# Adjacent Projects Reuse Strategy

> 最近更新：2026-06-05  
> 参考项目：`../ai-visual-novel-engine`、`../kmd`。

## 核心结论

我们应复用两个相邻项目的架构经验，而不是默认直接复用代码。

原因：

- 官方提交规范要求代码仓库在开题后创建，并要求持续 PR / commit。
- 复用自己过去的代码片段时，需要在 PR 描述中注明来源。
- 当前项目的核心是“小说 -> `ScreenplayDocument` -> YAML 序列化”，和两个相邻项目都相似但不相同。

默认策略：

- 直接代码复用：只在能显著省时间且可清楚注明来源时使用。
- 架构复用：积极使用。
- 文档复用：可以复用目录规范和问题拆解方式。
- 旧项目作为参考来源：README 中可放到“参考与来源说明”，不要假装从零发明。

## `ai-visual-novel-engine`

适合复用的架构：

- LLM 网关思路：统一屏蔽 OpenAI / Gemini / OpenAI-compatible provider 差异。
- 结构化输出契约：让模型输出严格 JSON，再映射到本项目 `ScreenplayDocument`。
- 多阶段生成：不要一次 prompt 直接产最终文档，可分为章节分析、角色抽取、场景规划、剧本块生成、校验修复。
- 灵感生成模式：可作为月点长期 AI 创作入口参考，从主题、关键词、人物关系或世界观设定生成 story seed，再进入 document / AST 语义编辑。
- fallback 思路：真实模型调用失败时使用 mock 或示例数据，保证 demo 可复现。
- 流式状态事件：生成过程中向 UI 展示阶段状态，而不是让用户盯着空白 loading。
- Director / Writer 分工思想：可改造成 Planner / Writer / Verifier。

不建议直接复用的部分：

- Neo4j / GraphRAG：对 72 小时 MVP 太重。
- 图片生成和视觉资产持久化：偏离官方题目。
- 完整游戏循环、存档、角色关系动态图谱：属于 VN runtime，不是小说转剧本工具的主线。
- 把灵感生成模式做成当前 submission 主入口：会偏离“多章节小说转剧本”的题目要求。
- 前端大段游戏 UI：产品形态不同。

可借鉴但需重写的模块：

- `LLMService` / `openaiService` 的 provider abstraction。
- `promptSchemas` 的结构化契约表达。
- `GameEngineService` 的分阶段编排和 mock fallback。

## `kmd`

适合复用的架构：

- `source -> document / AST -> IR/projection -> runtime/export` 的分层心智。
- Parser 不直接决定运行时行为，语义路由和导出由后续层处理。
- diagnostics / audit 思路：每个阶段产生可展示的错误和警告。
- Monaco 编辑器集成：可用于 YAML 输出、prompt/debug 面板或未来 DSL 编辑。
- projection 思路：核心事实和展示/索引投影分离。
- 文档库规范：`knowledge/` 放长期事实，`planning/` 放阶段路线。

不建议直接复用的部分：

- KMD parser / lowering 代码：面向动态文字 DSL，和月点剧本文档结构不同。
- Pixi / GSAP runtime：当前不需要演出播放引擎。
- KMD 指令系统、layout/stage/effect manager：过重。
- Vue/Pixi 编辑器壳：可借鉴，不建议直接搬。

可借鉴但需重写的模块：

- 诊断事件模型。
- Monaco markers 的校验反馈体验。
- AST / projection 的文档化方式。
