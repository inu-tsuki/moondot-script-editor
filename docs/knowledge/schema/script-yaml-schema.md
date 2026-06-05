# Script YAML Serialization Schema

> 最近更新：2026-06-05  
> 状态：草案 v0.1，用于 MVP 设计。实现落地后需同步校正字段。  
> 对应官方要求：定义剧本 YAML Schema，并说明 Schema 的设计原因。  
> 核心前提：本项目设计的是内部 `ScreenplayDocument`；YAML 是 document 的官方提交序列化表示。

## 设计目标

这个 Schema 定义“小说文本自动转换后的剧本文档”如何序列化为 YAML。提交演示需要覆盖 3 个以上章节，但 Schema 本身不限制只能处理 3+ 章节。它需要同时满足：

- 对评审：能证明输出是结构化剧本，而不是普通摘要。
- 对作者：能继续编辑、打磨、复制和导出。
- 对工程：能被校验、局部重生成和未来导出到其他格式。

## 与 Document / AST 的关系

`ScreenplayDocument` 是内部单一事实来源。它包含项目元信息、来源、角色表和 `script: ScreenplayAst`。YAML 是 document 的一个 projection：

```text
ScreenplayDocument
  -> ScreenplayYamlProjection
  -> YAML text
```

因此，UI 不应直接围绕 YAML 字符串编辑；AI 生成、结构化预览、字段编辑和导出器都应读写 document / AST。YAML 只负责保存、提交、校验和展示结构化结果。

## YAML 顶层结构

```yaml
schemaVersion: "0.1"
project:
  title: "示例剧本"
  language: "zh-CN"
  targetMedium: "screenplay"
  sourceType: "novel"
  generatedAt: "2026-06-05T20:00:00+08:00"
source:
  chapterCount: 3
  chapters:
    - id: "ch_001"
      title: "第一章"
      summary: "本章摘要"
characters:
  - id: "char_zhangsan"
    name: "张三"
    aliases: ["老张"]
    description: "人物小传"
script:
  structure:
    type: "linear"
    startSceneId: "scene_001"
  scenes:
    - id: "scene_001"
      sourceChapterIds: ["ch_001"]
      heading:
        locationType: "INT"
        location: "咖啡厅"
        timeOfDay: "夜"
      title: "咖啡厅重逢"
      synopsis: "张三和李四多年后重逢。"
      blocks:
        - id: "blk_001"
          type: "action"
          text: "雨声贴着玻璃滑落。张三坐在角落，手指反复摩挲杯沿。"
        - id: "blk_002"
          type: "dialogue"
          characterId: "char_zhangsan"
          parenthetical: "压低声音"
          text: "你终于来了。"
      nextSceneId: "scene_002"
```

## 字段定义

### `schemaVersion`

必填。Schema 版本号。当前草案为 `"0.1"`。

设计原因：作品挑战期间内部 document 和序列化字段会快速迭代，版本号可以避免 demo、README 和生成器之间互相误解。

### `project`

必填。剧本项目元信息。

- `title`：剧本标题。
- `language`：文本语言，MVP 默认 `"zh-CN"`。
- `targetMedium`：目标媒介，建议值为 `"screenplay"`、`"short_drama"`、`"visual_novel"`。
- `sourceType`：来源类型。当前 submission 使用 `"novel"`；长期可扩展为 `"inspiration_seed"`、`"outline"`、`"world_bible"` 等创作入口。
- `generatedAt`：生成时间，使用 ISO 8601 字符串。

设计原因：同一份 document 未来可能导出影视剧本、短剧或视觉小说脚本，目标媒介需要显式保存。

### `source`

必填。记录创作来源。当前 submission 记录小说来源章节；长期可以扩展为灵感种子、大纲或世界观设定的来源摘要。

- `chapterCount`：输入章节数。普通转换允许 `>= 1`；提交就绪检查应使用 `>= 3` 的样例。
- `chapters`：章节列表。
- `chapters[].id`：章节稳定 ID。
- `chapters[].title`：章节标题。
- `chapters[].summary`：章节摘要。

设计原因：官方要求作品具备处理 3 个章节以上小说的能力。保留章节映射可以证明生成结果来自多章节上下文，也方便作者回溯某场戏来自哪几章。`sourceType` 保留扩展空间，是为了让长期产品支持灵感生成和大纲扩写等入口，但当前 demo 必须使用小说来源。

### `characters`

必填，允许为空数组。记录角色资产。

- `id`：角色稳定 ID。
- `name`：显示名。
- `aliases`：别名或小说原文称呼。
- `description`：人物小传或改编备注。

设计原因：角色是剧本编辑和导出的核心资产。对白块通过 `characterId` 绑定角色，后续改名不需要全文替换。

### `script.structure`

必填。记录剧本组织方式。

- `type`：当前默认 `"linear"`，未来可扩展为 `"branching"`。
- `startSceneId`：起始场景 ID。

设计原因：影视和短剧通常是线性的，但视觉小说会有分支。先保留结构字段，可以避免后续导出 VN 时推倒重来。

### `script.scenes`

必填。场景数组。

- `id`：场景稳定 ID。
- `sourceChapterIds`：该场景关联的小说章节 ID。
- `heading`：场景行。
- `title`：人类可读的场景标题。
- `synopsis`：场景梗概。
- `blocks`：场景内的剧本块。
- `nextSceneId`：线性剧本中的下一个场景，可为空。

设计原因：场景是剧本的主要编辑单位，也适合 UI 做列表、预览和局部重新生成。

### `heading`

必填。场景行信息。

- `locationType`：建议值为 `"INT"`、`"EXT"`、`"INT_EXT"`，分别表示内景、外景、内外景。
- `location`：地点。
- `timeOfDay`：时间，例如 `"日"`、`"夜"`、`"黄昏"`。

设计原因：场景行是影视剧本最基础的工业结构。拆成字段后可以同时渲染为“内. 咖啡厅 - 夜”或 Fountain 风格。

### `blocks`

必填。剧本块数组。每个块都有：

- `id`：块稳定 ID。
- `type`：块类型。
- `text`：块文本。

当前支持的 `type`：

- `action`：动作或画面描写。
- `dialogue`：对白。
- `parenthetical`：括号提示。MVP 可直接放在 dialogue 的 `parenthetical` 字段里。
- `narration`：旁白或画外音。
- `transition`：转场。
- `note`：作者或制作批注，不一定导出到最终剧本。

`dialogue` 额外字段：

- `characterId`：关联角色 ID。
- `parenthetical`：对白前的神态或语气提示。

设计原因：块级结构让 AI 能单独生成、校验和修复对白或动作，也让 UI 能按剧本格式渲染。这里的 YAML 块结构应和 `ScreenplayAst` 块结构保持可映射，但不要求成为 UI 状态的原始存储。

## MVP 校验规则

- 普通转换：`source.chapterCount >= 1`。
- 普通转换：`source.chapters.length >= 1`。
- 提交就绪检查：当前演示样例应满足 `source.chapterCount >= 3` 且 `source.chapters.length >= 3`。
- `script.scenes.length >= 1`。
- 每个 scene 必须有 `id`、`heading` 和 `blocks`。
- 每个 block 必须有 `id`、`type` 和 `text`。
- `dialogue.characterId` 如果存在，必须能在 `characters` 中找到。
- 所有 ID 在同一作用域内必须唯一。

## 设计取舍

- 选择 YAML：符合官方要求，同时便于人工阅读、复制和 Git diff。
- 以 `ScreenplayDocument` 为核心，YAML 只是序列化表示：避免 UI 和生成链路被 YAML 模板绑死。
- 保留 AST 式块结构：比整段剧本文本更适合 AI 生成和局部编辑。
- 保留章节映射：对应官方对多章节长文本处理能力的要求，也让改编过程可追溯。
- 保留 `sourceType`：当前为 novel，未来可支持灵感生成、大纲扩写或世界观设定入口，而不改变内部 document 的核心结构。
- 暂不把 Fountain 作为主格式：Fountain 适合影视剧本文本，但不能完整表达来源章节、角色资产和未来分支。
- 暂不把 YAML + Fountain 作为核心存储：它是可选导出目标，不是当前 MVP 的单一事实来源。
- 暂不把 Ren'Py/Naninovel 字段做成必填：这些是后续导出目标，MVP 不应被游戏引擎字段拖重。
- 内部私有格式通过 importer / exporter 兼容标准：未来可以支持 Fountain 或 VN 脚本导入导出，但不让这些边界格式反向决定 document 结构。

## 开放问题

- `targetMedium` MVP 是否固定为 `"screenplay"`，还是允许用户选择短剧/VN？
- `sourceType` 是否需要在 v0.2 抽象为更完整的 source adapter 元数据？
- 场景块是否需要单独支持 `subtext` 或“潜台词”字段？
- 是否需要为每个 scene 保存 AI 生成置信度、模型名和 prompt 摘要？
- YAML 输出是否需要同时包含完整原文片段，还是只保留章节摘要以降低体积？
- document 与 YAML projection 是否允许字段不完全一致，例如 UI-only 字段不进入 YAML？
