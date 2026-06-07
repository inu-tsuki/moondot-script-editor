# Roadmap

> 最近更新：2026-06-07

这里保存 72 小时作品挑战的阶段路线。当前目标是围绕月点做出可运行、可演示、可提交的 AI 小说转剧本 MVP。

长期 IDE 目标不写在当前交付承诺里。它放在 `../../knowledge/product/vision.md`，作为产品愿景和架构方向；本 roadmap 只管理这次提交要完成的工作。

## 路线分层

- `Submission Roadmap`：当前比赛窗口内必须完成的提交路线，以本文为准。
- `Product Vision`：月点长期 IDE 方向，以 `../../knowledge/product/vision.md` 为准。
- `Engineering Plan`：当前脚手架、技术选型和 PR 拆分，以 `../engineering/` 和 `../development-workflow.md` 为准。

## 当前定位

月点第一版是一个以导入和转换为入口的剧本编辑器。

它不是纯转换器，因为官方要求产物可编辑、可进一步打磨；它也不是完整专业 IDE，因为当前提交重点是小说转剧本、YAML 输出和 Schema 文档。

长期产品可以有多个 AI 创作入口，例如小说改编、灵感生成、大纲扩写和世界观生成。当前 submission 只实现小说改编入口，因为这是官方题目要求；但工程命名应保留 source adapter 思路，避免把系统写死成只能处理小说章节。

## Submission Roadmap

```text
Phase 0: 文档和范围锁定
  -> Phase 1: 工程脚手架、文档模型、ingestion、YAML projection 和 mock scaffold
  -> Phase 2: Adaptation Plan / Scene Outline 工作流
  -> Phase 2.5: Workbench UI Foundation
  -> Phase 3: 真实模型调用、导出体验和 demo 强化
  -> Phase 4: Demo、README、提交材料和质量收口
```

## 阶段边界与完成标准

### Phase 0：文档和范围锁定

- 拉取官方议题需求。
- 拉取评审与作品提交规范。
- 建立文档库结构和放置规则。
- 明确 YAML Schema 文档是必交材料。
- 审计 brainstorm 是否符合提交需求，并收口 MVP 边界。
- 明确长期 IDE 目标放入 product vision，不进入当前 MVP 承诺。

完成标准：

- README、docs 索引、需求文档、提交规则、产品愿景和开发流程可公开提交。

### Phase 1：工程脚手架、文档模型和基础能力

- 建立可运行项目。
- 支持输入或上传小说文本。
- 展示章节识别结果、生成状态和 diagnostics。
- 定义 `ScreenplayDocument` / `ScreenplayAst`。
- 建立 runtime validation。
- 建立 YAML projection。
- 建立 mock adaptation scaffold。
- 实现基础语义块编辑。
- UI 命名保留 source / input 概念，但默认入口是 novel。
- 主分支保持可运行。

完成标准：

- 本地可以启动。
- 首页直接进入月点工作台，而不是 landing page。
- UI 有小说输入区、剧本工作区和输出/诊断区的基本布局。
- 输入样例能解析出章节。
- 可以生成最小 `ScreenplayDocument`。
- 可以生成符合草案结构的 YAML projection。
- 代码结构不要把未来灵感生成入口排除在外。

状态：已完成基础切片，后续只做必要 follow-up。

### Phase 2：Adaptation Plan / Scene Outline 工作流

- 建立 `AdaptationPreferences`、`SourceAnalysis`、`AdaptationQuestion`、`AdaptationPlan`、`SceneCard` 和 `GenerationTrace` 的轻量 contract。
- 让 mock adaptation 先生成 scene outline，再由 Writer 根据 scene-level brief 写初稿。
- 支持一个 scene 引用多个章节，证明 scene 不是 chapter 的机械映射。
- 建立 scene outline 的 human review 确认点。
- 提供复制或下载 YAML 的能力，保证最终产物仍来自 `ScreenplayDocument`。

完成标准：

- 用户可以先看到改编方案，再生成剧本初稿。
- 生成结果进入 `ScreenplayDocument.script`，而不是直接拼 YAML。
- trace 能解释 plan 和 writer 两阶段。
- demo 能展示三章以上小说输入、跨章节场景计划、语义块编辑和 YAML 导出。

详细计划见 `phase-2-adaptation-workflow.md`。

状态：已完成基础切片。

### Phase 2.5：Workbench UI Foundation

- 引入 Tailwind CSS，建立后续 UI 重构的样式地基。
- 借鉴 KMD dock / workbench 的信息架构，但不直接搬完整 Vue / Pinia / split-pane dock 代码。
- 抽出基础 UI primitives 和业务 panels，降低 `App.tsx` 单体复杂度。
- 让工作台以剧本编辑区为中心，source、outline、YAML 和 diagnostics 成为辅助 panel。
- 让 output 进入 tabs，为 Fountain-like preview 和真实模型 trace 留出位置。
- 改善语义块的剧本阅读视觉，保持 AST semantic block editing 作为主编辑方式。
- 补齐基础语义编辑控件，并用工业化手稿视觉统一工作台。
- 作为横向工程质量轨道接入 Vitest / Testing Library / Playwright 测试护栏。

完成标准：

- 中央剧本编辑区获得主要空间。
- Source、scene outline、YAML 和 diagnostics 不再杂乱垂直堆叠。
- Tailwind 已接入并用于主要新 UI。
- Phase 2 的导入、规划、确认、写入和 YAML 导出链路不退化。

详细计划见 `phase-2-5-workbench-ui-foundation.md`。

状态：基础切片已完成，文档同步、e2e 运行路径确认和 Phase 3 正式规划已完成。

### Phase 3：真实模型调用、导出体验和 demo 强化

- 定义 mock fallback 和真实模型共用的 model adapter contract。
- 接入真实模型调用层，mock fallback 保留。
- 强化 structured prompt contract、输出解析和修复策略。
- 将 Architect 解析 / 提问 / writer brief 与 Writer 初稿生成的 contract 固化到代码。
- 建立安全 server-side / local proxy 边界，避免 API key 暴露在浏览器端。
- 将模型 trace、失败恢复、diagnostics 和导出状态整理进分段 tool surfaces。
- 完成导出交互和提交演示路径。
- README 链接到 Schema 文档、运行方式和 demo 视频。
- 检查 README、Schema 文档和 demo 没有把长期 IDE 能力写成当前 MVP 承诺。

完成标准：

- 真实模型调用或 mock fallback 都有稳定演示路径。
- 生成结果通过 validation。
- Schema 文档解释字段设计原因，并与 YAML projection 保持一致。

详细计划见 `phase-3-model-workflow.md`。

状态：3.4 Vite local proxy handler 已完成；下一步 3.4b 前端 proxy adapter，随后 3.5 分段 Agent tool surfaces。

### Phase 4：Demo、README、提交材料和质量收口

- 完成 README。
- 录制并链接 demo 视频。
- 检查依赖、原创范围和复用说明。
- 检查 PR/commit 节奏和提交窗口。

完成标准：

- README 说明运行方式、依赖、原创范围、demo 链接和 Schema 文档。
- demo 展示 3 个章节以上输入、AI 改编、语义块编辑、YAML 导出。
- 主分支可运行。

## 赛后产品方向

这些方向来自 `../../knowledge/product/vision.md`，不属于当前提交承诺：

- 灵感生成、故事大纲扩写和世界观生成入口。
- 更完整的语义剧本编辑器。
- 场景卡片墙和结构大纲。
- 角色关系、出场统计和弧线追踪。
- 多版本草稿和局部重生成。
- source ingestion 完整体：source store、segment、event beat 和 coverage map。
- Fountain-like、视觉小说脚本、制片表等更多投影。
- 更完整的剧本排版和阅读体验。

## 参考

- `../../knowledge/requirements/xengineer-ai-novel-to-script.md`
- `../../knowledge/requirements/submission-rules.md`
- `../../knowledge/product/vision.md`
- `../../knowledge/architecture/source-ingestion-complete.md`
- `../../knowledge/architecture/version-control-direction.md`
- `../../knowledge/architecture/adaptation-workflow.md`
- `../../knowledge/architecture/agent-workflow-research.md`
- `phase-2-adaptation-workflow.md`
- `phase-2-5-workbench-ui-foundation.md`
- `phase-3-model-workflow.md`
- `../../planning/submission-fit-review.md`
