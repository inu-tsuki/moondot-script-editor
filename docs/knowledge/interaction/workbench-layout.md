# Workbench Layout

> 最近更新：2026-06-07
> 状态：Phase 3.5 正在把旧三栏收敛为 Editor + Converter 双栏工作台。本文记录布局契约和后续 dock 能力边界。

本文记录月点工作台布局的长期方向。早期三栏 UI 只是可运行骨架；Phase 2.5 已将它整理为以中央手稿编辑区为主的 lightweight workbench。Phase 3.5 的重点不是把工作台变成互斥页面，而是把它收敛为 `Editor` 与 `Converter` 两个协作区域，并让后续 dock 系统能复现和扩展这个默认布局。

## 核心结论

月点需要的是剧本工作台，不是固定三栏表单页，也不是强制 workspace switch 的 IDE 壳。

当前产品心智是双栏协作：

- `Editor`：已写入 `ScreenplayDocument.script.scenes` 的剧本文档。用户在这里编辑语义块、切换 scene，并从当前 document 导出 YAML。
- `Converter`：source 输入、偏好配置、Architect outline、Writer draft、model / artifact diagnostics 和 apply-to-document flow。它展示 pending artifacts，但不直接成为最终导出对象。

主阅读和编辑区域必须获得最大的视觉权重。`Editor` 是事实来源；`Converter` 是生成和审查辅助面板。Writer draft 只有在用户显式应用后，才进入 Editor document；YAML export 始终从当前 Editor document 生成。

## 推荐布局方向

当前默认布局：

```text
Top: app-level chrome / provider status / optional layout controls

Main workbench:
  EditorWorkspace:
    - scene navigation
    - semantic script editor
    - YAML export bar for current document

  ConverterWorkspace:
    - Source input / chapter status
    - Preferences
    - Scene Outline artifact
    - Writer Draft artifact
    - Model / artifact diagnostics
```

后续演进：

- Source / preferences / artifact diagnostics 可折叠或变成 dock panel。
- Semantic editor 占据最大可用面积。
- 场景列表可以成为窄 sidebar，scene 内容在主编辑区展开。
- 移动端可按 Editor / Converter 分段堆叠或抽屉化，但必须保留“正在编辑 document”与“正在审查 pending artifact”的区别。
- YAML preview 可以作为 Editor 的 document inspection / export detail，而不是 Converter pending artifact。

## Fountain-like 阅读排版

Fountain-like 不作为主输入格式，但 preview 和中央语义块编辑区都应该借鉴剧本阅读格式。Phase 2.5.5 已建立由 `ScreenplayDocument` 支撑的 Fountain-like reading surface：底层依赖 project metadata、source refs、character registry 和 `script: ScreenplayAst`，表层呈现为更像剧本稿的阅读面。

后续 UI 应做到：

- Scene heading 以清晰的场景行样式展示。
- Action 块像正文段落，而不是普通卡片表单。
- Dialogue 块突出角色名、对白和 parenthetical。
- Narration / voice-over 和 transition 有独立视觉层级。
- Note 不干扰最终阅读，可以轻量折叠或弱化。

主编辑仍然编辑 document / AST 字段；fountain-like 是阅读投影和视觉语言。当前不引入 Fountain parser、反解析、Monaco 或完整 WYSIWYG 剧本编辑器。

## 页面视觉风格

如果中央编辑区采用工业化手稿风格，整页也应配合这一模式。

整体气质应接近剧本审阅台、制片文档和批注工作台，而不是通用 SaaS dashboard。中央 `ScenePage` 是主稿纸；source、outline、Writer draft 和 diagnostics 是辅助托盘、索引或批注栏。YAML export 是当前主稿纸的投影动作，不是 pending artifact 的输出 tab。

设计原则：

- 页面背景使用安静的纸面 / 桌面色，避免营销式渐变和高饱和装饰。
- Panel 边框、tabs、button 和 badge 应更像工具控件，不像宣传卡片。
- Diagnostics 可以像批注或审稿标记；source refs 和 outline cards 可以像索引卡或生产记录。
- 辅助面板保持清晰可扫描，但视觉重量低于中央手稿。
- UI polish 不改变 `ScreenplayDocument`、工作流、导出格式或布局持久化边界。

## Dock 系统取舍

可以借鉴 `playground/kmd/apps/editor` 的 dock / workbench 思路，但不建议直接搬代码。Phase 3.5 之后，dock 的首要职责是把当前双栏布局建模为一个可复现的 preset：

```text
DockLayout preset="editor-with-converter"
  primary: EditorWorkspace
  right: ConverterWorkspace
```

这意味着 dock 是布局系统，不是产品信息架构本身。它可以让 Converter 折叠、改变宽度、进入 drawer，或在窄屏下变成 stacked mode；但不能把 pending outline / draft 伪装成已经写入 Editor 的 document。

可以借鉴：

- 可折叠 panel。
- 可切换 tab。
- 主编辑区优先。
- diagnostics / preview / source 作为辅助面板。
- 默认布局 preset、宽度状态和窄屏 drawer。

不建议直接搬：

- KMD 的完整 dock 系统。
- Vue/Pixi 相关编辑器壳。
- 与当前 React 工作台不匹配的状态管理和运行时结构。

Phase 2.5 的目标是 lightweight workbench：先做 panel 抽取、tabs、可折叠辅助区和主编辑区优先，再评估是否需要 resizable panels。Phase 3.5 允许引入轻量 dock model，但完整拖拽 dock、复杂 layout tree 和持久布局存档仍不进入当前 MVP。默认双栏是 canonical layout；dock 只把它做成可调、可折叠、可响应式。

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

## 已落地顺序和后续影响

Phase 2.5 UI PR 已按这个顺序落地：

1. 接入 Tailwind CSS。
2. 抽出基础 UI primitives。
3. 把 source、editor、output 拆成独立 React components。
4. 让 output 变成 tabbed panel：Scene Outline、YAML、Diagnostics，后续加入 Fountain-like。
5. 扩大语义编辑区，让 scene 内容成为主阅读区域。
6. 实现更像剧本排版的 block rendering。
7. 补齐基础语义编辑控件：add type menu、delete、move、dialogue 和 scene metadata 编辑。
8. 做一次工业化手稿风格的整页 UI polish。
9. 接入前端测试护栏。

后续进入 Phase 3 时，模型 trace、错误恢复、真实 API 状态和 mock fallback 应进入 Converter / dock 内部工具，而不是复活旧 Output tabs。Phase 3.5 已确认默认双栏仍是合理布局；下一步是让 dock 系统复现这套布局，并逐步补足 artifact trace、provider badge、diagnostics 分流和响应式折叠。
