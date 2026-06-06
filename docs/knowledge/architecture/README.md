# Architecture Knowledge

> 最近更新：2026-06-06

这里收纳系统边界、数据模型方向和长期架构原则。它回答“这个工具的核心形状是什么”。

## 当前入口

- `adaptation-workflow.md`：从小说/灵感来源到剧本 AST 的分阶段 AI 改编工作流。
- `agent-workflow-research.md`：对 CrewAI、LangGraph、OpenAI Agents SDK、Microsoft Agent Framework / AutoGen 的 agent workflow 调研和对月点的架构结论。
- `document-workspace-boundary.md`：`ScreenplayDocument` 与未来 workspace/project/store 的长期拆分边界。
- `screenplay-ast-contract.md`：`ScreenplayDocument` 是核心模型，`script: ScreenplayAst` 是脚本树，YAML 是官方要求的序列化表示。
- `screenplay-ast-structure.md`：`ScreenplayDocument` v0.1 与内部 `ScreenplayAst` 的节点结构和实现切片。
- `screenplay-model-direction.md`：从 brainstorm 收敛出的剧本数据模型和导出方向。
- `source-ingestion-complete.md`：source ingestion 的长期完整形态，从章节锚点扩展到 segment、beat 和 coverage。
- `tool-composition.md`：“小工具拼成大系统”的 typed tools 架构原则。
- `version-control-direction.md`：长期版本控制、草稿历史和 generation run 的边界。

## 放置规则

- 稳定的系统边界、数据模型、导出策略放这里。
- 复用策略放 `../reuse/`。
- 校验规则放 `../validation/`。
- 非 YAML 导出投影放 `../export/`。
- 具体 YAML 字段定义放 `../schema/`。
- 具体阶段任务、MVP 范围和开放问题放 `../../planning/`。
