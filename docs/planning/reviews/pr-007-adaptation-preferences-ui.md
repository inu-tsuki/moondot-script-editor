# PR #7 Review: Adaptation Preferences UI

> 最近更新：2026-06-06  
> GitHub PR：[#13](https://github.com/inu-tsuki/moondot-script-editor/pull/13)  
> 对应分支：`feat/adaptation-preferences-ui`（base = `main`）  
> 对应提交：
>
> - `d3dd038 feat: add adaptation preferences controls`

## 审阅结论

PR #7（GitHub PR #13）完成了 Phase 2.2 的既定目标：将用户的“改编偏好（Adaptation Preferences）”以前端表单控件的形式暴露出来，作为生成剧本大纲（Adaptation Plan）的输入条件。

- 新增 UI 面板：在剧本生成的来源预览上方加入了包括“媒介”、“长度”、“忠实度”、“节奏”、“风格”以及 3 个策略 Toggle 开关的设置区域。
- 联动 `AdaptationPlan` 生成：用户调整参数会重置之前的生成结果，并在下次生成时将用户的选项传入 `createMockAdaptationPlan`。
- 回写 `targetMedium`：在生成结束后，根据配置的 `targetMedium` 更新 `document.project.targetMedium`，确保文档元信息的一致性。

该变更进一步补全了 “生成前配置 UI” 的闭环，使得交互更加合理，并且满足 Roadmap 中对“让用户的创作方向进入 Architect 节点”的要求。

---

## Review 观察

### 1. 偏好控件与交互设计

- **无阻塞设计**：默认值使用 `defaultAdaptationPreferences` 覆盖，使得新用户进来不改任何选项也能顺畅走通 mock 流程。
- **重置机制合理**：当改变配置时调用 `clearAdaptationRun()` 清空旧的大纲和诊断信息，避免了产生旧生成结果与新配置相互矛盾的错觉。

### 2. 数据与底层逻辑完善

- `buildNovelAdaptationPrompt.ts` 引入 `resolveAdaptationPreferences` 处理默认值回退逻辑，使得 Prompt 中注入的数据不再可能为 `undefined`。
- `mockNovelAdaptation.ts` 将生成后的 `targetMedium` 同步到最终产出的 `document.project.targetMedium` 中，维护了 Ast 模型的一致性。

### 3. 可视化反馈

- 生成出来的 Outline 面板顶部，增加了 `outline-preferences` `span` 标签渲染，能让用户很清晰地知道当前的 mock outline 是在什么样的参数下生成的（如：short_drama, short_drama_3_min, core_rewrite, balanced），对演示 Demo（视频录制）非常加分。

---

## 本分支后续处理状态

已解决的事项：

- 解决了 PR #6 遗留的“当前 preferences 只能在代码层面默认传参，缺乏用户可视化调节表单”的缺口。

后续建议事项（参考 Roadmap Phase 2.3）：

- **Human-in-the-loop (Scene Outline 确认/编辑)**：目前的 preferences 修改已经能影响生成的 plan，接下来应在用户浏览 Scene Outline 时，提供一个 "确认并继续生成"（Accept & Draft Scenes） 或允许手动编辑卡片的功能。目前 "Generate" 按钮是一口气跑完所有流程，没有真正的停留让用户参与 Architect 之后的工作。

---

## 可粘贴到 GitHub PR 的 Review Comment

```md
### PR Review & Alignment Notes

This PR perfectly fulfills Phase 2.2 of our roadmap by surfacing the `AdaptationPreferences` to the user via UI controls. It successfully connects user intent with the underlying Architect generation prompt.

Highlights:

- **Seamless UX**: Modifying any preference instantly clears outdated generations, ensuring the UI always reflects a consistent state.
- **Data Integrity**: The chosen `targetMedium` from preferences is now correctly written back to `document.project.targetMedium` upon mock generation completion.
- **Great for Demo**: The chosen preferences are displayed as small tags above the generated Scene Outline, which is a fantastic visual aid for the final product demonstration video.

Observations & Next Steps:

- The next logical step (Phase 2.3) is allowing the user to pause after the Scene Outline is generated, so they can review/edit the `SceneCard`s before the Writer agent drafts the actual script blocks.
```
