# PR: Phase 3.4-pre Golden Fox Provider Schema Compatibility

> 最近更新：2026-06-07
> 对应分支：`feat/phase3.4-pre-golden-fox`
> 对应 PR：GitHub #34
> 对应阶段：Phase 3.4-pre `provider-facing schema compatibility`

## 结论

本轮 3.4-pre 方向正确：它把 019 审计里最危险的 OpenAI strict structured output 兼容性问题落成了 provider-facing schema、normalizer、schema registry、server skeleton 和 snapshot / roundtrip 测试。`adaptation_plan_v1` 与 `writer_scene_patch_v1` 都已经不再把 app-side Zod schema 原样暴露给 provider。

但当前 PR 还不建议直接进入 Phase 3.4 正式真实调用实现。审查发现两个 Active Medium：

- `openai` SDK 没有进入生产 bundle，但已经进入 `tsconfig.app.json` 的 app TypeScript compile graph。
- 测试和 server 注释锁定的是 Chat Completions `zodResponseFormat()` envelope，而 roadmap 规划的真实路径是 Responses API `text.format`。

这两点都属于边界问题，不是 schema 形状本身的问题。修完后，3.4 才适合继续做真实 `/api/model/call` handler、refusal / empty / parse / schema / semantic failure mapping，以及 API key smoke。

## Findings

### Active Medium：server-only OpenAI SDK 进入了 app TypeScript compile boundary

位置：`tsconfig.app.json:22`、`src/server/openai-client.ts:11`、`src/core/adaptation/index.ts:20`

`tsconfig.app.json` 当前 `include: ["src"]` 会把整个 `src/server/**` 纳入 app project。由于 `src/server/openai-client.ts` import 了 `openai`，`pnpm exec tsc -p tsconfig.app.json --listFilesOnly` 中可以看到 `src/server/openai-client.ts`、`src/server/index.ts` 以及 OpenAI SDK 的大量 declaration files。

这不是生产包泄露：`dist/assets` 中没有搜到 `openai`、`OpenAI`、`zodResponseFormat`、`OPENAI_API_KEY` 或 `sk-`。但它仍然违背 Phase 3.4 roadmap 的边界要求：`openai` SDK 只能出现在 proxy / server import path，不能进入 React client / app compile boundary。

额外的边界漂移点是 `src/core/adaptation/index.ts` re-export 了 provider-facing schema 和 registry：

- `adaptationPlanProviderSchema`
- `writerScenePatchProviderSchema`
- `PROVIDER_SCHEMA_REGISTRY`
- `resolveProviderSchema`
- `normalizeArchitectOutput`
- `normalizeWriterOutput`

这些 API 目前没有把 OpenAI SDK 打进 bundle，但它们让 provider schema 更容易被 browser-facing code 从 `src/core/adaptation` 聚合出口误用。Phase 3.4 的长期形状应该是：client 只知道 `structuredOutput: { schemaId }`，server / proxy 负责把 `schemaId` 解析成 provider-facing schema。

建议：

- 在 `tsconfig.app.json` 中显式 exclude `src/server/**`，或把 app include 收窄到浏览器入口和 browser-safe modules。
- 避免从 browser-facing `src/core/adaptation/index.ts` 聚合导出 provider registry / provider schemas；server 和测试可以 direct-import `src/core/adaptation/provider-schemas/**`。
- 增加边界测试或 CI 检查：app TS project / Vite client graph 不应包含 `src/server/**` 或 `node_modules/openai/**`。

### Active Medium：compatibility tests 锁定 Chat Completions helper，而规划目标是 Responses `text.format`

位置：`tests/core/adaptation/provider-schema-snapshot.test.ts:2`、`src/server/index.ts:11`、`docs/planning/roadmap/phase-3-model-workflow.md:269`

Phase 3.4 roadmap 明确要求 server-side registry 将 `schemaId` 映射到 OpenAI Responses API `text.format` structured output 参数。但当前 snapshot test 使用的是 `zodResponseFormat()`，server skeleton 注释也写成了：

```ts
zodResponseFormat(providerSchema, formatName)
```

本地 OpenAI SDK helper 文件同时提供 `zodResponseFormat()` 和 `zodTextFormat()`。两者底层都会生成 strict JSON Schema，但 envelope 不同：前者面向 Chat Completions `response_format`，后者面向 Responses API `text.format`。现在的测试能证明“schema 子集被 sanitize 了”，但还不能证明“3.4 真实 Responses API 参数形状是正确的”。

建议：

- 将 provider schema snapshot helper 切到 `zodTextFormat()`，并按 Responses `text.format` envelope 抽取 schema。
- 或保留当前 schema 子集测试，同时新增一组 `zodTextFormat()` envelope / snapshot assertion，确保 Phase 3.4 handler 使用的格式被测试覆盖。
- 更新 `src/server/index.ts` 的 TODO 注释，避免代码编写者沿着 Chat Completions `response_format` 接入，而不是 roadmap 中的 Responses `text.format`。

### Active Low：normalizer 在 malformed provider output 上可能抛 TypeError

位置：`src/core/adaptation/provider-schemas/normalizers.ts:106`

`normalizeWriterOutput()` 接收 `unknown`，随后直接 cast 成 `WriterScenePatchProviderOutput` 并访问 `out.scenes.map(...)`。如果未来 handler 在 provider schema parse 之前调用 normalizer，畸形 provider output 会变成未分类的 `TypeError`，而不是被映射到 `ModelCallError.reason === 'schema'` 或 `parse`。

这个问题当前还没有触发，因为 3.4-pre 尚未实现真实 handler；它是 Phase 3.4 接 handler 时的易错点。

建议：

- 在 registry 附近提供 `parseAndNormalizeProviderOutput(entry, raw)` 一类 helper：先 `entry.providerSchema.safeParse(raw)`，失败映射为 schema failure；成功后再 normalizer。
- Phase 3.4 handler 不直接调用裸 normalizer。
- 补 malformed provider output 测试，确认不会出现未捕获 `TypeError`。

## Verification

本轮审查已运行：

```sh
pnpm format:check
pnpm lint
pnpm build
pnpm test
git diff --check main...HEAD
```

结果：

- `pnpm format:check` passed。
- `pnpm lint` passed。
- `pnpm build` passed。
- `pnpm test` passed：10 files / 112 tests。
- `git diff --check main...HEAD` clean。

额外边界检查：

```sh
rg -n "openai|OpenAI|zodResponseFormat|OPENAI_API_KEY|sk-" dist/assets
pnpm exec tsc -p tsconfig.app.json --listFilesOnly
```

结果：

- `dist/assets` 未发现 OpenAI SDK、API key 变量名或疑似 secret。
- `tsconfig.app.json` 的 app project 当前包含 `src/server/openai-client.ts`、`src/server/index.ts` 和 OpenAI SDK declaration files。

## Test Gap

当前测试已经很好地覆盖 provider-facing schema 的 strict JSON Schema 子集：root object、`additionalProperties: false`、unsupported keywords、Writer flat block schema、normalizer roundtrip。

仍需补充：

- app compile / client graph 不包含 `src/server/**` 和 `openai` 的边界测试。
- Responses API `text.format` envelope 的 snapshot 或 assertion。
- handler 层 malformed provider output 的 parse / schema failure mapping。

## 后续动作

- 先在当前 PR 修复两个 Active Medium，再进入 Phase 3.4 正式真实调用实现。
- Low normalizer 问题可以随 Phase 3.4 handler 一起修，但不应等到真实 API key smoke 时才发现。
- `019` 保留为 OpenAI structured output compatibility audit；本文件作为 PR #34 的代码审查记录，不回写覆盖前置审计结论。
