# 月点 TODO

> 最近更新：2026-06-06

本文件是月点 AI 协作期任务池。阶段权威以 `roadmap/` 为准，官方约束以 `../knowledge/requirements/` 为准。

## 当前阶段

Phase 2.5：Workbench UI Foundation。Phase 2 的 Adaptation Plan / Scene Outline / YAML 导出链路已经完成基础切片；当前重点是在真实模型调用前整理工作台 UI 地基，让剧本编辑区成为主区域，并为 Fountain-like preview、diagnostics 和模型 trace 留出清晰面板。

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

## 下一步

- [ ] 作为 phase 外 engineering track，引入前端测试护栏：Vitest / Testing Library / Playwright。
- [ ] 拆分 `App.tsx` 中的 source、preferences、outline、editor、YAML export 和 diagnostics panels。
- [ ] 建立 `WorkbenchLayout`，让 semantic script editor 成为主区域。
- [ ] 将 scene outline、YAML 和 diagnostics 整理进 output tabs。
- [ ] 改善语义块剧本阅读视觉。
- [ ] 实现可选 `exportDocumentToFountainLike` 预览投影。
- [ ] 接入轻量模型调用层，将 mock fallback 替换为可配置 LLM agent。

## 提交前检查

- [ ] 仓库可访问。
- [ ] README 包含运行方式、依赖、原创范围、demo 视频链接和 Schema 文档链接。
- [ ] demo 视频可播放，且包含声音讲解。
- [ ] 主分支可运行。
- [ ] 关键编辑器链路有单元 / 组件 / e2e 测试或明确测试缺口。
- [ ] 每个 PR 只做一件事，标题和描述完整。
- [ ] commit 时间均在第三批次窗口内。
- [ ] 如复用旧代码或参考第三方实现，已在 PR 和 README 中说明。
