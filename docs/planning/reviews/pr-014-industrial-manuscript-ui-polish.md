# PR #14 Review: Industrial Manuscript UI Polish

> 最近更新：2026-06-06  
> GitHub PR：[#26](https://github.com/inu-tsuki/moondot-script-editor/pull/26)  
> 对应分支：`feat/industrial-manuscript-ui-polish`（base = `main`）  
> 对应功能提交：
>
> - `b418ce5 feat: industrial manuscript UI polish (Phase 2.5.6)`
> - `91cf31d refine: eliminate focus layout shifts and tighten block UX`

## 审查规划

本次 review 以 Phase 2.5.6 的工业化手稿 UI polish 为主线：中央编辑区应成为稳定稿纸，左右面板应退为工具托盘和生产记录，toolbar 应进入可预期的 gutter，而不是覆盖或撑乱正文。

主要依据：

- `docs/planning/roadmap/phase-2-5-workbench-ui-foundation.md`：Phase 2.5.6 的 `ManuscriptSurface`、block selection、toolbar、manuscript tokens 和 manual QA 标准。
- `docs/knowledge/interaction/screenplay-editor-ux.md`：selected / focused 状态与右侧小气泡 toolbar 规格。
- `docs/knowledge/interaction/semantic-block-editing.md`：主编辑仍是 `ScreenplayDocument` / AST 语义块编辑。
- `docs/planning/reviews/pr-013-basic-semantic-editor-controls.md`：2.5.5b review 中提出的 UI/UX implementation guidance。
- 人工截图观察：用户提供的 1920x1080 桌面截图，覆盖默认三栏、中央手稿、selected block toolbar 和左右辅助面板。

## 审阅结论

PR #14（GitHub PR #26）方向正确：它引入 `ManuscriptSurface`，把 toolbar 从正文下方 overlay 移到 block row 右侧，修复了 2.5.5b 的三个数据/编辑问题，并显著降低了辅助 panel 的 dashboard 感。

但当前实现仍不建议直接合并。截图和代码都显示 selected block 的视觉节奏被 toolbar 布局打断；scene heading 的输入框默认宽度让场景行被拉散；窄屏 toolbar 回退没有实现。它已经越过了“普通表单”的阶段，但还没有到“稳定稿纸”的阶段。建议先处理下面三个 findings。

## Findings

### 1. 右侧 toolbar 纵向占位会把每个 selected block 撑成大块

- 位置：`src/components/panels/ScenePage.tsx:120`、`src/components/panels/BlockToolbar.tsx:50`
- 严重度：Medium

规划要求 toolbar 是右侧小气泡：视觉上 floating，布局上不遮挡正文，主体约 32px 高。当前实现把 block row 定义为 `grid-cols-[32px_1fr_auto]`，右侧 toolbar 是 `flex flex-col`，四个 28px icon button 纵向排列。因为它在 grid flow 中参与高度计算，selected action block 被撑成约 120px 的浅色块。

截图中第一段 action 只有一行，但选中态背景覆盖了大片垂直空间，后续 dialogue 被明显下推。这等于用 toolbar 的高度定义了剧本文本节奏，违背了“控件藏进边缘和状态里”的目标。

建议：把 toolbar 改为横向 32px 高气泡，或让右侧 toolbar 在 row 内绝对定位到 gutter，不参与 block 高度计算。主动作保留 4 个 icon button 时应横排；如果右侧空间不足，保留一个 more / plus 按钮，move/delete 收进菜单。无论采用哪种方式，selected block 的最小高度不应由 toolbar 决定。

### 2. Scene heading 字段使用原生 input 默认宽度，场景行被拉散

- 位置：`src/components/panels/ScenePage.tsx:196`、`src/components/panels/ScenePage.tsx:210`
- 严重度：Low

`Location` 和 `Time of day` 使用 `input`，但 `manuscriptFieldInline` 只有 `w-auto`。原生 text input 仍有默认 size，截图里 `INT.`、`咖啡厅`、`-`、`夜` 被拉到很远的位置，场景行不像剧本 heading，更像几个表单字段散在一行。

这会削弱 2.5.6 的核心视觉目标：用户第一眼应看到紧凑、有秩序的场景行。

建议：给 heading input 设置内容感宽度，例如 `w-[10ch]` / `w-[14ch]`、`max-w-full`，或用 style 依据 `value.length` 计算 `ch` 宽度。短值不应占据长输入框空间；长地点应允许换行，但不要把 `- timeOfDay` 推到页面右侧。

### 3. 窄屏 toolbar 回退仍未实现

- 位置：`src/components/panels/ScenePage.tsx:122`、`src/components/panels/BlockToolbar.tsx:81`
- 严重度：Medium

Phase 2.5.6 规划要求窄屏下 toolbar 改为 block 下方 inline menu，Add after 菜单也不应硬浮动。当前 block row 在所有 viewport 都使用 `grid-cols-[32px_1fr_auto]`，insert menu 永远 `absolute right-full top-0`。

在手机或窄桌面上，右侧 gutter 会继续挤压正文，insert menu 可能越过稿纸或遮挡文字。这个风险无法通过桌面截图完全暴露，但代码没有任何 responsive fallback。

建议：在 `max-[760px]` 下把 block row 改成单列或两列，让 toolbar 进入正文下方的 inline row；insert menu 改为 `left-0 top-full` 或直接 inline 展开。这样满足“移动端不依赖 hover，关键操作可发现”的 UX 原则。

## Visual Review Notes

基于用户提供的桌面截图：

- 中央区域已经比 2.5.5b 更安静，`ScenePage` 不再是明显卡片，这是正确方向。
- 左右辅助 panel 的色彩降噪有效，但中央稿纸仍像填满整个中栏的大面板，缺少更明确的稿纸版心和边距层级。
- selected block 的浅色背景面积过大，视觉重心被 toolbar 拉走。
- 右侧 icon 列看起来像行内控件栈，不像规划中的小气泡。
- scene heading 的三个字段间距过散，削弱了剧本场景行的工业排版感。

## Review 观察

### 1. 2.5.5b 的核心数据 findings 已修复

`appendBlockToScene` 和 `insertBlockAfter` 现在继承 `scene.sourceRefs`；`buildDefaultBlockDraft` 在无角色时返回 `null`；scene title / synopsis 始终可编辑。这些修复让基础编辑闭环比上一轮稳定很多。

### 2. Document / UI state 边界仍然干净

`selectedBlockId` 仍留在 `App.tsx`，没有进入 `ScreenplayDocument`。本 PR 没有引入 Fountain 文本状态、`contenteditable` 或反解析。

### 3. Manuscript tokens 方向正确，但还需要组件化

`ScenePage` 中的 `manuscriptField` / `manuscriptText` 让 focus 不再改变 padding，这很好。下一步可以把 textarea auto-resize 和稿纸字段样式抽成 `ScriptTextarea` / `ManuscriptField`，避免 ScenePage 继续变成样式中枢。

## 验证记录

- `pnpm lint`：通过。
- `pnpm build`：通过。
- `pnpm format:check`：通过。
- `git diff --check main...HEAD`：通过。
- `pnpm dev --host 127.0.0.1 --port 5173`：通过，Vite dev server 启动。
- `curl -I http://127.0.0.1:5173/`：返回 `HTTP/1.1 200 OK`。

当前没有 Playwright / Vitest / Storybook 测试栈；本次 review 使用用户提供的桌面截图做视觉审查。建议修复后补一次桌面和窄屏截图，重点检查 selected block 高度、toolbar、insert menu、scene heading 和 dialogue 宽度。

## 本分支后续处理建议

合并前建议：

- 把 toolbar 改成不撑高 block 的 32px 气泡或不参与高度计算的 gutter overlay。
- 收紧 scene heading input 的宽度，让 `INT. LOCATION - TIME` 恢复剧本场景行节奏。
- 实现窄屏 toolbar / insert menu 回退。

后续 PR 建议：

- 抽 `ScriptTextarea` / `ManuscriptField`，集中 auto-resize、focus 和稿纸字段样式。
- 给 `ManuscriptSurface` 加更明确的版心上限和 paper gutter 策略。
- 增加轻量视觉回归手段，例如 Playwright 截图 smoke test 或 Storybook stories。

## 可粘贴到 GitHub PR 的 Review Comment

```md
### PR Review: Phase 2.5.6

The direction is right: `ManuscriptSurface`, source-ref preservation, invalid-dialogue prevention, always-editable scene metadata, and quieter auxiliary panels all move the editor toward the planned industrial manuscript feel.

I recommend addressing three issues before merge:

1. The right toolbar is vertical and participates in grid layout, so selecting a one-line block creates a tall highlighted area. The toolbar should behave like a 32px bubble/gutter control and should not define block height.
2. Scene heading inputs keep native text-input width, so `INT. LOCATION - TIME` is visually stretched apart. These fields need content-like `ch` widths or dynamic sizing.
3. The narrow-screen toolbar fallback from the 2.5.6 plan is not implemented; `grid-cols-[32px_1fr_auto]` and `absolute right-full` are used at all viewport sizes.

Validation passed:

- `pnpm lint`
- `pnpm build`
- `pnpm format:check`
- `git diff --check main...HEAD`
- dev server smoke check returned HTTP 200

The supplied desktop screenshot was included in the UI review. The main visual issue is the selected block rhythm: controls are still visibly driving manuscript layout.
```
