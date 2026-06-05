# Screenplay AST Contract

> 最近更新：2026-06-05  
> 状态：草案 v0.1。  
> 用途：定义本项目的核心数据轴心，避免把 YAML 模板误当成产品核心。

## 核心结论

我们真正设计的是“小说改编后的剧本 AST / 领域模型”，不是 YAML 模板。

YAML 只是 AST 的一种存储与提交表示。官方要求输出 YAML 和定义 YAML Schema，所以我们需要提供 YAML 序列化契约；但编辑器、AI 生成、校验和导出逻辑都应围绕 AST 工作。

## 权威层级

```text
Novel Input
  -> Chapter Parse Result
  -> Screenplay AST
  -> Render / Edit Views
  -> Export Targets
       - YAML: official required serialization
       - Fountain-like text: optional screenplay export
       - Ren'Py / Naninovel: optional VN export
       - Word / PDF: optional production-facing export
```

## AST 是什么

AST 是剧本初稿的单一事实来源。它应表达：

- 原小说章节和改编结果的映射。
- 剧本项目元信息。
- 角色、别名和人物小传。
- 线性或分支化的场景结构。
- 场景内的动作、对白、旁白、括号提示、转场和批注。
- UI 编辑时需要的稳定 ID 和局部更新边界。

## YAML 是什么

YAML 是 AST 的一个序列化投影。

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

## YAML + Fountain 是什么

`YAML + Fountain` 是一个可选导出方案，不是当前核心存储格式。

它适合表达：

- YAML Front Matter：角色、资产、章节映射、路由等元数据。
- Fountain Text：线性影视剧本文本。

但它不适合作为 MVP 的核心格式，因为官方要求的是完整 YAML Schema，而不是 Fountain 文件；同时小说转剧本阶段需要保留章节来源、生成元信息和块级结构，这些信息用单纯 Fountain 表达会变得含混。

## MVP 工程含义

第一版工程应优先实现：

- TypeScript AST 类型。
- AST 运行时校验。
- 小说章节解析到 AST seed。
- AI 或 mock 改编结果写入 AST。
- AST 结构化预览和轻量编辑。
- AST -> YAML 序列化。
- YAML Schema 文档与示例。

可暂缓：

- AST -> Fountain。
- AST -> YAML + Fountain 混合文本。
- AST -> Ren'Py / Naninovel。
- AST -> Word / PDF。
- 从 Fountain 反向解析回 AST。

## 命名原则

- 代码里的核心类型优先命名为 `ScreenplayAst`、`ScreenplayProject`、`SceneNode`、`ScriptBlock`。
- YAML 相关类型使用 `YamlScreenplayDocument` 或 `ScreenplayYamlProjection`，避免误认为它是核心模型。
- 导出器命名为 `serializeAstToYaml`、`exportAstToFountain`、`exportAstToRenpy`，而不是从 YAML 再导出其他格式。

