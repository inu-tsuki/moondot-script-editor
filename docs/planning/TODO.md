# 月点 TODO

> 最近更新：2026-06-07

本文件是月点 AI 协作期任务池。阶段权威以 `roadmap/` 为准，官方约束以 `../knowledge/requirements/` 为准。

## 当前阶段

Phase 3 已完成 model adapter contract、Structured Architect contract、Writer scene patch contract、OpenAI structured output compatibility audit 和 Vite local proxy handler。当前重点是 Phase 3.4b frontend proxy adapter，先打通 UI -> `/api/model/call` -> OpenAI -> validated artifact 的真实调用闭环；随后进入升级后的 Phase 3.5 Agent tool surfaces / IDE-ready UI。

## 已完成

- [x] 建立 `docs/` 文档库索引。
- [x] 整理第三批次第三题官方需求。
- [x] 整理评审规则和作品提交规范。
- [x] 建立 YAML Schema 文档入口。
- [x] 建立 72 小时作品挑战路线。
- [x] 审计 brainstorm 是否符合提交需求。
- [x] 建立剧本数据模型方向文档。
- [x] 明确 `ScreenplayDocument` 是核心模型，YAML 是序列化表示。
- [x] 建立剧本 YAML 序列化 Schema 草案。
- [x] 明确相邻项目复用策略和 Phase 1 技术选型。
- [x] 明确校验层职责和 Fountain-like 导出投影。
- [x] 将混合架构文档拆分到 reuse、validation、export、engineering 等语义目录。
- [x] 明确 3+ 章节是提交能力证明，不是普通转换硬限制。
- [x] 明确 MVP 主编辑是 document / AST 语义块编辑，Fountain-like 是预览/导出投影。
- [x] 建立 README 初稿，确保从第一天起满足提交规范。
- [x] 建立 PR、commit 和第一次提交后的开发流程文档。
- [x] 建立月点长期产品愿景文档，并明确长期 IDE 目标不进入当前 MVP 承诺。
- [x] 决定 MVP 默认目标媒介：短剧/影视线性剧本，视觉小说作为可选导出方向。
- [x] 按 React + TypeScript + Vite 搭建项目脚手架。
- [x] 建立 `.editorconfig`、Prettier 和 ESLint 基础规范。
- [x] 提交并合并 `feat/app-scaffold` PR。
- [x] 规划 `ScreenplayDocument` v0.1 与内部 `ScreenplayAst` 结构。
- [x] 明确 `ScreenplayDocument` 是剧本草稿快照，长期 workspace / project 外层承载来源、资产、生成日志和版本历史。
- [x] 定义 `ScreenplayDocument` / `ScreenplayAst` TypeScript 类型和 demo document。
- [x] 实现 diagnostics 分级和 `validateScreenplayDocument`。
- [x] 实现 document 到 YAML projection 的核心 serializer。
- [x] 实现小说 source ingestion 和基础章节解析。
- [x] 明确章节解析只属于 novel source ingestion，不承担小说到剧本的转换。
- [x] 建立小说改编 prompt / mock fallback 骨架。
- [x] 明确 AI 改编应先生成 source analysis / scene outline / writer brief，再委托 Writer 写剧本初稿。
- [x] 实现增加语义块的基础 UI。
- [x] 建立长期版本控制方向，明确版本历史属于 workspace / project 外层。
- [x] 建立 source ingestion 完整体规划，明确 chapter、segment、beat 和 coverage 的边界。
- [x] 建立 PR #8 之后的下一阶段规划。
- [x] 完成 agent workflow 调研沉淀，明确当前提交阶段不引入完整 agent graph runtime。
- [x] 正式启动 Phase 2 规划，明确 Adaptation Plan / Scene Outline 阶段边界。
- [x] 定义 `AdaptationPlan` / `SceneCard` / `AdaptationQuestion` 类型和 mock plan builder。
- [x] 定义 `AdaptationPreferences`，并让基础偏好进入 plan builder。
- [x] 定义轻量 `GenerationTrace` / `GenerationRun`，记录 plan / writer 两阶段。
- [x] 让 mock screenplay generation 基于 adaptation plan，而不是直接从章节生成场景。
- [x] 设计生成前配置 UI：目标长度、风格、忠实度、目标媒介、是否压缩支线。
- [x] 实现 adaptation plan / scene outline 的预览与确认交互。
- [x] 实现基础 YAML 导出交互。
- [x] 插入 Phase 2.5 Workbench UI Foundation 规划。
- [x] 接入 Tailwind CSS，建立全局样式地基。
- [x] 抽出基础 UI primitives：Button、PanelShell、Badge、Tabs、Field、Toolbar。
- [x] 拆分 `App.tsx` 中的 source、preferences、outline、editor、YAML export 和 diagnostics panels。
- [x] 建立 `WorkbenchLayout`，让 semantic script editor 成为主区域。
- [x] 将 scene outline、YAML 和 diagnostics 整理进 output tabs。
- [x] 建立 document-backed screenplay reading surface，让中央编辑区呈现剧本手稿阅读节奏。
- [x] 实现基础语义编辑控件：按类型新增、删除、移动 block，编辑 dialogue 字段和 scene metadata。
- [x] 完成工业化手稿 UI polish，让 source / outline / YAML / diagnostics 成为辅助区。
- [x] 作为 phase 外 engineering track，引入前端测试护栏：Vitest / Testing Library / Playwright。
- [x] 更新 README、roadmap、next direction、review 索引和测试说明，让文档与 #24-#27 合并后的代码状态一致。
- [x] 复核 `pnpm e2e` 的本地运行路径，明确代理环境下使用 `NO_PROXY=127.0.0.1,localhost`。
- [x] 启动 Phase 3 正式规划，定义模型调用层、structured output、mock fallback、server-side secret 边界、trace 和 demo hardening 的 PR 顺序。
- [x] 实现 Phase 3.1 model adapter contract，让 mock fallback 和未来真实模型共用 `ModelCallRequest` / `ModelCallResult` / `ModelCallError`。
- [x] 实现 Phase 3.2 Structured Architect contract，为 Architect plan 建立 Zod schema / runtime validation，并预留可序列化 `structuredOutput: { schemaId }` envelope。
- [x] 实现 Phase 3.3 WriterBrief and scene draft contract，让 Writer 输出收窄为可验证 `WriterScenePatch` 并通过 document operation 写回。
- [x] 审计 `adaptation_plan_v1` / `writer_scene_patch_v1` 的 OpenAI strict structured output 兼容性，明确 optional 字段、provider-facing strict schema 和 failure mapping 风险。
- [x] 完成 Phase 3.4-pre (Golden Fox)：安装 `openai` SDK v6.42.0，建立 provider-facing Zod schemas（`adaptation-plan-provider.ts`、`writer-scene-patch-provider.ts`）、normalizer、schema registry、compatibility snapshot 测试和 roundtrip 测试。Writer optional → nullable + discriminatedUnion → flat object 已完成。Vite dev server `/api/model/call` skeleton 已建立。`.env.example` 模板已创建。
- [x] 完成 Phase 3.4 Vite local proxy handler：`/api/model/call` dev-server endpoint 实现，挂在 Vite `configureServer()` middleware 上。Pipeline：body parse → env check → stage/schemaId validation → OpenAI Responses API call → output extraction → parseAndNormalizeProviderOutput → app-side Zod structural safeParse → ModelCallResult。Structural error 映射（config_missing / network / refusal / empty_output / parse / schema）已测试覆盖；semantic 由 client 端负责。19 handler tests，build boundary 验证通过（dist/ 不含 openai SDK 或 handler 代码）。注意：此 endpoint 仅在 `pnpm dev` 期间存在；可部署 server adapter 待后续规划。

## 下一步

- [ ] Phase 3.4b：前端 `ProxyModelAdapter` 实现，对接 `/api/model/call` endpoint，让 UI 可在 mock / local_proxy 之间切换。必须复用现有 app-side semantic validation path（`validateAdaptationPlan` / `validateWriterScenePatch`），不能把 server structural success 直接写入 state。
- [ ] Phase 3.5a：Workbench shell and activity rail，建立 IDE-ready 的工具外壳，承载 Source、Outline、Agent、Validation、Export 等 tool surfaces；不在这一段引入完整 agent runtime。
- [ ] Phase 3.5b：Model run monitor tool，展示 provider、stage、runId、loading / success / failure、trace event 和 `ModelCallError.reason` 分类；不显示 secret。
- [ ] Phase 3.5c：Architect tool surface，集中展示 source summary、preferences、prompt 摘要、`AdaptationPlan`、questions、scene outline 和 plan validation。
- [ ] Phase 3.5d：Writer tool surface，以 confirmed `SceneCard` 为单位展示 Writer queue、patch preview、semantic validation 和 apply 前状态。
- [ ] Phase 3.5e：Validation and export tool surface，整合 diagnostics、YAML projection、schema 链接和 demo readiness。
- [ ] 做 Phase 3.6 repair and fallback hardening，覆盖 parse、schema、semantic validation、network 和 config failures。
- [ ] 准备正式 demo 路径：3+ 章节输入、改编方案确认、语义块编辑、YAML 导出、Schema 文档链接。

## 提交前检查

- [ ] 仓库可访问。
- [ ] README 包含运行方式、依赖、原创范围、demo 视频链接和 Schema 文档链接。
- [ ] demo 视频可播放，且包含声音讲解。
- [ ] 主分支可运行。
- [ ] 普通改动按 `AGENTS.md` 运行 `pnpm format:check`、`pnpm lint`、`pnpm build`、`pnpm test`。
- [ ] UI、editor、toolbar、output panel 或 responsive layout 改动额外运行 `pnpm e2e`，或明确说明无法运行的环境原因。
- [ ] 关键编辑器链路有单元 / 组件 / e2e 测试，或在 PR 中明确测试缺口。
- [ ] 每个 PR 只做一件事，标题和描述完整。
- [ ] commit 时间均在第三批次窗口内。
- [ ] 如复用旧代码或参考第三方实现，已在 PR 和 README 中说明。
