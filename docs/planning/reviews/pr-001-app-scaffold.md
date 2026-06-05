# PR #1 Review: App Scaffold

> 最近更新：2026-06-05  
> 对应分支：`feat/app-scaffold`  
> 对应提交：`7ea384d feat: scaffold vite react app`

## 合并结论

PR #1 完成了月点的可运行脚手架：

- React + TypeScript + Vite。
- pnpm lockfile。
- `.editorconfig`、Prettier、ESLint。
- 月点工作台首屏骨架。
- source 输入、语义块 mock、YAML projection、diagnostics preview。

这个 PR 可以合并，因为它建立了后续工程工作的最小运行基座。

长期布局规划见 `../../knowledge/interaction/workbench-layout.md`。本文只记录 PR #1 合并后的 review 观察和 follow-up。

## Review 观察

### 1. 样式工具暂不扩展

当前不引入 UnoCSS 或 Tailwind。

原因：

- 第一批 UI 文件数量少，手写 CSS 更直观。
- 当前重点是确定产品结构、数据模型和生成链路，不是建立完整设计系统。
- UnoCSS / Tailwind 会增加 class 组织和配置成本，容易让脚手架 PR 膨胀。

后续触发条件：

- 组件数量增长，button、panel、tab、badge、spacing 等样式重复明显。
- 需要快速迭代复杂响应式布局。
- 已经形成稳定的设计 token 和组件层级。

如果未来引入，优先比较 Tailwind 与 UnoCSS：

- Tailwind：生态稳定，评审和合作者更容易理解。
- UnoCSS：更轻、更灵活，但配置表达更偏工程化。

当前判断：未来候选里 Tailwind 优先级高于 UnoCSS；当前 PR 继续使用普通 CSS。

### 2. 当前三栏 UI 只是骨架

当前 UI 的三栏布局可以证明产品结构，但不是最终编辑体验。

已知不足：

- 三栏比例偏固定，中部编辑区不够舒展。
- 中部语义块还没有呈现 fountain-like 的阅读排版。
- 右侧 YAML 占据固定空间，未来应成为可切换 projection 面板。
- source 输入在生成后应允许折叠，否则会挤占剧本阅读和编辑区域。
- scene / block 样式仍偏表单，后续要更像剧本文字。

这些不是 PR #1 的 blocker，但会影响后续 UI 质量。

### 3. 不直接搬 KMD dock 系统

可以借鉴 `playground/kmd` 的 dock / workbench 信息架构，但不建议直接搬完整 dock 代码。

可以借鉴：

- 可折叠 panel。
- 可切换 tab。
- 主编辑区优先。
- diagnostics / preview / source 作为辅助面板。

暂不搬迁：

- KMD 的完整 dock 系统。
- Vue/Pixi 相关编辑器壳。
- 与当前 React 工作台不匹配的状态管理和运行时结构。

后续如果需要更强布局能力，优先考虑 React 中的轻量 resizable panels 或专门的 React panel library。

### 4. Fountain-like 是阅读语言，不是主编辑器

当前 demo UI 没有真正呈现 fountain-like 排版，这是后续需要修正的视觉和交互问题。

后续应做到：

- Scene heading 以清晰的场景行样式展示。
- Action 块像剧本正文段落，而不是普通 textarea。
- Dialogue 块突出角色名、对白和 parenthetical。
- Narration / voice-over 和 transition 有独立视觉层级。
- Note 不干扰最终阅读，可以轻量折叠或弱化。

主编辑仍然编辑 AST 字段；fountain-like 是阅读投影和视觉语言。

## 后续动作

建议后续 UI 相关 PR 按这个顺序推进：

1. 把 source、editor、output 拆成独立 React 组件。
2. 让 output 变成 tabbed panel：Fountain-like、YAML、Diagnostics。
3. 扩大语义编辑区，让 scene 内容成为主阅读区域。
4. 实现更像剧本排版的 block rendering。
5. 再评估是否需要 resizable panel 或 dock。

这些动作不应阻塞下一个核心工程分支。下一个分支优先进入 `ScreenplayAst` 类型与校验层。

## 可粘贴到 GitHub PR 的 Review Comment

```md
Merged with one follow-up note:

The scaffold is good enough as the first runnable base, but the current three-column UI should be treated as a workbench skeleton rather than the final editing layout.

Follow-up decisions:

- Do not introduce Tailwind or UnoCSS yet. Plain CSS is enough for PR #1; revisit once component repetition appears.
- Do not migrate the full KMD dock system. Borrow the workbench idea: collapsible panels, tabs, main editor first.
- The semantic editor needs more reading/editing space in later UI PRs.
- Fountain-like formatting should become the visual language for preview/block rendering, not the primary editor format.

Next UI work should split source/editor/output into components, turn output into tabs, and make the semantic script area the primary reading surface.
```
