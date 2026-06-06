# PR #16: Model Adapter Contract

> 最近更新：2026-06-06
> 对应分支：`phase-3.1-model-adapter-contract`
> 对应阶段：Phase 3.1 `Model adapter contract`

## 结论

这次改动方向正确：它开始把 Phase 2 的 mock adaptation workflow 放进模型适配层边界，并新增 `src/core/model/` 来承接 mock fallback 和未来真实 provider 的共同接口。

初审发现的三类问题中，类型约束、success trace 和测试缺口已经有明显修正：`ModelStagePayloadMap` 让 stage 决定返回 artifact，缺失 artifact 不再被硬标成 success，`src/core/model/` 也新增了单元测试。

复核后仍有两个 Phase 3.2 开工前应修正的边界：source / preferences 变化时没有失效 in-flight run，以及失败结果仍没有填充 `ModelCallError`。它们都不大，但会直接影响 Structured Architect contract 的可靠性。

## Findings

### Resolved：缺失 artifact 时仍可能返回 success trace

位置：`src/core/model/mock-adapter.ts`

初审问题：`mapResult()` 总是把 `trace.outcome` 设置为 `success`。但 `planNovelAdaptationMock()` 在 unsupported source 或 empty chapters 等情况下会返回 error diagnostics 且没有 `plan`。此时 adapter 会返回 `data: null`、没有 `error`、trace 却是 success。

复核状态：已部分解决。当前实现会根据 artifact 是否存在设置 `trace.outcome: 'success' | 'error'`，并保留 `fallbackReason: 'semantic'`。剩余问题是 failure path 仍未设置 `ModelCallError`，见下方 active finding。

### Resolved：`ModelAdapter.call<TData>()` 允许调用方伪造响应类型

位置：`src/core/model/types.ts`、`src/core/model/mock-adapter.ts`

初审问题：`ModelCallRequest.stage` 是普通 `string`，`ModelAdapter.call<TData>()` 由调用方决定返回类型。mock adapter 内部再把 `result.plan` / `result.document` cast 成调用方指定的 `TData`。这意味着 TypeScript 允许错误调用，例如把 `adaptation_planning` 当成 `ScreenplayDocument`。

复核状态：已解决。当前实现引入了 `ModelStage` 和 `ModelStagePayloadMap`，`ModelAdapter.call()` 的返回类型由 `request.stage` 决定，而不是由调用方传入泛型决定。测试也补了 runtime shape check。

### Active Medium：source / preferences 变化不会失效 in-flight run

位置：`src/App.tsx`

当前实现用 `latestRunIdRef` 防止后一个模型请求被前一个模型请求覆盖。但 `updateSourceText()`、`updateAdaptationPreference()` / `clearAdaptationRun()` 和 document edit paths 并不会修改 `latestRunIdRef`。如果未来 local proxy 请求较慢，用户在请求期间修改 source、preferences 或 document，只要没有启动新的模型请求，旧请求返回后仍可能通过 run id 检查并写入旧 plan / draft。

这会影响 Phase 3.2：Structured Architect contract 需要保证 plan 产物对应当前 source / preferences，而不是一个已被用户编辑过的旧输入。

建议：

- 增加 `invalidateModelRun()`，将 `latestRunIdRef.current` 设置为新的 token 或 `null`。
- 在 `updateSourceText()`、`clearAdaptationRun()`、`updateAdaptationPreference()` 和会改变 document 的 edit paths 中调用它。
- 后续如引入 abort controller，可以让 invalidation 同时取消 pending request。

### Active Medium：failure paths 仍未填充 `ModelCallError`

位置：`src/core/model/types.ts`、`src/core/model/mock-adapter.ts`

当前 `ModelCallError` 已定义，但 mock adapter 的 failure path 只设置 `data: null`、diagnostics、`trace.outcome` 和 `fallbackReason`。unsupported source、empty chapters、no-plan draft 等失败没有填充 `result.error`。

这会影响 Phase 3.2 / 3.4：后续 parse、schema、semantic、network、config failures 需要统一分类。只有 diagnostics 不够，因为 diagnostics 是面向 UI 的信息；`ModelCallError` 才是模型适配层 contract。

建议：

- 对缺失 artifact / unsupported source / empty source / no-plan draft 返回 `error: { reason: 'semantic', message }`。
- 继续保留 diagnostics，供 UI 展示。
- 在 `tests/core/model/mock-adapter.test.ts` 中断言 failure result 的 `error.reason`。

### Resolved：异步 model call 缺少 rejection 边界

位置：`src/App.tsx`

初审问题：`generateSceneOutline()` 和 `confirmSceneOutline()` 直接 `await modelAdapter.call()`。当前 mock 不会 reject，但 Phase 3.4 的 local proxy 会引入 timeout、network、abort 和 server error。若 adapter reject，点击 handler 会绕过 diagnostics。

复核状态：已解决大半。当前 `App.tsx` 已添加 `try/catch`，并把 rejection 转换为 `model_call_rejected` diagnostic。剩余 stale-result 风险见上方 active finding。

## Verification

已运行：

```sh
pnpm format:check
pnpm lint
pnpm build
pnpm test
env NO_PROXY=127.0.0.1,localhost no_proxy=127.0.0.1,localhost pnpm e2e
```

结果：

- Vitest：4 files / 19 tests passed。
- Playwright：3 tests passed。

## Test Gap

已新增 `tests/core/model/mock-adapter.test.ts`，覆盖 planning success、unsupported source、empty chapters、runId echo、scene draft success、no-plan draft 和 runtime shape check。

仍建议补充：

- failure result 的 `ModelCallError` 断言。
- source / preferences 变化后 stale run 不会写入 plan 的组件级或 hook 级测试。
- 如果保留 unknown stage fallback，应有能触达该路径的测试；如果 `ModelStage` 已收窄到无法触达 unknown stage，则可以删除 fallback 或把它留给未来 untrusted transport 层。

## 后续动作

- 先修正两个 active findings，再继续 Phase 3.2 Structured Architect contract。
- 如果修复会扩大 scope，可以保留 local proxy、trace UI 和 repair 相关实现到后续 Phase 3 PR，不要塞回 3.1。
