# Brainstorm Submission Fit Review

> 最近更新：2026-06-05  
> 输入材料：`../knowledge/brainstorm/brainstorm.md`、`../knowledge/brainstorm/aichats.md`。  
> 对照材料：`../knowledge/requirements/xengineer-ai-novel-to-script.md`、`../knowledge/requirements/submission-rules.md`。

## 结论

当前 brainstorm 方向符合第三批次第三题提交需求，但需要控制 MVP 边界。

月点最适合 72 小时挑战的定位是：

> 一个以导入和转换为入口的剧本编辑器：能处理 3 个以上章节的小说长文本，生成结构化剧本文档，提供结构化预览和语义块编辑，并把 document 序列化为 YAML 剧本；同时附带 YAML Schema 文档解释设计原因。

不建议把第一版定位成完整现代剧本编辑器或完整 Story IDE。这个方向有长期价值，但会稀释官方题目的核心：小说转剧本、YAML 输出、Schema 文档。也不建议把第一版理解成“YAML 模板生成器”，因为 YAML 只是 `ScreenplayDocument` 的提交表示。

长期愿景里，月点的入口不应只有小说改编；`ai-visual-novel-engine` 的灵感生成模式可以启发后续产品方向。但 submission 阶段不能把“灵感生成”作为主交付，因为官方题目考验的是把多章节小说文本转换成剧本的工程能力。

## 符合需求的部分

- 官方要求“3 个章节以上小说文本”。brainstorm 中的分章结构和章节映射能直接支撑这一点。
- 官方要求“结构化剧本（YAML 格式）”。`ScreenplayDocument` / Scene / Block 模型可以自然序列化为 YAML。
- 官方要求“可编辑、可进一步打磨”。brainstorm 明确指出不能让作者盯着 YAML 写作，需要编辑界面。
- 官方要求“Schema 文档说明设计原因”。brainstorm 已经形成 document / AST 核心模型和 YAML/Fountain/VN 等导出关系，可转化为 Schema 设计理由。
- 评审强调完整度、交互和创新。结构化预览、角色表、场景块和导出扩展能提升作品表达力。

## 容易跑题的部分

- 完整所见即所得剧本编辑器。
- LSP、Tree-sitter、CRDT、多人协作。
- 完整 Fountain 解析/导出。
- 完整 Ren'Py / Naninovel / Word 导出。
- 卡片墙、节点图、资产管理大系统。

这些可以作为 README 和 demo 中的未来扩展方向，但不应成为 MVP 的交付核心。

## MVP 收口建议

第一版只做四条主链路：

- 导入：允许粘贴或上传小说文本；普通试跑可少于 3 章，提交演示必须覆盖 3 个以上章节。
- 解析：识别章节边界，生成章节摘要和角色候选。
- 改编：生成场景列表、动作、对白、旁白和转场。
- 输出：展示 document / AST 驱动的结构化编辑视图，并导出符合 `script-yaml-schema.md` 的 YAML。

工程命名可以吸收长期愿景：使用 source / input / adapter 这类中性概念，当前只实现 `sourceType: "novel"`。这样既贴合题目，也为未来 inspiration seed、outline 或 world bible 入口保留空间。

可选加分：

- 在 UI 中提供 Fountain-like 剧本预览。
- 提供一个“导出 Ren'Py 片段”的小 demo，证明架构扩展性。
- 提供 YAML 校验状态，展示 Schema 不是摆设。
- 提供一个小型 document inspection panel，证明 YAML 来自结构化模型而非文本拼接。

## MVP 决策记录

### 目标剧本类型

MVP 默认短剧/影视线性剧本，视觉小说作为可选导出方向。

理由：

- 影视/短剧最贴近“剧本”的传统理解。
- 短剧更适合中文网文改编和 72 小时 demo。
- 视觉小说可以展示架构扩展性，但不作为第一版主目标。

### 编辑能力

MVP 至少提供结构化预览和基础字段编辑，支持修改场景标题、动作、对白和角色名。进一步支持增加语义块时，优先覆盖 action、dialogue、narration、transition、note。

理由：

- 官方要求产物可编辑、可进一步打磨。
- 只展示 YAML 不能充分体现编辑体验。
- 语义块编辑能直接证明 AST 不是摆设。

### AI 生成链路

MVP 采用真实模型调用加 mock fallback。demo 时优先保证可复现，README 中说明外部模型依赖。

理由：

- 真实模型调用体现 AI 改编能力。
- mock fallback 可以降低网络、额度和模型波动带来的 demo 风险。
- 结构化输出和校验层可以暴露工程能力，而不是只展示 prompt。
- 可借鉴 `ai-visual-novel-engine` 的灵感生成/分阶段生成思路，但当前 demo 仍从小说文本进入。

### 输出产物

YAML 是必交产物；结构化预览是产品体验；Fountain-like 或 Ren'Py 片段只做小范围扩展证明。

理由：

- 官方明确要求结构化剧本 YAML 和 Schema 文档。
- 剧本阅读预览能提升 demo 表达力。
- 额外导出不能稀释主链路。

### 核心模型

核心模型是 `ScreenplayDocument`，其中 `script: ScreenplayAst` 是脚本树。YAML 是官方要求的序列化产物，`YAML + Fountain` 也是可选导出方案，不是核心存储格式。

### 旧项目积累

brainstorm 提到 `ai-novel-engine` 的积累。提交规范要求复用过去代码必须在 PR 描述和 README 中注明来源。

MVP 可以复用概念、提示词经验和架构经验；如复用代码片段，必须显式披露来源。

## 对提交规范的影响

- 需要尽早建立 README 初稿，持续披露依赖和原创范围。
- PR 应按“文档、脚手架、导入解析、生成、Schema、UI、导出、demo”拆小。
- 每次合并后主分支保持可运行。
- demo 视频需要覆盖输入 3 个以上章节、生成结构化剧本文档、编辑/预览、导出 YAML、Schema 文档位置。
