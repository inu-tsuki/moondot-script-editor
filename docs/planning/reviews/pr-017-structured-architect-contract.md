# PR: Structured Architect Contract（Phase 3.2）

> 最近更新：2026-06-07
> 对应分支：`phase-3.2-structured-architect-contract`
> 对应阶段：Phase 3.2 `Structured Architect contract`

## 结论

方向正确：3.2 已经把 Architect plan 接进 runtime validation，schema / semantic 失败不会写入 `ScreenplayDocument`，跨章节 sourceRefs 校验和测试覆盖也落地了。

第一轮复核发现三处 validator 契约孔洞：failure branch 不清旧 plan、SceneCard 漏检 `pacing` 和 `sourceRef.kind`、question/answer 引用完整性未校验。

第二轮复核（`66a25f3` 后）确认 stale plan 清理、`questionAnswers` 引用完整性、`pacing` 缺失和空 `sourceRefs` 已有明显收敛；但仍有四处 contract 缝隙会影响 Phase 3.3 Writer brief：`sourceRef.kind` 值域仍未限制为 novel chapter、空 `sceneOutline` 会被接受为可确认 plan、Architect structured output schema 尚未进入模型调用 envelope、若干 union / required 字段仍只做了宽松 string/object 校验。

第三轮复核（`c3d2512` 后）确认第二轮的 runtime validator 问题大多已修：`sourceRef.kind === 'chapter'`、空 `sceneOutline`、`pacing` 和 `headingSuggestion.locationType` 都有校验和测试覆盖。剩余主要问题已经从“手写 validator 漏洞”转为“schema 来源仍不够正”：当前实现把完整 JSON contract 写进 prompt，但 Phase 3 的长期边界应是 Zod / structured output schema 进入 model request envelope，prompt 只保留创作语义。

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

## Test Gap

已有 19 个 validator 测试，覆盖 schema / semantic failure、跨章节检测和 heading 校验。

建议补充：
- validation failure 后旧 plan 被清空的 App 级测试。
- `recommendedOptionId` 不匹配、answer 引用不存在 question/option 的测试。
- Zod schema 的 `safeParse` 成功 / 失败测试。
- model envelope smoke：Architect planning request 能携带 structured output schema / response format。
- prompt contract smoke：Architect prompt 不重复完整 schema，但说明 `sourceRefs.sourceId` 必须来自输入章节，并明确 schema 由调用层提供。

## 后续动作

- 在同一 Phase 3.2 PR 内引入窄范围 Zod schema 和 provider-neutral structured output envelope，替代 prompt 内的完整 JSON contract。
- 完成 schema 化后再继续 Phase 3.3 WriterBrief and scene draft contract。
