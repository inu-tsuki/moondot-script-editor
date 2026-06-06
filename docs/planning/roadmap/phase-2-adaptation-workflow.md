# Phase 2: Adaptation Workflow

> 最近更新：2026-06-06  
> 状态：当前启动阶段，用于把 mock adaptation scaffold 推进为可解释、可确认、可继续接入模型的改编工作流。

Phase 2 的目标不是“让模型直接写得更像剧本”，而是把小说改编拆成稳定的中间层：

```text
NovelSource
  -> AdaptationPreferences
  -> SourceAnalysis
  -> AdaptationQuestion[]
  -> AdaptationPlan / SceneCard[]
  -> user confirmation
  -> WriterBrief
  -> ScreenplayDocument.script
```

这一步完成后，月点会从“导入小说后触发 mock 生成”升级为“先解释改编方案，再写剧本初稿”的工作台。

## 当前基线

基础切片已具备：

- React + TypeScript + Vite 工程。
- `ScreenplayDocument` / `ScreenplayAst` 类型。
- runtime validation。
- YAML projection。
- 小说章节解析。
- mock adaptation scaffold。
- 基础语义块编辑。
- source ingestion、version control、agent workflow 的长期规划文档。

Phase 2 从这里继续，不重做基础模型，也不急着引入完整 agent graph runtime。

## 阶段目标

### 1. 建立 AdaptationPlan contract

把工作流中的关键中间产物变成 TypeScript 类型：

- `AdaptationPreferences`
- `SourceAnalysis`
- `AdaptationQuestion`
- `AdaptationQuestionAnswer`
- `AdaptationPlan`
- `SceneCard`
- `WriterBrief`
- `GenerationRun` / `GenerationTrace`

这些类型属于 `adaptation` 领域，不直接等同于 `ScreenplayDocument`。`ScreenplayDocument` 仍代表当前作品快照；adaptation 负责读取 document sources，生成 plan，并把确认后的 writer draft 写回 document script。

### 2. 让 mock 经过 plan 再写剧本

当前 mock 不能长期维持“一章一场”的错觉。Phase 2 需要让 mock 先创建 scene outline，再由 writer 消费 `SceneCard`。

完成后应能表达：

- 一个 scene 引用多个章节。
- 一个章节被多个 scene 使用。
- 每个 scene 有 `dramaticPurpose`、`pacing`、`sourceRefs` 和 `writerBrief`。
- trace 可以说明 plan step 和 writer step 做了什么。

### 3. 建立基础偏好与 Architect questions

Phase 2 采用混合方案：

- 用户先给少量 `AdaptationPreferences`。
- Architect 根据文本提出 0-3 个 `AdaptationQuestion`。
- 每个 question 都必须有推荐答案。
- 用户可以跳过 questions，直接采用推荐方案继续。

基础偏好用于控制大方向，例如目标媒介、目标长度、忠实度、风格和是否允许压缩/删减/重排。Architect questions 只处理读过小说后才知道该问什么的具体取舍。

### 4. 呈现 scene outline 确认点

Phase 2 的第一个 human-in-the-loop 节点是 scene outline 确认。

MVP 级 UI 不需要完整 wizard，但至少要让用户看到：

- 计划生成了哪些 scene。
- 每个 scene 来自哪些 `sourceRefs`。
- 为什么这些章节被合并、拆分或重排。
- 用户确认后 Writer 才生成 script scenes。

### 5. 保持 YAML / document 输出可用

Phase 2 的产物最终仍要写入 `ScreenplayDocument.script`。YAML 是 document 的 projection，不是 adaptation plan 的主存储格式。

因此每个 PR 都要保护：

- 现有 demo 可以继续生成剧本。
- document validation 不退化。
- YAML serializer 不被绕开。
- 生成结果继续保留 source trace。

## 非目标

Phase 2 暂不做：

- 真实模型 API 的完整接入。
- 完整 agent graph runtime。
- source segment / embedding index。
- 多版本草稿 UI。
- 完整 dock 系统。
- 完整 Fountain-like 导出器。

这些方向有价值，但它们都依赖更稳定的 `AdaptationPlan` contract。

## PR 拆分

### Phase 2.1：类型与 mock plan builder

目标：让 plan 成为代码中的一等对象。

建议内容：

- 新增 adaptation 类型文件。
- 新增默认 `AdaptationPreferences`。
- 新增 `createMockAdaptationPlan(document, preferences)`。
- 新增轻量 plan validation 或 diagnostics。
- mock writer 改为消费 `SceneCard`。

完成标准：

- `pnpm lint` / `pnpm build` 通过。
- mock 仍能生成 `ScreenplayDocument.script`。
- 单独调用 plan builder 能拿到 scene outline。
- 至少一张 scene card 引用多个章节，证明 scene 不等于 chapter。

### Phase 2.2：偏好输入进入工作流

目标：让用户的创作方向进入 Architect，而不是只进入 Writer。

建议内容：

- 在 UI 中增加少量基础偏好控件。
- 默认值服务于提交 demo：短剧/影视线性剧本、少量场景、保留核心重写。
- 将 preferences 写入 plan 和 trace。

完成标准：

- 用户修改偏好会影响 mock plan 或 trace。
- UI 不阻塞当前导入和生成路径。

### Phase 2.3：scene outline 预览与确认

目标：让 human review 成为工作流节点。

建议内容：

- 在工作台显示 `sceneOutline`。
- 展示 `sourceRefs`、`dramaticPurpose`、`pacing`。
- 增加确认动作，确认后再写入 script。
- 保留一键 mock fallback，避免 demo 卡死在未确认状态。

完成标准：

- 用户可以先看计划，再生成剧本。
- 生成剧本时能说明使用的是哪份 plan。

### Phase 2.4：YAML 导出交互收口

目标：把已有 serializer 变成演示时可用的输出能力。

建议内容：

- 增加复制 YAML。
- 增加下载 `.yaml`。
- 导出前展示 validation 状态。

完成标准：

- demo 中用户可以实际拿到 YAML 文件。
- 导出的 YAML 来自当前 `ScreenplayDocument`，不是 plan 或临时字符串。

## 阶段完成标准

Phase 2 完成时，月点应能稳定演示：

1. 用户导入三章以上小说样例。
2. 系统解析章节并保留 source anchors。
3. 用户选择基础改编偏好。
4. 系统生成 scene outline，并解释跨章节组合。
5. 用户确认后生成剧本初稿。
6. 生成结果进入 `ScreenplayDocument.script`。
7. 用户可以复制或下载 YAML。

完成这个阶段后，再进入 Phase 3：真实模型调用层、prompt contract 强化、提交 demo 和质量收口。

## 参考

- `../../knowledge/architecture/adaptation-workflow.md`
- `../../knowledge/architecture/agent-workflow-research.md`
- `../../knowledge/architecture/screenplay-ast-contract.md`
- `../../knowledge/architecture/document-workspace-boundary.md`
- `../next-direction.md`
