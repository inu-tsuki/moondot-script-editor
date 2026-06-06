# Phase 2.5: Workbench UI Foundation

> 最近更新：2026-06-06  
> 状态：规划启动，用于在真实模型调用层之前整理工作台 UI 地基。

Phase 2.5 是插入阶段。它不改变月点的核心产品目标，也不扩大 submission 承诺；它只解决 Phase 2 完成后已经暴露出的界面结构问题：当前三栏 UI 能证明功能存在，但不适合继续承载真实模型调用、Fountain-like preview、diagnostics、source coverage 和后续编辑能力。

这一步的目标是把月点从“功能堆在同一个页面里”整理成“可继续扩展的剧本工作台”。

```text
Phase 2: Adaptation Plan / Scene Outline 工作流
  -> Phase 2.5: Workbench UI Foundation
  -> Phase 3: 真实模型调用、导出体验和 demo 强化
```

## 为什么插入这里

Phase 2 已经让 MVP 主链路成立：

- 用户输入小说来源。
- 用户设置基础改编偏好。
- Architect 生成 scene outline。
- 用户确认后 Writer 写入 `ScreenplayDocument.script`。
- YAML projection 可以复制或下载。

继续直接进入真实模型层会让 UI 压力变得更大：

- 模型调用需要展示阶段状态、trace、失败恢复和 mock fallback。
- Fountain-like preview 需要和 YAML / diagnostics 共存。
- 语义块编辑区需要更像剧本阅读和编辑界面，而不是普通表单区。
- `App.tsx` 已经同时承担状态管理、工作流编排、布局和所有 panel 渲染，后续改动会变得脆。

因此 Phase 2.5 先整理 UI 地基，再接入真实模型。

## 核心决策

### 1. 引入 Tailwind CSS

Phase 1 曾暂缓 Tailwind，因为当时 UI 组件少，手写 CSS 更直观。现在重复的 button、panel、badge、tab、form field、scroll region 和 responsive layout 已经明显增多，引入 Tailwind 的条件成立。

Tailwind 在 Phase 2.5 中的职责：

- 统一 spacing、border、font、color 和 responsive class。
- 减少 `App.css` 中越来越分散的组件样式。
- 支撑快速调整 workbench layout。
- 让后续 UI PR 更容易只关注组件结构和交互。

Tailwind 不负责：

- 定义业务状态。
- 替代 React 组件边界。
- 引入整套重型设计系统。

### 2. 借鉴 KMD dock 信息架构，不直接搬完整 dock 代码

参考来源：`../kmd/apps/editor` 的 Vue editor shell、dock layout tree、window frame 和 panel registry。

可以借鉴：

- 主编辑区优先。
- source、outline、preview、YAML、diagnostics 作为辅助 panel。
- panel registry 心智：一个 view id 对应一个可渲染模块。
- output 区使用 tabs 承载多个 projection / diagnostics。
- 布局状态属于 UI state，不进入 `ScreenplayDocument`。

不直接搬：

- KMD 的 Vue / Pinia / Pixi 编辑器壳。
- 完整拖拽 dock engine。
- KMD 的 `splitpanes` 依赖和布局持久化实现。
- Monaco、TextMate 或 KMD runtime 相关 UI。

Phase 2.5 的目标不是做完整 IDE dock，而是做 lightweight workbench。

### 3. 先模块化，再增强布局能力

本阶段应按这个顺序推进：

1. 引入 Tailwind 和基础样式入口。
2. 抽出基础 UI primitives。
3. 拆分业务 panels。
4. 建立 WorkbenchLayout。
5. 让 output 进入 tabs。
6. 再评估是否需要 resizable panels。

不要一开始就做完整拖拽停靠。当前 MVP 更需要稳定、可读、可演示的布局。

## 推荐目标布局

Desktop：

```text
Topbar
  project actions / generation actions / export actions

Workbench
  Left rail or collapsible panel:
    Source input
    Chapter summary
    Adaptation preferences

  Main editor:
    Scene list / active scene
    Semantic screenplay blocks
    Fountain-like reading visual language

  Right output panel:
    Scene Outline tab
    YAML tab
    Diagnostics tab
    Future Fountain-like Preview tab
```

Mobile / narrow viewport：

```text
Topbar
  stacked actions

Sections
  Source
  Outline
  Editor
  Output
```

## PR 拆分

### Phase 2.5.1：Tailwind foundation

目标：把样式工具接入项目，但不做大规模 UI 重写。

建议内容：

- 安装并配置 Tailwind CSS。
- 建立 `src/index.css` 或等价全局样式入口。
- 保留必要的 reset / base 样式。
- 迁移少量通用 button / panel 样式，验证构建链路。

完成标准：

- `pnpm lint` / `pnpm build` / `pnpm format:check` 通过。
- 当前页面功能不退化。
- 不一次性重写所有界面。

### Phase 2.5.2：UI primitives

目标：把重复 UI 结构变成可组合组件。

建议内容：

- `Button`
- `PanelShell`
- `PanelHeader`
- `Badge`
- `Tabs`
- `Field`
- `Toolbar`

完成标准：

- `App.tsx` 中重复的按钮、panel header、badge 结构减少。
- 组件只表达 UI，不持有业务数据。
- 图标继续使用 `lucide-react`。

### Phase 2.5.3：Panel extraction

目标：拆开当前单体 `App.tsx`。

建议内容：

- `SourcePanel`
- `AdaptationPreferencesPanel`
- `SceneOutlinePanel`
- `ScriptEditorPanel`
- `YamlExportPanel`
- `DiagnosticsPanel`

完成标准：

- 主 `App.tsx` 保留顶层状态和工作流编排。
- 各 panel 通过 props 接收数据和事件。
- 行为与 Phase 2 完成状态一致。

### Phase 2.5.4：Workbench layout and output tabs

目标：重排工作台，给语义编辑区更大的阅读和编辑空间。

建议内容：

- 新增 `WorkbenchLayout`。
- Source / preferences 可以作为左侧辅助 panel。
- Scene outline、YAML、diagnostics 进入右侧 tabs。
- 中央 editor 成为最大区域。
- 窄屏按 source、outline、editor、output 顺序堆叠。

完成标准：

- 中央剧本编辑区明显大于左右辅助区。
- YAML 不再和 outline / diagnostics 一起垂直堆叠挤压。
- 不把 layout state 写入 `ScreenplayDocument`。

### Phase 2.5.5：Screenplay reading surface

目标：建立由 `ScreenplayDocument` 支撑的 Fountain-like reading surface，而不是只给 textarea 换皮。

这一步仍然不是完整 Fountain 编辑器。主输入模型继续是 `ScreenplayDocument`：project metadata、source refs、character registry 提供上下文，`script: ScreenplayAst` 提供场景和语义块结构。Fountain-like 是中央编辑区的阅读排版和交互语言。用户应该感觉自己在改剧本稿，但代码仍在稳定地编辑结构化 document / AST。

建议内容：

- 将 `ScriptEditorPanel` 内部拆成 `ScenePage` 和 per-block renderer/editor。
- 建立 `ActionBlockEditor`、`DialogueBlockEditor`、`NarrationBlockEditor`、`TransitionBlockEditor`、`NoteBlockEditor`。
- Scene heading 使用剧本场景行视觉，保留 scene title / synopsis 的轻量上下文。
- Action / narration 呈现为正文段落，而不是卡片表单。
- Dialogue 突出角色名、parenthetical 和对白文本。
- Transition 右对齐或独立成行。
- Note 弱化或旁注化，不打断阅读。
- 继续使用受控字段编辑 block 文本；可以让 textarea 无边框、自动高度、聚焦时显露编辑态。
- 保留增加语义块能力，但暂不扩展到完整 block 类型选择器之外的复杂编辑器行为。

完成标准：

- 用户能在 UI 中看出这是剧本，而不是 YAML 或普通表单。
- 仍可编辑块文本和添加语义块。
- Fountain-like 仍是 projection，不变成主输入格式。
- 不引入 `contenteditable`、Fountain parser、反解析、Monaco 或完整 WYSIWYG 剧本编辑器。
- 不改变 `ScreenplayDocument` / `ScriptBlock` 类型边界。

### Phase 2.5.6：Industrial manuscript UI polish

目标：让整页视觉服从中央工业化手稿风格，而不是只让编辑器主体像剧本。

这一步是 Phase 2.5 的小型 UI 收口，不改变 document 模型、生成工作流或输出格式。它的职责是统一页面外壳、辅助面板和控件语言，让 source、outline、YAML、diagnostics 都像同一个剧本制作工作台的一部分。

建议内容：

- 将页面背景、panel 边框、header、tabs 和按钮统一成克制的制片文档 / 审稿台气质。
- 让中央 `ScenePage` 更像主稿纸，左右辅助区更像工具托盘或批注栏。
- 减少装饰性卡片感，避免页面像普通 SaaS dashboard。
- 使用更稳定的中性色、纸面色、墨色和少量状态色；避免高饱和营销感。
- 让 diagnostics、source refs、outline cards 更像批注、索引和生产记录。
- 保持密度适中：能扫描，但不要压迫中央手稿的阅读节奏。

完成标准：

- 用户一眼能感到这是剧本审阅 / 改编工作台，而不是通用表单页。
- 中央手稿仍是第一视觉中心。
- 辅助面板视觉更安静，不和剧本正文竞争注意力。
- 不新增重型设计系统，不引入布局持久化或复杂主题系统。

## 非目标

Phase 2.5 暂不做：

- 真实模型 API 接入。
- 完整 agent graph runtime。
- 完整拖拽 dock 系统。
- 完整布局存档和 layout tree 持久化。
- Monaco 编辑器。
- 完整 Fountain-like 导出器。
- 多版本草稿 UI。

这些能力都可以在工作台地基稳定后继续推进。

## 阶段完成标准

Phase 2.5 完成时，月点应满足：

- 工作台布局以剧本编辑区为中心。
- Source、outline、YAML 和 diagnostics 是辅助面板。
- Output 使用 tabs 承载不同结果。
- 基础 UI primitives 支撑后续 PR。
- `App.tsx` 不再承载全部 panel 渲染细节。
- Tailwind 已接入并用于主要新 UI。
- 页面整体视觉服务工业化手稿风格，而不是普通 SaaS dashboard。
- Phase 2 的核心演示链路不退化。

完成 Phase 2.5 后，再进入 Phase 3：真实模型调用层、prompt contract 强化、提交 demo 和质量收口。
