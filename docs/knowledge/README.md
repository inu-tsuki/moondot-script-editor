# Knowledge Base

> 最近更新：2026-06-06

这里放长期事实、外部约束、Schema 设计和维护者需要反复查阅的上下文。它回答“系统必须满足什么，以及为什么可以这样理解”。

## 当前入口

- `requirements/xengineer-ai-novel-to-script.md`：第三批次第三题“AI 小说转剧本工具”的官方需求整理。
- `requirements/submission-rules.md`：评审规则、提交规范、PR/commit 有效性约束。
- `product/vision.md`：月点长期产品愿景，以及它和当前 MVP 的边界。
- `brainstorm/README.md`：产品脑暴和调研底稿索引。
- `architecture/document-workspace-boundary.md`：`ScreenplayDocument` 与未来 workspace/project/store 的长期拆分边界。
- `architecture/agent-workflow-research.md`：主流 agent / workflow 框架调研，以及它对月点分阶段改编工作流的影响。
- `architecture/screenplay-ast-contract.md`：`ScreenplayDocument` 是核心模型，`script: ScreenplayAst` 是脚本树，YAML 是官方要求的序列化表示。
- `architecture/screenplay-ast-structure.md`：`ScreenplayDocument` v0.1 与内部 `ScreenplayAst` 的节点结构和实现切片。
- `architecture/screenplay-model-direction.md`：从 brainstorm 收敛出的剧本数据模型和导出方向。
- `architecture/tool-composition.md`：“小工具拼成大系统”的 typed tools 架构原则。
- `interaction/semantic-block-editing.md`：MVP 主编辑体验是 document / AST 语义块编辑，Fountain-like 是预览/导出投影。
- `interaction/workbench-layout.md`：工作台布局、阅读/编辑区域、样式工具和 dock 取舍。
- `reuse/adjacent-projects.md`：`ai-visual-novel-engine`、`kmd` 的复用策略。
- `validation/screenplay-ast-validation.md`：输入、AST、projection 和导出器校验规则。
- `export/fountain-like-projection.md`：Fountain-like 导出投影。
- `schema/script-yaml-schema.md`：剧本文档的 YAML 序列化 Schema 草案和设计原因。

## 子目录

- `requirements/`：官方题目、提交规范、评审口径和报名/提交流程约束。
- `product/`：长期产品定位、愿景和产品原则。
- `brainstorm/`：产品脑暴、调研底稿和想法来源。
- `architecture/`：系统边界、数据模型方向和长期架构原则。
- `interaction/`：用户操作、编辑体验和 UI 交互语义。
- `reuse/`：相邻项目和旧代码的复用策略。
- `validation/`：输入、AST、projection 和导出器校验规则。
- `export/`：非 YAML 导出投影，例如 Fountain-like、Ren'Py sample。
- `schema/`：剧本 YAML Schema、字段语义、版本策略和设计理由。

## 维护规则

- 官方页面和社群通知改变时，先更新 `requirements/`，再调整 `planning/`。
- 长期 IDE 方向放进 `product/`，当前比赛交付路线放进 `planning/roadmap/`。
- 已确认会影响实现的数据结构和字段语义放进 `schema/`。
- 已收敛但尚未进入代码的数据模型方向放进 `architecture/`。
- 编辑体验和交互语义放进 `interaction/`，不要混进导出格式文档。
- 复用边界放进 `reuse/`，不要混进技术选型或 AST 契约。
- 校验规则放进 `validation/`，不要混进导出格式文档。
- 非 YAML 导出目标放进 `export/`，YAML 官方提交格式继续放 `schema/`。
- 未完全收敛的产品想法可以留在 `brainstorm/`，但不能直接覆盖需求和计划。
- 产品推测、技术取舍和里程碑拆分先放 `planning/`；稳定后再沉淀到 `knowledge/`。
- 不要让 README 代替需求文档。README 面向评委和使用者，`knowledge/` 面向工程维护。
