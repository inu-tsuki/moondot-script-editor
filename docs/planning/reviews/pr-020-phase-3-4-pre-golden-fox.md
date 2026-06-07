# PR: Phase 3.4-pre Golden Fox Provider Schema Compatibility

> 最近更新：2026-06-07
> 对应分支：`feat/phase3.4-pre-golden-fox`
> 对应 PR：GitHub #34
> 对应阶段：Phase 3.4-pre `provider-facing schema compatibility`

## 结论

本轮 3.4-pre 方向正确：它把 019 审计里最危险的 OpenAI strict structured output 兼容性问题落成了 provider-facing schema、normalizer、schema registry、server skeleton 和 snapshot / roundtrip 测试。`adaptation_plan_v1` 与 `writer_scene_patch_v1` 都已经不再把 app-side Zod schema 原样暴露给 provider。

第一次修复（`5a35829`）已经解决本轮审查发现的两个 Medium 和一个 Low：

- `openai` SDK 没有进入生产 bundle，但已经进入 `tsconfig.app.json` 的 app TypeScript compile graph。
- 测试和 server 注释锁定的是 Chat Completions `zodResponseFormat()` envelope，而 roadmap 规划的真实路径是 Responses API `text.format`。
- normalizer 在 malformed provider output 上可能抛裸 `TypeError`。

当前结论：PR #34 的 3.4-pre 前置工作已经不再阻塞，可以作为 Phase 3.4 正式真实调用实现的基础合并。注意它仍不是完整 3.4：真实 `/api/model/call` handler、refusal / empty / parse / schema / semantic failure mapping，以及 API key smoke 仍属于下一阶段。

## Findings

### Resolved Medium：server-only OpenAI SDK 进入了 app TypeScript compile boundary

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

复核状态（`5a35829`）：已解决。`tsconfig.app.json` 已增加 `exclude: ["src/server"]`，`src/core/adaptation/index.ts` 也不再 re-export provider schema / registry。额外探针确认 app TS project 不再包含 `src/server/**` 或 OpenAI SDK declaration files，`dist/assets` 中也没有 OpenAI / API key 相关关键词。

残留观察：`provider-schemas/**` 仍因 `tsconfig.app.json` 的 `include: ["src"]` 被 app project typecheck；但它不再通过 browser-facing barrel 暴露，也不引入 OpenAI SDK，当前不构成 3.4-pre 阻塞。

### Resolved Medium：compatibility tests 锁定 Chat Completions helper，而规划目标是 Responses `text.format`

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

复核状态（`5a35829`）：已解决。`provider-schema-snapshot.test.ts` 已改用 `zodTextFormat()` 并从 Responses `text.format` envelope 的顶层 `.schema` 抽取 JSON Schema；`src/server/index.ts` 的 TODO 也已改为 `text: { format: zodTextFormat(...) }`。

### Resolved Low：normalizer 在 malformed provider output 上可能抛 TypeError

位置：`src/core/adaptation/provider-schemas/normalizers.ts:106`

`normalizeWriterOutput()` 接收 `unknown`，随后直接 cast 成 `WriterScenePatchProviderOutput` 并访问 `out.scenes.map(...)`。如果未来 handler 在 provider schema parse 之前调用 normalizer，畸形 provider output 会变成未分类的 `TypeError`，而不是被映射到 `ModelCallError.reason === 'schema'` 或 `parse`。

这个问题当前还没有触发，因为 3.4-pre 尚未实现真实 handler；它是 Phase 3.4 接 handler 时的易错点。

建议：

- 在 registry 附近提供 `parseAndNormalizeProviderOutput(entry, raw)` 一类 helper：先 `entry.providerSchema.safeParse(raw)`，失败映射为 schema failure；成功后再 normalizer。
- Phase 3.4 handler 不直接调用裸 normalizer。
- 补 malformed provider output 测试，确认不会出现未捕获 `TypeError`。

复核状态（`5a35829`）：已解决。`provider-schemas/index.ts` 已新增 `parseAndNormalizeProviderOutput()`，先用 provider-facing schema `safeParse()` 再进入 normalizer；malformed provider output 测试覆盖了 null、错误 shape、Writer 缺 required fields 和 `scenes: null` 等输入。

## 第一次修复复核（2026-06-07，`5a35829`）

本轮修复覆盖了 `pr-020` 的全部 active findings：

- `tsconfig.app.json` 排除 `src/server`，app TS compile graph 不再包含 OpenAI SDK declarations。
- `src/core/adaptation/index.ts` 移除 provider schema / registry 聚合导出，server 和测试改为 direct-import provider schema modules。
- snapshot helper 从 Chat Completions `zodResponseFormat()` 切换到 Responses `zodTextFormat()`。
- server skeleton 注释对齐 Responses API `text.format`。
- provider registry 新增 `parseAndNormalizeProviderOutput()`，避免 malformed provider output 绕过 schema parse 后在 normalizer 内抛裸 `TypeError`。
- provider schema compatibility 测试从 112 增至 117，新增 malformed provider output guard 覆盖。

未发现新的 3.4-pre 阻塞项。可以合并当前 PR，并在后续 Phase 3.4 正式阶段继续实现真实 proxy handler、failure mapping 和 API key smoke。

## Verification

初次审查已运行：

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
- 初次审查时，`tsconfig.app.json` 的 app project 包含 `src/server/openai-client.ts`、`src/server/index.ts` 和 OpenAI SDK declaration files。

第一次修复复核运行：

```sh
pnpm format:check
pnpm lint
pnpm build
pnpm test
git diff --check main...HEAD
pnpm exec tsc -p tsconfig.app.json --listFilesOnly
rg -n "openai|OpenAI|zodResponseFormat|OPENAI_API_KEY|sk-" dist/assets
```

结果：

- `pnpm format:check` passed。
- `pnpm lint` passed。
- `pnpm build` passed。
- `pnpm test` passed：10 files / 117 tests。
- `git diff --check main...HEAD` clean。
- app TS project 不再包含 `src/server/**` 或 OpenAI SDK declaration files。
- `dist/assets` 未发现 OpenAI SDK、API key 变量名或疑似 secret。

## Test Gap

当前测试已经很好地覆盖 provider-facing schema 的 strict JSON Schema 子集：root object、`additionalProperties: false`、unsupported keywords、Writer flat block schema、normalizer roundtrip。

已由第一次修复覆盖：

- Responses API `text.format` envelope 的 snapshot / assertion。
- malformed provider output 的 parse-before-normalize guard 测试。

保留到 Phase 3.4 正式阶段：

- 真实 handler 层 refusal / empty / parse / schema / semantic failure mapping 测试。
- API key 配置缺失和真实调用 smoke。
- 可选：把 app compile / client graph 边界探针固化为 CI 检查。

## 后续动作

- 当前 PR 的 active review findings 已解决，可以合并后进入 Phase 3.4 正式真实调用实现。
- Phase 3.4 handler 必须调用 `parseAndNormalizeProviderOutput()`，不要直接调用裸 normalizer。
- `019` 保留为 OpenAI structured output compatibility audit；本文件作为 PR #34 的代码审查记录，不回写覆盖前置审计结论。
