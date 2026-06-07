# Phase 3: Model Workflow

> 最近更新：2026-06-07  
> 状态：Phase 3.4b frontend proxy adapter 已完成；当前准备 Phase 3.5 Editor / Converter workspace and dock UI。

Phase 3 是月点 MVP 中风险最高的一段。它不是简单地把 mock 替换成一次 LLM 调用；它要把真实模型接入已经建立的 typed workflow：

```text
NovelSource
  -> AdaptationPreferences
  -> Architect structured output
  -> human review / confirmation
  -> WriterBrief
  -> Writer structured output
  -> validation / repair
  -> ScreenplayDocument.script
  -> YAML projection / demo
```

Phase 3 的目标是证明月点不仅能“调用模型”，还能把长文本改编拆成可追溯、可确认、可修复、可导出的工程链路。

## 当前基线

主线已经具备：

- `ScreenplayDocument` / `ScreenplayAst` 内部文档模型。
- 小说 source ingestion 和章节级 source anchors。
- `AdaptationPreferences`、`SourceAnalysis`、`AdaptationQuestion`、`AdaptationPlan`、`SceneCard` 和 `GenerationTrace` 的轻量类型。
- `src/core/model/` 已定义 `ModelCallRequest`、`ModelCallResult`、`ModelCallError`、typed stage payload 和 mock adapter。
- Architect plan 已有 Zod schema、`ADAPTATION_PLAN_SCHEMA_ID`、`structuredOutput: { schemaId }` envelope 和 app-side semantic validation。
- Writer stage 已收窄为 `WriterScenePatch`，并已有 `WRITER_SCENE_PATCH_SCHEMA_ID`、Zod schema、app-side semantic validation 和 `applySceneDrafts()` document write-back。
- mock plan builder 和 mock writer。
- scene outline 确认点。
- YAML projection、复制和下载。
- 中央手稿式语义块编辑器。
- output tabs，可承载 outline、YAML、diagnostics 和后续 model trace。
- Vitest / Testing Library / Playwright 测试护栏。

Phase 3 不重做 Phase 2 的工作流，也不把 `ScreenplayDocument` 改成模型输出格式。模型只负责生成 typed artifacts；document 仍是编辑器、校验器和导出器的单一事实来源。

## 外部调研结论

主流 agent / workflow 构建方式给 Phase 3 的启发是：

- workflow 优先于万能 agent。复杂任务应拆成显式步骤，每步产出 typed artifact。
- human review 是工作流节点，不是最终失败后的补救。
- structured output 比“提示模型输出 JSON”更可靠，但仍需要 app-side validation 和失败分类。
- trace 是产品能力。它要解释模型如何分析 source、为何合并章节、Writer 根据什么 brief 写了某场戏。
- 完整 agent graph runtime 适合长任务、checkpoint、多人审批或外部工具执行；当前浏览器端 MVP 不应为它付出复杂度。

因此 Phase 3 仍采用轻量 typed workflow：

```text
typed TypeScript functions
  -> prompt builders
  -> model adapter / mock fallback
  -> structured parsing
  -> validation / repair
  -> visible workflow state
```

## 核心原则

### 1. 真实模型输出不能绕过 typed contract

所有模型输出必须先进入明确类型：

- Architect 输出 `AdaptationPlan` 或 plan patch。
- Writer 输出 scene draft / scene patch。
- Repair 输出修复后的同类型 artifact。

模型不能直接改 React state，不能直接生成 YAML，不能直接拼 `ScreenplayDocument` 字符串。

### 2. mock fallback 和真实调用共用接口

Phase 3 不能把 mock 留成另一条代码路径。mock fallback 应实现同一个 model workflow contract，方便：

- demo 在没有 API key 时可复现。
- 测试不依赖外部模型。
- 真实调用失败时能降级。
- PR 能逐步落地，而不是等真实 API 全接完才可运行。

### 3. API key 不进入浏览器

本项目是 Vite React 前端。真实模型调用需要 server-side 或 local proxy 边界：

- 前端只发请求到本地或部署侧 endpoint。
- endpoint 从环境变量读取 API key。
- `.env.local` 不提交。
- PR 和 README 只说明变量名和运行方式，不泄露私有 endpoint、token 或非公开日志。

MVP 可以先实现本地 demo proxy；部署方式可在提交前按比赛环境再收口。

### 4. validation / repair 是生成链路的一部分

Phase 3 需要区分失败类型：

- config missing：未配置模型或 API key。
- network error：请求失败、超时、限流。
- refusal / empty output：模型没有给出可用结果。
- parse error：不是可解析 JSON / structured payload。
- schema error：结构字段不符合 contract。
- semantic validation warning：结构合法，但 sourceRefs、角色引用、scene purpose 等不合格。

第一版 repair 可以很轻：

- 能自动修复时修复。
- 不能修复时回退 mock 或展示 diagnostics。
- 永远不能把不可信输出直接写进 `ScreenplayDocument`。

### 5. trace 要面向创作解释

Trace 不只是 console log。Phase 3 的 trace 应能回答：

- Architect 用了哪些 source chapters。
- 哪些问题需要用户确认。
- 哪些章节被合并到同一 scene。
- Writer 收到的 brief 是什么。
- 是否发生 fallback、repair 或 validation warning。

短期 trace 可以继续是 UI state / lightweight `GenerationRun`；长期 trace history 仍属于 workspace / project 外层，不进入 `ScreenplayDocument` 本体。

### 6. schema 属于 model envelope，prompt 只承载创作语义

Structured output 的 schema 不应主要靠 prompt 文案重复。Phase 3 的模型边界应把 schema 作为代码资产和调用 envelope 的一部分：

- Zod 或等价 schema 定义模型 artifact 的结构、必填字段和 enum 值域。
- `ModelCallRequest` 或相邻 request envelope 携带 provider-neutral 的 structured output 配置。
- app-side validator 复用同一份 schema 做 `safeParse`，再执行 sourceRefs、questionAnswers、sceneOutline 等 semantic validation。
- prompt 只描述任务身份、输入上下文、创作目标和不容易写进 schema 的语义约束。

这样 Phase 3.4 接真实 SDK 时，只需要把同一份 schema 映射到 provider 的 structured output 参数，而不是维护一份 prompt 字段清单和一份 runtime validator。

### 7. schema id 是后续阶段的连接点

Phase 3.2 审查后，模型调用边界已经从 `responseSchema: ZodObject` 收敛为可序列化的 `structuredOutput: { schemaId }`。后续阶段应沿用这个连接点：

- Phase 3.3 为 Writer artifact 定义新的 schema id，并在 mock / app-side validation 中使用同一份 schema。
- Phase 3.3 可以建立轻量 client-side schema registry / resolver，帮助测试 schema id 与 Zod schema 的对应关系；但不接真实 SDK。
- Phase 3.4 在 server-side / local proxy 中建立 provider registry，把 `schemaId` 映射到 SDK structured output 参数。
- 未知 `schemaId` 必须变成 configuration diagnostic 或 `ModelCallError`，不能静默降级成无 schema 文本调用。
- prompt 不能要求模型伪造“最小有效 artifact”。无法形成可执行 artifact 时，应进入 refusal / empty output / schema / semantic failure。

### 8. OpenAI structured output 兼容性是 3.4 前置

Phase 3.4 可以引入 OpenAI JavaScript SDK，但只能位于 local proxy / server boundary。浏览器端仍只看到 `ModelCallRequest` 和可序列化的 `structuredOutput: { schemaId }`。

OpenAI structured output 的接入方式应优先使用 Responses API 的 `text.format` / JavaScript SDK Zod helper，而不是把完整 JSON schema 塞进 prompt。但 SDK helper 不等于“任意 Zod schema 都可直接使用”：OpenAI strict structured output 只支持 JSON Schema 子集，并要求 root schema 是 object、对象字段全部 required、对象禁止额外属性。模型 refusal 也不会被强行包装成业务 artifact。

因此 3.4 接 SDK 前需要做一次 provider-facing schema 兼容性审计：

- `adaptation_plan_v1` 和 `writer_scene_patch_v1` 都必须能解析为 OpenAI strict structured output 可接受的 schema。
- 所有 provider-facing object 都必须有明确的 `additionalProperties: false` 策略。
- optional 字段不能直接作为 OpenAI strict output 字段；如需要“可为空”，使用 required nullable field，或在 provider schema 与 app-side schema 之间做显式 normalizer。
- `z.discriminatedUnion`、`z.literal()`、`.min()`、`.positive()` 等 Zod 语义需要检查 SDK helper 生成的 JSON Schema 是否落在 OpenAI 支持子集内。
- refusal、empty output、SDK parse failure 和 app-side schema / semantic failure 都必须映射到 `ModelCallError`，不能伪装成一个最小可用 plan 或 patch。

## 非目标

Phase 3 暂不做：

- 完整 CrewAI / LangGraph / AutoGen / Microsoft Agent Framework runtime 集成。
- OpenAI Agents SDK 集成；当前阶段只需要普通 SDK structured output 调用。
- 持久 checkpoint、后台任务队列或多人审批。
- 完整 RAG / embedding index / source segment retrieval。
- 完整 Fountain parser / reverse parser。
- 多版本草稿 UI 和 diff viewer。
- 视觉小说脚本导出器。
- 完整角色管理面板。
- 在浏览器端保存或调用私有 API key。

这些方向可以在 demo 稳定后继续拆分，不进入当前 Phase 3 的提交承诺。

## PR 拆分

### Phase 3.1：Model adapter contract（已合并）

目标：在接真实模型前，定义 mock 和真实调用共用的模型边界。

建议内容：

- 新增 `src/core/model/` 或等价目录。
- 定义 `ModelProviderConfig`、`ModelCallRequest`、`ModelCallResult`、`ModelCallError`、`ModelTraceEvent`。
- 支持 `mock` provider，作为默认 provider。
- 定义 adapter 输入输出，不在 UI 里散落 provider 细节。
- 明确缺少 API key 时的状态：不是异常崩溃，而是进入 mock fallback 或 config diagnostic。

完成标准：

- mock adaptation workflow 通过 model adapter contract 调用。
- 现有 demo 行为不退化。
- 不引入真实 API key，不提交 `.env.local`。
- `pnpm format:check` / `pnpm lint` / `pnpm build` / `pnpm test` 通过。

### Phase 3.2：Structured Architect contract（已合并）

目标：让 Architect 的模型输出进入可验证的结构化 contract。

建议内容：

- 定义 Architect request / response envelope。
- 引入窄范围 Zod schema（或等价 schema）作为 Architect output 的结构权威，不迁移整个 document validator。
- 为 `SourceAnalysis`、`AdaptationQuestion[]`、`questionAnswers`、`SceneCard[]`、`recommendedPlan` 和 `preferences` 建立 schema / runtime parser。
- 让 `ModelCallRequest` 或 Architect request envelope 能携带 provider-neutral structured output schema / response format。
- 让 prompt builder 引用调用层提供的 structured output schema，只保留创作语义约束，不重复完整 JSON schema。
- 分类处理 parse / schema / semantic validation failure。
- 保持 mock Architect 使用同一 contract。

完成标准：

- Architect Zod schema 可单独测试，并与 `validateAdaptationPlan` 共用。
- Architect 输出可以被单独测试。
- 至少覆盖一个跨章节 scene 的 sourceRefs 校验。
- schema failure 不会写入 `ScreenplayDocument`。
- diagnostics 能解释失败或 fallback。
- 真实 SDK 尚未接入时，schema 仍能作为 app-side validation 和 mock adapter contract 使用。

范围边界：

- 3.2 可以增加 `zod` 依赖，但只用于模型 artifact contract。
- 3.2 不接 OpenAI SDK / local proxy，不读取 API key。
- 3.2 不把 `validateScreenplayDocument()` 迁移到 Zod。
- 3.2 若暂未映射真实 SDK structured output，也必须为 3.4 预留 provider-neutral envelope。

### Phase 3.3：WriterBrief and scene draft contract

目标：让 Writer 只根据确认后的 scene-level brief 写剧本初稿。

状态：已合并。

建议内容：

- 定义 `WriterBrief` 的最小代码 contract。
- 延续 Phase 3.2 的 schema 策略，定义 Writer scene draft / scene patch 输出 schema。
- 将当前 `scene_draft -> ScreenplayDocument` 的模型产物边界收窄为 `WriterScenePatch` / `SceneDraftPatch`；`ScreenplayDocument` 只能由 document operation 写入。
- 为 Writer 输出定义 schema id，例如 `writer_scene_patch_v1`，并通过 `structuredOutput: { schemaId }` 进入 model request。
- Writer validator 先做 Zod structural parse，再做 scene id、sourceRefs、character references、block 类型和空场景等 semantic checks。
- Writer prompt 明确禁止直接输出 YAML。
- Writer prompt 不重复完整 schema，也不要求模型返回“最小有效 patch”；无法根据 brief 生成可执行 patch 时，应产生明确 failure / diagnostic。
- Writer 产物先进入 scene patch，再由 document operation 写入 `ScreenplayDocument.script`。
- 保留 sourceRefs 和 character references。
- mock Writer 和未来真实 Writer 共用同一个 Writer artifact contract。

完成标准：

- Writer 不直接消费完整小说文本。
- Writer 输出可验证、可修复、可回写 document。
- `ModelStagePayloadMap` 不再让 Writer stage 直接返回完整 `ScreenplayDocument`。
- Writer structured output request 可序列化，且能通过 schema id 找到 app-side schema。
- 测试覆盖 Writer schema `safeParse`、semantic validation failure、mock Writer success 和 failure result 的 `ModelCallError`。
- 生成结果继续驱动 YAML preview 和 diagnostics。

范围边界：

- 3.3 不接 OpenAI SDK / local proxy，不读取 API key。
- 3.3 不实现完整 repair loop；只需要把不可用 Writer output 分类为 failure 或 diagnostic。
- 3.3 不做大规模 UI 改版；如需要 UI 入口，只做确认 outline 后生成 patch 的最小链路。

### Phase 3.4：Local model proxy / server boundary

目标：建立安全的真实模型调用入口，用 OpenAI JS SDK 证明真实 structured output path，同时不把 API key 暴露给浏览器。

建议内容：

- 增加最小 local proxy 或 dev server endpoint。
- 在 proxy / server 侧引入 `openai` npm dependency；浏览器 bundle 不直接 import OpenAI SDK。
- 从环境变量读取模型配置。
- 前端通过 adapter 调用 endpoint。
- 建立 server-side schema registry / resolver，将 Phase 3.2 / 3.3 的 `schemaId` 映射到 OpenAI Responses API `text.format` structured output 参数。
- 优先用 OpenAI JS SDK 的 Zod helper 保持 Zod contract 与 provider schema 不漂移；如 helper 生成的 schema 不满足 OpenAI 子集，则建立窄范围 provider-facing strict schema 和 normalizer。
- 接 SDK 前先完成 `adaptation_plan_v1` / `writer_scene_patch_v1` 的 OpenAI structured output compatibility audit。
- 对 Writer optional 字段制定 provider-facing 表达：required empty arrays、required nullable strings，或显式 normalizer；不要把 optional 直接传给 strict structured output。
- 生成或快照检查 provider-facing JSON Schema，确认 root object、required 字段、`additionalProperties: false`、nested union 和 literal 输出都符合 OpenAI 支持子集。
- 前端到 proxy 的请求只传 `messages`、`stage`、`runId` 和 `structuredOutput` 等可序列化字段，不传 Zod runtime object。
- 未知 `schemaId` 返回明确 schema configuration diagnostic 或 `ModelCallError.reason === 'config_missing'`。
- 文档说明 `.env.local` 示例变量名，但不提交 secret。
- 请求超时、取消、错误状态进入 `ModelCallError.reason === 'network'` 或更具体原因。
- OpenAI refusal 映射为 `ModelCallError.reason === 'refusal'`，empty output 映射为 `empty_output`。
- SDK parse / structured output mismatch 映射为 `parse` 或 `schema`；app-side semantic validation 继续映射为 `semantic`。

完成标准：

- 无 API key 时 mock fallback 可用。
- 有 API key 时可触发真实 Architect 或 Writer 调用。
- 浏览器 bundle 中不包含 API key。
- 真实调用路径能证明 `schemaId` 已被解析并传入 provider structured output 配置。
- `openai` SDK 只出现在 proxy / server import path，不出现在 React client import graph。
- 两个现有 schema id 都有 provider-facing compatibility 检查或等价测试。
- Writer optional 字段在 OpenAI strict output 中有明确表达和 app-side normalization 策略。
- refusal、empty output、parse、schema、semantic 和 config missing 至少有 adapter 层测试或手动验证记录。
- PR 明确验证方式和未配置 key 时的行为。

### Phase 3.5：Editor / Converter workspace and dock UI

目标：在真实调用闭环稳定后，先修正 UI 信息架构，再继续拆 tool surfaces。当前工作台已经暴露出布局模型问题：scene navigator 挤占中央编辑空间，右栏在中等宽度下被压到下方，source / preferences 与 output 分裂在不同栏，Topbar 混合了 app、agent 和 export 动作，而旧 `Output` 的 outline / YAML / diagnostics 三个 tab 不是同一层级对象。

Phase 3.5 的第一刀不是继续增加工具页，而是把产品重新收敛成两个一级 workspace：

- `Editor`：承载已经写入 `ScreenplayDocument.script.scenes` 的剧本文档编辑，并负责导出当前 editor document 的 YAML projection。
- `Converter`：承载 source input、preferences、Architect outline、Writer draft、model / artifact validation 和 apply-to-document flow。

3.5 不引入完整 agent graph runtime，不承诺自由形态 agent 对话页，也不一次性实现完整多 scene 文档流编辑器。它先建立稳定的 Editor + Converter 双栏工作台和可选 dock 结构，让后续 Architect、Writer、Validation 和 run monitor 都有正确落点。

代码组织也应跟随这个边界。当前代码已经在 core 层接近分区：`src/core/screenplay/` 属于 Editor document/editing domain，`src/core/adaptation/` 和 `src/core/model/` 属于 Converter / agent workflow domain。但组件层仍是 `src/components/panels/` 平铺，`App.tsx` 直接编排 source、preferences、outline、Writer draft、editor、YAML、diagnostics 和 Topbar actions。3.5a 应把 render 结构拆成 shell / editor / converter，而不是只改 CSS。

总体原则：

- `Editor` 和 `Converter` 是一级功能，但默认不是互斥 switch 页面；它们可以并排协作。后续 dock / focus mode 是布局模式，不是产品心智的替代。
- Topbar 只保留 app-level 行为：品牌、provider 状态、全局状态和可选布局入口。`大纲`、`确认生成`、`应用到剧本` 等 workflow action 移入 `Converter`；YAML copy / download 可以保留在 `Editor`，因为导出对象始终是已写入的 editor document。
- 使用 dock / panel model 统一承载 Editor 主稿纸与 Converter 辅助面板。dock 的开合、宽度和选中状态只属于 UI state，不写入 `ScreenplayDocument`。
- 中央手稿编辑区仍是主工作区；scene navigator 不能作为外部布局补丁挤压稿纸版心，应归入 `Editor` 自己的 header / rail / document flow。
- `Converter` 只通过 typed artifacts 驱动：`AdaptationPlan`、`WriterScenePatch`、diagnostics、`ModelCallResult` 和 `GenerationTrace`，不直接读写 provider 私有结构。
- 每个 tool surface 只消费 typed artifacts、`GenerationRun`、diagnostics 和 `ModelCallResult`，不直接读写 provider 私有结构。
- `mock` 与 `local_proxy` 共用同一 UI 状态模型；provider 差异只体现在 config、trace 和 failure reason。
- artifact 来源必须来自生成时的 trace / run metadata，不能用当前 provider toggle 反推。
- Agent 对话页先作为“typed workflow transcript / command surface”，不承诺自由形态多工具 agent runtime。
- 任何 UI 改动都保留窄屏回退，并运行 `pnpm e2e` 或在 PR 中说明缺口。

目标代码组织：

```text
src/components/shell/
  AppShell.tsx
  DockLayout.tsx
  WorkspaceSwitcher.tsx (optional)

src/features/editor/
  EditorWorkspace.tsx
  SceneNavigator.tsx
  ScriptEditorPanel.tsx
  ScenePage.tsx
  editors/

src/features/converter/
  ConverterWorkspace.tsx
  SourceInputPanel.tsx
  PreferencesPanel.tsx
  PlanPanel.tsx
  WriterDraftPanel.tsx
  ArtifactDiagnosticsPanel.tsx
  RunBadge.tsx
  ConverterActions.tsx
```

这个目录结构可以分 PR 渐进迁移，不要求一次性移动所有文件；但新增代码应优先落在新的 feature / shell 边界内，避免继续扩大 `components/panels/` 平铺层。

建议分段：

#### Phase 3.5a：Workspace shell and dock foundation

目标：建立 Editor / Converter 双栏工作台和统一 dock 基础，而不是继续在旧三栏中堆按钮与 tabs。默认布局应复现“Editor 主稿纸 + Converter 右侧流程面板”，dock / switch / drawer 是可选布局能力。

建议内容：

- 新增或重构 `AppShell`、`DockLayout`、`EditorWorkspace`、`ConverterWorkspace` 等 UI shell 组件；`WorkspaceSwitcher` 可作为窄屏或专注模式后续能力，不是 3.5a 必需项。
- 将 `App.tsx` 的 render 编排瘦身为 workspace composition：`AppShell` 负责 app chrome，`EditorWorkspace` / `ConverterWorkspace` 负责各自 UI。业务 handlers 可暂时留在 `App.tsx`，但不再让 `App.tsx` 直接拼装所有 panels。
- 迁移或封装现有 `components/panels`：`ScriptEditorPanel` / `ScenePage` 归入 editor feature；`SourcePanel` / `AdaptationPreferencesPanel` / `SceneOutlinePanel` / `YamlExportPanel` / `DiagnosticsPanel` 归入 converter feature 或由 converter wrapper 统一承载。
- Topbar 从 workflow command bar 降级为 app shell：provider 状态和可选布局入口留在这里，agent 动作移入 Converter，export 动作归属 Editor。
- `EditorWorkspace` 先承载当前 `ScriptEditorPanel` 和 scene navigation；不在 3.5a 强行完成文档流编辑器。
- `ConverterWorkspace` 先承载现有 source、preferences、outline、writer draft preview 和 model / artifact diagnostics，但通过 dock / mode 组织，而不是拆成左右栏加 output tabs。
- `EditorWorkspace` 保留 YAML export bar，因为导出的是当前已写入 document；Converter 只显示 pending artifact 的状态与诊断。
- 1180px 以下不能把主要工具面板无提示地压到页面底部；窄屏下可进入 drawer / stacked workspace，但必须保持用户知道自己正在编辑 document 还是审查 Converter artifact。

完成标准：

- 用户能清楚区分 `Editor` document 与 `Converter` pending artifacts。
- Source / preferences / outline / writer draft / model diagnostics 被统一收进 `Converter`，不再分裂在左右栏和 output tabs。
- YAML copy / download 从当前 `Editor` document 导出，不导出 pending outline / draft。
- `Editor` 中的 scene navigation 不再作为外部布局补丁挤占主编辑器空间。
- 现有 source ingestion、outline generation、Writer draft preview / apply、multi-scene editing、YAML export 和 diagnostics 不退化。
- UI state 不写入 `ScreenplayDocument`；document changes 仍只通过现有 screenplay operations / `applySceneDrafts()`。
- 新增组件有清晰 ownership：shell 不知道 Converter workflow internals，Editor 不消费 pending `WriterScenePatch`，Converter 不直接编辑 `ScreenplayDocument.script.scenes`，只通过 explicit apply handler 写回。
- `App.tsx` 不再 import 每一个 leaf panel；它最多组合 shell / workspace 级组件。

#### Phase 3.5b：Converter workspace consolidation

目标：把 converter 从散落的 panels / buttons / output tabs 收敛为一个可审查的 agent workflow surface。它管理生成和应用前的 artifact，不拥有最终 document export。

建议内容：

- 将 converter 内部组织成明确模式：Input、Plan、Draft、Validate / Apply。
- `大纲`、`确认生成`、`应用到剧本` 等动作放在 Converter 内部，与对应 artifact 同屏或近邻。
- Outline、Writer draft 和 model / artifact diagnostics 不再作为同级 “Output tabs”；它们是 converter workflow 的不同部分。
- 保留 human review pause：用户确认 outline 后才允许进入 Writer；Writer patch apply 前必须可见。
- Provider trace、artifact validation status 和 apply readiness 在 Converter 内形成连续状态，而不是散在 Topbar / Output / Diagnostics。

完成标准：

- 从 3+ 章节输入到 outline、Writer draft、应用到 Editor document 的流程可以在 Converter 内顺序完成。
- 应用后，Editor export bar 可导出当前 document YAML。
- 用户能判断当前结果来自 mock、真实模型、fallback 还是 validation failure。
- invalid plan / patch 不会进入下一阶段或写入 document。
- 组件测试或 e2e 覆盖核心 Converter workflow。

#### Phase 3.5c：Editor workspace stabilization

目标：让 Editor 成为稳定的剧本文档工作区，而不是被临时 scene tab 和外部 panels 拼接起来。

建议内容：

- 将 scene navigation 收进 Editor header / rail / document flow，避免挤压稿纸主体。
- 明确 Editor 只编辑已写入 `ScreenplayDocument.script.scenes` 的内容；Converter preview 不混入 Editor。
- 为多 scene document flow 预留结构，但 3.5c 可以先保持 “active scene + navigation”。
- 保留现有 block editing、scene metadata editing、selected block toolbar 和窄屏回退。

完成标准：

- 多 scene 都可在 Editor 中发现、切换和编辑。
- Editor 版心不会因为 Converter / dock 开合而坍缩。
- 现有 editor e2e smoke 和 selected block toolbar layout 不退化。

#### Phase 3.5d：Run monitor and artifact trace

目标：把 3.4b 的真实调用状态变成可见的 run monitor，但作为 Converter / dock 的内部工具，而不是新的首级页面。

建议内容：

- 展示当前 provider：`mock` / `local_proxy`、模型配置状态、当前 stage、runId、loading / success / failure。
- 展示 Architect / human review / Writer / validation / fallback 的阶段状态和 trace event。
- failure 按 `ModelCallError.reason` 分组展示：config、network、refusal、empty output、parse、schema、semantic。
- 不显示 API key、raw secret、完整私密请求头；需要 raw payload 时只显示可序列化 prompt messages / schema id / artifact summary。

完成标准：

- 用户能判断当前结果来自 mock、真实模型、fallback 还是 validation failure。
- run monitor 不取代 diagnostics；它解释调用过程，diagnostics 解释 artifact/document 问题。
- 有组件测试或 e2e 覆盖 provider 状态、loading、failure 和 success summary。

#### Phase 3.5e：Dedicated Architect / Writer / Validation surfaces

目标：在 workspace / dock 稳定后，再把 Architect、Writer、Validation / demo readiness 拆成更强的专用工具，而不是一开始就铺开一组孤立页面。

建议内容：

- Architect：集中展示 source summary、preferences、prompt messages 摘要、`AdaptationPlan`、questions 和 scene outline。
- Writer：以 confirmed `SceneCard` 为单位展示 Writer queue、patch preview、semantic validation 和 apply 前状态。
- Validation：整合 document diagnostics、model diagnostics、schema validation、schema 链接和 demo readiness；YAML projection / copy / download 仍从 Editor 当前 document 发起。
- 为 retry / fallback / repair 预留入口，但自动 repair 仍放到 Phase 3.6。

完成标准：

- Architect 不直接写 `ScreenplayDocument.script`。
- Writer 只处理 `WriterScenePatch`，写回仍通过 document operation。
- YAML projection 与 `ScreenplayDocument` validation 保持一致，不变成模型输入或主事实来源。

可选后续切片：

- Agent conversation surface：在 3.5a-3.5d 稳定后，把 Architect / Writer / Validation 的 typed events 渲染成对话式 transcript，并允许用户发起受控 command。它仍应调用现有 typed workflow，不直接开放任意工具执行。

完成标准：

- 3.5 每个 PR 都能独立合并，不要求一次性完成全部 IDE shell。
- 用户能清楚知道当前在编辑 document 还是审查 Converter artifact，以及 converter 正处在 input / plan / draft / validate / apply 的哪一步。
- 新 UI 不破坏 3.4b 的真实调用闭环，也不绕过 3.2 / 3.3 的 schema 与 semantic validation。

### Phase 3.6：Repair and fallback hardening

目标：让模型不稳定时 demo 仍然可控。

建议内容：

- 对 parse error / schema error / semantic validation warning 建立统一处理。
- 可自动修复的输出进入 repair；不可修复时 fallback。
- 增加测试覆盖关键失败类型。
- demo 样例固定为 3+ 章节，并展示真实模型或 mock fallback 的等价路径。

完成标准：

- 真实模型失败不会破坏当前 document。
- mock fallback 能保持完整演示链路。
- validation 结果和 YAML projection 保持一致。

### Phase 3.7：Demo path and submission hardening

目标：把提交演示路径收口。

建议内容：

- 准备正式 3+ 章节样例。
- 明确 demo 操作顺序。
- README 补 demo 视频链接前的最终占位和 Schema 文档入口。
- 检查长期 IDE 目标没有被写成当前 MVP 承诺。
- 如有真实模型调用，说明配置方式和 fallback。

完成标准：

- 从输入小说到导出 YAML 可连续演示。
- demo 能展示跨章节 scene planning、用户确认、语义编辑和 YAML 导出。
- 主分支可运行，验证结果写入 PR。

## 验证策略

普通 Phase 3 PR 运行：

```sh
pnpm format:check
pnpm lint
pnpm build
pnpm test
```

涉及 UI、editor、output tabs、trace panel 或 responsive layout 时额外运行：

```sh
env NO_PROXY=127.0.0.1,localhost no_proxy=127.0.0.1,localhost pnpm e2e
```

模型调用相关 PR 还应说明：

- 是否配置真实 API key。
- 未配置 key 时是否走 mock fallback。
- 是否触发真实外部调用。
- 是否新增或修改 prompt contract。
- 失败路径如何验证。

## 阶段完成标准

Phase 3 完成时，月点应满足：

- mock fallback 和真实模型调用共用同一 workflow contract。
- Architect structured output 可生成、可验证、可展示。
- 用户确认后的 WriterBrief 可以驱动 Writer 生成剧本初稿。
- 生成结果只通过 document operations 写入 `ScreenplayDocument`。
- validation / repair / fallback 不会让坏数据污染当前文档。
- output tabs 能解释模型阶段、trace 和 diagnostics。
- 没有 API key 或真实模型失败时，demo 仍可完整走通。
- README 和 demo 叙述清楚区分已实现 MVP 与长期 IDE 愿景。

完成 Phase 3 后，进入 Phase 4：Demo、README、提交材料和质量收口。

## 参考

- `../../knowledge/architecture/adaptation-workflow.md`
- `../../knowledge/architecture/agent-workflow-research.md`
- `../../knowledge/architecture/screenplay-ast-contract.md`
- `../../knowledge/architecture/document-workspace-boundary.md`
- `../engineering/frontend-test-harness.md`
- `phase-2-adaptation-workflow.md`
- `phase-2-5-workbench-ui-foundation.md`
