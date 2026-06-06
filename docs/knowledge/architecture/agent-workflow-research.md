# Agent Workflow Research

> 最近更新：2026-06-06  
> 状态：规划输入，用于指导 AdaptationPlan、human review、generation trace 和后续模型调用层。

本文沉淀对主流 agent / workflow 产品与社区框架的调研结论。它不是选型报告的终局版，而是回答一个更贴近月点当前阶段的问题：外部 agent 产品的成熟模式，能不能优化我们从 `ai-visual-novel-engine` 迁移来的分阶段创作架构？

## 调研对象

本轮主要参考：

- [CrewAI Introduction](https://docs.crewai.com/en/introduction)：区分 Flows 与 Crews。Flows 用于结构化、事件驱动、带状态管理的工作流，Crews 是 Flow 内被委派任务的 agent 团队。
- [LangGraph Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)：通过 `interrupt()` 暂停图执行，保存状态，并在外部输入后恢复。
- [LangGraph Human-in-the-loop server API](https://docs.langchain.com/langsmith/add-human-in-the-loop)：把暂停点暴露为可恢复的 interrupt payload，适合审阅、编辑和批准工具调用或工作流步骤。
- [OpenAI Agents SDK guide](https://developers.openai.com/api/docs/guides/agents)：当应用需要自己掌管 orchestration、tool execution、approvals 和 state 时，使用 SDK track。
- [OpenAI Agents SDK tracing](https://openai.github.io/openai-agents-python/tracing/)：agent run 应该保留 LLM generation、tool call、handoff、guardrail、自定义事件等 trace。
- [OpenAI Agents SDK guardrails](https://openai.github.io/openai-agents-python/guardrails/)：guardrail 可以放在输入、输出和工具调用边界。
- [Microsoft Agent Framework Workflows](https://learn.microsoft.com/en-us/agent-framework/workflows/)：明确区分 agent 与 workflow，workflow 用显式步骤、类型安全、checkpoint 和 HITL 控制复杂流程。
- [Microsoft Agent Framework overview](https://learn.microsoft.com/en-us/agent-framework/overview/)：建议能写成函数的任务不要先做成 agent，workflow 适合有明确步骤、需要控制执行顺序或多组件协作的任务。
- [AutoGen Human-in-the-Loop](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/tutorial/human-in-the-loop.html)：支持运行中反馈与终止后反馈，但也提示阻塞式用户代理更适合短交互和即时审批。

## 共识模式

### Workflow 优先于万能 agent

几个框架虽然都提供 agent 概念，但成熟方向并不是让一个 agent 自由完成所有步骤。更稳定的形态是：

```text
deterministic tool / typed workflow
  -> bounded agent step
  -> typed artifact
  -> validation / review
  -> next step
```

这与月点现有判断一致：小说改编不应直接由 Writer 读完整小说并输出最终剧本，而应先产生可审阅的中间产物。

### Human review 应该是工作流节点

LangGraph、Microsoft Agent Framework 和 AutoGen 都把人类反馈看成工作流的一部分，而不是生成结束后的补救。对月点来说，最有价值的暂停点不是“最终剧本生成后确认”，而是：

- source analysis 后，让用户补足目标长度、媒介、忠实度和风格。
- scene outline 生成后，让用户确认场景合并、删减和重排策略。
- 单场 writer draft 后，允许局部重写或调整本场 brief。

这意味着 UI 要能承接“等待用户输入”的中间状态，而不是只有一个生成按钮和一个最终输出区。

### Trace 是产品能力，不只是调试日志

OpenAI Agents SDK 和 Microsoft Agent Framework 都强调 run / event / trace。对月点来说，trace 的价值更偏创作产品：

- 解释为什么某几个章节被合并成一场戏。
- 记录用户选择过的改编策略。
- 追溯某段对白来自哪个 `SceneCard` 和哪些 `sourceRefs`。
- 支持之后的版本对比和局部重生成。

因此 generation trace 不应只作为 console log，而应在长期进入 workspace / project 层。当前 `ScreenplayDocument` 可以先保留轻量 mock trace，长期 trace record 属于外层项目历史。

### Guardrail 应该分层

外部框架通常把 guardrail 放在输入、输出、工具调用或 agent 边界。月点也需要分层校验，但名称可以继续使用 validation，因为我们的边界更偏数据模型：

- source validation：来源文本是否为空、章节是否可追溯、source id 是否稳定。
- plan validation：`SceneCard.sourceRefs` 是否存在、是否有 dramatic purpose、是否遗漏关键章节。
- document validation：`ScreenplayDocument` / `ScreenplayAst` 的结构完整性、ID 唯一性、角色引用有效性。
- export validation：YAML projection 是否符合提交格式，Fountain-like / VN projection 是否能生成。

这说明校验层不是“额外洁癖”，而是 agent workflow 的执行边界。

## 对月点的架构结论

### 不急着引入完整 agent 框架

当前提交阶段暂不引入 CrewAI、LangGraph、AutoGen 或 Microsoft Agent Framework。

原因：

- 当前是浏览器端 React demo，尚无长任务后端、持久 checkpoint、外部工具执行和多用户任务队列。
- 我们真正缺的是类型契约和可审阅中间产物，不是 agent runtime。
- 过早引入 graph runtime 会把提交作品的复杂度从“AI 小说转剧本工具”转移到“框架集成展示”。

更合适的当前形态：

```text
typed TypeScript functions
  -> prompt builders
  -> mock / future model adapter
  -> validation
  -> visible workflow state
```

如果后续做真实后端，再根据需要选择：

- 只需要一次模型调用加工具：OpenAI-compatible API / Responses-style 调用即可。
- 需要可恢复长任务、checkpoint、多人审批：再考虑 LangGraph 或 Microsoft Agent Framework 类工作流。
- 需要多个角色 agent 协作但流程仍清晰：保留内部 workflow，agent 作为 step implementation。

### AdaptationPlan 必须成为一等类型

调研强化了一个判断：中间产物必须结构化。月点下一步不应直接增强 mock writer，而应先落：

- `AdaptationPlan`
- `SourceAnalysis`
- `SceneCard`
- `AdaptationQuestion`
- `GenerationTrace` 或轻量 `GenerationRun`

这些类型会让“先规划，再写作”从文档判断变成代码约束。

### Human-in-the-loop 的第一颗钉子是 scene outline 确认

MVP 不需要实现真正的可恢复后台任务，但需要在产品形态上表现出暂停点：

```text
用户导入小说
  -> 系统解析章节
  -> 系统生成改编计划
  -> 用户确认 / 调整计划
  -> 系统写剧本初稿
```

也就是说，Phase 2 UI 的目标不是完整 wizard，而是让中间 panel 能显示 `sceneOutline`，并让用户理解“这场戏为什么这样合并来源”。

### Source ingestion 要服务于 plan，而不是替代 plan

章节解析继续是 source anchor。外部 agent 框架常见的 retrieval、checkpoint、tool call 都需要稳定输入边界。对月点来说，这个边界就是：

- `NovelSource.chapters`
- 未来的 `SourceSegment`
- 未来的 `SourceBeat`
- `sourceRefs`

但 scene 边界由 AdaptationPlan 决定，不由章节解析器决定。

## 对下一步 PR 的影响

下一步 PR 应把“agent workflow 规划”落到最小代码结构：

1. 新增 `AdaptationPlan` 相关类型。
2. 新增 mock plan builder，让一场戏可以引用多个章节。
3. mock writer 改为消费 `SceneCard`，而不是直接消费章节。
4. trace 中保留 plan step 和 writer step。
5. UI 可以暂时只显示 plan 摘要，不必一次做完整可编辑流程。

这条路线吸收了外部 agent 产品的成熟经验，但保持月点自己的轻量实现。现在的核心不是展示“我们用了某个 agent 框架”，而是展示“我们知道创作型 agent 应该在哪里暂停、在哪里解释、在哪里让用户介入”。
