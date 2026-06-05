# 月点 TODO

> 最近更新：2026-06-05

本文件是月点 AI 协作期任务池。阶段权威以 `roadmap/` 为准，官方约束以 `../knowledge/requirements/` 为准。

## 当前阶段

Phase 1：工程脚手架与基础 UI 已建立。当前重点进入 `ScreenplayDocument` / `ScreenplayAst` 类型、运行时校验和 demo document。

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

## 下一步

- [ ] 以 PR 方式拆分第一组开发任务：脚手架、document / AST、文本输入、YAML 导出、语义块编辑。
- [ ] 定义 `ScreenplayDocument` / `ScreenplayAst` TypeScript 类型和运行时校验。
- [ ] 实现 document 到 YAML projection 的序列化器。
- [ ] 实现章节解析和基础 YAML 导出。
- [ ] 实现 diagnostics 分级和 `validateScreenplayDocument`。
- [ ] 实现可选 `exportDocumentToFountainLike` 预览投影。
- [ ] 实现增加语义块的基础 UI。
- [ ] 设计轻量模型调用层和 mock fallback。

## 提交前检查

- [ ] 仓库可访问。
- [ ] README 包含运行方式、依赖、原创范围、demo 视频链接和 Schema 文档链接。
- [ ] demo 视频可播放，且包含声音讲解。
- [ ] 主分支可运行。
- [ ] 每个 PR 只做一件事，标题和描述完整。
- [ ] commit 时间均在第三批次窗口内。
- [ ] 如复用旧代码或参考第三方实现，已在 PR 和 README 中说明。
