# Tool Composition Architecture

> 最近更新：2026-06-05  
> 状态：Phase 1 架构原则。

## 核心原则

“小工具拼成大系统”适合本项目，但它的意思不是插件市场、微服务或复杂 agent runtime。

适合本项目的表达是：

```text
small typed tools
  -> shared ScreenplayDocument
  -> deterministic orchestration
```

所有工具都围绕 `ScreenplayDocument` 或明确 DTO 连接，不能共享隐式可变全局状态。`ScreenplayAst` 是 document 内部的脚本树，不承载全部项目元信息。

## 工具清单

第一版工具可以拆成：

- `parseChapters(text) -> ChapterParseResult`
- `planAdaptation(chapters) -> AdaptationPlan`
- `generateScreenplayDocument(plan) -> ScreenplayDocument`
- `validateScreenplayDocument(document) -> Diagnostic[]`
- `serializeDocumentToYaml(document) -> string`
- `renderPreview(document) -> PreviewModel`
- `exportDocumentToFountainLike(document) -> string`（可选）
- `exportDocumentToRenpySample(document) -> string`（可选）

## 好处

- 每个工具都能单独测试。
- LLM 失败时可以替换成 mock。
- 后续导出器不会反向污染 document / AST。
- demo 能清楚展示工程完整度。
- PR 可以按工具边界拆小，符合提交规范。

## 边界

第一版不做：

- 动态插件系统。
- 复杂 agent tool-call loop。
- 多服务编排。
- 工具之间共享可变全局状态。
- 让某个导出格式反向决定 document 结构。

## 数据流

```text
Novel text
  -> chapter parser
  -> LLM planner / writer
  -> ScreenplayDocument
  -> validation diagnostics
  -> preview / editor
  -> YAML projection
  -> optional exporters
```

不要用某一个领域的工具统治全部系统：

- 不要让 YAML 模板统治 document。
- 不要让编辑器组件统治数据模型。
- 不要让 LLM prompt 统治导出格式。
- 不要让未来 VN 导出拖重 MVP。
