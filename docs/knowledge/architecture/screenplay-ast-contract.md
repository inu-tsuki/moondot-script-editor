# Screenplay Document Contract

> 最近更新：2026-06-05  
> 状态：草案 v0.1。  
> 用途：定义本项目的核心数据轴心，避免把 YAML 模板误当成产品核心。

## 核心结论

我们真正设计的是“小说改编后的剧本文档模型”，不是 YAML 模板。

更准确地说，月点内部的核心类型应是 `ScreenplayDocument`：外层包含项目元信息、创作来源、角色符号表和脚本树；其中 `script: ScreenplayAst` 才是狭义的剧本语义 AST。

YAML 只是 document 的一种提交表示。官方要求输出 YAML 和定义 YAML Schema，所以我们需要提供 YAML 序列化契约；但编辑器、AI 生成、校验和导出逻辑都应围绕 document / AST 工作。

## 权威层级

```text
Creative Source
  -> Source Adapter
  -> Chapter Parse Result for novel source
  -> ScreenplayDocument
       - project metadata
       - source bundle
       - character registry
       - script: ScreenplayAst
  -> Render / Edit Views
  -> Export Targets
       - YAML: official required serialization
       - Fountain-like text: optional screenplay export
       - Ren'Py / Naninovel: optional VN export
       - Word / PDF: optional production-facing export
```

## Document / AST 是什么

`ScreenplayDocument` 是剧本初稿的单一事实来源。它应表达：

- 创作来源和改编结果的映射；MVP 主要是原小说章节映射。
- 剧本项目元信息。
- 角色、别名和人物小传。
- 线性或分支化的场景结构。
- 场景内的动作、对白、旁白、括号提示、转场和批注。
- UI 编辑时需要的稳定 ID 和局部更新边界。

其中 `ScreenplayAst` 只负责表达脚本树：场景组织方式、场景节点和剧本块。`project`、`source` 和 `characters` 是 document 层数据，不强行塞进脚本 AST。

`ScreenplayDocument` 的权威范围是“当前剧本草稿”。长期项目级信息，例如完整来源库、资产库、生成日志、版本历史和协作状态，应进入 `MoondotProject` / workspace 外层。具体边界见 `document-workspace-boundary.md`。

## YAML 是什么

YAML 是 `ScreenplayDocument` 的一个序列化投影。

它必须：

- 满足官方“结构化剧本（YAML 格式）”要求。
- 能被 README 和 demo 清楚展示。
- 能被 Schema 文档解释字段和设计原因。
- 能被运行时校验。

它不应该：

- 成为 UI 的唯一编辑方式。
- 决定内部状态管理方式。
- 限制未来 Fountain、Ren'Py、Naninovel、Word 或 PDF 导出。
- 迫使作者手写深层嵌套字段。

## 私有格式与工业标准

月点会形成一个比 YAML、Fountain 或 VN runtime script 更复杂的内部私有格式。这个复杂度来自编辑器和 AI 改编需求：稳定 ID、来源追溯、角色别名、局部重生成和 diagnostics path 都需要结构化保存。

这不意味着月点会脱离工业标准。相反，内部 document 应作为中间语义模型，把常见格式接到边界上：

- 小说、灵感、大纲、世界观设定通过 source adapter 进入 `ScreenplayDocument`。
- Fountain 可以在未来通过 importer 解析成 `ScreenplayAst`，再补齐 document 层字段。
- Ren'Py / Naninovel 可以在未来通过 VN importer / exporter 与 document 互转。
- YAML 是当前官方提交 projection，不应成为其它格式的中转站。

因此兼容策略是：

- 内部保持 `ScreenplayDocument` 权威。
- 外部格式通过 importer / exporter 连接。
- 每个 importer / exporter 声明能力范围和可能的信息损失。
- 不让某一个外部格式反向决定 document 的内部结构。

## YAML + Fountain 是什么

`YAML + Fountain` 是一个可选导出方案，不是当前核心存储格式。

它适合表达：

- YAML Front Matter：角色、资产、章节映射、路由等元数据。
- Fountain Text：线性影视剧本文本。

但它不适合作为 MVP 的核心格式，因为官方要求的是完整 YAML Schema，而不是 Fountain 文件；同时小说转剧本阶段需要保留章节来源、生成元信息和块级结构，这些信息用单纯 Fountain 表达会变得含混。

## MVP 工程含义

第一版工程应优先实现：

- TypeScript `ScreenplayDocument` / `ScreenplayAst` 类型。
- document 运行时校验。
- 小说章节解析到 document source seed。
- AI 或 mock 改编结果写入 document。
- document / AST 结构化预览和轻量编辑。
- document -> YAML 序列化。
- YAML Schema 文档与示例。

可暂缓：

- document -> Fountain。
- document -> YAML + Fountain 混合文本。
- document -> Ren'Py / Naninovel。
- document -> Word / PDF。
- 从 Fountain 反向解析回 document。

## 命名原则

- 代码里的核心文档类型优先命名为 `ScreenplayDocument`。
- 脚本树类型命名为 `ScreenplayAst`，节点类型命名为 `SceneNode`、`ScriptBlock`。
- 内部 document 版本字段使用 `documentVersion`。
- YAML 相关类型使用 `YamlScreenplayDocument` 或 `ScreenplayYamlProjection`，避免误认为它是核心模型。
- 导出器命名为 `serializeDocumentToYaml`、`exportDocumentToFountain`、`exportDocumentToRenpy`，而不是从 YAML 再导出其他格式。
