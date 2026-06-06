# PR #12 Review: Screenplay Reading Surface

> 最近更新：2026-06-06  
> GitHub PR：[#24](https://github.com/inu-tsuki/moondot-script-editor/pull/24)  
> 对应分支：`feat/screenplay-reading-surface`（base = `main`）  
> 对应功能提交：
>
> - `325e209 feat: add screenplay reading surface with per-block editors`
> - `34eefd1 docs: add Fountain reading surface research notes`
> - `1bb8791 docs: add industrial manuscript UI polish plan`

## 审查规划

本次 review 以 Phase 2.5.5 的文档标准为主线：中央编辑区应成为由 `ScreenplayDocument` 支撑的 Fountain-like reading surface，而不是普通 textarea 卡片列表。

主要依据：

- `docs/planning/roadmap/phase-2-5-workbench-ui-foundation.md`：Phase 2.5.5 完成标准和 Phase 2.5.6 UI polish 衔接。
- `docs/knowledge/interaction/semantic-block-editing.md`：主编辑仍是 document / AST 语义块编辑，不引入 Fountain 文本主输入。
- `docs/knowledge/interaction/workbench-layout.md`：中央 `ScenePage` 是主稿纸，辅助区不应争夺注意力。
- `docs/knowledge/interaction/fountain-reading-surface-research.md`：Fountain 规则到 `ScriptBlock` 排版的映射。
- Fountain 官方语法文档：用于核对 scene heading、action、dialogue、parenthetical、transition、note 等排版依据。

## 审阅结论

PR #12（GitHub PR #24）方向正确：它把 `ScriptEditorPanel` 中的卡片式 block 列表拆成 `ScenePage` 和五类 block editor，让 action、dialogue、narration、transition、note 呈现出接近剧本阅读面的视觉差异。

它也守住了关键边界：没有引入 `contenteditable`、Fountain parser、反解析状态或新的 document 类型。编辑仍通过 block id 回写 `ScreenplayDocument`。合并前建议处理一个编辑可靠性问题，并对窄屏 dialogue 排版做一次轻量修正。

## Findings

### 1. 自动高度 textarea 没有响应 focus 样式变化

- 位置：`src/components/panels/editors/ActionBlockEditor.tsx:12`、`DialogueBlockEditor.tsx:13`、`NarrationBlockEditor.tsx:19`、`NoteBlockEditor.tsx:12`、`TransitionBlockEditor.tsx:12`
- 严重度：Medium

五个 block editor 都在 `useEffect([block.text])` 中把 textarea 高度设为 `scrollHeight`。但 focus 样式会改变 padding、border 和部分排版，例如 `focus:px-2 focus:py-1`，`DialogueBlockEditor` 还会从 `text-center` 切到 `focus:text-left`。这些变化会改变 textarea 的可用内容高度和换行结果，却不会触发高度重算。

结果是：用户聚焦长文本时可能出现内容被裁切、光标区域被遮住，或失焦后留下多余高度。由于 textarea 同时设置了 `overflow-hidden`，这类问题在手稿编辑里会很明显。

建议：优先让 focus 态不改变 padding，只改变 border/background；或者抽一个共享 `AutoResizeTextarea`，在 `onFocus`、`onBlur`、`onInput` 和 value 更新后统一重算高度。这样既减少重复逻辑，也避免编辑时的版面跳动。

### 2. Dialogue 宽度在窄屏下可能过窄

- 位置：`src/components/panels/editors/DialogueBlockEditor.tsx:22`
- 严重度：Low

`DialogueBlockEditor` 使用 `max-w-[65%]`。在桌面中栏这接近剧本对白缩进，但移动端或较窄桌面下，65% 会让对白列过窄，中文对白更容易频繁换行。与此同时 focus 时变成左对齐，会让编辑状态和阅读状态发生明显重排。

建议：加入响应式宽度，例如窄屏使用 `max-w-full`，宽屏再回到 65%；或使用固定上限加可用宽度的组合。是否保留 focus 左对齐也应和自动高度修复一起验证。

## Review 观察

### 1. 组件层级符合 2.5.5 目标

`ScriptEditorPanel -> ScenePage -> per-block editor` 的层级与规划一致。`ScenePage` 负责 scene heading / title / synopsis 和 block 分发，具体 block editor 负责排版和文本编辑。

### 2. Document 边界保持干净

本 PR 没有改变 `ScreenplayDocument`、`SceneNode` 或 `ScriptBlock` 类型。角色名仍从 `charactersById` 映射得到；对白、旁白、转场和批注仍编辑各自 block 的 `text` 字段。

### 3. Fountain-like 只作为阅读面语言

实现没有引入 Fountain 文本状态，也没有从 Fountain 反解析回 AST。这符合“Fountain-like 是 projection 和视觉语言，不是主输入格式”的边界。

### 4. 2.5.6 UI polish 的必要性更明确

中央阅读面已经显著接近工业化手稿；下一步需要让页面外壳、辅助面板、diagnostics 和 output tabs 也降低普通 dashboard 感，避免中央手稿和外层 UI 气质脱节。

## 验证记录

- `pnpm lint`：通过。
- `pnpm build`：通过。
- `pnpm format:check`：通过。
- `git diff --check main...HEAD`：通过。

当前没有 Playwright / Vitest 测试栈；本 PR 强依赖视觉和输入体验，建议合并前人工运行 `pnpm dev`，检查桌面和窄屏下的 focus、长文本换行、textarea 自动高度和 block 间距。

## 本分支后续处理建议

合并前建议：

- 修复 textarea 自动高度与 focus 样式变化之间的裁切/跳动风险。
- 给 Dialogue block 增加窄屏宽度策略。

后续 PR 建议：

- 进入 Phase 2.5.6：Industrial manuscript UI polish。
- 再评估是否需要抽共享 `AutoResizeTextarea` / `ScriptTextarea` primitive。
- 暂缓 `contenteditable`、Fountain parser、富文本 overlay 和复杂 block 工具条。

## 可粘贴到 GitHub PR 的 Review Comment

```md
### PR Review: Phase 2.5.5

The direction is strong: `ScriptEditorPanel -> ScenePage -> per-block editors` matches the planned ScreenplayDocument-backed Fountain-like reading surface. The PR keeps the model boundary clean: no `contenteditable`, no Fountain parser, no reverse parsing state, and no `ScreenplayDocument` / `ScriptBlock` type changes.

Two issues to address before merge:

1. Each auto-resizing textarea recalculates height only when `block.text` changes, but focus styles add padding/border and, for dialogue, change alignment. With `overflow-hidden`, long text can be clipped or leave extra height when focus changes. Prefer stable padding across focus states, or extract a shared auto-resize textarea that recalculates on focus/blur/input/value updates.
2. Dialogue uses `max-w-[65%]` everywhere. That works for desktop screenplay indentation, but is likely too narrow on mobile/narrow panels. Add a responsive fallback such as full width on narrow viewports.

Validation passed:

- `pnpm lint`
- `pnpm build`
- `pnpm format:check`
- `git diff --check main...HEAD`

Manual visual/input QA is still recommended because this PR changes the core editing feel.
```
