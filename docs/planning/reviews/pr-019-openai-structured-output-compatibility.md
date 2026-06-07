# PR: OpenAI Structured Output Compatibility Audit（Phase 3.4）

> 最近更新：2026-06-07
> 对应分支：`docs/phase3.4-openai-structured-output-audit`
> 对应阶段：Phase 3.4 `Local model proxy / server boundary`

## 结论

可以进入 Phase 3.4，并在这一阶段引入 OpenAI JavaScript SDK，但 SDK 只能出现在 local proxy / server boundary，不能进入 React client import graph。当前不需要 OpenAI Agents SDK；普通 OpenAI SDK + Responses API structured output 足够证明 MVP 的真实模型路径。

现有 `structuredOutput: { schemaId }` 方向正确：前端请求只携带可序列化 schema id，proxy 侧用 registry 解析到 provider-facing schema。`adaptation_plan_v1` 和 `writer_scene_patch_v1` 也都已经有 app-side Zod contract 和 semantic validation。

但现有 Zod schema 还不能假设可以原样传给 OpenAI strict structured output。OpenAI structured output 的 strict 模式要求 root schema 是 object、对象字段全部 required、对象禁止额外属性；同时只支持 JSON Schema 子集。Writer schema 的 optional 字段、所有 object 的 strictness、数组 / 数字约束和 block union 都需要先审计或做 provider-facing normalizer。

官方依据：OpenAI Structured Outputs guide（`https://platform.openai.com/docs/guides/structured-outputs`）说明 JavaScript SDK 可使用 Zod helper 接 structured output，同时 strict structured output 有 required fields、`additionalProperties: false`、root object / supported schema subset 等限制。

## Findings

### Active High：Writer optional fields 与 OpenAI strict required-fields 约束不匹配

位置：`src/core/adaptation/writer-scene-patch-schema.ts:25`、`src/core/adaptation/writer-scene-patch-schema.ts:56`、`src/core/adaptation/writer-scene-patch-schema.ts:69`

`writerScenePatchSchema` 目前有多处 `.optional()`：

- scene-level `synopsis`
- block-level `sourceRefs`
- dialogue `parenthetical`
- narration `voice`
- top-level `characterUpdates`

这些字段作为 app-side domain contract 是合理的：缺省 `sourceRefs`、缺省旁白 voice、缺省角色更新都很自然。但 OpenAI strict structured output 不适合直接表达“对象字段可省略”。如果把这些 Zod schema 原样交给 SDK helper，可能生成不被接受的 schema，或在 strict output 中出现 provider schema 与 app-side Zod contract 的语义分叉。

建议：

- provider-facing Writer schema 中把 `sourceRefs` 和 `characterUpdates` 变成 required array；没有引用或角色更新时返回 `[]`。
- `synopsis`、`parenthetical`、`voice` 使用 required nullable field，proxy normalizer 在进入 app-side `writerScenePatchSchema.safeParse()` 前把 `null` 移除或转成现有 contract 可接受值。
- 不要让 prompt 要求“省略字段”；缺省语义应由 provider schema 和 normalizer 明确承载。
- 补 compatibility test：provider-facing Writer fixture 经过 normalizer 后能通过 app-side Zod + semantic validation。

### Active Medium：所有 Zod object 尚未显式 strict，provider schema 需要 `additionalProperties: false`

位置：`src/core/adaptation/adaptation-plan-schema.ts:14`、`src/core/adaptation/writer-scene-patch-schema.ts:14`

当前 schema 全部使用普通 `z.object(...)`。Zod 默认会剥离未知字段，而不是报错；这对 app-side parsing 比较宽容，但和 OpenAI strict structured output 的“对象禁止额外属性”不是同一个 contract。

3.4 不一定要马上把 app-side schema 全量改成 `.strict()`，因为那会改变 mock / fallback 的 parse 行为；但 provider-facing schema 必须明确所有 object 的 `additionalProperties: false`。否则真实模型路径和本地 validation 路径会出现“OpenAI 不会返回的字段 app-side 却悄悄吞掉”的漂移。

建议：

- 建立 server-side schema registry 时，为每个 provider-facing object 生成或断言 `additionalProperties: false`。
- 评估是否把模型 artifact 的 app-side Zod objects 改成 `.strict()`；若不改，则在 proxy 层先用 strict provider schema 拦住 extra keys。
- 补 schema snapshot / compatibility assertion，避免后续新增 object 忘记设置 strictness。

### Active Medium：`.min()` / `.positive()` 这类 Zod 约束需要按所选模型确认 provider schema

位置：`src/core/adaptation/adaptation-plan-schema.ts:29`、`src/core/adaptation/adaptation-plan-schema.ts:31`、`src/core/adaptation/writer-scene-patch-schema.ts:61`

现有 schema 里有多处结构 + 语义混合约束：

- `z.array(...).min(1)`：`sourceRefs`、`options`、`sceneOutline`、`scenes`、`blocks`
- `z.number().int().positive()`：`estimatedBlocks`

这些在 app-side Zod validation 中很有价值。OpenAI structured output 对普通模型支持一部分数组和数字约束，例如 `minItems`、`minimum`、`exclusiveMinimum`；但 structured output 仍是 JSON Schema 子集，fine-tuned 模型对这些约束也更严格。3.4 不能只看 Zod 源码判断兼容性，需要检查 SDK helper 最终生成的 provider schema 是否被所选模型接受。

建议：

- provider-facing schema 只保留 OpenAI 支持的结构约束：type、properties、required、enum、array item shape 等。
- `.min(1)`、positive integer、sourceRefs known chapter、scene coverage 等继续由 app-side validator 负责。
- 若 SDK helper 生成 unsupported keyword，建立 provider-facing schema sanitizer 或手写窄 schema，避免 OpenAI API 拒绝请求。

### Active Medium：Writer block discriminated union 需要验证 SDK helper 输出形态

位置：`src/core/adaptation/writer-scene-patch-schema.ts:25`

`sceneBlockDraftSchema` 使用 `z.discriminatedUnion('type', [...])`，这是 app-side parse 的好选择。但 provider-facing JSON Schema 可能生成 `oneOf`、`anyOf`、`const` 或 discriminator 相关字段。OpenAI structured output 支持的 union 形态有限，并且 root 不能是 `anyOf`；nested union 通常可行，但要看 SDK helper 最终输出。

另外，`sourceRefSchema.kind` 使用 `z.literal('chapter')`。如果 helper 输出 `const` 而不是单值 `enum`，也需要确认 OpenAI 是否接受。

建议：

- 3.4 安装 OpenAI SDK 后，先生成 `writer_scene_patch_v1` provider schema snapshot，人工确认 block union 输出。
- 如果 helper 输出不兼容，优先把 provider-facing block schema 改成统一 object shape：`type` required enum，所有 variant-specific 字段 required nullable，再用 app-side normalizer 还原为现有 discriminated union。
- 保留 app-side `z.discriminatedUnion` 作为最终结构权威，不因为 provider schema 限制牺牲 domain type。

### Confirmed：Architect schema 没有 optional 字段，但仍需要 provider-facing strict 化

位置：`src/core/adaptation/adaptation-plan-schema.ts:93`

`adaptationPlanSchema` 的 root object 和嵌套 object 目前字段都是 required，这一点比 Writer 更接近 OpenAI strict structured output。它的主要风险不是 optional，而是：

- 普通 `z.object` 未显式 strict。
- `.min(1)` 和 `.positive()` 可能生成 unsupported JSON Schema keywords。
- `sourceRefSchema.kind` 的 literal 输出形态需要确认。
- `estimatedBlocks` 的 positive 语义仍应由 app-side validation 兜底。

建议：

- 先把 Architect provider schema 作为第一条 compatibility smoke path，因为它没有 optional 字段，适合作为 SDK 接入的最小真实调用。
- 对生成出的 provider JSON Schema 做 snapshot / assertion，再接真实 API key。
- 保持 `validateAdaptationPlan()` 的 semantic checks，尤其是 `sceneOutline[].id` 唯一性、known chapter refs、questionAnswers 引用完整性。

## Phase 3.4 Implementation Notes

建议 3.4 的真实调用顺序：

1. React client 继续构造 `ModelCallRequest`，只传 `messages`、`stage`、`runId`、`structuredOutput.schemaId`。
2. Local proxy 读取环境变量和 `schemaId`，从 server-side registry 解析 provider-facing structured output spec。
3. Proxy 用 OpenAI JS SDK 调 Responses API structured output。
4. Proxy 先处理 refusal / empty output / SDK parse failure。
5. 如有 provider normalizer，先 normalizer，再进入 app-side Zod `safeParse` 和 semantic validator。
6. Proxy / adapter 返回 `ModelCallResult`，失败统一落到 `ModelCallError`。

失败映射建议：

- 缺少 API key、未知 `schemaId`、未配置模型：`config_missing`
- timeout、connection refused、rate limit、5xx：`network`
- OpenAI refusal：`refusal`
- 没有可用 structured output：`empty_output`
- SDK 返回不可解析 payload：`parse`
- provider output 不符合 app-side Zod：`schema`
- sourceRefs、scene coverage、character refs 等语义失败：`semantic`

## Phase 3.4 Acceptance Checklist

- [ ] `openai` dependency 只被 proxy / server 代码 import。
- [ ] `.env.local` 只记录变量名示例，不提交 secret。
- [ ] `schemaId` 只能由 server-side registry 解析，client 不传 Zod runtime object。
- [ ] `adaptation_plan_v1` 有 provider-facing structured output compatibility test 或 snapshot。
- [ ] `writer_scene_patch_v1` 有 provider-facing structured output compatibility test 或 snapshot。
- [ ] Writer optional 字段有 required array / nullable / normalizer 策略。
- [ ] 所有 provider-facing object 都断言 `additionalProperties: false`。
- [ ] unsupported JSON Schema keyword 不会进入 OpenAI strict schema。
- [ ] refusal / empty / parse / schema / semantic / config missing 都有测试或手动验证记录。

## Recommendation

Phase 3.4 可以启动，且应该引入 OpenAI SDK；但第一步不是直接发真实请求，而是把 `schemaId -> provider-facing structured output schema -> app-side validation` 这条链路建稳。Architect schema 适合作为第一条真实 structured output smoke；Writer schema 需要先处理 optional / union / normalizer，再进入真实调用。
