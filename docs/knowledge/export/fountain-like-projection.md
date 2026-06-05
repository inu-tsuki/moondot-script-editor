# Fountain-like Projection

> 最近更新：2026-06-05  
> 状态：草案 v0.1。  
> 参考：Fountain 官方语法文档 `https://fountain.io/syntax/`。

## Fountain 官方语法要点

Fountain 是面向剧本的纯文本标记语言。官方文档强调：

- 普通段落默认是 Action。
- 全大写且上下文符合规则的行会被解释为 Character。
- `@` 可以强制 Character。
- `!` 可以强制 Action。
- `^` 可表示双人同时对白。
- 括号行用于 parenthetical。
- `[[...]]` 是 note。
- `/* ... */` 是 boneyard。
- `#` section 和 `=` synopsis 是大纲辅助。
- 标题页使用 `key: value`。
- `===` 是分页。
- 强调语法接近 Markdown，但 `_..._` 表示下划线。

这些规则说明了一个关键点：Fountain 的强项是“让纯文本被解释成剧本格式”，不是承载完整 `ScreenplayDocument`。

## 我们的 Fountain-like 是什么

`fountain-like` 是 `ScreenplayDocument -> readable screenplay text` 的导出投影。第一版主要读取其中的 `script: ScreenplayAst`，同时使用 `project`、`source` 和 `characters` 辅助生成标题页、章节标记和角色名。

它的目标：

- 让评委和作者快速看懂生成结果像剧本。
- 为后续 Fountain 导出做形态预演。
- 给 UI 的剧本预览提供排版依据。

它不是：

- document / AST 的核心存储。
- YAML 的替代物。
- 第一版需要完整兼容 Fountain parser 的输入格式。

## Fountain-like 应包含什么

### 标题页 / 项目信息

从 document 的 `project` 导出：

```text
Title:
    示例剧本
Author:
    AI Novel to Script Tool
Draft date:
    2026-06-05
```

### 章节 / 大纲标记

从 source chapters 或 scene grouping 导出：

```text
# 第一章
= 本章改编为咖啡厅重逢和雨夜追问两场戏。
```

这些不进入最终剧本正文，但帮助作者导航。

### 场景行

英文/标准倾向：

```text
INT. 咖啡厅 - 夜
```

中文本地化倾向：

```text
.内. 咖啡厅 - 夜
```

`.` 前缀用于强制 scene heading，避免中文场景行无法被标准 Fountain parser 识别。MVP 预览可以显示为“内. 咖啡厅 - 夜”，导出时可选择标准映射或中文本地化映射。

### 动作 / 画面描写

来自 `action` block：

```text
雨声贴着玻璃滑落。张三坐在角落，手指反复摩挲杯沿。
```

如果动作行全大写或可能被误判为角色名，导出时可用 `!` 强制 action。

### 角色与对白

英文/标准倾向：

```text
ZHANG SAN
You finally came.
```

中文本地化倾向：

```text
@张三
你终于来了。
```

`@` 用于强制 character，适合中文姓名和非罗马字符。

### 括号提示

来自 dialogue block 的 `parenthetical`：

```text
@张三
（压低声音）
你终于来了。
```

MVP 预览可以保留中文全角括号；后续标准 Fountain 导出可选择转换为半角括号。

### 旁白 / 画外音

来自 `narration` block：

```text
NARRATOR (V.O.)
雨还没有停。
```

中文预览可以显示为：

```text
@旁白
雨还没有停。
```

### 转场

来自 `transition` block：

```text
CUT TO:
```

中文可预览为“切至：”，但如果导出到标准 Fountain，建议保留英文转场或建立映射表。

### 批注

来自 `note` block：

```text
[[这里需要强化张三的动机。]]
```

批注默认不进入最终剧本文本，但可进入 fountain-like 预览。

### 可选：分页和居中文本

分页：

```text
===
```

居中文本：

```text
>第一幕结束<
```

MVP 不必优先实现，但可以作为导出器能力。

## MVP 不做什么

- 不解析用户手写 Fountain 回 document。
- 不实现完整 Fountain 标准兼容。
- 不支持复杂双人同时对白排版。
- 不支持 boneyard 编辑语义。
- 不把 Fountain-like 作为官方提交格式。

未来若实现标准 Fountain importer，应把 Fountain 文本解析为 `ScreenplayAst`，再由 importer 补齐 document 层的稳定 ID、角色表和可选来源信息。Fountain importer 不应要求内部 document 退化成纯文本。

## 实现目标

第一版实现：

```text
exportDocumentToFountainLike(document, options) -> string
```

`options` 至少包含：

- `locale`: `"zh-CN"` 或 `"en-US"`。
- `sceneHeadingStyle`: `"standard"` 或 `"localized"`。
- `forceChineseCharacterCue`: boolean。
