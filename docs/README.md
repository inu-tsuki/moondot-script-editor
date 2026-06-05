# 月点文档索引

> 最近更新：2026-06-05

`docs/` 是月点的项目文档库，按用途分成三类：开发规划、知识库、归档。新增文档时先判断它是在回答“接下来怎么做”，还是“长期事实是什么”，或者只是“历史材料是什么”。

## 开发规划：`docs/planning/`

放仍会影响开发顺序、任务拆分、里程碑和提交节奏的文档。

- `roadmap/`：阶段路线，只放阶段级计划和范围边界。
- `engineering/`：当前工程搭建和技术选型计划。
- `reviews/`：已合并 PR 的 review、回顾和后续动作。
- `TODO.md`：AI 协作期任务池和提交规范相关的执行清单；阶段权威以 `roadmap/` 为准。

当前优先从这里开始：

- `planning/roadmap/README.md`
- `planning/development-workflow.md`
- `planning/reviews/pr-001-app-scaffold.md`
- `planning/TODO.md`

## 知识库：`docs/knowledge/`

放长期有效、可被维护者反复查阅的事实、机制和外部约束。

- `requirements/`：来自七牛云 x XEngineer 页面的议题需求、评审规则和提交规范。
- `product/`：月点长期产品定位、IDE 愿景和产品原则。
- `brainstorm/`：产品脑暴和调研底稿，用于追溯想法来源。
- `architecture/`：系统边界、数据模型方向和长期架构原则。
- `schema/`：剧本 YAML Schema 的定义、设计原因和版本演进。

当前优先从这里开始：

- `knowledge/requirements/xengineer-ai-novel-to-script.md`
- `knowledge/requirements/submission-rules.md`
- `knowledge/product/vision.md`
- `knowledge/architecture/screenplay-model-direction.md`
- `knowledge/interaction/semantic-block-editing.md`
- `knowledge/interaction/workbench-layout.md`
- `knowledge/validation/screenplay-ast-validation.md`
- `knowledge/export/fountain-like-projection.md`
- `knowledge/schema/README.md`

## 归档：`docs/archive/`

放不再作为当前事实来源、但仍值得保留的历史方案、旧评审和长对话记录。

归档文档可以提供背景，但不应覆盖 `planning/` 和 `knowledge/` 中的当前结论。

## 放置规则

- 要安排阶段顺序、阶段边界、72 小时交付策略：放 `planning/roadmap/`。
- 要安排当前工程脚手架、技术栈和 PR 拆分：放 `planning/engineering/`。
- 要保存已合并 PR 的 review 和 follow-up：放 `planning/reviews/`。
- 要保存 PR、commit、第一次提交和开发节奏：放 `planning/development-workflow.md`。
- 要记录当前任务、PR 拆分、提交前检查：放 `planning/TODO.md`。
- 要保存官方议题、评审和提交约束：放 `knowledge/requirements/`。
- 要保存长期产品定位、IDE 愿景和产品原则：放 `knowledge/product/`。
- 要保存已收敛的数据模型、导出策略和架构方向：放 `knowledge/architecture/`。
- 要保存编辑体验和 UI 交互语义：放 `knowledge/interaction/`。
- 要保存相邻项目复用策略：放 `knowledge/reuse/`。
- 要保存 AST/input/projection 校验规则：放 `knowledge/validation/`。
- 要保存非 YAML 导出投影：放 `knowledge/export/`。
- 要保存想法来源和调研底稿：放 `knowledge/brainstorm/`。
- 要解释剧本 YAML 结构、字段语义、Schema 版本：放 `knowledge/schema/`。
- 要保存过期方案、已废弃技术路线、历史上下文：放 `archive/`。
- 如果一份文档从计划变成长期机制，应移动到 `knowledge/` 并更新引用。
- 如果一份文档不再指导当前开发，应移动到 `archive/` 并在当前文档中保留必要结论。

## 权威顺序

1. 七牛云 x XEngineer 官方页面、报名/作品提交系统和官方社群通知。
2. `docs/knowledge/requirements/` 中整理出的当前约束。
3. `docs/planning/` 中基于约束拆出的执行计划。
4. 代码实现、README、demo 和 PR 描述。
