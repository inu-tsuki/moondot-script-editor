# PR: Phase 3.5c Dock Foundation

> 最近更新：2026-06-07
> 对应分支：`feat/phase3.5c-dock-foundation`
> 对应 PR：GitHub #42
> Base PR：GitHub #41 `feat/phase3.5b-card-controls`
> 对应阶段：Phase 3.5c `DockLayout, SplitterBar, workspace wrappers`

## 结论

方向正确，但不建议直接合并。PR #42 把默认 Editor + Converter 双栏显式建模为
`DockLayout preset="editor-with-converter"`，并新增 `SplitterBar`、`EditorWorkspace`、
`ConverterWorkspace` 和 `ExportBar`，这符合 Phase 3.5 的布局收敛方向：dock 是复现并扩展
默认双栏的布局系统，不是把 Editor / Converter 改成互斥页面。

当前主要问题不是功能无法运行，而是 foundation 的职责还没有真正落稳：`App.tsx` 仍在直接拼装
所有 leaf panels；窄屏 stacked 模式也破坏了 `EditorWorkspace` 依赖的 flex column 语义。这两个问题
会影响后续 3.5 的 converter consolidation、editor stabilization 和 dock mode 扩展，应在同一 PR 内修复。

## Findings

### Active Medium：`App.tsx` 仍直接拼装 leaf panels，workspace composition 目标未真正落地

位置：`src/App.tsx:3-12`、`src/App.tsx:603-669`

PR 描述中写到 `App.tsx` render 层只组合 workspace 级组件，不再 import 每个 leaf panel。但当前
`App.tsx` 仍直接 import 并组装：

- `SceneNavigator`
- `ScriptEditorPanel`
- `SourcePanel`
- `AdaptationPreferencesPanel`
- `SceneOutlinePanel`
- `WriterDraftPanel`
- 多个 diagnostics / export 组件

`EditorWorkspace` 和 `ConverterWorkspace` 目前更像 layout wrapper，而不是各自 workspace 的
composition owner。这样虽然能减少一部分 CSS 布局耦合，但 `App.tsx` 仍然知道 converter workflow
内部的 panel 顺序和 editor 内部结构。后续如果要把 Converter 整理成 Input / Plan / Draft /
Validate / Apply，或把 scene navigation 收进 Editor header / rail，仍会继续修改 `App.tsx`。

建议：

- 让 `EditorWorkspace` 接收 editor 所需 domain props / callbacks，并在内部组合 scene navigation、
  script editor 和 export bar。
- 让 `ConverterWorkspace` 接收 converter workflow 所需 props / callbacks，并在内部组合 source、
  preferences、outline、writer draft 和 diagnostics。
- `App.tsx` 可以暂时继续持有 workflow state 和 handlers，但 render 层最多组合 `AppShell`、
  `DockLayout`、`EditorWorkspace`、`ConverterWorkspace`。

### Active Medium：窄屏 stacked 模式破坏 `EditorWorkspace` 的 flex 语义

位置：`src/components/shell/DockLayout.tsx:71-74`、`src/features/editor/EditorWorkspace.tsx:15-21`

宽屏模式下，left panel 的父容器是 `flex flex-col min-h-0`，因此 `EditorWorkspace` 内部的
`scriptEditor` wrapper 使用 `flex-1 min-h-0` 是有效的：

```tsx
<div className="flex flex-col min-h-0 min-w-0 gap-3 overflow-hidden">{left}</div>
```

窄屏模式下，`{left}` 被放进普通 wrapper：

```tsx
<div className="min-h-[360px] flex-shrink-0">{left}</div>
```

而 `EditorWorkspace` 返回的是 fragment：

```tsx
<>
  {sceneNavigator}
  <div className="flex-1 min-h-0">{scriptEditor}</div>
  {exportBar}
</>
```

这会导致 `scriptEditor` 的 `flex-1` 没有 flex column 上下文。窄屏下 editor、scene navigation 和
export bar 不再是稳定的垂直 workspace，滚动和高度分配可能退化；现有 mobile e2e 只检查 selected
block toolbar 位置，没有覆盖 export bar / editor workspace 高度关系。

建议：

- 让 narrow left wrapper 也成为 `flex flex-col min-h-0` 容器。
- 或者让 `EditorWorkspace` 自身渲染一个稳定的 `section` / `div` root，root 固定为
  `flex flex-col min-h-0 gap-3`。
- 补一个窄屏布局断言：Editor 区仍显示 scene navigation、editor surface 和 export bar，且 converter
  stacked 后不挤压 editor 主体。

### Follow-up Low：`SplitterBar` 缺少基础可访问性和触控支持

位置：`src/components/shell/SplitterBar.tsx:64-69`

`SplitterBar` 当前使用 `div` + `onMouseDown` 实现拖拽。作为可交互 layout control，它缺少：

- `role="separator"`
- `aria-orientation="vertical"`
- `tabIndex`
- 键盘 resize 行为
- pointer / touch 事件

这不一定阻塞当前 PR 的主流程，但它是新引入的 dock foundation 控件，最好在同 PR 或紧随其后的修复中补上。

## Accepted Decisions

- 默认双栏是 canonical layout：Editor 与 Converter 并排协作，dock 负责复现和扩展它。
- Editor 下的 export bar 是有意设计：导出的对象始终是当前 Editor document，而不是 Converter pending artifact。
- Phase 3.5 当前不引入完整 KMD dock tree、tabbed window、拖拽重排或 layout persistence。
- `DockLayout` 的 `preset="editor-with-converter"` 是正确方向；问题在于 composition 边界和窄屏 flex 语义还没收紧。

## Positive Notes

- `AppShell` 改为 children 模式，外层 chrome 与具体 layout 解耦。
- `DockLayout` 把默认双栏从隐式 CSS 变成显式 preset，为后续 dock / focus mode 留出入口。
- `SplitterBar` 的 ghost-line resize 没有把 layout state 写入 `ScreenplayDocument`，符合 document /
  workspace boundary。
- `RunBadge` artifact provider 语义已经修正：outline / draft badge 使用生成时 provider，而不是当前 provider。
- source diagnostics 分流已经修正，source 问题能落回 source 附近，而不是混入最终 document export diagnostics。

## Verification

本轮 review 已运行：

```sh
git diff --check main...HEAD
pnpm format:check
pnpm lint
pnpm build
pnpm test
pnpm e2e
```

结果：

- `git diff --check main...HEAD` clean。
- `pnpm format:check` passed。
- `pnpm lint` passed。
- `pnpm build` passed。
- `pnpm test` passed：15 files / 177 tests。
- `pnpm e2e` 在 sandbox 内 webServer 启动失败；以非沙箱权限复跑通过：4 tests。

## 后续动作

- 在 #42 内修复 `App.tsx` 仍拼 leaf panels 的 workspace composition 问题。
- 在 #42 内修复窄屏 stacked layout 的 Editor flex column 语义。
- 可在 #42 或后续小修中补 `SplitterBar` 的 separator ARIA、键盘 resize 和 pointer/touch 支持。
- 修复后复跑 `pnpm format:check`、`pnpm lint`、`pnpm build`、`pnpm test`、`pnpm e2e`。
