# PR #15: Frontend Test Harness

> 最近更新：2026-06-06  
> 对应 GitHub PR：#27 `chore/frontend-test-harness`

## 结论

这次 PR 是必要的横向工程质量补强，不属于新的产品 phase。它把 Phase 2.5 中最容易回归的区域纳入自动化检查：screenplay operations、组件行为、workbench smoke、output tabs、selected block toolbar 布局和 mobile fallback。

这让后续 Phase 3 接入真实模型时，可以更安心地改动工作流和 output panel，而不必每次都靠肉眼重新确认中央手稿编辑体验有没有被挤坏。

## 已落地内容

- 增加 `pnpm test`，使用 Vitest + Testing Library。
- 增加 `pnpm e2e`，使用 Playwright。
- 配置 Playwright 通过当前分支的 Vite server 访问 `127.0.0.1:5173`。
- 使用系统 Chromium `/usr/bin/chromium`，不下载 Playwright 托管浏览器。
- 增加 core operations、`ScenePage`、`ScriptEditorPanel` 和 workbench e2e 的第一批测试。

## 主要收益

- `src/core/screenplay/operations.ts` 的新增、删除、移动和更新行为有了回归护栏。
- 组件测试能覆盖空 title / synopsis、无角色时禁用 Dialogue draft 等边界。
- e2e 测试能覆盖评审会直接看到的工作台加载、output tabs、toolbar 不撑高 block、窄屏 toolbar 回退。
- 后续 UI polish 不再只依赖截图和主观判断。

## 风险和后续动作

- e2e 对本地环境有明确依赖：`127.0.0.1:5173` 必须由当前分支服务，且系统存在 `/usr/bin/chromium`。
- 如果 dev server 来自另一个 shell、另一个分支或不可被当前执行环境访问，Playwright 可能失败；这种失败应在 PR 中说明为环境问题，而不是直接归类为 UI 回归。
- 当前测试仍是第一批护栏，不覆盖完整 YAML serializer、validation、model trace 或真实模型失败恢复。
- Phase 3 引入模型层后，应补充 Architect / Writer contract、mock fallback、错误状态和 trace 展示的测试。

## 流程结论

提交前验证应跟随 `AGENTS.md`：

- 普通改动运行 `pnpm format:check`、`pnpm lint`、`pnpm build` 和 `pnpm test`。
- UI、editor、toolbar、output panel 或 responsive layout 改动额外运行 `pnpm e2e`。
- 无法运行 e2e 时，在 PR 的 verification 中写清楚环境原因和已经完成的替代验证。
