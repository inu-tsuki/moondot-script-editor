# Screenplay Model Direction

> 最近更新：2026-06-05  
> 来源：`../brainstorm/brainstorm.md` 与 `../brainstorm/aichats.md`。  
> 状态：初步收敛，供 MVP 设计、document / AST 契约和 YAML 序列化 Schema 使用。

## 核心判断

本项目不能只做“小说文本进、YAML 文本出”的转换器。官方要求产物是“可编辑、可进一步打磨的剧本初稿”，因此核心应是可编辑的 `ScreenplayDocument` / 领域模型，其中 `script: ScreenplayAst` 承载脚本树。YAML 必须服务于 document 的提交、存储和校验，而不是成为作者需要手写维护的负担。

当前方向是：

- 内部用结构化 `ScreenplayDocument` 表示剧本项目，其中 `script: ScreenplayAst` 表达脚本树。
- 对外优先把 document 序列化为官方要求的 YAML。
- UI 提供可读、可编辑的剧本视图。
- YAML + Fountain、Ren'Py、Naninovel、Word 等作为后续导出目标或 demo 加分项，而不是当前 MVP 必需项。

## 为什么不是纯 YAML 编辑器

纯 YAML 满足“结构化”和“格式要求”，但对小说作者不友好：

- 作者难以直接在嵌套 YAML 中修改对白、动作和场景。
- 长章节生成后，YAML 的定位、折叠和局部编辑成本高。
- 评审强调交互流畅度，只有 YAML 文本框会显得像工程脚本工具。

因此 MVP 应同时提供：

- document / AST 驱动的结构化预览/编辑区：让作者看到章节、场景、角色、对白和动作。
- YAML 导出区：把 document 序列化为官方提交格式。
- Schema 文档：解释 document 的 YAML 投影字段为什么这样设计。

## 数据模型方向

`ScreenplayDocument` 初步采用三层结构：

- `Project Manifest`：标题、作者、语言、目标媒介、角色表、素材和生成元信息。
- `Chapter Adaptations`：从原小说章节到剧本段落的映射，保留来源章节，便于追溯。
- `Scenes and Blocks`：剧本核心结构。场景包含动作、对白、旁白、括号提示、转场、批注等块。

这个结构比直接 Fountain 更适合官方题目，因为官方明确要求 YAML Schema。它也比只用纯文本更适合 AI 生成，因为模型可以按 document / AST 字段生成、校验和局部修复。

## 导出策略

MVP 硬交付：

- `YAML`：主交付格式，完整表达剧本初稿。
- `Schema 文档`：解释 document 的 YAML 序列化字段、层级和设计原因。

MVP 可选加分：

- `Fountain-like preview`：在 UI 中模拟影视剧本阅读格式。
- `Ren'Py/Naninovel stub`：展示一个小片段如何从 document/YAML 编译到 VN 脚本。
- `YAML + Fountain export`：展示 document 可以被导出为混合文本，但不作为核心存储。

暂缓：

- 完整 Fountain 解析器。
- 完整 YAML + Fountain 双向读写。
- 完整 Word 导出。
- 完整 Ren'Py/Naninovel 工程导出。
- 多人协作、CRDT、LSP、Tree-sitter。
- 卡片墙和复杂节点图编辑器。

## 中文剧本适配原则

- 支持中文场景行，例如“内. 咖啡厅 - 夜”和“外. 街道 - 日”。
- 支持中文角色对白格式，例如“张三：（压低声音）别出声。”
- 支持动作、旁白和对白分离，避免把小说心理描写直接塞进对白。
- 字符串序列化为 YAML 时应对中文标点友好，必要时统一加引号。
- Schema 应允许国际影视格式和中式短剧格式共存，但 MVP 默认选择一种清晰格式展示。

## 风险边界

- 如果把目标扩成完整现代剧本编辑器，会超出 72 小时挑战的合理范围。
- 如果只做转换器，会弱化“可编辑初稿”和“交互流畅度”。
- 因此第一版应做“可编辑的 AI 改编工作台”：导入章节、生成剧本文档、可视化编辑、序列化导出 YAML。
