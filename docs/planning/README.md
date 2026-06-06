# Development Planning

> 最近更新：2026-06-06

这里放仍会影响开发顺序、任务拆分和提交节奏的文档。它回答“下一步做什么，做到什么程度算结束”。

## 当前入口

- `submission-fit-review.md`：brainstorm 与官方提交需求的适配审计、MVP 收口和开放问题。
- `development-workflow.md`：PR、commit、第一次提交和后续开发节奏。
- `engineering/frontend-test-harness.md`：phase 外的前端测试护栏规划，覆盖单元、组件和浏览器级 UI 回归测试。
- `engineering/phase-1-technology-selection.md`：Phase 1 技术栈和脚手架边界。
- `next-direction.md`：Phase 3 启动后的近期开发方向和第一组模型工作流 PR 拆分建议。
- `reviews/README.md`：已合并 PR 的 review、回顾和后续动作。
- `roadmap/README.md`：72 小时作品挑战的阶段路线。
- `roadmap/phase-2-adaptation-workflow.md`：Phase 2 的 Adaptation Plan / Scene Outline 工作流规划。
- `roadmap/phase-2-5-workbench-ui-foundation.md`：Phase 2.5 工作台 UI 地基规划，位于真实模型调用层之前。
- `roadmap/phase-3-model-workflow.md`：Phase 3 模型调用、structured output、mock fallback、trace 和 demo hardening 规划。
- `TODO.md`：任务池和提交前检查。

## 子目录

- `roadmap/`：阶段路线。这里只放阶段级文档，不按具体文件或组件拆。
- `engineering/`：当前工程搭建、测试护栏、技术栈、目录结构和 PR 拆分建议。
- `reviews/`：已合并 PR 的 review 和 follow-up 记录。

## 维护规则

- 当前阶段权威顺序放在 `roadmap/`。
- 开发节奏、PR 拆分和 commit 规范放在 `development-workflow.md`。
- 当前工程选型和脚手架边界放在 `engineering/`。
- 下一两个 PR 的优先级和实现切片放在 `next-direction.md`。
- 已合并 PR 的不足、取舍和后续动作放在 `reviews/`。
- 具体任务、PR 拆分和检查项放在 `TODO.md`。
- 官方约束变化时，先更新 `../knowledge/requirements/`，再调整计划。
- 不再指导当前开发的计划移入 `../archive/`。
