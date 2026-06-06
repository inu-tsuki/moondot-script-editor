# Next Direction

> 最近更新：2026-06-06  
> 状态：Phase 2.5 基础切片已完成，当前用于承接 Phase 3 启动前的状态同步、质量收口和模型层规划。

本文用于回答“下一两个 PR 先做什么”。阶段级边界见 `roadmap/README.md` 和 `roadmap/phase-2-5-workbench-ui-foundation.md`；长期产品愿景仍以 `../knowledge/product/vision.md` 为准。

## 当前基线

主线已经具备：

- React + TypeScript + Vite 工程脚手架。
- `ScreenplayDocument` / `ScreenplayAst` 类型、runtime validation diagnostics 和 YAML projection。
- 小说 source ingestion 和章节解析；章节只作为来源结构，不直接承担剧本转换。
- `AdaptationPreferences`、`AdaptationPlan`、`SceneCard` 和两阶段 `GenerationTrace`。
- scene outline 预览、确认写入和 YAML 复制 / 下载。
- Tailwind、UI primitives、panel extraction、`WorkbenchLayout` 和 output tabs。
- document-backed screenplay reading surface。
- 基础语义编辑控件：新增、删除、移动 block，编辑 dialogue 字段和 scene metadata。
- 工业化手稿 UI polish。
- Vitest / Testing Library / Playwright 前端测试护栏。

当前短板已经从“UI 地基不足”转移到“真实模型层尚未接入，prompt contract、错误恢复、trace 展示和 demo 路径还需要收口”。

## 近期原则

下一步可以进入 Phase 3，但不要把“接入模型”理解成直接从小说文本调用一次 LLM 并拼出剧本。

月点当前更适合保持已经确定的两阶段改编工作流：

```text
用户输入 source
  -> Architect 解析来源、生成问题和 scene outline
  -> 用户确认目标长度、风格、忠实度和必要取舍
  -> Architect 产出 writer brief
  -> Writer 根据 brief 生成 ScreenplayDocument 初稿
  -> 用户在语义块编辑器中打磨
  -> YAML projection / diagnostics / demo
```

这样做的好处是：

- 保留 human review checkpoint，降低长文本一次性生成的失控风险。
- 让跨章节合并成同一 scene 成为正常能力，而不是章节映射的例外处理。
- trace 可以解释 Architect 和 Writer 两阶段分别做了什么。
- mock fallback 和真实模型调用可以共用同一组输入 / 输出 contract。

需要避免：

- 把章节解析误当成剧本转换器。
- 直接把 LLM 输出当作 YAML，而绕过 `ScreenplayDocument`。
- 为了真实模型调用提前引入完整 agent graph runtime。
- 在 Phase 3 同时做完整 Fountain parser、dock persistence 或多版本草稿 UI。

## 推荐 PR 顺序

### PR A：Status refresh

目标：让文档与 Phase 2.5 和测试护栏落地后的真实代码状态一致。

建议内容：

- 更新 README、TODO、roadmap、Phase 2.5 文档和 review 索引。
- 明确 Phase 2.5 已完成基础切片，Phase 3 是下一产品阶段。
- 将测试说明与 `AGENTS.md` 对齐：普通改动跑 `format:check` / `lint` / `build` / `test`；UI 和布局改动额外跑 `e2e`。
- 记录 Playwright 固定使用 `127.0.0.1:5173` 和系统 Chromium 的约束。

完成标准：

- 文档不再指向已完成的 Phase 2.5 PR 作为“下一步”。
- 后续维护者能从 README、TODO 和 roadmap 得到同一张地图。
- 本 PR 不改产品代码。

### PR B：Phase 3 model adapter contract

目标：在接真实模型前，先定义模型调用层的工程边界。

建议内容：

- 定义 LLM provider config 的最小形态：provider、model、base URL / API key 来源、超时和 mock fallback 开关。
- 定义 Architect / Writer 的请求和响应 envelope。
- 明确真实模型输出必须先进入 typed contract，再进入 `ScreenplayDocument`。
- 定义失败恢复：解析失败、validation warning、空输出、超时和 fallback。
- 在 output tabs 中预留模型 trace / diagnostics 的展示位置。

完成标准：

- mock fallback 和未来真实 API 共用同一组 contract。
- 不在 UI 组件中散落 provider 细节。
- 不把 API key、私人 endpoint 或非公开日志写入仓库。

### PR C：Architect review loop

目标：把 Phase 2 的偏好表单推进为更像真实创作流程的 Architect 提问与确认。

建议内容：

- Architect 根据 source analysis 和用户偏好生成少量开放问题或建议。
- 用户可以接受默认建议，也可以补充长度、风格、重点角色、改编媒介和压缩策略。
- Architect 产出 writer brief，Writer 只消费确认后的 brief。

完成标准：

- 用户不是被动等待一次性转换，而是在生成前参与改编取舍。
- writer brief 可以被 trace 展示和调试。
- 仍保持 MVP 简洁，不做复杂多轮 agent graph。

### PR D：Demo hardening

目标：把提交演示路径固定下来。

建议内容：

- 准备 3+ 章节样例输入。
- 确认 scene outline 能展示跨章节合并。
- 确认基础语义编辑和 YAML 导出在 demo 中稳定。
- 补必要 e2e 或手动验证记录。
- README 补 demo 链接前的占位说明和最终检查项。

完成标准：

- 主分支可运行。
- 演示路径可以从输入到导出连续走完。
- README、Schema 文档和 demo 叙述不承诺尚未实现的长期 IDE 能力。

## 暂缓事项

以下事项仍然有价值，但不应压过 Phase 3 主线：

- 完整 Fountain parser / reverse parser。
- 完整 dock engine、layout tree 持久化和拖拽停靠。
- Monaco / CodeMirror 专业文本编辑器。
- 多版本草稿 UI 和 diff viewer。
- 视觉小说脚本导出器。
- 全量 source coverage map UI。

它们适合在真实模型调用、demo 和提交材料稳定后继续拆分。
