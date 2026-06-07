# PR: Phase 3.4 Server-Side Wire-Up

> 最近更新：2026-06-07
> 对应分支：`feat/phase3.4-server-wire-up`
> 对应 PR：GitHub #36
> 对应阶段：Phase 3.4 `Local model proxy / server boundary`

## 结论

方向正确但当前不建议直接合并。PR #36 已经把 `/api/model/call` 从 501 skeleton 推进到真实 OpenAI Responses API pipeline：读取 env、解析 `schemaId`、调用 `responses.create()` + `zodTextFormat()`、抽取 `output_text`、执行 `parseAndNormalizeProviderOutput()` 和 app-side Zod structural validation，并补了 16 个 server handler tests。

但审查发现两个代码级 Active Medium，以及一个后端规划层面的 Active Medium：

- HTTP 边界没有校验 `stage` 与 `schemaId` 的配对，跨边界后不能再依赖 TypeScript `ModelStagePayloadMap`。
- Responses refusal 识别只覆盖 `incomplete_details` / `error.code`，没有覆盖 output content 中的 `refusal` part。
- 当前实现是 Vite dev server middleware，不是可部署后端；规划文档把它写成“endpoint 完整实现 / server-side wire-up 已完成”，语义偏满。

建议本 PR 内先修前两项；第三项至少要在 planning 文档中降准为 “Vite local proxy handler 已完成”，并把可部署 server adapter 作为后续明确工作。

## Findings

### Active Medium：HTTP 边界没有校验 `stage` 与 `schemaId` 的配对

位置：`src/server/handler.ts:66`、`src/server/handler.ts:310`

`isModelCallRequestShape()` 目前只检查：

- `messages` 是 array。
- `structuredOutput.schemaId` 是 string。

随后 handler 直接用 `schemaId` 解析 provider schema，而 `stage` 只进入 trace。这样跨 HTTP 可以发出不匹配请求，例如：

```json
{
  "messages": [{ "role": "user", "content": "Write a scene draft." }],
  "stage": "scene_draft",
  "structuredOutput": { "schemaId": "adaptation_plan_v1" }
}
```

当前 handler 会用 Architect provider schema 发真实 OpenAI 请求，成功后返回 plan-shaped data，但 trace 仍标成 `scene_draft`。前端 TypeScript 的 `ModelStagePayloadMap` 无法保护 HTTP 请求体；到了 server boundary 必须重新做 runtime contract check。

建议：

- 在 server 侧建立 allowlist：`adaptation_planning -> adaptation_plan_v1`，`scene_draft -> writer_scene_patch_v1`。
- 对未知 `stage` 或 stage/schema mismatch 返回 `ModelCallError.reason === 'config_missing'` 或 `parse`，不要发 OpenAI 请求。
- 补测试：stage/schema mismatch 时 `fakeCreate` 不应被调用；unknown stage 也不应被调用。

### Active Medium：Responses refusal 识别不完整，可能被误归类为 empty output

位置：`src/server/handler.ts:113`、`src/server/handler.ts:394`

`isRefusal()` 当前只看：

- `response.incomplete_details?.reason === 'content_filter'`
- `response.error?.code === 'invalid_prompt'`

但 OpenAI SDK 的 Responses 类型中，output message content 可以包含 `ResponseOutputRefusal`，其 `type` 为 `refusal`，字段为 `refusal: string`。如果真实响应以 output content part 表达 refusal，而 `output_text` 为空，当前 handler 会通过 refusal check，然后在 output text extraction 阶段返回 `empty_output`。这会破坏 Phase 3.4 roadmap 中 refusal / empty output 的失败语义分离。

建议：

- 扩展 response shape，检查 `response.output[]` 中 message content 是否含 `{ type: 'refusal' }`。
- refusal content 命中时返回 `ModelCallError.reason === 'refusal'`，message 中可带 refusal 文本的短摘要。
- 补 mocked Responses payload 测试：`output: [{ type: 'message', content: [{ type: 'refusal', refusal: '...' }] }]` 应映射为 `refusal`，不是 `empty_output`。

### Active Medium：当前“后端”只是 Vite local proxy，规划文档把部署形态说得过满

位置：`vite.config.ts:21`、`docs/planning/TODO.md:74`、`docs/planning/next-direction.md:26`

`/api/model/call` 目前挂在 Vite dev server 的 `configureServer()` middleware 上。这个 endpoint 只在 `pnpm dev` 期间存在；`pnpm build` 产物中的 `dist/` 不包含 handler、OpenAI SDK 或 `/api/model/call`。

这符合 “local proxy / demo proxy” 的阶段目标，但它不是独立可部署后端，也不是 production static hosting 会自动拥有的 API route。当前 planning 文档写：

- “`/api/model/call` endpoint 完整实现”
- “Phase 3.4 server-side wire-up 已完成”

这些表述容易让后续代码编写者误以为 deployment story 已收口。实际部署还需要一个可运行的 Node/Serverless adapter，或明确比赛 demo 只走 `pnpm dev` local proxy。

建议：

- 文档改为 “Vite local proxy handler 已完成” 或 “dev-server endpoint 已完成”。
- 明确 `pnpm build` 仍只生成静态前端，部署时需要额外 API host。
- 后续阶段抽出可部署核心：例如 `handleModelCallCore(request, env, client)`，再分别接 Vite middleware、Express/Fastify、Vercel/Netlify function。
- 不要把 Vite middleware 当成长期后端技术栈；它适合本地 demo，不适合最终部署边界。

### Active Low：文档声称 error mapping 全覆盖，但 semantic 并未在 server 覆盖

位置：`docs/planning/TODO.md:74`、`docs/planning/next-direction.md:26`

PR body 和 planning 文档提到 “8 种 `ModelCallError` 映射全部测试覆盖”。但当前 handler 只覆盖 structural path：request parse、config、network、refusal、empty output、JSON parse、provider schema、app-side Zod schema。

`semantic` 仍由前端 `App.tsx` 调用 `validateAdaptationPlan()` / `validateWriterScenePatch()` 执行。这一取舍可以接受，因为 semantic validation 需要 runtime context，例如 source chapters、current plan、characters；server handler 当前请求体里没有这些上下文。

问题在于文档措辞。应明确写成：

- server handler 覆盖 structural / provider failures。
- client 继续负责 semantic validation。
- Phase 3.4b 的 `ProxyModelAdapter` 不能绕过现有 `App.tsx` validation path。

## Backend Planning Review

当前代码编写者的后端规划可以理解为 “先用 Vite local proxy 证明真实模型调用路径”。这个阶段拆分是合理的：它避免 API key 进入浏览器 bundle，也让 handler 可以在 Vitest 中用 mocked OpenAI client 测出 failure mapping。

但不能把它当成最终后端技术栈。现在的技术形态是：

- Node.js runtime。
- TypeScript server modules in `src/server/`。
- Vite dev server middleware 作为唯一 HTTP adapter。
- OpenAI JS SDK 只在 node/server compile graph。

更稳的后续规划：

1. 保留 Vite middleware 作为 local demo adapter。
2. 抽出 request/response 无关的 core handler，输入 plain `ModelCallRequest` 和注入式 env / client，输出 `ModelCallResult`。
3. 为部署目标单独加 adapter：Express/Fastify、小型 Node server、Vercel/Netlify function 或比赛指定平台。
4. 在文档中明确本地 demo 与部署 demo 的启动方式不同。

这样既不推翻当前 PR，也不会让项目过早绑定 Vite dev server。

## Verification

本轮审查已运行：

```sh
pnpm format:check
pnpm lint
pnpm build
pnpm test
git diff --check origin/main...HEAD
rg -n "openai|OpenAI|handleModelCall|OPENAI_API_KEY|sk-|responses\\.create|zodTextFormat" dist
pnpm exec tsc -p tsconfig.app.json --listFilesOnly
pnpm exec tsc -p tsconfig.node.json --listFilesOnly
```

结果：

- `pnpm format:check` passed。
- `pnpm lint` passed。
- `pnpm build` passed。
- `pnpm test` passed：11 files / 133 tests。
- `git diff --check origin/main...HEAD` clean。
- `dist/` 未发现 OpenAI SDK、handler、API key 变量名或疑似 secret。
- app TS project 未包含 `src/server/**` 或 OpenAI SDK declarations。
- node TS project 包含 `src/server/**`、provider schemas 和 OpenAI SDK declarations，符合 server boundary。

## Test Gap

当前 tests 已覆盖：

- success path：Architect / Writer。
- config missing：no key、unknown schemaId、GET method。
- parse failures：request JSON、missing fields、model output non-JSON。
- network / auth：connection、rate limit、5xx、bad API key。
- refusal / empty：content filter、empty output。
- schema：provider schema mismatch。

仍需补：

- stage/schemaId mismatch。
- unknown stage。
- invalid `messages[]` item role/content shape。
- Responses output content `refusal` part。
- Vite middleware smoke：`/api/model/call` 在 dev server 可达；`dist` / static preview 不声称提供 API。

## 后续动作

- 当前 PR 内修复 stage/schemaId runtime contract 和 refusal content 分类。
- 更新 planning 文档，把 “server-side wire-up 已完成” 降准为 “Vite local proxy handler 已完成”。
- Phase 3.4b 实现前端 `ProxyModelAdapter` 时必须复用现有 app-side semantic validation path，不要把 server structural success 直接写入 state。
- 后续单独规划可部署后端 adapter，不把 Vite dev middleware 当作最终部署方案。
