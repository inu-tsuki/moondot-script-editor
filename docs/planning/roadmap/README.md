# Roadmap

> 最近更新：2026-06-05

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
  -> Phase 1: 工程脚手架与基础 UI
  -> Phase 2: 小说输入、章节解析和 YAML 输出
  -> Phase 3: AI 改编链路和 Schema 文档
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

### Phase 1：工程脚手架与基础 UI

- 建立可运行项目。
- 支持输入或上传小说文本。
- 展示章节识别结果和生成状态。
- UI 命名保留 source / input 概念，但默认入口是 novel。
- 主分支保持可运行。

完成标准：

- 本地可以启动。
- 首页直接进入月点工作台，而不是 landing page。
- UI 有小说输入区、剧本工作区和输出/诊断区的基本布局。
- 代码结构不要把未来灵感生成入口排除在外。

### Phase 2：小说输入、章节解析和 YAML 输出

- 支持 3 个章节以上文本，证明长文本和多章节改编能力；普通试跑不限制只能使用 3+ 章节。
- 识别章节边界。
- 生成最小结构化剧本 YAML。
- 提供复制或下载 YAML 的能力。
- 在 document/YAML 中保留 `sourceType: "novel"`，为未来 `inspiration_seed`、`outline` 等入口留扩展空间。

完成标准：

- 输入样例能解析出章节。
- 可以生成最小 `ScreenplayDocument`。
- 可以导出符合草案结构的 YAML。

### Phase 3：AI 改编链路和 Schema 文档

- 接入 AI 生成或可替代的本地 mock 管线。
- 生成场景、人物、对白、动作等结构。
- 完成 `docs/knowledge/schema/script-yaml-schema.md`。
- README 链接到 Schema 文档。
- 检查 README 和 Schema 文档没有把长期 IDE 能力写成当前 MVP 承诺。

完成标准：

- 真实模型调用或 mock fallback 至少一条链路稳定可演示。
- 生成结果进入 `ScreenplayDocument`，而不是直接拼 YAML。
- Schema 文档解释字段设计原因。

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
- `../../planning/submission-fit-review.md`
