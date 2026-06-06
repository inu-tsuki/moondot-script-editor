# Next Direction

> 最近更新：2026-06-06  
> 状态：Phase 2.5 启动规划，承接 Phase 2 完成后的工作台 UI 地基整理。

本文用于承接当前 roadmap 之后的下一阶段开发。它不替代 roadmap；它只回答“下一两个 PR 先做什么”。阶段级边界见 `roadmap/phase-2-5-workbench-ui-foundation.md`。

## 当前基线

主线已经具备：

- React + TypeScript + Vite 工程脚手架。
- `ScreenplayDocument` / `ScreenplayAst` 类型。
- runtime validation diagnostics。
- 小说 source ingestion 和章节解析。
- `AdaptationPreferences`、`AdaptationPlan`、`SceneCard` 和两阶段 trace。
- scene outline 预览与确认写入。
- 基础语义块编辑。
- YAML projection、复制和下载。
- Phase 2 相关 PR review 文档。

当前短板不在“功能是否存在”，而在“这些功能如何被组织成一个清晰的创作工作台”。

## 近期原则

下一步不要立刻跳到真实模型调用。

原因：

- 真实模型调用需要展示阶段状态、trace、错误恢复和 mock fallback。
- Fountain-like preview、YAML 和 diagnostics 会进一步挤压当前右侧输出区。
- 当前 `App.tsx` 同时承担状态、工作流、布局和所有 panel 渲染，后续会越来越难改。
- 当前三栏布局让中部剧本编辑区不够像主舞台。

更稳的方向是插入 Phase 2.5：先整理 UI foundation，再进入模型层。

推荐近期主线：

```text
Tailwind foundation
  -> UI primitives
  -> panel extraction
  -> WorkbenchLayout
  -> output tabs
  -> screenplay reading surface
```

## 推荐 PR 顺序

### PR A：Tailwind foundation

目标：引入 Tailwind CSS，建立可持续重写 UI 的样式地基。

建议内容：

- 安装并配置 Tailwind CSS。
- 建立全局样式入口。
- 保留必要 base/reset。
- 用 Tailwind 迁移少量通用按钮、panel 或 badge 样式，验证工具链。

完成标准：

- `pnpm lint` / `pnpm build` / `pnpm format:check` 通过。
- 当前工作流不退化。
- 不在同一个 PR 里重写全部 UI。

### PR B：UI primitives

目标：把重复 UI 结构抽成 React 组件。

建议内容：

- `Button`
- `PanelShell`
- `PanelHeader`
- `Badge`
- `Tabs`
- `Field`
- `Toolbar`

完成标准：

- `App.tsx` 中重复结构减少。
- primitives 不持有业务状态。
- 图标继续来自 `lucide-react`。

### PR C：Panel extraction

目标：拆开当前单体 `App.tsx`。

建议内容：

- `SourcePanel`
- `AdaptationPreferencesPanel`
- `SceneOutlinePanel`
- `ScriptEditorPanel`
- `YamlExportPanel`
- `DiagnosticsPanel`

完成标准：

- `App.tsx` 主要保留顶层状态、派生数据和工作流 handler。
- panel 通过 props 接收数据和事件。
- Phase 2 行为保持一致。

### PR D：Workbench layout and output tabs

目标：把页面从固定三栏表单整理成剧本工作台。

建议内容：

- 新增 `WorkbenchLayout`。
- 左侧放 source / preferences。
- 中央放 semantic script editor。
- 右侧 output tabs 承载 scene outline、YAML、diagnostics，预留 Fountain-like preview。
- 窄屏按 section 堆叠。

完成标准：

- 剧本编辑区成为主区域。
- YAML、outline 和 diagnostics 不再互相挤压。
- layout state 不进入 `ScreenplayDocument`。

### PR E：Screenplay reading surface

目标：让语义块视觉更像剧本。

建议内容：

- Scene heading 采用剧本场景行视觉。
- Action / narration 呈现为正文段落。
- Dialogue 突出角色名和对白层级。
- Note / transition 弱化或独立处理。

完成标准：

- 用户能看出主编辑区是剧本，而不是普通表单。
- 仍保持 AST semantic block editing。
- 不把 Fountain-like 变成主输入格式。

## 暂缓事项

以下事项有价值，但不应抢在 Phase 2.5 前面：

- 真实模型 API 接入。
- 完整 agent graph runtime。
- 完整拖拽 dock 系统。
- Monaco 编辑器。
- 完整 Fountain-like 导出器。
- 多版本草稿 UI。

原因：它们都需要更清楚的工作台结构来承载。

## 推荐下一步

下一步优先做 PR A：`Tailwind foundation`。

它会把我们刚刚做出的 UI 技术判断落进工程：

- Tailwind 成为主要新 UI 的样式工具。
- 现有手写 CSS 先保留，避免一次性大迁移。
- 后续 primitives / panels / layout PR 可以逐步减少 `App.css` 和 `App.tsx` 的压力。

这一步完成后，再做 UI primitives 会很自然。
