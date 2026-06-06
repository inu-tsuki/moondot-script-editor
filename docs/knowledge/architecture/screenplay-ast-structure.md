# Screenplay Document & Script AST Structure

> 最近更新：2026-06-05  
> 状态：v0.1 规划，用于 `feat/screenplay-ast` 分支。

本文细化 `ScreenplayDocument` 的内部结构，以及其中 `script: ScreenplayAst` 的节点形状。它服务代码实现，不替代 YAML Schema 文档。

核心原则：

- `ScreenplayDocument` 是月点的内部单一事实来源。
- `ScreenplayAst` 是 document 内部的脚本语义树，不包含全部项目元信息。
- 月点的内部 document 是私有语义格式，不等同于 YAML、Fountain 或 VN runtime script。
- YAML 是 document 的官方提交 projection。
- Fountain-like、Ren'Py、Naninovel 等是 document 的可选导出 projection。
- 未来标准格式导入应通过 importer / adapter 进入 document，而不是让某个外部格式直接统治内部结构。
- UI 编辑 document 中的语义节点，不直接编辑 YAML 字符串。
- diagnostics 是校验结果，不是 document 本体。
- source adapter 是创作入口，小说导入只是当前 MVP 的 adapter。

## 目标

`feat/screenplay-ast` 分支需要先交付一个可被 UI、校验器和 YAML serializer 共用的核心模型。

第一版应支持：

- 多章节小说来源。
- 剧本项目元信息。
- 角色表。
- 线性场景序列。
- action、dialogue、narration、transition、note 语义块。
- 稳定 ID。
- 运行时校验。
- demo/mock document。

暂不支持：

- 真实分支叙事图。
- 完整 Fountain parser。
- 完整 VN runtime 字段。
- 角色关系图谱。
- 多版本草稿系统。
- 复杂制片表或资产管理。

## 顶层结构

建议 TypeScript 结构：

```ts
type ScreenplayDocument = {
  documentVersion: '0.1';
  project: ScreenplayProject;
  source: SourceBundle;
  characters: CharacterProfile[];
  script: ScreenplayAst;
};
```

说明：

- `documentVersion` 是内部 document 版本。
- YAML projection 使用 `schemaVersion`，不要和 `documentVersion` 混用。
- `project` 保存剧本项目元信息。
- `source` 保存创作来源和可追溯信息。
- `characters` 是角色资产表。
- `script` 保存真正的剧本 AST：场景结构和块级剧本文本。
- `ScreenplayDocument` 会比 YAML 或 Fountain 更复杂，但它不要求作者手写；它是编辑器、AI、校验器和导出器共享的中间语义模型。

边界提醒：`ScreenplayDocument` 是一个剧本草稿的语义快照，不是整个月点项目的总仓库。长期 workspace / project / store 的拆分见 `document-workspace-boundary.md`。

## 私有格式与工业标准

月点确实会形成一个比提交 YAML 更复杂的内部私有格式。这个选择是合理的，因为编辑器需要稳定 ID、来源映射、角色符号表、局部重生成边界和 diagnostics path；这些信息不是 Fountain 或 VN runtime script 的主要表达目标。

兼容工业标准的方式不是把内部格式写成 Fountain，也不是把 Ren'Py / Naninovel 字段提前做成必填，而是建立清晰的 importer / exporter：

```text
Novel chapters
  -> NovelSourceAdapter
  -> ScreenplayDocument

Fountain text
  -> FountainImporter
  -> ScreenplayDocument       (future)

Ren'Py / Naninovel script
  -> VNImporter
  -> ScreenplayDocument       (future)

ScreenplayDocument
  -> YAML projection          (official submission)
  -> Fountain export          (future screenplay standard)
  -> Ren'Py / Naninovel export (future VN runtime)
```

因此：

- `ScreenplayDocument` 是内部中枢。
- YAML、Fountain 和 VN 脚本都可以是边界格式。
- 导入外部标准格式时，可能需要补齐月点内部字段，例如稳定 ID、sourceRefs、角色别名。
- 导出外部标准格式时，可能会丢弃 editor-only 信息，例如 diagnostics path、source summary 或局部生成备注。
- 每个 importer / exporter 都应声明自己的能力范围和可能的信息损失。

## Source Ingestion 与改编 Agent 边界

小说来源和剧本格式来源需要不同的入口：

```text
Novel text
  -> parseNovelChapters
  -> NovelSource.chapters
  -> LLM adaptation agent
  -> ScreenplayAst

Fountain-like text
  -> Fountain importer
  -> ScreenplayAst        (future)
```

`parseNovelChapters` 只负责把自由文本摄取为可追溯的章节来源。它可以识别章节标题、保留章节正文，并产生章节数 diagnostics；它不负责把小说“解析”为场景、对白或动作块。

小说到剧本的转换属于改编问题，不是文本语法解析问题。当前改编工作流应建立 prompt / agent 输入输出协议，并保留 mock fallback 让 demo 可复现；真实转换需要由 LLM 完成规划、改写、结构化输出和修复。

只有当输入本身已经是结构化剧本格式，例如 Fountain-like 文本时，才适合使用确定性 parser 直接导入为 AST。这个 parser 应放在 importer 边界，而不是复用小说 source ingestion。

更完整的 AI 改编链路见 `adaptation-workflow.md`。核心方向是先生成 source analysis、开放问题和 scene outline，再根据用户确认后的 writer brief 生成剧本初稿。

## Project

```ts
type ScreenplayProject = {
  id: ProjectId;
  title: string;
  language: 'zh-CN';
  targetMedium: 'screenplay' | 'short_drama' | 'visual_novel';
  createdAt?: string;
  updatedAt?: string;
};
```

设计原因：

- `targetMedium` 影响导出和提示词，但不应改变 document 基本形状。
- 时间字段可选，避免 demo/mock 数据必须处理时间。
- `sourceType` 不放在 `project` 内部；它属于 `source.type`。YAML v0.1 可以继续投影为 `project.sourceType`，但代码应从 `source.type` 生成。

## Source

当前 MVP 只实现 `novel` source，但类型上保留 adapter 扩展。

```ts
type SourceBundle = NovelSource | InspirationSeedSource | OutlineSource | WorldBibleSource;

type NovelSource = {
  type: 'novel';
  title?: string;
  chapters: SourceChapter[];
};

type SourceChapter = {
  id: ChapterId;
  index: number;
  title: string;
  summary?: string;
  text?: string;
};
```

长期候选：

```ts
type InspirationSeedSource = {
  type: 'inspiration_seed';
  prompt: string;
  keywords?: string[];
};

type OutlineSource = {
  type: 'outline';
  outline: string;
};

type WorldBibleSource = {
  type: 'world_bible';
  title?: string;
  summary: string;
};
```

MVP 取舍：

- 代码只实现 `NovelSource`。
- 类型可以预留其他 source，但不必为它们实现 UI。
- `chapterCount` 是 derived value，不是 document 必存字段。
- 原文 `text` 可以存在于运行时 document，YAML projection 默认只导出摘要，避免 YAML 体积过大。

## Characters

```ts
type CharacterProfile = {
  id: CharacterId;
  name: string;
  aliases: string[];
  description?: string;
  tags?: string[];
};
```

设计原因：

- 对白块通过 `characterId` 绑定角色。
- 角色改名不需要全文替换对白。
- `aliases` 保留小说原文称呼和改编后显示名之间的关系。
- `tags` 只作为轻量分类，不做完整人物关系图。

## Script

```ts
type ScreenplayAst = {
  structure: ScriptStructure;
  scenes: SceneNode[];
};

type ScriptStructure = {
  type: 'linear';
};
```

MVP 使用 `scenes` 数组顺序表达线性剧本顺序。

原因：

- UI 拖拽和排序直接操作数组。
- YAML serializer 可以从数组顺序推导 `startSceneId` 和 `nextSceneId`。
- 不把未来 branching 结构提前塞进第一版。

未来如果支持 VN / branching，再引入：

```ts
type BranchingStructure = {
  type: 'branching';
  startSceneId: SceneId;
  edges: SceneEdge[];
};
```

## Scene

```ts
type SceneNode = {
  id: SceneId;
  title: string;
  synopsis?: string;
  sourceRefs: SourceRef[];
  heading: SceneHeading;
  blocks: ScriptBlock[];
};

type SceneHeading = {
  locationType: 'INT' | 'EXT' | 'INT_EXT';
  location: string;
  timeOfDay: string;
};

type SourceRef = {
  sourceId: ChapterId | string;
  kind: 'chapter' | 'seed' | 'outline' | 'world_bible';
};
```

设计原因：

- `sourceRefs` 让场景可追溯到小说章节。
- `heading` 用结构化字段保存，方便渲染中文场景行或 Fountain-like 场景行。
- `synopsis` 用于编辑和生成辅助，不一定进入最终剧本文本。

## Blocks

MVP 使用 discriminated union。

```ts
type ScriptBlock = ActionBlock | DialogueBlock | NarrationBlock | TransitionBlock | NoteBlock;

type BaseBlock = {
  id: BlockId;
  sourceRefs?: SourceRef[];
};

type ActionBlock = BaseBlock & {
  type: 'action';
  text: string;
};

type DialogueBlock = BaseBlock & {
  type: 'dialogue';
  characterId: CharacterId;
  parenthetical?: string;
  text: string;
};

type NarrationBlock = BaseBlock & {
  type: 'narration';
  voice?: 'voice_over' | 'off_screen' | 'narrator';
  text: string;
};

type TransitionBlock = BaseBlock & {
  type: 'transition';
  text: string;
};

type NoteBlock = BaseBlock & {
  type: 'note';
  text: string;
};
```

取舍：

- `parenthetical` 第一版作为 dialogue 字段，不做独立块。
- `note` 默认不进入最终剧本文本，但可进入编辑视图和 diagnostics。
- 所有 block 都有稳定 ID，方便局部编辑和局部重生成。

## ID 约定

ID 使用可读前缀：

- `project_`
- `ch_`
- `char_`
- `scene_`
- `blk_`

第一版可以用简单工厂生成 ID，不需要引入 UUID 库。若后续需要跨会话稳定性，再评估 nanoid 或 crypto UUID。

## 不进入 Document / AST 的内容

以下内容不作为 `ScreenplayDocument` 或 `ScreenplayAst` 本体字段：

- 当前选中的 UI tab、展开状态、滚动位置。
- diagnostics 列表。
- YAML 文本字符串。
- Fountain-like 文本字符串。
- 原始 LLM prompt 全文。
- 模型请求的 transient loading state。

这些内容应属于 UI state、validation result、projection result 或 generation log。

## 与 YAML Projection 的关系

YAML projection 从 `ScreenplayDocument` 生成。

映射规则：

- `documentVersion` 不直接等于 `schemaVersion`。YAML 使用自己的 `schemaVersion`。
- `source.type` 可投影为 YAML 当前草案中的 `project.sourceType`。
- `source.chapters.length` 可投影为 `source.chapterCount`。
- `script.scenes[]` 顺序可投影为 `startSceneId` / `nextSceneId`。
- `scene.sourceRefs` 可投影为 `sourceChapterIds`。
- `ScriptBlock` union 可投影为 YAML blocks。

如果 document 和 YAML projection 不完全一致，以 document 为权威。

## 与校验层的关系

`validateScreenplayDocument(document)` 应基于 document 结构运行。后续如果需要，也可以拆出更窄的 `validateScreenplayAst(script, context)`，专门校验脚本树本身。

第一版 validation 重点：

- 必填对象存在。
- ID 唯一。
- scene 顺序非空。
- scene heading 完整。
- dialogue 的 `characterId` 能找到角色。
- novel source 至少 1 章。
- submission readiness 样例至少 3 章。

diagnostics 返回值不写回 document，除非用户明确应用某个修复动作。

## `feat/screenplay-ast` 实现切片

建议本分支按三步提交：

1. `docs: plan screenplay ast structure`
   - 新增本文档。
   - 更新 architecture / docs 索引。
   - 补 `.gitignore` 的 `.vite/`。
2. `feat: add screenplay ast types`
   - 新增 `src/core/screenplay/types.ts`。
   - 导出 `ScreenplayDocument`、`ScreenplayAst`、`SceneNode`、`ScriptBlock` 等核心类型。
   - 新增 mock/demo document。
   - 更新现有 UI mock 数据使用 document 结构。
3. `feat: add screenplay ast validation`
   - 引入 Zod。
   - 新增 `src/core/screenplay/schema.ts` 或 `src/core/validation/validateScreenplayDocument.ts`。
   - 添加最小校验和 diagnostics 类型。

如果时间紧，步骤 2 和步骤 3 可以合并，但 PR 描述必须说明哪些校验已实现、哪些仍在文档阶段。
