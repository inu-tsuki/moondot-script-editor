# PR #16: Model Adapter Contract

> 最近更新：2026-06-06  
> 对应分支：`phase-3.1-model-adapter-contract`  
> 对应阶段：Phase 3.1 `Model adapter contract`

## 结论

这次改动方向正确：它开始把 Phase 2 的 mock adaptation workflow 放进模型适配层边界，并新增 `src/core/model/` 来承接 mock fallback 和未来真实 provider 的共同接口。

但当前实现还没有完全达到 Phase 3.1 的 contract 目标。主要风险集中在三处：失败结果会被 trace 标记成 success、`call<TData>()` 的泛型让调用方可以伪造响应类型、异步模型调用尚未定义 rejection / stale result 的安全边界。

## Findings

### Medium：缺失 artifact 时仍可能返回 success trace

位置：`src/core/model/mock-adapter.ts`

`mapResult()` 总是把 `trace.outcome` 设置为 `success`。但 `planNovelAdaptationMock()` 在 unsupported source 或 empty chapters 等情况下会返回 error diagnostics 且没有 `plan`。此时 adapter 会返回 `data: null`、没有 `error`、trace 却是 success。

这会削弱 Phase 3 contract：调用方无法可靠判断 Architect 是否成功产出 typed artifact。

建议：

- 如果 stage 预期 artifact 缺失，返回 `trace.outcome: 'error'`。
- 设置 `error.reason`，例如 `semantic` 或 `schema`。
- 保留 diagnostics，供 UI 展示失败原因。

### Medium：`ModelAdapter.call<TData>()` 允许调用方伪造响应类型

位置：`src/core/model/types.ts`、`src/core/model/mock-adapter.ts`

`ModelCallRequest.stage` 是普通 `string`，`ModelAdapter.call<TData>()` 由调用方决定返回类型。mock adapter 内部再把 `result.plan` / `result.document` cast 成调用方指定的 `TData`。这意味着 TypeScript 允许错误调用，例如把 `adaptation_planning` 当成 `ScreenplayDocument`。

这和 Phase 3 的 typed artifact 原则相冲突。模型输出 contract 应由 stage 决定，而不是由调用者声明。

建议：

- 将 request / result 改成按 stage 区分的 discriminated union。
- 或提供 typed methods，例如 `planAdaptation()`、`draftScene()`。
- 至少将 `stage` 收窄为明确 union，并让每个 stage 映射到固定 result type。

### Medium：异步 model call 缺少 rejection 和 stale result 边界

位置：`src/App.tsx`

`generateSceneOutline()` 和 `confirmSceneOutline()` 直接 `await modelAdapter.call()`。当前 mock 不会 reject，但 Phase 3.4 的 local proxy 会引入 timeout、network、abort 和 server error。若 adapter reject，点击 handler 会绕过 diagnostics。若用户在慢请求期间修改 source 或 preferences，旧请求也可能在返回后覆盖新状态。

建议：

- 明确 adapter 是否永远 resolve；若不是，App 需要 `try/catch` 并转换为 diagnostics。
- 增加 run id 或 abort signal，忽略 stale result。
- 在真实 provider 落地前补测试，避免本地 proxy 接入后污染当前 document。

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

- Vitest：3 files / 9 tests passed。
- Playwright：3 tests passed。

## Test Gap

当前没有直接覆盖 `src/core/model/` 的单元测试。

建议在修复后增加：

- `adaptation_planning` 成功返回 plan。
- planning 缺失 plan 时返回 error trace 和 `ModelCallError`。
- unknown stage 返回 fallback / diagnostic。
- `scene_draft` 缺少 plan 时返回 error。
- stage 与 result type 的类型约束测试或等价 runtime 测试。

## 后续动作

- 先修正以上 three findings，再继续 Phase 3.2 Structured Architect contract。
- 如果修复会扩大 scope，可以保留 local proxy、trace UI 和 repair 相关实现到后续 Phase 3 PR，不要塞回 3.1。
