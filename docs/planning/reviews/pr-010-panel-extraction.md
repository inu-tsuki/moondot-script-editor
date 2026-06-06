# PR #10 Review: Panel Extraction

> 最近更新：2026-06-06  
> GitHub PR：[#21](https://github.com/inu-tsuki/moondot-script-editor/pull/21)  
> 对应分支：`feat/panel-extraction`（base = `main`）  
> 对应功能提交：
>
> - `1f07f85 feat: extract business panels from App.tsx`

## 审查规划

本次 review 以文档库中的当前指引作为规划依据，而不是只看代码是否能编译。

- `docs/README.md`：确认本 review 属于仍会影响开发节奏和后续动作的材料，应落在 `docs/planning/reviews/`。
- `docs/planning/development-workflow.md`：按短 PR、单一目的、可验证结果来审查，不把 panel extraction 和 layout 重构混成一笔。
- `docs/planning/roadmap/phase-2-5-workbench-ui-foundation.md`：用 Phase 2.5.3 的完成标准作为主 rubric：`App.tsx` 保留状态与工作流，panels 通过 props 接收数据和事件，Phase 2 行为不退化。
- `docs/knowledge/interaction/workbench-layout.md`：检查这次拆分是否为后续 WorkbenchLayout、output tabs 和剧本阅读界面留下结构。
- `docs/knowledge/architecture/document-workspace-boundary.md`：确认 UI state、layout state 和 diagnostics 没有被塞回 `ScreenplayDocument`。

## 审阅结论

PR #10（GitHub PR #21）方向正确：它把 `App.tsx` 中的业务渲染拆成 `SourcePanel`、`AdaptationPreferencesPanel`、`SceneOutlinePanel`、`ScriptEditorPanel`、`YamlExportPanel`、`DiagnosticsPanel` 和 `Topbar`，让 `App.tsx` 回到状态、派生数据和 workflow handler 的角色。

这基本满足 Phase 2.5.3 的目标，并为后续 `WorkbenchLayout` 和 output tabs 做了准备。但合并前建议处理一个布局回归风险。

## Findings

### 1. YAML preview 不再是 `side-tabs` 的独立 grid 行

- 位置：`src/App.tsx:303`、`src/components/panels/YamlExportPanel.tsx:54`、`src/App.css:69`
- 严重度：Medium

`side-tabs` 仍定义了 `grid-template-rows: auto minmax(0, 1fr) auto`，这显然假设输出面板有三个直接子项：controls、YAML preview、diagnostics。拆分后，`YamlExportPanel` 把 `<pre className="yaml-preview">` 包进了 `output-controls` 这个第一个直接子项里，而 `DiagnosticsPanel` 成了第二个直接子项。

结果是 `minmax(0, 1fr)` 的可伸展空间会分配给 diagnostics，而不是 YAML preview。视觉上 YAML preview 可能被压回 auto 高度，右侧输出区的主要阅读区域会退化。这和 `workbench-layout.md` 中“YAML / diagnostics 作为 output 区辅助面板，需要清晰承载 projection”的方向不一致。

建议：让 `YamlExportPanel` 只渲染导出状态和按钮，把 `<pre>` 留在 `App.tsx` 或一个专门的 `YamlPreviewPanel` 中，确保 YAML preview 仍是 `side-tabs` 的直接 grid child。也可以同步调整 `side-tabs` 布局，不再依赖 direct children 顺序。

## Review 观察

### 1. 组件边界基本清楚

各 panel 只通过 props 接收数据和事件，没有引入新的全局状态，也没有把 UI 状态写进 `ScreenplayDocument`。这符合 document / workspace boundary 的长期约束。

### 2. `App.tsx` 的职责收敛明显

`App.tsx` 保留了 source parsing、document validation、adaptation plan、YAML projection、copy/download 等 orchestration。业务 JSX 大幅减少，后续接入 WorkbenchLayout 时不需要再从单体页面里剥离大量表单细节。

### 3. 行为迁移大体等价

Source 文本更新、偏好变更清空当前 adaptation run、生成大纲、确认写入、编辑 block、复制和下载 YAML 等 handler 仍由原来的状态流驱动。没有看到 domain logic 被复制到 panel 内部。

### 4. 下一步不应扩大功能面

根据 Phase 2.5 路线，下一步更适合进入 WorkbenchLayout 和 output tabs，而不是接真实模型调用。当前 panel extraction 已经给 layout PR 留出了接口，但 output 区还没有完成 tabs 化。

## 验证记录

- `pnpm lint`：通过。
- `pnpm build`：通过。
- `pnpm format:check`：通过。
- `git diff --check main...HEAD`：通过。

## 本分支后续处理建议

合并前建议：

- ~~修复 YAML preview 的 grid child 层级，避免输出面板布局退化。~~ 已在 `dc9976f` 修复：`<pre>` 从 `YamlExportPanel` 移回 `App.tsx`，恢复为 `side-tabs` 的直接 grid child。

后续 PR 建议：

- 新增 `WorkbenchLayout`，让 semantic script editor 成为主区域。
- 将 Scene Outline、YAML 和 Diagnostics 放入 output tabs。
- 在不改变 AST 编辑模型的前提下，继续推进 screenplay reading surface。

## 可粘贴到 GitHub PR 的 Review Comment

```md
### PR Review & Planning-Based Notes

I reviewed this PR against the docs planning rubric, especially Phase 2.5.3 panel extraction, workbench layout direction, and the document/workspace boundary.

The extraction direction is good: `App.tsx` now mostly owns state, derived data, and workflow handlers, while feature panels receive data/events via props. No UI/layout state is being pushed into `ScreenplayDocument`, which keeps the architecture boundary clean.

One issue to fix before merge:

- ~~`YamlExportPanel` now renders the YAML `<pre>` inside `output-controls`, but `.side-tabs` still assumes controls, YAML preview, and diagnostics are direct grid children. The `1fr` row can end up assigned to diagnostics instead of the YAML preview, causing output layout regression. Consider keeping the YAML preview as a direct child of `side-tabs` or updating the layout contract.~~ Fixed in dc9976f.

No remaining issues. Ready to merge.

Validation passed:

- `pnpm lint`
- `pnpm build`
- `pnpm format:check`
- `git diff --check main...HEAD`

Next step after this PR should stay within Phase 2.5: WorkbenchLayout and output tabs, not model API expansion yet.
```
