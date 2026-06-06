# PR: Structured Architect Contract（Phase 3.2）

> 最近更新：2026-06-07
> 对应分支：`phase-3.2-structured-architect-contract`
> 对应阶段：Phase 3.2 `Structured Architect contract`

## 结论

方向正确：3.2 已经把 Architect plan 接进 runtime validation，schema / semantic 失败不会写入 `ScreenplayDocument`，跨章节 sourceRefs 校验和测试覆盖也落地了。

第一轮复核发现三处 validator 契约孔洞：failure branch 不清旧 plan、SceneCard 漏检 `pacing` 和 `sourceRef.kind`、question/answer 引用完整性未校验。

第二轮复核（`66a25f3` 后）确认 stale plan 清理、`questionAnswers` 引用完整性、`pacing` 缺失和空 `sourceRefs` 已有明显收敛；但仍有四处 contract 缝隙会影响 Phase 3.3 Writer brief：`sourceRef.kind` 值域仍未限制为 novel chapter、空 `sceneOutline` 会被接受为可确认 plan、Architect structured output schema 尚未进入模型调用 envelope、若干 union / required 字段仍只做了宽松 string/object 校验。

第三轮复核（`c3d2512` 后）确认第二轮的 runtime validator 问题大多已修：`sourceRef.kind === 'chapter'`、空 `sceneOutline`、`pacing` 和 `headingSuggestion.locationType` 都有校验和测试覆盖。剩余主要问题已经从“手写 validator 漏洞”转为“schema 来源仍不够正”：当前实现把完整 JSON contract 写进 prompt，但 Phase 3 的长期边界应是 Zod / structured output schema 进入 model request envelope，prompt 只保留创作语义。

第四轮复核（`548672e` 后）确认 Zod 迁移方向正确，上一轮提到的 union / required 字段宽松问题已经基本收口：`adaptationPlanSchema.safeParse()` 成为结构校验入口，`validateAdaptationPlan()` 继续负责跨章节、question/answer 引用等语义校验。当前剩余风险集中在两个边界：`responseSchema` 直接携带 Zod object，尚不是浏览器到 local proxy 可传输的 provider-neutral envelope；prompt 中“返回 schema 内允许的最小有效 plan”会鼓励模型伪造最小通过结果，而不是显式暴露 empty/refusal/semantic failure。

## Findings

### Medium：invalid Architect result 会留下旧 plan 可确认

位置：`src/App.tsx:327`

在 `generateSceneOutline` 的 validation failure 分支里，只写入 diagnostics 然后 `return`，没有清空已有 `adaptationPlan` / `adaptationTrace`。如果用户之前已经生成过一个 plan，再触发一次生成且新结果 schema/semantic validation 失败，旧 outline 仍会显示，顶部确认按钮仍因 `!!adaptationPlan` 保持可用。

建议：
- 在 `generateSceneOutline` 的 failure 分支里 `setAdaptationPlan(undefined)`、`setAdaptationTrace([])`。
- 或在 generate 开始时先清空旧 plan，让 failure 时 UI 自然回落到空状态。

### Medium：`SceneCard` contract 校验漏掉必填字段和 `SourceRef.kind`

位置：`src/core/adaptation/validate-adaptation-plan.ts:134`、`:149`

`SceneCard` 类型要求 `pacing`，但 validator 的必填字段只检查 `id/title/dramaticPurpose/writerBrief`。`sourceRefs` 也只检查 array 和 `sourceId`，没检查 `kind`。这会让 `{ sourceId: validChapterId }` 或 `{ kind: 'seed', sourceId: validChapterId }` 通过，最后被 cast 成 `AdaptationPlan`。

建议：
- 校验 `pacing` 必须是 string（至少），最佳是校验 `AdaptationPacing` union。
- 校验 `sourceRefs.length > 0`。
- novel Architect 阶段校验 `kind === 'chapter'`。

### Low：`AdaptationQuestion` / `questionAnswers` 的引用完整性还没校验

位置：`src/core/adaptation/validate-adaptation-plan.ts:222`、`:421`

当前只检查 `recommendedOptionId` 是 string、option 有 id/label。`questionAnswers` 也只检查 `questionId/optionId` 是 string。

建议：
- `recommendedOptionId` 必须存在于该 question 的 options 中。
- answer 必须引用存在的问题和选项。
- `answer.source` 必须是 `'recommended' | 'user'`。

## 第二轮 Findings（2026-06-07，`66a25f3` 后）

### Resolved：`sourceRef.kind` 仍只校验为 string，没有限制为 `chapter`

位置：`src/core/adaptation/validate-adaptation-plan.ts:181`、`:302`

第一轮建议里已经指出 novel Architect 阶段应校验 `kind === 'chapter'`。当前实现补了 `kind` 存在性，但仍只检查 `typeof refObj.kind === 'string'`。因此 `{ kind: 'seed', sourceId: 'ch_001' }` 可以通过校验，被 cast 成 `AdaptationPlan`，再由 Writer mock 写入 scene / block `sourceRefs`。

这个问题会让来源追溯变得不可信：`serializeDocumentToYaml` 只把 `kind === 'chapter'` 的 ref 投影为 `sourceChapterIds`，所以错误 kind 会在 YAML 中静默丢失章节映射。

建议：
- 提取 `validateChapterSourceRefs()`，同时用于 `SceneCard.sourceRefs` 和 `AdaptationQuestion.sourceRefs`。
- 对 novel Architect contract 明确要求 `ref.kind === 'chapter'`，不只是 string。
- 补 `sourceRef.kind: 'seed' | 'outline' | 'world_bible'` 的拒绝测试。

复核状态（`c3d2512`）：已解决。当前实现提取了 `validateChapterSourceRefs()`，并补了 SceneCard / AdaptationQuestion 的非 chapter kind 拒绝测试。

### Resolved：空 `sceneOutline` 会被接受为可确认 plan

位置：`src/core/adaptation/validate-adaptation-plan.ts:416`、`src/App.tsx:470`

当前 validator 只检查 `sceneOutline` 是 array。`sceneOutline: []` 会返回有效 `plan`，然后顶部确认按钮只依赖 `!!adaptationPlan`，用户可以确认一个没有 scene card 的 Architect 结果。Writer mock 随后会写入空 `script.scenes`，再由 document validator 报 `empty_scene_list`。

这不符合 Phase 3.2 “schema failure 不会写入 `ScreenplayDocument`”的精神：空 outline 已经是无可执行 scene-level brief 的 Architect failure，不应等到 Writer / document validation 再兜底。

建议：
- 对 novel source 要求 `sceneOutline.length >= 1`。
- 作为 semantic failure 返回 `empty_scene_outline` 或类似 diagnostic。
- 补 validator 测试，并在 App 层维持 invalid plan 不可确认。

复核状态（`c3d2512`）：已解决主要 runtime 风险。当前 validator 对空 `sceneOutline` 返回 semantic failure，并补了 `empty_scene_outline` 测试。

### Active Medium：Architect structured output schema 尚未进入模型调用 envelope

位置：`src/core/adaptation/buildNovelAdaptationPrompt.ts:120`

Phase 3.2 路线图要求定义 Architect request / response envelope，并让模型输出进入可验证的结构化 contract。当前代码只有自然语言 `PromptMessage[]`，`ModelCallRequest` 还没有携带 response schema / structured output 配置；`buildNovelAdaptationPrompt` 在 `c3d2512` 中把完整 JSON contract 写进 prompt，缓解了 mock / 文本模型提示不明确的问题，但这仍不是最终的 structured output 边界。

完整 schema 不应该主要靠 prompt 文案约束。真实 SDK 接入时，`AdaptationPlan` JSON Schema / Zod schema 应进入模型调用层的 structured output 字段，由 provider 负责 schema adherence；prompt 只描述创作任务、语义偏好和少量不会进入 schema 的判断标准。

如果继续把字段清单写在 prompt 里，会造成两套 contract：一套在 validator / schema，一套在自然语言 prompt。两者漂移后，模型可能照 prompt 生成“看起来合理”的 JSON，但被 validator 拒绝，或者 prompt 没更新却 schema 已变。

建议：
- 引入窄范围 Zod schema，作为 Architect artifact 的结构权威。
- 在 model contract 中增加 Architect response schema / structured output envelope，例如 `responseFormat`、`outputSchema` 或 provider-neutral 等价字段。
- 用同一份 schema 驱动未来 SDK structured output 和 app-side `validateAdaptationPlan`，避免 TypeScript 类型、JSON Schema、prompt 文案三方漂移。
- prompt 只保留任务语义：来源章节、改编偏好、不要直接写剧本、跨章节合并原则、心理描写外化等。
- 在 Phase 3.4 local proxy 接真实 SDK 时，将该 schema 映射到 provider 的 structured output 参数。

当前 prompt 最多保留 schema 外的桥接说明，例如：

- “按调用层提供的 structured output schema 返回 Architect plan”。
- “`sourceRefs.sourceId` 只能引用输入章节 ID”。
- “如果无法形成可执行 scene outline，应返回 schema 内允许的失败 / fallback artifact，而不是空 plan”。

复核状态（`548672e`）：部分解决。当前实现已经新增 `adaptationPlanSchema`，并通过 `ModelCallRequest.responseSchema` 传入 model adapter；但 envelope 类型仍是 `responseSchema?: object`，调用处直接传 Zod schema object，尚未形成可序列化 / registry-backed 的 provider-neutral contract。详见第四轮 findings。

### Partially Resolved Low：runtime validator 和 TypeScript union contract 仍有宽松不一致

位置：`src/core/adaptation/validate-adaptation-plan.ts:134`、`:198`、`:260`、`:360`、`:378`

当前 validator 仍有若干字段只做宽松校验：

- `SceneCard.pacing` 只要求 string，没有限制为 `'slow' | 'balanced' | 'fast'`。
- `headingSuggestion.locationType` 只要求非空 string，没有限制为 `'INT' | 'EXT' | 'INT_EXT'`。
- `preferences` 只要求 object，没有校验 `targetMedium`、`targetLength`、`fidelity`、`pacing`、`style` 等字段。
- `AdaptationQuestionOption.impact` 没有被要求。
- `AdaptationOption.tradeoffs` 没有被要求。

这些不一定全部阻塞 3.2 合并，但会让 validator 的“通过”比 TypeScript contract 宽。后续 Writer brief 会依赖 `pacing`、`sourceRefs` 和 heading 建 scene patch，建议在 3.2 收紧最关键的 union 字段，或在 3.3 开工前作为 follow-up 修完。

复核状态（`c3d2512`）：关键 Writer 依赖字段已有收紧：`pacing` 和 `headingSuggestion.locationType` 已做 union 校验并补测试。仍未完全对齐的是 `preferences`、`AdaptationQuestionOption.impact` 和 `AdaptationOption.tradeoffs` 等字段；如果引入 Zod schema，这些应在同一轮 schema 化中收口。

复核状态（`548672e`）：基本解决。Zod schema 已覆盖 `preferences` union、`AdaptationQuestionOption.impact`、`AdaptationOption.tradeoffs`、`pacing`、`headingSuggestion.locationType` 和非空 `sceneOutline` / `sourceRefs` 等结构约束；`validateAdaptationPlan()` 只保留 schema 后的语义完整性检查。

## 第四轮 Findings（2026-06-07，`548672e` 后）

### Active Medium：`responseSchema` 直接携带 Zod object，仍不是可传输的 structured output contract

位置：`src/core/model/types.ts:83`、`src/App.tsx:312`

当前 `ModelCallRequest` 新增了 `responseSchema?: object`，`generateSceneOutline()` 直接传入 `adaptationPlanSchema`。这对 in-process mock adapter 是可工作的，也让 app-side validator 与调用层共享了同一份 Zod schema；但它还不是 Phase 3.4 local proxy / real SDK 所需的请求契约。

Zod schema object 不能作为浏览器到本地代理的 HTTP payload 直接传输，也不是 provider-neutral structured output envelope。若后续 adapter 跨进程，`responseSchema` 会退化成不可序列化的实现对象，代理层无法仅凭请求内容知道该用哪个 schema、schema 名称、strict 策略或 provider 映射方式。

建议：

- 把 model request 改成可序列化或 registry-backed envelope，例如 `structuredOutput: { name, schemaId }`。
- 如果当前阶段要直接传 schema 内容，则使用 JSON Schema 形态：`structuredOutput: { name, jsonSchema, strict }`。
- local proxy / provider adapter 通过 `schemaId` 或 `jsonSchema` 映射到 SDK structured output 字段；UI 层不直接跨边界传 Zod object。
- 保留 Zod 作为 app-side parse / validation 权威，但把跨进程 model contract 设计成稳定数据，而不是运行时对象引用。

### Active Medium：prompt 鼓励返回“最小有效 plan”，会掩盖失败语义

位置：`src/core/adaptation/buildNovelAdaptationPrompt.ts:125`

prompt 现在写着“如果不能形成可执行 scene outline，返回 schema 内允许的最小有效 plan”。这句话会把真实失败引导成“构造一个勉强通过 schema 的 plan”：模型可能编造 scene card、sourceRefs 或 recommended plan 来满足 `.min(1)`，从而绕过 `empty_output`、`refusal` 或 semantic failure 的分类。

这和 3.2 的目标有轻微冲突：Architect plan 应当是可执行的 scene-level brief；如果不能形成 brief，应该显式失败或进入定义好的 failure artifact，而不是生成一个看似合法但创作上不可用的最小 plan。

建议：

- 移除“返回 schema 内允许的最小有效 plan”这句，改成“无法形成可执行 scene outline 时不要编造计划”。
- 若产品需要模型表达不可完成状态，在 Architect response envelope 中增加明确 failure branch，再由 adapter 转成 `ModelCallError` 或 validation diagnostic。
- 补 prompt smoke / text test，确保 prompt 不鼓励 fake minimal valid plan。

## Verification

第一轮已运行：

```sh
pnpm format:check
pnpm lint
pnpm test
pnpm build
git diff --check main...HEAD
pnpm e2e
```

结果：

- Vitest：5 files / 38 tests passed。
- Playwright：3 tests passed。

第二轮复核运行：

```sh
pnpm format:check
pnpm lint
pnpm test
pnpm build
git diff --check main...HEAD
```

结果：

- Vitest：5 files / 45 tests passed。
- `git diff --check main...HEAD` clean。

第三轮复核运行：

```sh
pnpm test -- tests/core/adaptation/validate-adaptation-plan.test.ts
pnpm test -- tests/core/model/mock-adapter.test.ts
git diff --check main...HEAD
```

结果：

- `pnpm format:check` passed。
- `pnpm lint` passed。
- `pnpm test` passed：5 files / 51 tests。
- `pnpm build` passed。
- `git diff --check main...HEAD` clean。

第四轮复核运行：

```sh
pnpm format:check
pnpm lint
pnpm test
pnpm build
git diff --check 34496ea..HEAD
```

结果：

- `pnpm format:check` passed。
- `pnpm lint` passed。
- `pnpm test` passed：6 files / 63 tests。
- `pnpm build` passed。
- `git diff --check 34496ea..HEAD` clean。

## Test Gap

已有 19 个 validator 测试，覆盖 schema / semantic failure、跨章节检测和 heading 校验。

建议补充：
- validation failure 后旧 plan 被清空的 App 级测试。
- `recommendedOptionId` 不匹配、answer 引用不存在 question/option 的测试。
- model envelope smoke：Architect planning request 的 structured output contract 是可序列化或 registry-backed，而不是直接跨边界传 Zod object。
- prompt contract smoke：Architect prompt 不鼓励构造 fake minimal valid plan；无法形成 scene outline 时应进入显式 failure 语义。

## 后续动作

- Zod schema 与 validator 收口已经完成，可作为 Phase 3.2 的结构校验基础。
- 在同一 Phase 3.2 PR 内把 structured output envelope 改成可序列化 / provider-neutral contract，替代直接传 Zod object 的调用边界。
- 移除或改写“最小有效 plan”提示词，避免模型用伪造 plan 吞掉 failure。
- 完成 schema 化后再继续 Phase 3.3 WriterBrief and scene draft contract。
