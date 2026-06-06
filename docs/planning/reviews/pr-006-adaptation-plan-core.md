# PR #6 Review: Adaptation Plan Core

> 最近更新：2026-06-06  
> GitHub PR：[#11](https://github.com/inu-tsuki/moondot-script-editor/pull/11)  
> 对应分支：`feat/adaptation-plan-core`（base = `main`）  
> 对应提交：
>
> - `ecf6124 feat: add adaptation plan core`

## 审阅结论

PR #6（GitHub PR #11）实现了基于 `AdaptationPlan`（改编大纲）的中间态数据结构和 UI 呈现，极大提升了从小说章节到剧本节点转换过程的可解释性。

- 新增 `AdaptationPreferences`（改编偏好）：支持配置目标媒介、长度、忠实度、节奏、风格及合并/重组策略。
- 新增 `AdaptationPlan` 与 `SceneCard` 模型：将生成的逻辑分离为“大纲规划（Source Analysis & Scene Outline）”和“剧本草稿（Writer Draft）”两部分。
- 修改 `mockNovelAdaptation.ts`：通过 `createMockAdaptationPlan` 生成 mock 的场景卡片大纲，然后通过 `SceneCard` 驱动生成剧本块，打破了之前“一章对应一场戏”的刻板 mock。
- 修改 `App.tsx` 与 `App.css`：在侧边栏新增了 "Scene Outline" 面板以及生成轨迹（Trace）的呈现。

该变更进一步对齐了“通过 Agent 架构将复杂任务拆解”的设计目标，符合 `submission-rules.md` 中对于“作品完整度与创新性（产品设计合理）”的考察维度。

---

## Review 观察

### 1. `AdaptationPlan` 结构设计

#### ① 引入两阶段生成范式

之前 `mockNovelAdaptation` 直接把 Chapter 转为 Scene。本次重构中，`createMockAdaptationPlan.ts` 先根据来源生成 `AdaptationPlan`（包含 `sceneOutline` 等中间决策），然后再由 Writer 阶段根据 `sceneOutline` 里的 `writerBrief` 产出 SceneNode。

- 这不仅使得 mock 逻辑更接近未来的大模型 Prompt 管线，还为以后允许用户手动修改 `SceneCard`（Human-in-the-loop）打下了数据基础。

#### ② 跨章节组合 Mock 逻辑

- `createMockAdaptationPlan` 中，通过 `groupChaptersForScenes` 实现了简单的两章合并为一场戏的 mock 策略，修复了之前 Review（PR #5）中提到的“一章=一场戏与 prompt 协议冲突”的问题。
- 此逻辑在 trace 中明确标注，向评委清晰地解释了这里的规划意图。

### 2. UI 渲染与可观测性

#### ① Scene Outline 面板呈现

- `App.tsx` 增加 `adaptationPlan` 的渲染，使得剧本生成的中间过程不再是黑盒。用户能在界面上看到 `title`, `dramaticPurpose` 及来源映射（sourceRefs）。
- 对提交作品的“展示（Demo）”得分项有极大帮助：可以在 Demo 视频中着重讲解这个中间层（Agentic Workflow 的体现）。

#### ② Trace 跟踪完善

- 增加了 `GenerationRun` 和 `GenerationTraceStep`，并且在每一步加上了 `artifactType`。
- Trace 列表的显示也让生成的步骤（Source Analysis -> Planning -> Writer Draft）可视化。

### 3. 数据与类型安全

#### ① 遗留 Gap 修复

- PR #5 遗留了 mock fallback 未呈现跨章节合并的说明。本 PR 通过 `groupChaptersForScenes` 给出了实质性的 mock 解决方案，不再只是文字标注。

#### ② Preferences 默认配置

- `resolveAdaptationPreferences` 使用了完善的 fallback 机制，如果在调用时缺少配置则采用 `defaultAdaptationPreferences`，提升了健壮性。

---

## 本分支后续处理状态

已解决或推进的事项：

- 解决了 PR #5 中 mock 实现（一章一场）与 Prompt 设计不匹配的遗留问题。
- 为“生成前配置 UI（目标长度、风格、忠实度）”做好了数据层和类型层的铺垫。

仍需关注的事项（供后续 PR 参考）：

- **UI 交互缺口**：当前 preferences 是在代码层面直接使用 default 传参，尚未提供给用户可视化调节的表单组件。
- **用户确认与编辑（Human-in-the-loop）**：目前 `sceneOutline` 只是展示，未来需要支持在 Plan 生成后让用户手动编辑 `sceneCard` 再继续下一步 Writer 阶段。
- **与工作流状态管理的整合**：需要将当前状态（编辑配置 -> 生成大纲 -> 确认修改 -> 生成剧本）体现在顶层 UI 交互中。

---

## 可粘贴到 GitHub PR 的 Review Comment

```md
### PR Review & Alignment Notes

This PR significantly improves the conceptual architecture of the generator by introducing an intermediate `AdaptationPlan` and `AdaptationPreferences` model.

Highlights:

- **Two-stage Agentic Pattern**: Extracted the "Planning" phase to `createMockAdaptationPlan`, which outputs `SceneCard`s. The "Writer" phase now generates scenes based on these cards rather than mapping chapters 1:1, resolving the mock implementation discrepancy noted in PR #5.
- **Enhanced Observability**: The `App` UI now renders the `Scene Outline` and step-by-step trace visually. This will be a great highlight for the demo video as it clearly shows the "Agent's thought process".
- **Solid Data Models**: `AdaptationPreferences` provide a comprehensive foundation for the next planned feature: user configuration forms for generation.

Observations & Next Steps:

- With `AdaptationPreferences` now in the core, the immediate next step should be adding a UI form to allow users to tweak these settings before generation.
- The `Scene Outline` is currently read-only. Eventually, adding an interactive step for users to accept/edit the plan before proceeding to the Writer draft would complete the "Human-in-the-loop" experience.
```
