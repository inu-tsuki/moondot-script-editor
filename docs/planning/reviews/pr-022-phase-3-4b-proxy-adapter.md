# PR: Phase 3.4b Frontend Proxy Adapter

> 最近更新：2026-06-07
> 对应分支：`feat/phase3.4b-proxy-adapter`
> 对应 PR：GitHub #38
> 对应阶段：Phase 3.4b `Frontend ProxyModelAdapter + provider switching`

## 结论

方向正确，但当前不建议直接合并。PR #38 已经把前端真实调用闭环接到 `/api/model/call`：新增 `createProxyModelAdapter()`，通过 `fetch()` 实现 `ModelAdapter` contract；`App.tsx` 可以在 `mock` 与 `local_proxy` 之间切换；Topbar 增加 provider 状态指示；production build 禁止自动探测。

主路径上，server structural success 没有直接写入 state。Architect 结果仍先走 `validateAdaptationPlan()`，Writer 结果仍先走 `validateWriterScenePatch()`，再通过 `applySceneDrafts()` 写回 document。这是 3.4b 最关键的边界，当前实现守住了。

但审查发现两个 Active Medium：

- 自动探测只证明 Vite endpoint 可达，不能证明真实 provider 已配置；未配置 `OPENAI_API_KEY` 时会默认切到 `local_proxy`，让本应可复现的 mock demo 变成 config error。
- provider 切换不会失效进行中的 model run；用户切换 provider 后，旧请求仍可能通过 runId 检查并写入 plan / patch。

建议本 PR 内修复这两项，再合并 3.4b。

## Findings

### Active Medium：自动探测会在无 API key 时默认切到 `local_proxy`，破坏 mock fallback 默认路径

位置：`src/App.tsx:153`、`src/App.tsx:170`、`src/server/handler.ts:372`

`App.tsx` 挂载后会发送：

```json
{
  "messages": [{ "role": "user", "content": "probe" }],
  "stage": "_probe",
  "structuredOutput": { "schemaId": "_probe" }
}
```

只要响应里的 `body.trace.provider === 'local_proxy'`，就执行：

```ts
setIsProxyAvailable(true);
setProviderType('local_proxy');
```

问题是 server handler 对 unknown stage 的处理发生在读取 env 之前。`_probe` 会在 stage allowlist 处快速返回 `config_missing`，trace 仍是 `provider: 'local_proxy'`，并且不会检查 `OPENAI_API_KEY`。

因此在最常见的本地演示状态下：

1. 用户运行 `pnpm dev`。
2. `/api/model/call` endpoint 可达。
3. 没有配置 `.env.local` / `OPENAI_API_KEY`。
4. App 自动切到 `local_proxy`。
5. 用户点击“大纲”，真实调用 path 返回 `config_missing`。

这和 Phase 3 roadmap 的目标冲突：没有 API key 时 mock fallback 应保持完整 demo path。当前 UI 虽然可以手动切回 Mock，但默认路径已经从“可生成 mock 大纲”变成“点击后报配置错误”。

建议：

- 默认 `providerType` 保持 `mock`。自动探测只设置 `isProxyAvailable`，不要自动切到 `local_proxy`。
- 或者新增真正的 health/config probe，server 返回 `ready: true` 只有在 endpoint 可达且 `canMakeRealCall(env)` 为 true 时才自动切换。
- 如果保留自动切换，至少应在没有 key 时自动回到 mock，并把 config diagnostic 展示为“代理不可用，可继续使用 Mock”。
- 补 App / Topbar 组件测试：endpoint reachable but API key missing 时，默认 provider 仍为 `mock`，点击“大纲”走 mock adapter。

### Active Medium：provider 切换不会失效进行中的 model run

位置：`src/App.tsx:143`、`src/App.tsx:558`、`src/components/panels/Topbar.tsx:34`

PR 已经用 `latestRunIdRef` 防止 source、preferences 或 document edits 后的 stale response 写入 state。`invalidateModelRun()` 在这些路径中会把 latest run 清空：

- source text change。
- adaptation preferences change。
- document edit。
- manual block text update。
- clear adaptation run。

但 provider 切换路径没有调用它。`Topbar` 的 `handleToggle()` 只调用 `onProviderChange('mock')` 或 `onProviderChange('local_proxy')`；`App.tsx` 直接传入 `setProviderType`。

这样会出现竞态：

1. 当前 provider 是 `local_proxy`。
2. 用户点击“大纲”，runId 记为 `run-a`。
3. 请求尚未返回时，用户切换到 `mock`。
4. `latestRunIdRef.current` 仍是 `run-a`。
5. 旧 proxy 响应返回，runId 检查通过，plan 写入 state。

这会让 UI 显示的 provider 状态与实际写入的 artifact 来源不一致；如果旧请求是 Writer，还可能把用户切换 provider 后不再期望的 patch 写入 document。

建议：

- 在 `App.tsx` 包一层 `handleProviderChange(nextProvider)`，先 `invalidateModelRun()`，再 `setProviderType(nextProvider)`。
- 切换 provider 时可清理当前 loading / pending 状态；如果未来有 `AbortController`，也应取消旧请求。
- 补组件测试：发起 proxy call 后切回 mock，旧 proxy response resolved 时不应更新 `adaptationPlan` 或 `screenplayDocument`。

### Active Low：`ProxyModelAdapter` 对 HTTP JSON shape 的 guard 太宽

位置：`src/core/model/proxy-adapter.ts:201`

当前 adapter 只要 parsed JSON 是 object 且包含 `trace` 字段，就直接 cast 为 `ModelCallResult`：

```ts
if (parsed !== null && typeof parsed === 'object' && 'trace' in parsed) {
  return parsed as ModelCallResult<ModelStagePayloadMap[S]>;
}
```

如果 server / middleware / proxy 返回 `{ trace: {...} }`、`{ trace: null }` 或缺少 `diagnostics` 的 JSON，adapter 会当成成功 envelope 返回。随后 `App.tsx` 会访问 / spread `result.diagnostics`，可能抛出 runtime error。

这个问题不影响当前 happy path，因为 server handler 返回的是完整 `ModelCallResult`。但它削弱了 HTTP 边界的容错能力，和 adapter “never reject” 的 contract 不完全一致。

建议：

- 至少校验 `diagnostics` 是 array、`trace` 是 object、`data` 字段存在或为 null、`error.reason` 若存在则属于 `ModelCallErrorReason`。
- 对 malformed JSON envelope 返回 `ModelCallError.reason === 'parse'`，不要让调用方崩溃。
- 补测试：`{ trace: { provider: 'local_proxy' } }` 应返回 parse error，而不是 pass-through。

## Positive Notes

- `createProxyModelAdapter()` 没有 import server code 或 OpenAI SDK，符合 browser boundary。
- `App.tsx` 保留了 app-side semantic validation：Architect 使用 `validateAdaptationPlan()`，Writer 使用 `validateWriterScenePatch()`。
- `local_proxy` failure path 不直接写 `ScreenplayDocument`。
- `ProxyModelAdapter` 对 fetch rejection、non-JSON response、server-side config/refusal/empty/schema error 做了基本映射，并保持 promise resolve。
- Production build 用 `import.meta.env.DEV` 限制探测，避免静态生产环境误打 `/api/model/call`。

## Verification

本轮审查已运行：

```sh
pnpm format:check
pnpm lint
pnpm build
pnpm test
pnpm e2e
git diff --check origin/main...HEAD
rg -n "openai|OpenAI|handleModelCall|OPENAI_API_KEY|sk-|responses\\.create|zodTextFormat" dist
pnpm exec tsc -p tsconfig.app.json --listFilesOnly
```

结果：

- `pnpm format:check` passed。
- `pnpm lint` passed。
- `pnpm build` passed。
- `pnpm test` passed：12 files / 153 tests。
- `pnpm e2e` passed：3 tests。
- `git diff --check origin/main...HEAD` clean。
- `dist/` 未发现 OpenAI SDK、handler、API key 变量名或疑似 secret。
- app TS project 未包含 `src/server/**` 或 OpenAI SDK declarations。

e2e 备注：

- 第一次在 sandbox 内直接运行 `pnpm e2e` 时，Vite webServer 启动失败 / connection refused。
- 单独以同权限层启动 `pnpm dev --host 127.0.0.1 --port 5173 --strictPort` 后，复跑 `pnpm e2e` 通过。
- 该现象更像本地执行环境的端口权限 / 网络隔离，不是 PR #38 的 UI 回归。

## Test Gap

当前 tests 覆盖：

- `ProxyModelAdapter` success：Architect / Writer。
- fetch rejection：connection refused、timeout、generic error。
- server error pass-through：config_missing、refusal、empty_output、schema。
- malformed HTTP：non-JSON body、unexpected JSON structure。
- request serialization 和 custom baseUrl。
- e2e 仍覆盖 workbench load、output tabs、selected block toolbar 和 mobile fallback。

仍需补：

- `App.tsx` provider auto-detect：endpoint reachable but API key missing 时不应自动破坏 mock default。
- `App.tsx` provider switching：切换 provider 应 invalidate in-flight run。
- `App.tsx` semantic validation pass-through：proxy success with invalid semantic plan / patch 不应写入 state。
- `ProxyModelAdapter` malformed `ModelCallResult` envelope guard。

## 后续动作

- 本 PR 内修复 auto-detect 默认切换策略，保留 mock fallback 的默认演示路径。
- 本 PR 内修复 provider switching 的 stale run invalidation。
- 收紧 `ProxyModelAdapter` response shape guard 可以作为同 PR Low 修复；若时间紧，可作为明确 follow-up，但建议顺手补。
- 修复后复跑 `pnpm format:check`、`pnpm lint`、`pnpm build`、`pnpm test`、`pnpm e2e`，并补充组件 / adapter 测试覆盖上述 gap。

## Review Follow-Up (2026-06-07)

全部三个 findings 已在 `f1e7a22` 修复：

### M1：Auto-detect 不再自动切到 `local_proxy`

位置：`src/App.tsx:170`

探针成功时只设置 `isProxyAvailable = true`，不再调用 `setProviderType('local_proxy')`。默认 `providerType` 保持 `'mock'`。用户可在 Topbar 看到绿色 "代理" 指示器后手动切换。

复核状态：已解决。

### M2：Provider 切换现在 invalidate 进行中的 model run

位置：`src/App.tsx:143-154`

新增 `handleProviderChange(next)` wrapper，先 `invalidateModelRun()`（清空 `latestRunIdRef`）再 `setProviderType(next)`。Topbar 的 `onProviderChange` 由 `setProviderType` 改为 `handleProviderChange`。切换 provider 后，旧 provider 的响应不会通过 runId 检查写入 state。

复核状态：已解决。

### L：Response shape guard 收紧为 `isModelCallResultEnvelope()`

位置：`src/core/model/proxy-adapter.ts:105-143`

新增 `isModelCallResultEnvelope()` 函数，检查：
- `diagnostics` 是 array
- `data` key 存在（null 合法）
- `trace` 是非 null object，且 `trace.provider` 是 string
- `error` 若存在，`error.reason` 必须是 string

新增 4 个测试用例（malformed envelope: 缺 diagnostics/data、diagnostics 非 array、trace null、error.reason 非 string）。Proxy adapter tests 从 17 → 21。

复核状态：已解决。

### 验证

```sh
pnpm format:check   # ✅
pnpm lint           # ✅
pnpm build          # ✅
pnpm test           # ✅ 12 files / 157 tests
rg "openai|handleModelCall|..." dist/  # ✅ empty
```
