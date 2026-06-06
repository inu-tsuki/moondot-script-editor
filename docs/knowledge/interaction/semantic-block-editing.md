# Semantic Block Editing

> 最近更新：2026-06-05  
> 状态：MVP 交互方向。

## 核心结论

MVP 主编辑体验应是 `ScreenplayDocument` 中的 AST 语义块编辑，而不是 fountain-like 文本编辑。

原因：

- 官方要求“可编辑、可进一步打磨的剧本初稿”，不是要求用户会写 Fountain。
- 我们的核心模型是 `ScreenplayDocument`，UI 应直接编辑其中的 scene / block / character 等语义数据。
- Fountain-like 更适合做阅读预览和可选导出，而不是第一版主输入法。
- 语义块 UI 更容易展示“AI 生成了结构化剧本”，也更容易做字段校验和局部重生成。

## MVP 编辑能力

第一版至少支持：

- 编辑项目标题和目标媒介。
- 查看章节列表和章节摘要。
- 查看场景列表。
- 编辑场景标题、地点、内外景、时间。
- 编辑 block 文本。
- 增加语义块。
- 删除语义块。
- 调整语义块顺序。
- 将 dialogue 绑定到已有角色。
- 新增角色并用于对白。

## 语义块类型

MVP 推荐支持：

- `action`：动作 / 画面描写。
- `dialogue`：对白。
- `narration`：旁白 / 画外音。
- `transition`：转场。
- `note`：作者批注或制作提示。

可以暂缓：

- `parenthetical` 独立块。MVP 可作为 dialogue 的字段。
- `choice` / `branch`。如果目标媒介选择 VN，先作为未来扩展。
- `shot` / `camera`。这会偏向分镜，不是小说转剧本第一版核心。

## “增加语义块”交互

用户在 scene 内点击新增按钮，选择块类型：

```text
Action | Dialogue | Narration | Transition | Note
```

不同块显示不同字段：

- Action：文本。
- Dialogue：角色、括号提示、对白文本。
- Narration：旁白文本、可选 voice type。
- Transition：转场类型或文本。
- Note：批注文本。

新增后立即写入 document，再由 preview 和 YAML projection 自动更新。

## Fountain-like 在 UI 中的位置

Fountain-like 不作为主编辑器。

它适合放在：

- 剧本预览面板。
- 导出预览 tab。
- demo 中展示“同一份 `ScreenplayDocument` 还能投影成剧本文本”的能力。

第一版不做：

- 在 Fountain-like 文本中编辑并反解析回 AST。
- 完整 Fountain parser。
- 复杂所见即所得剧本排版编辑器。

## 中央阅读面雏形

Phase 2.5.5 应把中心编辑区升级为由 `ScreenplayDocument` 支撑的 Fountain-like reading surface。它不是让用户直接编辑 Fountain 文本，而是在 document metadata、角色表、source refs 和语义块上覆盖更像剧本稿的排版语言。

推荐组件层级：

```text
ScriptEditorPanel
  -> ScenePage
    -> SceneHeadingEditor
    -> ScriptBlockEditor
      -> ActionBlockEditor
      -> DialogueBlockEditor
      -> NarrationBlockEditor
      -> TransitionBlockEditor
      -> NoteBlockEditor
```

编辑原则：

- 默认视觉像剧本阅读稿，聚焦某个块时再显露边框、工具条或编辑提示。
- 先使用受控 `textarea`，通过无边框、自动高度和类型化排版降低表单感。
- 暂不使用 `contenteditable`；它会过早引入 IME、selection、撤销栈和反解析复杂度。
- Dialogue 使用已有 `characterId`、`parenthetical` 和 `text` 分层展示。
- Transition 可以右对齐；Note 应弱化或旁注化；Action / narration 保持正文阅读节奏。
- 所有编辑仍通过 scene / block id 回写 `ScreenplayDocument`，不引入独立的 Fountain 文本状态。

完整基础编辑流程见 `screenplay-editor-ux.md`。阅读面只解决“像剧本稿”；真正可用的编辑器还需要 block toolbar、add block menu、delete / move、dialogue 角色与括号提示编辑，以及 scene metadata 编辑。

## 推荐界面结构

```text
Left: Novel / Chapters
Center: 月点 Semantic Block Editor
Right: Preview / YAML / Diagnostics
```

中心区域是主工作区：

- Scene card。
- Block list。
- Add block controls。
- Character selector。
- Regenerate scene / block action（可选）。

右侧是投影：

- Fountain-like preview。
- YAML projection。
- Diagnostics。

## 为什么不是纯表单

语义块编辑不等于枯燥表单。它应该更像一个剧本工作台：

- 每个 scene 是一个清晰段落。
- 每个 block 使用符合剧本语义的视觉样式。
- Dialogue 块突出角色和对白。
- Action 块像剧本文字。
- Note 块轻量，不打断阅读。

这样既能保留结构化工程优势，也能让作者感到自己在编辑剧本，而不是填 JSON/YAML。
