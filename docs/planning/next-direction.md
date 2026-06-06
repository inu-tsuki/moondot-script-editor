# Next Direction

> 最近更新：2026-06-07
> 状态：Phase 3.2 已合并；当前用于承接 Phase 3.3 / 3.4 的下一组模型工作流 PR。

本文用于回答“下一两个 PR 先做什么”。阶段级边界见 `roadmap/README.md` 和 `roadmap/phase-3-model-workflow.md`；长期产品愿景仍以 `../knowledge/product/vision.md` 为准。

## 当前基线

主线已经具备：

- React + TypeScript + Vite 工程脚手架。
- `ScreenplayDocument` / `ScreenplayAst` 类型、runtime validation diagnostics 和 YAML projection。
- 小说 source ingestion 和章节解析；章节只作为来源结构，不直接承担剧本转换。
- `AdaptationPreferences`、`AdaptationPlan`、`SceneCard` 和两阶段 `GenerationTrace`。
- scene outline 预览、确认写入和 YAML 复制 / 下载。
- Tailwind、UI primitives、panel extraction、`WorkbenchLayout` 和 output tabs。
- document-backed screenplay reading surface。
- 基础语义编辑控件和工业化手稿 UI polish。
- Vitest / Testing Library / Playwright 前端测试护栏。
- Phase 3.1 model adapter contract：`ModelCallRequest` / `ModelCallResult` / `ModelCallError`、typed stage payload、mock adapter。
- Phase 3.2 Structured Architect contract：Architect Zod schema、`ADAPTATION_PLAN_SCHEMA_ID`、`structuredOutput: { schemaId }` envelope、app-side semantic validation。

Phase 3 的正式路线见 `roadmap/phase-3-model-workflow.md`。下一步应进入 WriterBrief / scene draft contract，而不是直接接 local proxy 或真实 SDK。

## 近期原则

Phase 3 继续坚持：

```text
typed workflow
  -> structured model output
  -> validation / repair
  -> ScreenplayDocument
  -> YAML projection
```

需要避免：

- 把 API key 暴露在浏览器端。
- 让模型直接生成 YAML。
- 让模型输出绕过 `ScreenplayDocument` validation。
- 在下一组 PR 引入完整 agent graph runtime。
- 把 mock fallback 和真实模型做成两套互不相干的路径。
- 让 Writer stage 直接返回完整 `ScreenplayDocument`，绕过 scene patch / document operation。
- 在 prompt 中要求模型伪造“最小有效 artifact”来吞掉失败。

## 推荐 PR 顺序

### PR A：Model adapter contract（已合并）

目标：定义 mock fallback 和真实模型调用共用的边界。

建议内容：

- 新增 `src/core/model/` 或等价目录。
- 定义 `ModelProviderConfig`、`ModelCallRequest`、`ModelCallResult`、`ModelCallError` 和 `ModelTraceEvent`。
- 默认 provider 仍是 `mock`。
- 将 adaptation mock 调用包进 adapter contract。
- 缺少 API key 时产生 config diagnostic 或 mock fallback，不让应用崩溃。

完成标准：

- 现有 demo 行为不退化。
- UI 不感知具体 provider 细节。
- 不提交 secret 或 `.env.local`。
- `pnpm format:check` / `pnpm lint` / `pnpm build` / `pnpm test` 通过。

### PR B：Structured Architect contract（已合并）

目标：让 Architect 的 plan 输出变成可验证 artifact。

建议内容：

- 定义 Architect request / response envelope。
- 为 `SourceAnalysis`、`AdaptationQuestion[]`、`SceneCard[]` 和 `recommendedPlan` 建立 schema 或 runtime validator。
- prompt builder 明确输出 contract。
- 分类 parse / schema / semantic validation failure。
- mock Architect 继续使用同一 contract。

完成标准：

- Architect 输出可以单独测试。
- schema failure 不会写入 `ScreenplayDocument`。
- diagnostics 能解释 fallback 或失败原因。

### PR C：WriterBrief and scene draft contract

目标：让 Writer 只根据确认后的 scene-level brief 生成 scene draft / scene patch。

建议内容：

- 定义 `WriterBrief` 代码 contract。
- 定义 Writer 输出 schema。
- 将 Writer 模型产物从完整 `ScreenplayDocument` 收窄为 `WriterScenePatch` / `SceneDraftPatch`。
- 为 Writer 输出定义 schema id，并通过 `structuredOutput: { schemaId }` 进入 model request。
- 建立 Writer app-side validator：先 Zod `safeParse`，再校验 scene id、sourceRefs、character references、block 类型和空场景。
- Writer prompt 明确禁止直接输出 YAML。
- Writer prompt 不重复完整 schema，也不鼓励伪造最小有效 patch；无法生成可执行 patch 时进入明确 failure / diagnostic。
- Writer 产物先通过 validation，再由 document operation 写入 `ScreenplayDocument.script`。
- mock Writer 和未来真实 Writer 共用同一个 Writer artifact contract。

完成标准：

- Writer 不直接消费完整小说文本。
- Writer stage 不直接返回完整 `ScreenplayDocument`。
- Writer structured output request 可序列化，并能通过 schema id 找到 app-side schema。
- 生成结果继续驱动 YAML preview 和 diagnostics。
- mock Writer 和未来真实 Writer 共用 contract。
- 测试覆盖 Writer schema、semantic validation、mock success 和 failure `ModelCallError`。

### PR D：Local model proxy / server boundary

目标：建立真实模型调用的安全入口。

建议内容：

- 增加最小 local proxy 或 dev server endpoint。
- 从环境变量读取模型配置。
- 前端只调用本地 endpoint。
- 建立 server-side schema registry / resolver，把 Architect / Writer `schemaId` 映射到真实 SDK structured output 参数。
- 前端到 proxy 只传可序列化 request envelope，不传 Zod runtime object。
- 未知 `schemaId` 明确返回 schema configuration diagnostic 或 `ModelCallError`。
- 文档说明 `.env.local` 示例变量名。
- 请求超时、取消、错误状态进入 `ModelCallError`。
- refusal / empty output / parse / schema mismatch 不进入假成功 artifact。

完成标准：

- 无 API key 时 mock fallback 可用。
- 有 API key 时可触发真实 Architect 或 Writer 调用。
- 浏览器 bundle 中不包含 API key。
- 真实调用路径能证明 `schemaId` 已被解析并传入 provider structured output 配置。

## 暂缓事项

- 完整 LangGraph / CrewAI / Mastra / Microsoft Agent Framework 集成。
- 持久 checkpoint 和后台任务队列。
- 完整 RAG / embedding source retrieval。
- 多版本草稿 UI 和 diff viewer。
- 完整 Fountain parser / reverse parser。
- 视觉小说脚本导出器。

这些方向适合在真实模型调用和 demo 路径稳定后继续拆分。
