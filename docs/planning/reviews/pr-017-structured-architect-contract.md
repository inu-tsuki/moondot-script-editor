# PR: Structured Architect Contract（Phase 3.2）

> 最近更新：2026-06-06
> 对应分支：`phase-3.2-structured-architect-contract`
> 对应阶段：Phase 3.2 `Structured Architect contract`

## 结论

方向正确：3.2 已经把 Architect plan 接进 runtime validation，schema / semantic 失败不会写入 `ScreenplayDocument`，跨章节 sourceRefs 校验和测试覆盖也落地了。

本轮复核发现三处 validator 契约孔洞：failure branch 不清旧 plan、SceneCard 漏检 `pacing` 和 `sourceRef.kind`、question/answer 引用完整性未校验。修完后就可以安全进入 3.3 Writer brief。

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

## Verification

已运行：

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

## Test Gap

已有 19 个 validator 测试，覆盖 schema / semantic failure、跨章节检测和 heading 校验。

建议补充：
- validation failure 后旧 plan 被清空的 App 级测试。
- `pacing` 缺失/无效的测试。
- `sourceRef.kind` 非 `chapter` 的测试。
- `recommendedOptionId` 不匹配、answer 引用不存在 question/option 的测试。

## 后续动作

- 先修正以上 three findings，再继续 Phase 3.3 WriterBrief and scene draft contract。
