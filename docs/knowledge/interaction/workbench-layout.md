# Workbench Layout

> 最近更新：2026-06-06  
> 状态：交互设计方向，用于约束后续 UI PR。

本文记录月点工作台布局的长期方向。当前脚手架中的三栏 UI 只是可运行骨架，不是最终编辑体验。

## 核心结论

月点需要的是剧本工作台，不是固定三栏表单页。

MVP 可以先用左中右三栏证明产品结构：

- 左侧：source 输入和章节识别。
- 中间：语义块编辑。
- 右侧：YAML、diagnostics 和预览。

但功能完善时，主阅读和编辑区域必须获得更大的空间。中部区域应成为真正的剧本编辑舞台，而不是被左右两侧长期挤压。

## 推荐布局方向

基础阶段保留简单布局，但为后续演进留下结构：

```text
Top: project actions / generate / export

Main workbench:
  Primary: semantic script editor
  Secondary panels:
    - Source / Chapters
    - Fountain-like Preview
    - YAML Projection
    - Diagnostics
```

建议演进：

- Source panel 可折叠。
- YAML / Fountain-like / Diagnostics 放在 tabs 中。
- Semantic editor 占据最大可用面积。
- 场景列表可以成为窄 sidebar，scene 内容在主编辑区展开。
- 移动端按 source、editor、output 分段堆叠。

## Fountain-like 阅读排版

Fountain-like 不作为主输入格式，但 preview 和中央语义块编辑区都应该借鉴剧本阅读格式。Phase 2.5.5 的目标是建立由 `ScreenplayDocument` 支撑的 Fountain-like reading surface：底层依赖 project metadata、source refs、character registry 和 `script: ScreenplayAst`，表层呈现为更像剧本稿的阅读面。

后续 UI 应做到：

- Scene heading 以清晰的场景行样式展示。
- Action 块像正文段落，而不是普通卡片表单。
- Dialogue 块突出角色名、对白和 parenthetical。
- Narration / voice-over 和 transition 有独立视觉层级。
- Note 不干扰最终阅读，可以轻量折叠或弱化。

主编辑仍然编辑 document / AST 字段；fountain-like 是阅读投影和视觉语言。当前不引入 Fountain parser、反解析、Monaco 或完整 WYSIWYG 剧本编辑器。

## 页面视觉风格

如果中央编辑区采用工业化手稿风格，整页也应配合这一模式。

整体气质应接近剧本审阅台、制片文档和批注工作台，而不是通用 SaaS dashboard。中央 `ScenePage` 是主稿纸；source、outline、YAML 和 diagnostics 是辅助托盘、索引或批注栏。

设计原则：

- 页面背景使用安静的纸面 / 桌面色，避免营销式渐变和高饱和装饰。
- Panel 边框、tabs、button 和 badge 应更像工具控件，不像宣传卡片。
- Diagnostics 可以像批注或审稿标记；source refs 和 outline cards 可以像索引卡或生产记录。
- 辅助面板保持清晰可扫描，但视觉重量低于中央手稿。
- UI polish 不改变 `ScreenplayDocument`、工作流、导出格式或布局持久化边界。

## Dock 系统取舍

可以借鉴 `playground/kmd/apps/editor` 的 dock / workbench 思路，但不建议直接搬代码。

可以借鉴：

- 可折叠 panel。
- 可切换 tab。
- 主编辑区优先。
- diagnostics / preview / source 作为辅助面板。

不建议直接搬：

- KMD 的完整 dock 系统。
- Vue/Pixi 相关编辑器壳。
- 与当前 React 工作台不匹配的状态管理和运行时结构。

Phase 2.5 的目标是 lightweight workbench：先做 panel 抽取、tabs、可折叠辅助区和主编辑区优先，再评估是否需要 resizable panels。完整拖拽 dock、布局存档和 KMD 式 layout tree 不进入当前 MVP。

## 样式工具取舍

Phase 2.5 决定引入 Tailwind CSS。

此前 Phase 1 暂缓 Tailwind，理由是：

- 第一批 UI 文件数量少，手写 CSS 更直观。
- 当前更重要的是定义布局语义、AST 编辑方式和 projection 关系。
- UnoCSS / Tailwind 会增加 class 命名和配置成本，容易让 PR 从“脚手架”膨胀成“样式系统选型”。

现在引入条件已经成立：

- 组件数量增长，重复 spacing、button、panel、tab、badge 样式明显增多。
- 需要快速迭代复杂响应式布局。
- 已经有稳定的 design token 和组件层级。

Tailwind 优于 UnoCSS 的原因：

- Tailwind：生态稳定，评审和合作者更容易理解。
- UnoCSS：更轻、更灵活，但配置表达更偏工程化。

在当前项目节奏下，Tailwind 更适合作为 Phase 2.5 的样式工具。现有手写 CSS 不需要一次性删除；后续 UI PR 可以逐步把重复样式迁移到 Tailwind class 和小型 UI primitives。

## 对后续 PR 的影响

Phase 2.5 UI PR 应按这个顺序推进：

1. 接入 Tailwind CSS。
2. 抽出基础 UI primitives。
3. 把 source、editor、output 拆成独立 React components。
4. 让 output 变成 tabbed panel：Scene Outline、YAML、Diagnostics，后续加入 Fountain-like。
5. 扩大语义编辑区，让 scene 内容成为主阅读区域。
6. 实现更像剧本排版的 block rendering。
7. 补齐基础语义编辑控件：add type menu、delete、move、dialogue 和 scene metadata 编辑。
8. 做一次工业化手稿风格的整页 UI polish。
9. 再评估是否需要 resizable panel。
