# Frontend Test Harness

> 最近更新：2026-06-06  
> 状态：基础接入已完成。它是横向工程质量轨道，不归入 Phase 2.5 / Phase 3 等产品阶段。

## 定位

前端测试不是新的产品 phase。它是贯穿后续 PR 的工程护栏，用来捕捉 lint / build 无法发现的编辑器行为和视觉回归。

引入测试的目标不是追求覆盖率数字，而是防止核心演示链路和手稿编辑体验反复破损：block 操作、scene metadata、YAML / diagnostics 联动、toolbar 布局和窄屏回退。

## 当前落地

已接入：

- `pnpm test`：Vitest + Testing Library。
- `pnpm e2e`：Playwright browser smoke / layout tests。
- `tests/core/`：覆盖 screenplay operations。
- `tests/components/`：覆盖 `ScenePage` 和 `ScriptEditorPanel` 的关键组件行为。
- `tests/e2e/`：覆盖 workbench smoke、output tabs、selected block toolbar 和 mobile fallback。

后续新增 UI、editor、toolbar、output panel 或 responsive layout 改动时，应按 `AGENTS.md` 额外运行 `pnpm e2e`，或在 PR 中明确说明无法运行的环境原因。

## 推荐工具

### Vitest + Testing Library

用于纯函数、React 组件行为和状态联动。

优先覆盖：

- `src/core/screenplay/operations.ts`：append / insert 继承 `sourceRefs`，delete / move / update 行为稳定。
- `validateScreenplayDocument` 和 YAML serializer 的关键约束。
- `ScenePage`：空 `title` / `synopsis` 仍渲染可编辑控件。
- `ScriptEditorPanel` / `BlockToolbar`：无角色时禁用 Dialogue draft。

### Playwright

用于浏览器级 smoke、交互和布局断言。

本仓库默认使用系统 Chromium（Arch / pacman：`/usr/bin/chromium`）运行 e2e，不使用 `pnpm exec playwright install` 下载 Playwright 托管浏览器，避免和系统包管理边界混用。

Playwright 固定使用 `127.0.0.1:5173`。运行 `pnpm e2e` 前，确认 5173 空闲，或已经由本仓库当前分支的 `pnpm dev --host 127.0.0.1 --port 5173 --strictPort` 提供服务。

优先覆盖：

- 首页加载并显示 Source / Semantic Blocks / Output。
- 点击或聚焦 block 后，toolbar 出现且不遮挡正文。
- selected block 高度不被 toolbar 撑高。
- scene heading 保持紧凑的 `INT. LOCATION - TIME` 节奏。
- 窄屏 viewport 下 toolbar 进入 inline 回退，不挤压正文。
- YAML / Diagnostics tabs 可切换。

## 建议脚本

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "e2e": "playwright test",
  "e2e:ui": "playwright test --ui"
}
```

提交前常规检查可以扩展为：

```text
pnpm lint
pnpm build
pnpm format:check
pnpm test
pnpm e2e
```

## 已完成 PR 切片

已作为独立 engineering PR 引入，不挂到任一产品 phase：

1. 安装并配置 Vitest、Testing Library 和 Playwright。
2. 增加 operations / validation / serialization 的第一批单元测试。
3. 增加 App smoke 和 manuscript toolbar 的第一批 Playwright 测试。
4. 在 PR review 模板或开发流程中标注：UI polish PR 必须说明是否跑过截图 / e2e 检查。

当前基础已完成；后续重点是随功能增长补测试，而不是追求一次性高覆盖。

## 非目标

- 不引入 Storybook，除非后续需要组件展示目录或设计系统文档。
- 不追求全量视觉快照；先用少量 bounding box / visibility / viewport 测试拦住高风险回归。
- 不让测试阻塞所有探索性 UI PR；但影响 editor 主流程、toolbar、scene metadata、YAML 导出的 PR 应补测试或说明缺口。
