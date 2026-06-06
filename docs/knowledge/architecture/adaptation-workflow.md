# AI Adaptation Workflow

> 最近更新：2026-06-06  
> 状态：Phase 1 改编链路规划，用于后续模型调用层和 UI 工作流。

本文定义月点从创作来源到剧本 AST 的 AI 工作流。它参考了父目录 `ai-visual-novel-engine` 的分阶段叙事生成方式，但目标不是 VN runtime scene，而是可编辑、可校验、可导出的 `ScreenplayDocument`。

## 核心判断

小说改编不应该默认“一步直接转剧本”。

原因：

- 剧本场景不是小说章节的等价物。几章小说可能合并为一个 scene，一个章节也可能拆成多个 scene。
- 小说写作依靠心理描写、叙述顺序和信息遮蔽；剧本写作需要动作、对白、场面调度、节奏和可拍摄性。
- 用户往往还没有决定目标长度、风格、忠实度、目标媒介、保留/删减支线等关键约束。
- 长文本直接交给 Writer 容易产出“像摘要的剧本”或“带对白的小说”，而不是可拍摄场景。

因此 Phase 1 应采用分阶段工作流：先分析和规划，再由 Writer 根据更窄的 brief 写初稿。

## 分章器是否仍有用

有用，但它不是改编器。

`parseNovelChapters` 的价值：

- 把自由文本摄取成可追溯的 `NovelSource.chapters`。
- 作为长文本切片和上下文检索的粗粒度锚点。
- 为后续 `sourceRefs` 提供稳定 ID，例如 `ch_001`、`ch_002`。
- 支持提交就绪检查，例如演示样例是否覆盖 3 个以上章节。
- 让 UI 能展示来源覆盖、章节缺失和解析 diagnostics。

它不应该做的事：

- 不负责决定 scene 边界。
- 不负责把心理描写改成动作和对白。
- 不负责判断哪些章节合并、删减或重排。
- 不负责输出最终 `ScreenplayAst`。

正确关系：

```text
Novel text
  -> parseNovelChapters
  -> NovelSource.chapters
  -> Source Analysis
  -> Adaptation Plan / Scene Outline
  -> Writer Brief
  -> ScreenplayAst
```

`scene.sourceRefs` 和 `block.sourceRefs` 是多对多关系。一个 scene 可以引用多个章节，多个 scene 也可以引用同一个章节。

## 推荐工作流

### 1. Source Ingestion

输入小说文本，解析章节，保留原文和 diagnostics。

输出：

- `NovelSource.chapters`
- 章节数、空章节、未识别标题等 diagnostics。

### 2. Source Analysis

由 Adaptation Architect 读取章节，提取改编所需的语义材料。

输出建议：

- 核心事件列表。
- 人物弧光和关系变化。
- 时间线。
- 必须保留的信息。
- 可删减支线。
- 可外化的心理描写。
- 潜在场景素材。

### 3. Adaptation Questions

先问用户，而不是急着写。

常见问题：

- 目标长度：短片、3 分钟短剧、10 场左右、完整一集。
- 目标媒介：影视剧本、短剧、视觉小说分支、舞台化对白。
- 改编忠实度：忠于原文、保留核心重写、自由改编。
- 风格：现实主义、悬疑、轻喜剧、冷峻、浪漫、节奏快慢。
- 重点：人物关系、反转、情绪爆发、世界观揭示。
- 是否允许合并角色、删减支线、重排时间线。

这些问题可以在 UI 中做成“生成前配置”，也可以由 agent 根据文本自动提出 2-3 个关键开放问题。

### 4. Adaptation Plan / Scene Outline

Architect 根据来源分析和用户选择，生成剧本大纲，而不是最终剧本文本。

输出建议：

```ts
type AdaptationPlan = {
  sourceAnalysis: SourceAnalysis;
  adaptationQuestions: AdaptationQuestion[];
  adaptationOptions: AdaptationOption[];
  recommendedPlan: string;
  sceneOutline: SceneCard[];
  characterUpdates: CharacterUpdate[];
  risks: string[];
};
```

`SceneCard` 至少包含：

- `title`
- `dramaticPurpose`
- `sourceRefs`
- `pacing`
- `estimatedBlocks`
- `writerBrief`

这里允许且鼓励跨章节组合。例如：

```text
Scene: 雨夜重逢
sourceRefs: [ch_001, ch_002]
dramaticPurpose: 把等待、信件真相和第一次情绪冲突压缩到同一场咖啡厅戏。
```

### 5. Writer Delegation

Writer 不直接面对整部小说，而是面对 scene-level brief。

Writer brief 应包含：

- 本场 narrative goal。
- sourceRefs 和必要原文摘录。
- 角色在本场的 immediate goal。
- 情绪状态和潜台词。
- 节奏：慢、自然、快。
- 风格指令。
- 必须写出的信息点。
- 禁止机械复制的小说段落。

输出为 `ScreenplayAst` 的 scene 或 scene patch。

### 6. Validation / Revision

生成后运行校验和质量审查。

基础校验：

- `ScreenplayDocument` 结构完整。
- ID 唯一。
- scene / block 引用的 `sourceRefs` 存在。
- dialogue 引用角色表。
- YAML projection 可生成。

改编质量审查：

- 场景是否只是小说摘要。
- 心理描写是否已外化。
- source coverage 是否集中或遗漏。
- scene 是否有明确冲突和转折。
- 对白是否承担人物关系和信息推进。

## 从 ai-visual-novel-engine 迁移的模式

父项目的有效模式：

- `Architect Agent`：从一句灵感生成 Story Outline / 世界观 / 角色。
- `Script Supervisor`：分析用户输入，选择相关实体和上下文。
- `Director`：输出 `WriterBrief`，控制 narrativeGoal、pacing、characterMindsets 和状态变化。
- `Writer`：根据 brief 写具体场景。
- Prompt 被拆成 identity、rules、context、task、output contract 等模块。
- 状态变更是 typed、可回放、可验证的。

月点可以迁移这些思想：

- 把 `Architect` 改为 `Adaptation Architect`，负责来源分析、开放问题和 scene outline。
- 把 `Director` 改为 `Screenplay Director`，负责决定本场戏的戏剧目标、节奏和改编策略。
- 把 `Writer` 改为 `Screenplay Writer`，只根据 scene brief 生成 AST block。
- 把 VN 的 `WorldState` / graph 简化为 `ScreenplayDocument`、source coverage map、characters 和 generation trace。
- 暂不引入完整后端图谱，但保留 typed trace，为未来 agent 工具调用做准备。

## Phase 1 实现边界

当前可做：

- 保留 `parseNovelChapters`。
- 建立 adaptation prompt builder。
- 建立 mock fallback，使 demo 可复现。
- UI 中让“生成”触发 mock，并在 diagnostics 中标记 mock。
- 文档明确真实流程需要“先规划，再写作”。

后续模型调用层再做：

- `generateAdaptationPlan(document, userPreference)`。
- 让用户确认 plan 或调整目标。
- `generateSceneDraft(sceneCard, document)`。
- `validateAndRepairGeneratedDocument(document)`。

MVP 可以先把 plan / writer 的 JSON contract 做轻，避免在第一版引入过重后端。
