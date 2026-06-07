# PR: Phase 3.5a Workspace Shell and Dock Foundation

> 最近更新：2026-06-07
> 对应分支：`feat/phase3.5a-shell-and-dock`
> 对应 PR：GitHub #40
> 对应阶段：Phase 3.5a `Workspace shell and dock foundation`

## 结论

方向正确，但当前更像“Editor / Converter 目录边界 + 默认双栏 shell”的第一刀，还不是完整 dock foundation。

PR #40 已经移除旧 `WorkbenchLayout`，把 Topbar 降级为 app-level provider 状态，把 editor 组件迁到 `src/features/editor/`，把 source / preferences / outline / diagnostics / YAML 相关组件迁到 `src/features/converter/`。这解决了旧三栏中 Topbar 混合 workflow command、output tabs 同层放置不相关对象的问题。

需要校正的产品判断是：默认双栏不是问题。当前 `Editor` 与 `Converter` 并排协作符合产品意图；后续 dock 系统应该把这套双栏变成可配置 preset，而不是强迫用户在两个 workspace 之间 switch。`Editor` 是已写入稿件与最终导出的事实来源，`Converter` 是生成、审查和应用 typed artifacts 的流程面板。

## Findings

### Active Medium：source diagnostics 被分流到 Converter 末尾

位置：`src/App.tsx:279-297`、`src/core/source-ingestion/parseNovelChapters.ts:116-124`、`src/core/validation/validateScreenplayDocument.ts:142-172`

PR #40 新增了按阶段分流 diagnostics：

```ts
const sourceDiagnostics = displayedDiagnostics.filter(
  (d) => d.path === 'sourceText' || d.path?.startsWith('ch_'),
);
```

但当前解析器和 document validator 实际产生的 source path 是：

- `sourceText`
- `source.chapters`
- `source.chapters[0].text`
- `source.chapters[0].title`

因此章节数不足、章节正文为空等 source 问题会落入 `documentExportDiagnostics`，显示在 Converter 流程末尾，而不是 Source 输入区附近。用户正在修 source text 时，会被迫到下方找错误提示，和“inline display between converter cards”的目标不一致。

建议：

- source 分流覆盖 `path === 'source.chapters'` 和 `path.startsWith('source.chapters')`。
- 如果未来 source adapter 不止 novel，可以抽成 `getDiagnosticStage(diagnostic)`，不要靠字符串前缀散落在 `App.tsx`。
- 补一个轻量测试或 e2e：输入空章节正文时，diagnostic 出现在 Source card 下方。

### Follow-up Medium：shell 还没有形成可复用 dock / workspace composition 层

位置：`src/components/shell/AppShell.tsx:5-12`、`src/App.tsx:600-680`

`AppShell` 当前只接收 `center` / `right` 两个 ReactNode，`App.tsx` 仍直接拼装 `SceneNavigator`、`ScriptEditorPanel`、`SourcePanel`、`AdaptationPreferencesPanel`、`SceneOutlinePanel` 和 diagnostics。作为过渡是可以接受的，但它还没有达到 3.5a 原本设定的“render 层只组合 shell / workspace 级组件”。

这个 follow-up 不要求把默认双栏改成 workspace switch。相反，下一步 dock 应该显式把当前布局建模为默认 preset：

```text
AppShell
  DockLayout preset="editor-with-converter"
    EditorWorkspace
    ConverterWorkspace
```

这样后续才可以安全加入 resize、collapse、drawer 或窄屏 stacked mode，而不让 `App.tsx` 继续承担布局编排。

## Accepted Decisions

- 默认双栏协作是有意设计，不作为 review finding。
- Dock 系统的目标是复现并扩展当前双栏布局，而不是否定当前布局。
- `Editor` 是当前 `ScreenplayDocument` 的编辑和导出归属；`Converter` 只通过 explicit apply handler 把 `WriterScenePatch` 写回 document。

## Positive Notes

- Topbar 已移除大纲、剧本、应用和导出等 workflow command，只保留品牌和 provider 状态。
- 旧 `components/panels` 平铺结构开始迁移到 `features/editor` 与 `features/converter`。
- `SceneNavigator` 从 `App.tsx` 内联 JSX 抽成组件，为 3.5c 收进 Editor header / rail 留了入口。
- Source、preferences、outline、diagnostics 不再通过旧 Output tabs 组织。

## Verification

本轮 stacked review 已运行：

```sh
git diff --check main...feat/phase3.5a-shell-and-dock
pnpm format:check
pnpm lint
pnpm build
pnpm test
pnpm e2e
```

结果：

- `git diff --check main...feat/phase3.5a-shell-and-dock` clean。
- `pnpm format:check` passed。
- `pnpm lint` passed。
- `pnpm build` passed。
- `pnpm test` passed：14 files / 166 tests。
- `pnpm e2e` 在 sandbox 内 webServer 启动失败；以非沙箱权限复跑通过：4 tests。

## 后续动作

- 本 PR 或紧随其后的同阶段修复 source diagnostics 分流。
- 规划文档应明确：默认双栏是 canonical layout，dock 需要把它做成 preset。
- 3.5 后续应补 `EditorWorkspace` / `ConverterWorkspace` / `DockLayout` wrapper，让 `App.tsx` 不再直接拼 leaf panels。
