# PR: Phase 3.4b Frontend Proxy Adapter

> 最近更新：2026-06-07
> 对应分支：`feat/phase3.4b-proxy-adapter`
> 对应 PR：GitHub #38
> 对应阶段：Phase 3.4b `Frontend ProxyModelAdapter + provider switching`

## 结论

方向正确，但当前仍不建议直接合并。PR #38 已经把前端真实调用闭环接到 `/api/model/call`：新增 `createProxyModelAdapter()`，通过 `fetch()` 实现 `ModelAdapter` contract；`App.tsx` 可以在 `mock` 与 `local_proxy` 之间切换；Topbar 增加 provider 状态指示；production build 禁止自动探测。

主路径上，server structural success 没有直接写入 state。Architect 结果仍先走 `validateAdaptationPlan()`，Writer 结果仍先走 `validateWriterScenePatch()`，再通过 `applySceneDrafts()` 写回 document。这是 3.4b 最关键的边界，当前实现守住了。

第一轮发现的 auto-detect、provider switching 和 response envelope guard 已在后续提交中修复。第二轮发现的“确认 scene outline 后立即 apply Writer patch”也已在 `2e7b235` 中拆成生成草稿和应用草稿两个阶段。

最新复核仍不建议直接合并：pending `writerDraft` 没有随 source、document、provider 或新 outline 失效，旧 Writer patch 仍可能被应用到新上下文。另一个中等风险是 Writer 草稿预览目前只显示标题和 block 数，尚不足以支撑“审阅后写入”。

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

## Second Review Follow-Up (2026-06-07)

`f1e7a22` 已解决第一轮的 auto-detect、provider switching 和 response envelope guard 问题。`588b52b` 已把可见按钮文案从“确认写入”修成“确认生成”。但复核完整 UI 流程后，发现问题并没有完全解决：当前代码只是修正了 label，实际动作仍然把 outline confirmation、Writer 生成和 document apply 合并成一个不可审阅的按钮。

### Active High：确认 outline 后会立即 apply Writer patch，缺少 Writer 草稿预览和最终写入确认

位置：`src/App.tsx:450`、`src/App.tsx:459`、`src/App.tsx:484`、`src/App.tsx:496`、`src/components/panels/SceneOutlinePanel.tsx:27`、`src/components/panels/Topbar.tsx:95`

当前链路是：

1. `SceneOutlinePanel` / Topbar 的“确认生成”按钮触发 `confirmSceneOutline()`。
2. `confirmSceneOutline()` 立即用 `buildNovelSceneWriterPrompt(workingDocument, adaptationPlan)` 调用 `stage: 'scene_draft'`。
3. Writer 返回后立即执行 `validateWriterScenePatch()`。
4. validation 通过后，立刻调用 `setScreenplayDocument((prev) => applySceneDrafts(prev, validated.patch!))`。

这意味着用户在 Scene outline 上做出的动作不只是“确认大纲并请求 Writer 生成候选剧本”，而是直接替换了 `ScreenplayDocument.script.scenes`。对于 3.4b 来说，这已经不是旧 mock demo 的文案瑕疵：PR 正在接入 `local_proxy` 和真实 Writer 输出，因此任何 provider 返回的合法 patch 都会在用户尚未看到剧本草稿 / 剧本概览前写入当前稿件。

`applySceneDrafts()` 本身仍是正确的 document operation 边界；问题在于调用时机。它应该只发生在用户看过 Writer 结果并明确选择“写入剧本 / 应用到剧本”之后，而不是发生在 outline confirmation 之后。

建议本 PR 内修复为两阶段 UI：

- `confirmSceneOutline()` 只负责确认当前 `AdaptationPlan`，触发 Writer 生成，并把 validated `WriterScenePatch` 存成 pending artifact，例如 `writerScenePatch` / `writerDraftPreview`。
- UI 展示 Writer 生成结果：至少提供 scene draft 数量、scene title / synopsis、blocks 摘要、source refs、validation diagnostics 和将要覆盖 / 写入的范围。
- 新增显式 apply 动作，例如 `applyWriterDraft()` 或 `writeGeneratedDraft()`；只有这个动作可以调用 `applySceneDrafts()`。
- `isCurrentPlanDrafted` / button disabled 状态需要拆分为更明确的状态：`outlineReady`、`writerGenerating`、`writerDraftReady`、`draftApplied`。不要用“已生成”暗示已经写入，也不要让 outline 面板承担最终写入。
- 生成新 outline、切换 provider、修改 source / preferences / document 时，应 invalidate pending writer draft，避免旧 patch 被应用到新上下文。

最小可接受修复：

- 点击“确认生成”后，不能立即改变 `screenplayDocument.script.scenes`。
- Writer patch 必须先在 UI 中可见，且 validation 结果可见。
- 必须存在一个独立的“写入剧本 / 应用到剧本”按钮，点击后才调用 `applySceneDrafts()`。
- mock Writer diagnostic 应使用“生成 scene draft”，不要继续说“写入 scene draft”，否则 diagnostics panel 仍会误导用户。

建议补充测试：

- 组件或 e2e：点击 Scene outline 的“确认生成”后，编辑区剧本内容不应变化，Writer draft preview 应出现。
- 组件或 e2e：点击独立“写入 / 应用”按钮后，`ScreenplayDocument.script.scenes` 才更新。
- 回归测试：生成新 outline 或修改 source/preferences/document 后，旧 pending writer draft 不可再应用。
- 文案回归：outline confirmation 控件不出现 `确认写入` / `已写入`；mock writer diagnostic 不出现 `Writer 写入 scene draft`。

函数名 `confirmSceneOutline` 可以继续描述“用户确认 outline”这一事件，但它不应再包含最终 document apply。这个拆分会让 3.5 Writer tool surface 的规划自然落位：Architect 工具负责 plan / outline，Writer 工具负责候选 draft，Validation / Apply 才负责写入当前剧本。

## Third Review Follow-Up (2026-06-07)

`2e7b235` 已经解决第二轮最关键的问题：Writer 生成和 document apply 不再绑定在同一个按钮里。当前实现新增了 `writerDraft: WriterScenePatch | null` 和 `isGeneratingWriter` 状态；`generateWriterDraft()` 只调用 Writer、运行 `validateWriterScenePatch()`，并把通过 validation 的 patch 存成 pending draft；只有 `applyWriterDraft()` 会调用 `applySceneDrafts()` 写入 `ScreenplayDocument.script`。

复核状态：主拆分已解决，但仍有两个需要在本 PR 内处理的 workflow 边界。

### Active High：pending `writerDraft` 不会随上下文变化失效，旧 patch 仍可应用

位置：`src/App.tsx:151`、`src/App.tsx:285`、`src/App.tsx:348`、`src/App.tsx:381`、`src/App.tsx:459`、`src/App.tsx:594`

修复后，Topbar 的 apply 可用条件是：

```ts
canApply={hasWriterDraft && !isDraftApplied}
```

但 `hasWriterDraft` 只看 `writerDraft !== null`。当前这些路径不会清掉 pending draft：

- `invalidateModelRun()` 只把 `latestRunIdRef.current` 设为 `null`，不会 `setWriterDraft(null)`。
- provider 切换调用 `handleProviderChange()`，只 invalidate in-flight run，不 invalidate pending draft。
- 普通手稿编辑通过 `handleEdit()` / `handleUpdateBlockText()` 只 invalidate model run，不 invalidate pending draft。
- `updateSourceText()` 清掉了 `adaptationPlan` / `adaptationTrace`，但没有清 `writerDraft`。
- `generateSceneOutline()` 开始新规划时清掉 `adaptationPlan` / `adaptationTrace`，但没有清 `writerDraft`。

因此可以出现：

1. 用户生成 outline。
2. 用户点击“确认生成”，得到 pending Writer draft。
3. 用户修改 source、preferences、手稿，或切换 provider，或重新生成 outline。
4. 旧 `writerDraft` 仍留在 state。
5. Topbar 仍显示“应用”，点击后旧 patch 通过 `applyWriterDraft()` 写入当前 document。

这会把旧 brief / 旧 source refs / 旧 provider 输出应用到新的创作上下文，正好绕过了两阶段设计想保护的 human review 边界。

建议：

- 增加 `invalidateWriterDraft()`，至少执行 `setWriterDraft(null)`，必要时也清掉 writer draft diagnostics。
- 在 source text change、preferences change、document edit、manual block edit、provider change、new outline generation、clear adaptation run 中调用它。
- `generateWriterDraft()` 开始时也应先清掉旧 `writerDraft`，避免 generation in-flight 时 UI 仍可应用旧 draft。
- 补测试：pending draft 存在后，修改 source/preferences/document、切 provider、重新生成 outline，都不应还能点击“应用”。

### Active Medium：Writer 草稿预览不足以支撑“审阅后写入”

位置：`src/components/panels/SceneOutlinePanel.tsx:84`

当前预览只展示：

- `sceneCardId`
- `title`
- block 数量

这比直接写入前进了一步，但还不够构成真正的 Writer 草稿审阅点。用户仍看不到将要写入的 `heading`、`synopsis`、block 文本、角色对白、source refs 或 validation diagnostics 摘要。实际决策仍接近盲按“应用到剧本”。

建议本 PR 至少把 preview 扩到可判断写入内容的最小集合：

- 每场 scene 的 `heading`、`synopsis`、source refs。
- 前若干个 blocks 的类型和文本摘要；dialogue block 显示 character id / name。
- 显示 validation 通过状态和 diagnostics 摘要。
- 如果空间有限，可使用可展开 row，但默认 preview 不能只剩 title 和 block count。

### 已验证

本次复核运行：

```sh
pnpm format:check
pnpm lint
pnpm build
pnpm test
pnpm e2e
```

结果：

- `pnpm format:check` passed。
- `pnpm lint` passed。
- `pnpm build` passed。
- `pnpm test` passed：12 files / 157 tests。
- `pnpm e2e` passed：3 tests。

测试缺口：

- 当前没有 App / SceneOutlinePanel 层面的测试覆盖“生成 Writer draft 不改稿，应用后才改稿”。
- 当前没有测试覆盖 pending writer draft 在 source / preferences / document / provider / new outline 变化后失效。
