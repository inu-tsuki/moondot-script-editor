# Script YAML Schema

> 最近更新：2026-06-05

这里放月点的剧本 YAML Schema 文档。官方议题要求额外提交一篇文档来定义剧本 YAML Schema，并说明该 Schema 的设计原因。

注意：这里定义的是 `ScreenplayDocument` 的 YAML 序列化投影，不是编辑器的核心数据模型本身。核心模型见 `../architecture/screenplay-ast-contract.md`，内部结构规划见 `../architecture/screenplay-ast-structure.md`。

## 当前计划文档

- `script-yaml-schema.md`：草案 v0.1，定义 document 的 YAML 序列化 Schema、字段语义、示例和设计理由。

## Schema 文档验收标准

`script-yaml-schema.md` 至少应包含：

- Schema 版本号。
- 顶层结构说明。
- 章节、场景、人物、对白、动作、旁白等字段定义。
- 必填字段与可选字段。
- 字段命名原因和层级设计原因。
- 一段完整 YAML 示例。
- 可编辑性说明：作者如何继续打磨剧本初稿。
- 扩展性说明：后续如何支持分镜、角色库、导出格式或多模型生成。

## 维护规则

- Schema 一旦被代码消费，字段变更必须同步更新这里。
- 破坏兼容的字段变更应提升 Schema 版本。
- 示例必须能被当前工具导入或校验。
