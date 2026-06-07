# Phase 2.5: Workbench UI Foundation

> 最近更新：2026-06-06  
> 状态：基础切片已完成。本文保留 Phase 2.5 的设计边界、落地顺序和进入 Phase 3 的收口标准。

Phase 2.5 是插入阶段。它不改变月点的核心产品目标，也不扩大 submission 承诺；它解决 Phase 2 完成后暴露出的界面结构问题：早期三栏 UI 能证明功能存在，但不适合继续承载真实模型调用、Fountain-like preview、diagnostics、source coverage 和后续编辑能力。

这一步的目标是把月点从“功能堆在同一个页面里”整理成“可继续扩展的剧本工作台”。当前基础切片已经落地，下一阶段可以在这个工作台上承载真实模型调用和 demo 强化。

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
- 用户确认 scene outline 后，Writer 生成剧本初稿；验证通过后再通过 document operation 写入 `ScreenplayDocument.script`。
- YAML projection 可以复制或下载。

当时如果直接进入真实模型层，会让 UI 压力变得更大：

- 模型调用需要展示阶段状态、trace、失败恢复和 mock fallback。
- Fountain-like preview 需要和 YAML / diagnostics 共存。
- 语义块编辑区需要更像剧本阅读和编辑界面，而不是普通表单区。
- `App.tsx` 已经同时承担状态管理、工作流编排、布局和所有 panel 渲染，后续改动会变得脆。

因此 Phase 2.5 先整理 UI 地基，再接入真实模型。这个决策已经通过 #18 到 #26 的 UI PR 和 #27 的测试护栏 PR 落地。

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

实际落地顺序与规划一致：

1. 引入 Tailwind 和基础样式入口。
2. 抽出基础 UI primitives。
3. 拆分业务 panels。
4. 建立 WorkbenchLayout。
5. 让 output 进入 tabs。
6. 建立 screenplay reading surface。
7. 补齐基础语义编辑控件。
8. 做工业化手稿视觉收口。
9. 作为 phase 外 engineering track 接入前端测试护栏。

没有在本阶段引入完整拖拽停靠。当前 MVP 更需要稳定、可读、可演示的布局；resizable panels、layout persistence 和完整 dock engine 继续暂缓。

## 落地状态

- Phase 2.5.1 Tailwind foundation：已完成。
- Phase 2.5.2 UI primitives：已完成。
- Phase 2.5.3 Panel extraction：已完成。
- Phase 2.5.4 Workbench layout and output tabs：已完成。
- Phase 2.5.5 Screenplay reading surface：已完成。
- Phase 2.5.5b Basic semantic editor controls：已完成。
- Phase 2.5.6 Industrial manuscript UI polish：已完成。
- Engineering track Frontend test harness：已完成基础接入，不计入产品 phase，但作为后续 PR 的质量护栏。

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

### Phase 2.5.5b：Basic semantic editor controls

目标：把中央 reading surface 推进为可完成基础打磨流程的语义编辑器。

2.5.5 解决“看起来像剧本稿”；2.5.5b 解决“能完整编辑剧本草稿”。它仍然不做 Fountain 文本编辑，也不做完整专业编剧 IDE，而是补齐 MVP 需要的结构化编辑闭环。

建议内容：

- 新增 `docs/knowledge/interaction/screenplay-editor-ux.md`，定义 selected / focused 状态、block toolbar、add block menu、dialogue editing、scene metadata editing 和移动端原则。
- 支持新增指定类型 block：action / dialogue / narration / transition / note。
- 支持删除、上移、下移、可选复制 block。
- 支持编辑 dialogue 的 `characterId` 和 `parenthetical`。
- 支持编辑 scene title、synopsis、locationType、location、timeOfDay。
- 将新增、删除、移动、复制、更新 dialogue 字段和更新 scene metadata 的逻辑放进 `src/core/screenplay/operations.ts` 纯函数。
- 让 selected block / toolbar state 只存在于 UI state，不进入 `ScreenplayDocument`。

完成标准：

- 用户可以完成一次基础剧本打磨：改场景、改 block、加 block、删 block、移动 block、修正 dialogue 角色和括号提示。
- 所有编辑都回写 `ScreenplayDocument`，YAML preview 和 diagnostics 自动更新。
- 中央页面仍保持 Fountain-like reading surface，不退回卡片表单。
- 不引入 `contenteditable`、Fountain parser、拖拽排序、多选 block 或复杂 AI 局部重写工具条。

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

执行切片：

1. `ManuscriptSurface`：把中央 `ScenePage` 从普通 panel card 中解放出来，形成稳定稿纸版心、纸面背景和右侧工具 gutter。`ScriptEditorPanel` 可以保留轻量 header，但正文应像一张主稿纸。
2. Block selection：移除“整个 block 是 button”的混合命中区，改成 block row + 独立选择 handle。`textarea` / `select` / `input` 只负责编辑，选择态由 row 或 gutter 明确承载。
3. Block toolbar：采用右侧小气泡工具条，锚在 selected block 的右侧 gutter，不覆盖正文。第一版不引入 Floating UI，用 CSS 定位和响应式回退即可。
4. Manuscript tokens：抽出正文、字段、行距、focus、纸面、辅助区等稳定 class 组合，避免各 block editor 自己拼样式导致页面气质分裂。
5. Assistant panels：降低 source、outline、YAML、diagnostics 的视觉权重，让它们更像工具托盘、批注栏和生产记录，而不是同等主卡片。
6. Manual QA：检查桌面、窄屏、长文本、dialogue、transition、空 title / synopsis、toolbar 展开菜单和键盘 Tab 顺序。

Toolbar 规格：

- 默认位置：selected block 右侧 gutter，优先右对齐，不放在左侧正文起点。
- 主体大小：高度约 32px，icon button 28x28px，最多 4 个主动作；超过的动作进入菜单。
- 主动作：Move up、Move down、Add after、Delete。Duplicate 可以暂缓，或放进 more menu。
- Add after 菜单：宽度约 132-160px，列出 Action / Dialogue / Narration / Transition / Note；窄屏下改为 block 下方 inline menu。
- Floating UI：暂不引入。只有当出现 viewport 碰撞检测、自动翻转、portal layering、复杂嵌套菜单或 resizable panel 溢出问题时，再评估 `@floating-ui/react`。

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
- 中央编辑器支持基础语义编辑流程，而不只是 block 文本修改。
- 基础 UI primitives 支撑后续 PR。
- `App.tsx` 不再承载全部 panel 渲染细节。
- Tailwind 已接入并用于主要新 UI。
- 页面整体视觉服务工业化手稿风格，而不是普通 SaaS dashboard。
- Phase 2 的核心演示链路不退化。

当前 Phase 2.5 的基础完成标准已经满足。状态文档同步、`pnpm e2e` 本地运行路径确认，以及真实模型调用层 contract 的正式规划已经完成。

后续工作进入 Phase 3：真实模型调用层、structured prompt contract、fallback / repair、提交 demo 和质量收口。
