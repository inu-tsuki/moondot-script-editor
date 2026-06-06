# PR #11 Review: Workbench Layout and Output Tabs

> 最近更新：2026-06-06  
> GitHub PR：[#23](https://github.com/inu-tsuki/moondot-script-editor/pull/23)  
> 对应分支：`feat/workbench-layout-tabs`（base = `main`）  
> 对应功能提交：
>
> - `bac9f44 feat: add WorkbenchLayout and output tabs`

## 审查规划

本次 review 以 Phase 2.5.4 的文档标准为主线：建立轻量 `WorkbenchLayout`、让 output 进入 tabs、扩大中央语义编辑区，并确认 layout state 不进入 `ScreenplayDocument`。

主要依据：

- `docs/planning/roadmap/phase-2-5-workbench-ui-foundation.md`：Phase 2.5.4 完成标准。
- `docs/knowledge/interaction/workbench-layout.md`：工作台以 semantic editor 为主区域，source / YAML / diagnostics 为辅助面板。
- `docs/knowledge/architecture/document-workspace-boundary.md`：UI tab、layout state、diagnostics 不应成为 document 字段。
- `docs/knowledge/interaction/semantic-block-editing.md`：后续 2.5.5 仍应编辑 `ScreenplayDocument` 中的 metadata、角色上下文和 AST 语义块，而不是把 Fountain-like 文本作为主输入。

## 审阅结论

PR #11（GitHub PR #23）完成了 Phase 2.5.4 的主要结构目标：新增 `WorkbenchLayout`，让 source、script editor、output 明确分区；将 Scene Outline、YAML 和 Diagnostics 收进右侧 tabs；并把中央列权重提高到明显主区域。

方向正确，且没有把 `outputTab` 写进 `ScreenplayDocument`。合并前建议处理两个交互/布局细节，避免 output tabs 在真实演示里显得“不响应用户动作”。

## Findings

### 1. 顶部动作不会切换到对应 output tab

- 位置：`src/App.tsx:197`、`src/App.tsx:242`
- 严重度：Medium

`generateSceneOutline` 生成大纲后不会切换到 `outline` tab。如果用户当前停在 YAML 或 Diagnostics，再点击顶部「大纲」，新结果已经生成但不会出现在当前视图里。类似地，顶部 YAML 下载后的反馈只显示在 YAML tab 内；用户停在其他 tab 时会看不到反馈。

建议：生成大纲后执行 `setOutputTab('outline')`。下载/复制 YAML 后可以执行 `setOutputTab('yaml')`，或者把导出反馈提升到 output header / topbar 级别。

### 2. Outline tab 仍保留侧栏时代的高度限制

- 位置：`src/components/panels/SceneOutlinePanel.tsx:43`
- 严重度：Low

`SceneOutlinePanel` 内部列表仍使用 `max-h-[220px] overflow-auto`。在 2.5.3 中它和 YAML、diagnostics 垂直共处，这个限制合理；但 2.5.4 已经把 outline 放进独立 tab，右侧 tab 内容区本身可滚动，旧高度限制会让 outline 在有空间时仍被关在较小的盒子里。

建议：移除固定 `max-h-[220px]`，或让 `SceneOutlinePanel` 接收 compact/full mode。当前 output tab 应优先使用 full mode。

## Review 观察

### 1. Layout state 边界正确

`outputTab` 是 React UI state，没有进入 document、source、validation 或 serialization 层，符合 document / workspace boundary。

### 2. Output tabs 降低了右栏挤压

YAML、diagnostics 和 outline 不再同时垂直堆叠，右侧输出区更接近 `workbench-layout.md` 中的辅助 panel 结构，也为后续 Fountain-like preview tab 留出了入口。

### 3. 2.5.5 需要优化为 reading surface 方案

2.5.4 已经把中央编辑区变成主区域。下一步不应只是“美化 textarea”，而应建立 `ScenePage` + per-block renderer/editor 的雏形：由 `ScreenplayDocument` 的 metadata、角色表、source refs 和 `script` AST 共同呈现 Fountain-like 阅读面，仍保留结构化编辑。

## 验证记录

- `pnpm lint`：通过。
- `pnpm build`：通过。
- `pnpm format:check`：通过。
- `git diff --check main...HEAD`：通过。

当前没有 Playwright / Vitest 测试栈；布局和滚动行为仍建议人工运行 `pnpm dev` 检查桌面与窄屏视口。

## 本分支后续处理建议

合并前建议：

- ~~生成大纲后切到 `outline` tab。~~ 已在 `07e7133` 修复。
- ~~YAML 下载/复制反馈切到 `yaml` tab，或提升反馈层级。~~ 已在 `07e7133` 修复：`copyYaml` / `downloadYaml` 开头执行 `setOutputTab('yaml')`。
- ~~移除 outline list 的旧高度限制，或引入 compact/full mode。~~ 已在 `07e7133` 修复：移除 `max-h-[220px]`。

后续 PR 建议：

- 进入 Phase 2.5.5：实现由 `ScreenplayDocument` 支撑的 Fountain-like reading surface。
- 暂缓真实模型 API、Fountain parser 和复杂 WYSIWYG 编辑器。

## 可粘贴到 GitHub PR 的 Review Comment

```md
### PR Review: Phase 2.5.4

The structure is on target: `WorkbenchLayout` establishes left/center/right regions, the center editor now has clear priority, and outline/YAML/diagnostics are moved into output tabs without leaking layout state into `ScreenplayDocument`.

Two issues to address before merge:

1. ~~After generating an outline from the topbar, switch to the `outline` tab.~~ Fixed in 07e7133.
2. ~~`SceneOutlinePanel` still has `max-h-[220px]` from the old stacked output layout.~~ Fixed in 07e7133.

All findings resolved. Ready to merge.

Validation passed:

- `pnpm lint`
- `pnpm build`
- `pnpm format:check`
- `git diff --check main...HEAD`

For Phase 2.5.5, I recommend treating the next PR as a ScreenplayDocument-backed Fountain-like reading surface, not just textarea styling.
```
