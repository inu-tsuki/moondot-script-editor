# PR Reviews

> 最近更新：2026-06-07

这里记录已合并或正在审查的 PR 的工程回顾、review 意见和后续动作。它回答“这次审查里我们学到了什么，以及下一步应该怎么修正”。

## 当前入口

- [pr-001-app-scaffold.md](pr-001-app-scaffold.md)：PR #1 `feat/app-scaffold` 的 review 和后续 UI 架构取舍。
- [pr-002-screenplay-ast.md](pr-002-screenplay-ast.md)：PR #2 `feat/screenplay-ast` 的 review，关注数据模型对齐和校验逻辑设计 Gap。
- [pr-003-screenplay-model.md](pr-003-screenplay-model.md)：PR #3 `feat/screenplay-model` 的 review，关注类型层设计、ID 稳定性、YAML serializer 内联和 source ingestion 分离 Gap。
- [pr-004-screenplay-validation-yaml.md](pr-004-screenplay-validation-yaml.md)：PR #4 `feat/screenplay-validation-yaml` 的 review，关注校验层设计、YAML serializer 抽取和遗留 source ingestion Gap。
- [pr-005-novel-adaptation-workflow.md](pr-005-novel-adaptation-workflow.md)：PR #5 `feat/novel-adaptation-workflow` 的 review，关注改编管线设计、mock fallback 边界和来源归因风险。
- [pr-006-adaptation-plan-core.md](pr-006-adaptation-plan-core.md)：PR #6 `feat/adaptation-plan-core` 的 review，关注 AdaptationPlan 模型引入、UI 呈现和 mock 两阶段重构。
- [pr-007-adaptation-preferences-ui.md](pr-007-adaptation-preferences-ui.md)：PR #7 `feat/adaptation-preferences-ui` 的 review，关注生成前配置表单 UI、偏好数据联动及可视化呈现。
- [pr-008-scene-outline-confirmation.md](pr-008-scene-outline-confirmation.md)：PR #8 `feat/scene-outline-confirmation`（GitHub #15）的 review，关注大纲生成与剧本草稿编写的工作流分离与确认机制。
- [pr-009-yaml-export-actions.md](pr-009-yaml-export-actions.md)：PR #9 `feat/yaml-export-actions`（GitHub #16）的 review，关注 YAML 复制/下载导出、导出前 validation 状态和 projection 边界。
- [pr-010-panel-extraction.md](pr-010-panel-extraction.md)：PR #10 `feat/panel-extraction`（GitHub #21）的 review，关注文档库指引下的 panel 拆分、布局回归风险和 Phase 2.5 后续动作。
- [pr-011-workbench-layout-tabs.md](pr-011-workbench-layout-tabs.md)：PR #11 `feat/workbench-layout-tabs`（GitHub #23）的 review，关注 WorkbenchLayout、output tabs、中央编辑区权重和 2.5.5 方案衔接。
- [pr-012-screenplay-reading-surface.md](pr-012-screenplay-reading-surface.md)：PR #12 `feat/screenplay-reading-surface`（GitHub #24）的 review，关注 document-backed Fountain-like reading surface、per-block editor 和手稿输入体验风险。
- [pr-013-basic-semantic-editor-controls.md](pr-013-basic-semantic-editor-controls.md)：PR #13 `feat/basic-semantic-editor-controls`（GitHub #25）的 review，关注基础语义编辑闭环、document 追溯边界和手稿式 UI/UX 收口。
- [pr-014-industrial-manuscript-ui-polish.md](pr-014-industrial-manuscript-ui-polish.md)：PR #14 `feat/industrial-manuscript-ui-polish`（GitHub #26）的 review，关注工业化手稿 UI、toolbar gutter、视觉节奏和窄屏回退。
- [pr-015-frontend-test-harness.md](pr-015-frontend-test-harness.md)：PR #15 `chore/frontend-test-harness`（GitHub #27）的 review，关注 Vitest / Testing Library / Playwright 测试护栏、e2e 环境边界和后续质量节奏。
- [pr-016-model-adapter-contract.md](pr-016-model-adapter-contract.md)：PR #16 `feat/model-adapter-contract`（Phase 3.1）的 review，关注模型适配层 contract、typed artifact、失败分类、异步边界和测试缺口。
- [pr-017-structured-architect-contract.md](pr-017-structured-architect-contract.md)：PR #17 `phase-3.2-structured-architect-contract` 的 review，关注 Architect Zod schema、structured output envelope、semantic validation 和 prompt 失败语义。
- [pr-018-writer-brief-scene-draft-contract.md](pr-018-writer-brief-scene-draft-contract.md)：PR #18 `feat/phase3.3-writer-contract-planning` 的 review，关注 WriterScenePatch validation、document write-back 边界和 sceneCard/sourceRef/character 引用完整性。
- [pr-019-openai-structured-output-compatibility.md](pr-019-openai-structured-output-compatibility.md)：Phase 3.4 前置审计，关注 OpenAI structured output strict schema、Zod helper、optional 字段、schema registry 和 failure mapping。
- [pr-020-phase-3-4-pre-golden-fox.md](pr-020-phase-3-4-pre-golden-fox.md)：Review #20 / GitHub #34 `feat/phase3.4-pre-golden-fox` 的 review，关注 provider-facing schema、OpenAI SDK server boundary、Responses `text.format` envelope 和 normalizer failure mapping。
- [pr-021-phase-3-4-server-wire-up.md](pr-021-phase-3-4-server-wire-up.md)：Review #21 / GitHub #36 `feat/phase3.4-server-wire-up` 的 review，关注 `/api/model/call` handler、stage/schema runtime contract、Responses refusal mapping 和 Vite local proxy 部署边界。

## 维护规则

- 这里可以记录已经合并或正在审查的 PR 的不足，但不反向修改该 PR 的提交说明。
- 如果 review 结论会影响长期系统边界，再沉淀到 `../../knowledge/`。
- 如果 review 结论会影响下一个分支，进入对应 planning 或 TODO。
- 不把 review 文档写成事后自夸；优先记录风险、取舍和下一步动作。
