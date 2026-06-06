# PR #13 Review: Basic Semantic Editor Controls

> 最近更新：2026-06-06  
> GitHub PR：[#25](https://github.com/inu-tsuki/moondot-script-editor/pull/25)  
> 对应分支：`feat/basic-semantic-editor-controls`（base = `main`）  
> 对应功能提交：
>
> - `e64e3be feat: add basic semantic editor controls`
> - `ef62ce6 refactor: use ghost inputs and non-intrusive toolbar`

## 审查规划

本次 review 以 Phase 2.5.5b 的完整编辑闭环为主线：中央编辑区应继续是 `ScreenplayDocument` 驱动的 Fountain-like reading surface，同时补齐新增、删除、移动、角色修正、括号提示和 scene metadata 编辑。

主要依据：

- `docs/planning/roadmap/phase-2-5-workbench-ui-foundation.md`：Phase 2.5.5b 完成标准，以及 Phase 2.5.6 工业化手稿 UI polish 的衔接。
- `docs/knowledge/interaction/screenplay-editor-ux.md`：selected / focused 状态、block toolbar、add block menu、dialogue editing 和 scene metadata editing 的交互边界。
- `docs/knowledge/interaction/semantic-block-editing.md`：主输入模型仍是 document / AST 语义块编辑，不引入 Fountain 文本反解析。
- `docs/knowledge/interaction/fountain-reading-surface-research.md`：Fountain-like 排版语言如何映射到 scene heading、action、dialogue、transition 和 note。
- `docs/knowledge/architecture/document-workspace-boundary.md`：`ScreenplayDocument` 是可编辑语义快照，source refs 等轻量追溯信息仍应被谨慎保留。

## 审阅结论

PR #13（GitHub PR #25）补齐了 2.5.5b 的主要能力：它增加了纯函数操作层、block toolbar、指定类型新增、场景元数据编辑、dialogue 角色与 parenthetical 编辑，并让 `selectedBlockId` 保持在 UI state 中。

但当前实现仍不建议直接合并。它存在几个会把 document 推入错误或弱化来源追溯的边界问题；同时，UI/UX 现在仍处在“表单控件伪装成稿纸”的中间态，阅读态、选中态和编辑态没有足够清晰地分层。建议先修复前三个 findings，再把 UI 指导作为 2.5.5b 收口或 2.5.6 的第一项实现输入。

## Findings

### 1. 新增和插入 block 会丢失 scene sourceRefs

- 位置：`src/core/screenplay/operations.ts:78`、`src/core/screenplay/operations.ts:111`
- 严重度：Medium

`appendBlockToScene` 和 `insertBlockAfter` 创建 `nextBlock` 时只写入 `id` 和 `draft`，没有继承当前 scene 的 `sourceRefs`。在 base 分支中，`appendBlockToFirstScene` 会给新 block 写入 `sourceRefs: scene.sourceRefs`。这个 PR 扩展到任意 scene 后，反而让手动新增的 block 静默失去来源覆盖信息。

这会削弱 YAML projection、source coverage 和后续生成/审查链路对“该剧本块来自哪个来源片段”的理解。即使手动新增内容不一定完全来自原文，也应明确采用一个策略：继承 scene source refs，或引入显式的 manual origin 标记；不要在新增路径中悄悄丢掉已有的追溯上下文。

建议：把 block draft 转换为 `ScriptBlock` 的逻辑放到知道 scene 的位置执行，并默认带上 `sourceRefs: scene.sourceRefs`。如果未来要区分人工新增内容，再扩展更明确的 provenance 字段。

### 2. 没有角色时仍可创建无效 dialogue block

- 位置：`src/components/panels/ScriptEditorPanel.tsx:32`、`src/components/panels/BlockToolbar.tsx:32`
- 严重度：Medium

两个 `buildDefaultDraft('dialogue')` 都使用 `(firstCharacterId ?? '') as CharacterId`。当 document 没有角色时，用户点击 Dialogue 会生成 `characterId: ''` 的对白块。校验器会在 `src/core/validation/validateScreenplayDocument.ts:94` 报 `missing_dialogue_character`，说明这是一个会被 UI 一键制造出的无效 document 状态。

这也违背了 `screenplay-editor-ux.md` 中“没有角色时不要生成无效 characterId”的约束。

建议：抽出共享的 `buildDefaultBlockDraft`，让 dialogue 在无角色时返回 `null` 或 disabled menu item；UI 可显示“先创建角色”入口。不要用类型断言掩盖运行时无效值。

### 3. 清空 scene title 后，必填标题编辑器会消失

- 位置：`src/components/panels/ScenePage.tsx:185`
- 严重度：Medium

`scene.title` 只有 truthy 时才渲染 input。用户把标题删空后，`updateSceneMetadata` 会写入空字符串，下一次 render 中 input 直接消失。校验器在 `src/core/validation/validateScreenplayDocument.ts:201` 又要求 scene title 非空，于是用户会被困在一个有 error、但没有原位修复控件的状态。

`scene.synopsis` 也有类似问题，虽然 synopsis 不是必填项，但它让用户无法给缺失 synopsis 的场景补回摘要。

建议：scene title 和 synopsis 字段始终渲染。空值时使用低调 placeholder 和 ghost control 样式，而不是条件隐藏。

## UI/UX Implementation Guidance

当前 UI 的主要问题不是单个按钮或颜色，而是页面层级没有真正服务“工业化手稿编辑器”。中央编辑区、辅助面板和工具条都在争抢同一个视觉层，导致它既不像沉浸式剧本稿纸，也不像稳定的生产工具。

建议代码编辑者按以下方向改：

1. 重建中央编辑层级：`ScriptEditorPanel` 内引入 `ManuscriptSurface`，让 `ScenePage` 成为纸面，而不是 `PanelShell` 里的又一张 card。中央列应明显大于左右列，左右面板更像工具托盘、批注栏和生产记录。

2. 明确 reading / selected / focused 三态：reading 态只显示剧本排版；selected 态在 block gutter 显示轻量 toolbar；focused 态显示稳定编辑 affordance。不要用 `role="button"` 的 block 外壳包住 textarea / select / input，选择行为应交给 gutter handle 或独立命中区域。

3. 把 toolbar 放入 gutter 或文档流：当前 `absolute top-full` 的 toolbar 容易覆盖下一段文本。更好的结构是 `[gutter toolbar] [script block content]`，移动端再折叠成 more menu。

4. 建立统一稿纸排版 tokens：抽出 `manuscriptText`、`manuscriptField`、`blockShell` 等 class 组合，避免每个 editor 自己拼颜色、间距和 focus 行为。focus 态不要改变 padding、宽度或文本对齐，以免稿纸跳动。

5. 让 scene header 像真正的场景行：scene heading 维持全大写和强排版权重；title / synopsis 始终可编辑；scene id 和其他 metadata 放到更安静的位置，不要抢标题视觉。

6. 降低左右辅助区噪声：source、outline、YAML、diagnostics 不应和中央稿纸同等卡片化。它们可以更紧凑、更灰、更像审稿索引和输出记录，让中央手稿成为第一视觉中心。

一句话目标：这是结构化数据驱动的剧本稿纸，不是把表单控件换皮成剧本文字。控件应藏进边缘和状态里，document / AST 仍是唯一编辑事实源。

## Review 观察

### 1. 操作层方向正确，但需要更严格的 draft 边界

把新增、插入、删除、移动、角色更新和 scene metadata 更新放到 `src/core/screenplay/operations.ts` 是正确方向。下一步应把 `BlockDraft -> ScriptBlock` 的补全规则集中起来，避免 UI 组件重复实现默认 block 逻辑。

### 2. UI state 没有污染 document

`selectedBlockId` 仍在 `App.tsx` 内作为 UI state 管理，没有进入 `ScreenplayDocument`。这符合 document / workspace 边界文档中“不把当前 UI 选择态写入 document”的约束。

### 3. 基础编辑闭环已经接近成型

用户已经可以在中央页完成大部分基础打磨动作：改文本、改场景 heading、改角色、改 parenthetical、新增指定类型、删除和移动 block。修复以上 findings 后，这条链路会更接近 Phase 2.5.5b 完成标准。

## 验证记录

- `pnpm lint`：通过。
- `pnpm build`：通过。
- `pnpm format:check`：通过。
- `git diff --check main...HEAD`：通过。

当前没有 Playwright / Vitest 测试栈；本 PR 涉及核心编辑体验，仍建议人工运行 `pnpm dev`，检查桌面和窄屏下的 selection、toolbar、长文本输入、scene title 清空、无角色新增 dialogue、删除最后一个 block 等路径。

## 本分支后续处理建议

合并前建议：

- 修复新增 / 插入 block 的 `sourceRefs` 继承策略。
- 禁止无角色状态下生成无效 dialogue draft。
- 让 scene title / synopsis 字段在空值时仍可编辑。

后续 PR 建议：

- 抽共享 `buildDefaultBlockDraft`、`ScriptTextarea` 或 `AutoResizeTextarea` primitive。
- 将 `BlockToolbar` 移入 block gutter 或文档流，避免覆盖稿纸内容。
- 进入 Phase 2.5.6：Industrial manuscript UI polish，让整页外壳服从中央手稿风格。

## 可粘贴到 GitHub PR 的 Review Comment

```md
### PR Review: Phase 2.5.5b

This PR moves the central reading surface much closer to a real semantic editor: the pure operation layer, block toolbar, typed add menu, scene metadata editing, dialogue character editing, and parenthetical editing all match the planned 2.5.5b direction.

I recommend addressing these before merge:

1. `appendBlockToScene` and `insertBlockAfter` create blocks without inheriting the current scene's `sourceRefs`, which regresses source coverage/provenance from the previous append path.
2. Dialogue draft creation casts `''` to `CharacterId` when the document has no characters, so the UI can create an invalid dialogue block with one click.
3. Scene title is conditionally rendered only when truthy; clearing it removes the only in-place editor even though validation requires a non-empty title.

The UI also needs a focused polish pass: central editor should become a true manuscript surface, selection controls should move into a block gutter or document flow, and reading / selected / focused states should be visually distinct without layout jumps.

Validation passed:

- `pnpm lint`
- `pnpm build`
- `pnpm format:check`
- `git diff --check main...HEAD`
```
