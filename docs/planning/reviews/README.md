# PR Reviews

> 最近更新：2026-06-06

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

## 维护规则

- 这里可以记录已经合并或正在审查的 PR 的不足，但不反向修改该 PR 的提交说明。
- 如果 review 结论会影响长期系统边界，再沉淀到 `../../knowledge/`。
- 如果 review 结论会影响下一个分支，进入对应 planning 或 TODO。
- 不把 review 文档写成事后自夸；优先记录风险、取舍和下一步动作。
