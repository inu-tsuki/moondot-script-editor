# Next Direction

> 最近更新：2026-06-06  
> 状态：PR #8 之后的近期规划。

本文用于承接 review follow-up 之后的下一阶段开发。它不替代 roadmap；它只回答“下一两个 PR 先做什么”。

## 当前基线

主线已经具备：

- React + TypeScript + Vite 工程脚手架。
- `ScreenplayDocument` / `ScreenplayAst` 类型。
- runtime validation diagnostics。
- YAML projection。
- 小说章节解析。
- mock adaptation scaffold。
- 基础语义块编辑。
- PR #3-#5 review 文档。

正在处理：

- PR #8：review follow-up 修正，包括 diagnostics 去重、source guard、YAML 换行标准化、block ID factory 统一。

## 近期原则

下一步不要立刻跳到“真实模型调用”。

原因：

- 真实模型调用需要稳定的输入输出 contract。
- 用户还没有机会确认目标长度、风格、忠实度和删减策略。
- 当前 mock 直接写剧本，仍不足以体现“先规划，再写作”的产品形态。

更稳的方向是先把 Adaptation Architect 的中间产物做出来。

推荐近期主线：

```text
sourceText
  -> parseNovelChapters
  -> adaptation preferences
  -> mock / future LLM adaptation plan
  -> scene outline preview
  -> user confirm
  -> writer draft
```

## 推荐 PR 顺序

### PR A：Adaptation Plan 类型与 mock

目标：让“先大纲，后剧本”成为代码结构，而不只是 prompt 文档。

建议内容：

- 新增 `AdaptationPlan`、`SceneCard`、`AdaptationQuestion` 类型。
- 新增 `createMockAdaptationPlan(document)`。
- `adaptNovelToScreenplayMock` 改为使用 mock plan 生成场景。
- trace 中显式保留 plan / writer 两阶段。

完成标准：

- build / lint 通过。
- mock 仍可生成剧本。
- 代码中能单独拿到 scene outline。

### PR B：生成前配置 UI

目标：让用户能表达需求，而不是把“目标长度、风格、忠实度”硬塞进 prompt。

建议内容：

- 增加轻量配置状态：
  - 目标长度。
  - 目标媒介。
  - 改编忠实度。
  - 风格 / 节奏。
  - 是否允许合并角色、删减支线、重排时间线。
- 把配置传入 adaptation plan builder。
- 不急着美化成完整 wizard。

完成标准：

- UI 不阻塞当前 demo。
- 配置能进入 prompt / mock trace。

### PR C：Scene Outline 预览与确认

目标：让月点从“生成按钮直接出剧本”变成“先给改编方案”。

建议内容：

- 在中间面板或侧边区域显示 scene outline。
- 显示每个 scene 的 sourceRefs、dramaticPurpose、pacing。
- 用户点击确认后再生成 script scenes。

完成标准：

- 用户能看到“一场戏可能来自多个章节”的计划。
- mock fallback 不再表现成单纯一章一场的最终逻辑。

### PR D：YAML 导出交互

目标：把已有 serializer 变成可用导出功能。

建议内容：

- 增加复制 YAML。
- 增加下载 `.yaml`。
- 导出前显示 validation 状态。

完成标准：

- demo 中用户可以实际拿到 YAML 文件。

### PR E：真实模型调用层

目标：替换 mock fallback。

前置条件：

- AdaptationPlan contract 已稳定。
- 生成前配置已能进入 prompt。
- scene outline 预览能承接模型输出。

建议内容：

- 轻量 API 层。
- OpenAI-compatible endpoint。
- mock fallback 保留。
- 不在浏览器暴露默认 API key。

## 暂缓事项

以下事项有价值，但不应抢在 adaptation plan 前面：

- Fountain-like 导出完整实现。
- `SourceSegment` / embedding index。
- 多版本草稿 UI。
- 完整 dock 系统。
- 完整 YAML 标准库替换。

原因：它们会变大，但不能直接改善“小说如何被合理改编成剧本”的核心体验。

## 推荐下一步

下一步优先做 PR A：`AdaptationPlan` 类型与 mock。

它会把我们已经讨论清楚的产品判断落进代码：

- 分章器只是 source anchor。
- scene outline 才是改编中间层。
- Writer 不直接面对整部小说，而是面对 scene-level brief。

这一步完成后，再做配置 UI 和 outline 预览会很自然。
