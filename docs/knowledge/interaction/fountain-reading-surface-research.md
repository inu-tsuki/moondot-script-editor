# Fountain 阅读面调研笔记

> 最近更新：2026-06-06
> 状态：调研笔记，已为 Phase 2.5.5 Screenplay Reading Surface 的排版落地提供参考。
> 参考：Fountain 官方语法文档 `https://fountain.io/syntax/`、2001: A Space Odyssey (IMSDB)。

## 调研目的

Phase 2.5.5 已把中央编辑区从卡片表单升级为剧本阅读面。Fountain 的核心哲学——"make it look like a screenplay"——恰好表达了同样的设计意图：排版即语义。

本文记录 Fountain 语法规则与 `ScriptBlock` 类型的映射关系，以及从中提取的排版设计决策。

## Fountain 语法 ←→ ScriptBlock 映射

### Scene Heading（→ SceneHeading）

```
Fountain:
  INT/EXT/INT./EXT/I/E 开头，前后各有一个空行
  . 前缀可以强制 scene heading
  可选附加 Scene Number：#1A#

我们的模型:
  SceneHeading { locationType, location, timeOfDay }
  formatSceneHeading() → "INT. LOCATION - TIME"
```

**排版决策**：粗体、全大写风格、与前后内容有明确间距。保留 scene title/synopsis 作为轻量上下文。

### Action（→ ActionBlock）

```
Fountain:
  不匹配其他规则的段落默认为 Action
  ! 前缀可以强制 Action
  保留空行和缩进

我们的模型:
  ActionBlock { type: 'action', text }
```

**排版决策**：全宽 prose 段落（`text-[15px] leading-relaxed`）。无边线、无 badge。这是阅读面的默认段落样式——读者不应该"注意到" action 块的存在，它应该像正文一样流畅。

### Character + Dialogue（→ DialogueBlock）

```
Fountain:
  Character: 全大写行，前后有空行规则
  Dialogue: 紧接 Character 或 Parenthetical
  @ 前缀可以强制 Character（保留大小写）
  Parenthetical: (括号包裹)

我们的模型:
  DialogueBlock { type: 'dialogue', characterId, parenthetical?, text }
```

**排版决策**：
- Character name：居中、粗体、大写（`text-center font-extrabold uppercase`）
- Parenthetical：居中、括号包裹、较淡色（`text-[13px] italic text-[#7b776b]`）
- Dialogue text：缩进至 ~65% 宽度居中（`max-w-[65%] mx-auto`）
- 参考 2001 剧本中角色名居中缩进约 40%、对白更窄的工业排版

### Narration（→ NarrationBlock）

```
Fountain:
  无原生 Narration 类型；通常作为 Action 或 Character + V.O. extension 处理

我们的模型:
  NarrationBlock { type: 'narration', voice?, text }
  voice: 'voice_over' → V.O. / 'off_screen' → O.S. / 'narrator' → NARRATOR
```

**排版决策**：prose 段落 + 左侧轻量 voice type badge。voice type 标签帮助区分旁白与普通 action，但不应抢夺阅读注意力。

### Transition（→ TransitionBlock）

```
Fountain:
  大写 + TO: 结尾，前后空行
  > 前缀可以强制 transition

我们的模型:
  TransitionBlock { type: 'transition', text }
```

**排版决策**：右对齐（`text-right`）、大写风格（`uppercase`）、比正文紧凑。参考工业剧本中 `CUT TO:` 的右对齐惯例。

### Note（→ NoteBlock）

```
Fountain:
  [[方括号包裹]] — 默认不进入最终输出
  /* boneyard */ — 注释块

我们的模型:
  NoteBlock { type: 'note', text }
```

**排版决策**：左侧细线（`border-l-2 border-[#cfc7ba]`）、淡化斜体（`text-xs italic text-[#8a8a8a]`）、旁注感。Note 是工作台辅助信息，不应打断阅读流。

## Emphasis 富文本：已知限制

Fountain 支持行内 emphasis：

```
*italic*  _underline_  **bold**  ***bold italic***
```

我们的 `<textarea>` 无法渲染行内富文本。在 Phase 2.5.5 中这是有意取舍：

- **保留的**：纯文本编辑的简单性和可靠性
- **放弃的**：行内 emphasis 预览
- **未来方向**：如果引入富文本渲染层（非 `contenteditable`），可以用 overlay 展示 emphasis 而不改变编辑模型

## 与现有文档的关系

- `docs/knowledge/export/fountain-like-projection.md` — 覆盖 Fountain-like 作为导出投影的格式约定
- 本文 — 覆盖 Fountain 排版规则如何影响阅读面的 block editor 视觉设计
- `docs/knowledge/interaction/semantic-block-editing.md` — 覆盖 AST 语义块编辑的交互原则

本文不重复导出格式讨论，也不定义新的 block 类型或编辑器行为。
