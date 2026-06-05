# Semantic Block Editing

> 最近更新：2026-06-05  
> 状态：MVP 交互方向。

## 核心结论

MVP 主编辑体验应是 AST 语义块编辑，而不是 fountain-like 文本编辑。

原因：

- 官方要求“可编辑、可进一步打磨的剧本初稿”，不是要求用户会写 Fountain。
- 我们的核心模型是 `ScreenplayAst`，UI 应直接编辑 AST 的 scene / block / character。
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

新增后立即写入 AST，再由 preview 和 YAML projection 自动更新。

## Fountain-like 在 UI 中的位置

Fountain-like 不作为主编辑器。

它适合放在：

- 剧本预览面板。
- 导出预览 tab。
- demo 中展示“AST 还能投影成剧本文本”的能力。

第一版不做：

- 在 Fountain-like 文本中编辑并反解析回 AST。
- 完整 Fountain parser。
- 复杂所见即所得剧本排版编辑器。

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
