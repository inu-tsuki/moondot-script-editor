# PR #8 Review: Scene Outline Confirmation

> 最近更新：2026-06-06  
> GitHub PR：[#15](https://github.com/inu-tsuki/moondot-script-editor/pull/15)  
> 对应分支：`feat/scene-outline-confirmation`（base = `main`）  
> 对应提交：
>
> - `65d3f2b feat: add scene outline confirmation`

## 审阅结论

PR #8（GitHub PR #15）落地了 Roadmap Phase 2.3 的核心目标：在改编工作流中建立“Human-in-the-loop”（人工介入）的暂停与确认机制，使用户的干预成为正式的工作流节点。

- **管线拆分**：将原来一镜到底的 `adaptNovelToScreenplayMock` 拆分为 `planNovelAdaptationMock`（生成大纲阶段）与 `draftNovelAdaptationFromPlanMock`（草稿编写阶段）。保留了原始 `adaptNovelToScreenplayMock` 作为两个阶段的组合 fallback。
- **阶段性控制 UI**：在应用主操作区和 Scene Outline 面板区新增了“写入（确认写入）”按钮。现在点击“大纲”按钮只会生成中间态的 Plan，必须再点击“确认写入”才会将其转化为实际的剧本 Block。
- **状态防御**：新增了 `isCurrentPlanDrafted` 状态，判断当前生成的 Plan 是否已经被写入剧本，并以此禁用冗余的二次写入操作。

本次改动防止了“一键生成黑盒”成为唯一交互路径，让原本仅用于展示的 Plan 数据结构成为拦截和控制生成管线的关键节点，进一步体现了 Agent 工作流的步骤可控性。

---

## Review 观察

### 1. 代码解耦与架构一致性

原有的单次 mock 生成逻辑被拆成 plan / draft 两个可单独调用的函数。代码层面，Prompt Message 和 Trace 的组装过程也按阶段拆开，两个阶段各自维护诊断信息（`mock_adaptation_plan_used` / `mock_writer_draft_used`），结构比之前更接近真实 agent workflow。

### 2. UI 交互体验

- 按钮状态清晰：利用 `disabled={isCurrentPlanDrafted}` 防护了用户的重复点击行为。
- 面板内聚：在 Scene Outline 面板内同样加入了 `outline-actions`，用户审完大纲后可以直接确认，不必回到 topbar。
- （结合 `gh pr view` 里的 Notes）虽然目前暂时还不支持用户直接编辑单个 Scene Card，但这个“确认”节点的设立为未来的扩展打好了基建。

### 3. 边界与残留风险

- `draftNovelAdaptationFromPlanMock` 假设传入的 `plan` 已经来自当前 document/source。当前 App 在 source text 和 preferences 变化时会清空旧 plan，可以避免 UI 层使用过期 plan；如果后续把 draft 函数暴露给更多调用方，需要补 plan/source 一致性校验。
- 当前确认只支持“接受整份 outline”，还没有单个 `SceneCard` 的编辑、删减、重排能力。Phase 2.3 先建立暂停点是合理的，但 demo 讲解时要避免把它说成完整可编辑大纲。

---

## 本分支后续处理状态

已解决的事项：

- Roadmap Phase 2.3 的“流程暂停与确认”节点确立。
- 解决了前面 PR 中提到的“Generate 按钮一口气跑完所有流程，没有给用户真正参与 Architect 之后的工作留出余地”的问题。

后续演进（Phase 2.3+ / Phase 2.4）：

- **编辑能力支持**：就像 PR Notes 里提到的 "scene card editing remains a later enhancement"，未来应该允许在点击“写入”之前，对大纲内的卡片进行增删改。
- **局部重写**：当支持单场卡片修改后，可能会延伸出“重新生成单场戏”的需求，这需要对 ID 系统和 Patch 更新逻辑进行更细致的设计。

---

## 可粘贴到 GitHub PR 的 Review Comment

```md
### PR Review & Alignment Notes

This PR implements the "human review pause" described in Phase 2.3 of our roadmap. By splitting the workflow into `plan` and `draft` steps, it turns the generator from a one-shot action into a controllable agentic pipeline.

Highlights:

- **Architectural Clarity**: Separating `planNovelAdaptationMock` and `draftNovelAdaptationFromPlanMock` keeps responsibilities distinct while leaving a functional one-shot composite adapter for fallback scenarios.
- **Great UX Protections**: The `isCurrentPlanDrafted` state correctly disables the confirm button after it's been clicked, preventing accidental duplicated draft outputs.
- **Contextual UI**: Adding the confirmation button directly inside the outline panel keeps the accept action close to the artifact being reviewed.

Observations & Next Steps:

- As noted in your PR description, scene card editing is the natural next step. The architecture introduced here provides the exact necessary pause in the lifecycle to plug in an editable form for the `SceneCard`s in the future.
- Future callers of `draftNovelAdaptationFromPlanMock` should eventually validate that the plan still belongs to the active source/document before drafting.
```
