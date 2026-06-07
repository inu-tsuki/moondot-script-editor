# PR: Phase 3.5b Per-card Controls and Writer Draft Split

> 最近更新：2026-06-07
> 对应分支：`feat/phase3.5b-card-controls`
> 对应 PR：GitHub #41
> Base PR：GitHub #40 `feat/phase3.5a-shell-and-dock`
> 对应阶段：Phase 3.5b `Converter card controls, WriterDraftPanel split, independent scroll`

## 结论

方向正确，主流程通过。PR #41 把全局 workflow command 拆回各个 artifact card：preferences card 负责生成大纲，Scene Outline card 负责确认生成 Writer draft，新增 `WriterDraftPanel` 负责预览草稿和应用到剧本。这个方向修正了旧 UI 中“agent 功能按钮离 artifact 太远”的问题，也保住了我们反复强调的 human review pause：outline 只是确认生成剧本草稿，Writer draft 通过 validation 后仍要显式应用到当前稿件。

需要校正的产品判断是：Editor 下的 export bar 是有意为之，不是偏离 Converter consolidation。YAML 导出的对象始终是当前 Editor 中已经写入的 `ScreenplayDocument`，不是 Converter 里 pending 的 outline 或 Writer draft。因此导出可以归属 Editor；Converter 负责生成、验证、展示和应用 artifact。

当前仍有一个会误导用户判断 artifact 来源的问题：RunBadge 使用当前 provider，而不是生成该 artifact 时的 provider。

## Findings

### Active Medium：RunBadge 显示当前 provider，而不是 artifact provider

位置：`src/App.tsx:662-678`、`src/features/converter/SceneOutlinePanel.tsx:38-43`、`src/features/converter/WriterDraftPanel.tsx:56-60`、`src/features/converter/RunBadge.tsx:7-16`

PR #41 新增 `RunBadge`，用于标记 outline / draft 来自 `Mock` 还是 `API`。但 `SceneOutlinePanel` 和 `WriterDraftPanel` 接收的是全局 `providerType`：

```tsx
<RunBadge provider={providerType} />
```

这会显示“当前选择的 provider”，而不是 artifact 的真实生成来源。复现路径：

1. 用户切到 `local_proxy`。
2. 生成 Scene Outline。
3. 切回 `mock`。
4. `adaptationPlan` 仍然保留，但 Scene Outline 的 badge 会显示 `Mock`。

如果 Writer draft 也采用同样逻辑，用户会误以为当前草稿来自切换后的 provider。这个问题和 3.5d 的 run monitor / artifact trace 方向直接相关：provider 差异应该体现在 trace 和 artifact metadata，而不是用当前 UI state 推断。

建议：

- 在生成 outline 成功时记录 `adaptationPlanProvider = result.trace.provider`，传给 `SceneOutlinePanel`。
- 在生成 Writer draft 成功时记录 `writerDraftProvider = result.trace.provider`，传给 `WriterDraftPanel`。
- 或者把 `GenerationTraceStep` 扩展出 provider 字段，用 artifactType 查找对应 provider。
- provider 切换时可以清空 pending draft，但不应改变已经生成的 plan badge。
- 补组件或 App-level 测试：生成后切换 provider，已有 artifact 的 badge 不变。

## Accepted Decisions

- Editor export bar 是有意设计：导出当前 Editor document，而不是导出 Converter pending artifact。
- 默认双栏是有意设计：Editor 与 Converter 并排协作，dock 后续应把它作为默认 preset。
- `WriterDraftPanel` 从 `SceneOutlinePanel` 拆出是正确方向：outline 和 writer draft 是两个 artifact，不应共用同一张卡片。

## Positive Notes

- `确认生成` 不再直接写入剧本，只触发 Writer draft generation。
- `应用到剧本` 只存在于 Writer draft card，流程语义比 3.4b 更清楚。
- Writer draft preview 展示 heading、synopsis、source refs 和 block 摘要，用户在应用前能看到草稿内容。
- `ConverterPanel` / `App.css` 的 `min-height: 0` 与 `overflow-auto` 修正了 editor center 和 converter right 的独立滚动。
- e2e 新增完整 converter workflow：大纲生成、确认生成草稿、应用到剧本。

## Verification

本轮 stacked review 已运行：

```sh
git diff --check feat/phase3.5a-shell-and-dock...feat/phase3.5b-card-controls
pnpm format:check
pnpm lint
pnpm build
pnpm test
pnpm e2e
```

结果：

- `git diff --check feat/phase3.5a-shell-and-dock...feat/phase3.5b-card-controls` clean。
- `pnpm format:check` passed。
- `pnpm lint` passed。
- `pnpm build` passed。
- `pnpm test` passed：14 files / 166 tests。
- `pnpm e2e` 在 sandbox 内 webServer 启动失败；以非沙箱权限复跑通过：4 tests。

## 后续动作

- 在 #41 内修复 RunBadge artifact provider 语义。
- 规划文档应改口径：导出归属 Editor；Converter consolidation 不再要求 YAML copy / download 必须在 Converter 内。
- 3.5d run monitor 可以继续扩展 provider、stage、runId、loading / success / failure 和 failure reason，但应建立在 artifact trace 上。
