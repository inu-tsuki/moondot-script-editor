# Source Ingestion Complete Direction

> 最近更新：2026-06-06  
> 状态：长期架构规划；当前代码只实现 chapter parser。

本文定义月点 source ingestion 的完整形态。当前 `parseNovelChapters` 只完成第一层：把小说文本切成章节。长期 source ingestion 应成为 AI 改编、来源追踪、局部重生成和质量审查的共同地基。

## 核心判断

source ingestion 不是“把小说转剧本”。

它的职责是把原始来源变成可追踪、可检索、可引用、可诊断的材料层：

```text
Raw source
  -> normalized source record
  -> chapters
  -> segments
  -> source analysis
  -> event / beat cards
  -> coverage map
```

剧本场景仍由 Adaptation Architect / Writer 决定。章节、段落和事件只是 source anchors，不是 scene 边界。

## 当前层级

当前已实现：

```text
novel text
  -> parseNovelChapters
  -> SourceChapter[]
```

它提供：

- `ch_001` 这类稳定来源 ID。
- 章节标题。
- 章节正文。
- 空文本、未识别标题等 diagnostics。
- 提交样例的 3+ 章节检查基础。

这已经足够支撑 MVP demo，但不够支撑完整长文本改编 IDE。

## 完整层级

长期建议拆成四层。

### 1. SourceRecord

保存来源整体信息。

```ts
type SourceRecord = {
  id: `src_${string}`;
  type: 'novel' | 'inspiration_seed' | 'outline' | 'world_bible';
  title?: string;
  language: 'zh-CN';
  rawText?: string;
  normalizedText?: string;
  contentHash?: string;
  createdAt: string;
};
```

作用：

- 支持一个项目多个来源。
- 区分原文和规范化文本。
- 支持重新 ingestion、去重和版本追踪。

### 2. SourceChapter

章节是稳定大块。

```ts
type SourceChapter = {
  id: `ch_${string}`;
  sourceId: `src_${string}`;
  index: number;
  title: string;
  text?: string;
  summary?: string;
  startOffset?: number;
  endOffset?: number;
};
```

作用：

- 人类能理解。
- LLM 长上下文切片的粗粒度单位。
- 场景和剧本块可通过 `sourceRefs` 追溯到章节。

### 3. SourceSegment

段落或语义片段是检索单位，不是 MVP 必须。

```ts
type SourceSegment = {
  id: `seg_${string}`;
  sourceId: `src_${string}`;
  chapterId: `ch_${string}`;
  index: number;
  text: string;
  kind: 'paragraph' | 'semantic_chunk';
  startOffset?: number;
  endOffset?: number;
  summary?: string;
};
```

何时需要 segment：

- 单章太长，直接喂给 LLM 容易发散。
- 需要 scene 点击后显示对应原文片段。
- 需要局部重生成，只喂相关段落给 Writer。
- 需要 coverage 检查到段落级别。
- 需要 RAG / embedding 检索。

当前不急着实现 segment。先保留类型方向，等 adaptation plan UI 或局部重生成出现后再做。

### 4. SourceBeat / Event Card

事件卡片由 LLM 或规则抽取，属于改编规划材料。

```ts
type SourceBeat = {
  id: `beat_${string}`;
  sourceRefs: SourceRef[];
  summary: string;
  characters: string[];
  locations?: string[];
  dramaticFunction?: string;
  timelineOrder?: number;
  keepOrCut?: 'keep' | 'merge' | 'cut' | 'uncertain';
};
```

作用：

- 帮 Adaptation Architect 判断哪些内容要保留、合并或删减。
- 让“几章合成一场”变得可解释。
- 让用户在生成前确认改编策略。

SourceBeat 不是剧本 scene。它是小说中的故事事件，scene 是剧本里的戏剧单位。

## SourceRef 精度

当前 `SourceRef` 只到 chapter：

```ts
{ kind: 'chapter', sourceId: 'ch_001' }
```

长期可以升级为：

```ts
type SourceRef = {
  sourceId: string;
  kind: 'source' | 'chapter' | 'segment' | 'beat';
  span?: {
    startOffset: number;
    endOffset: number;
  };
};
```

但不要过早把所有 block 都强制绑定到 span。太精细的来源追踪会增加 UI 和 LLM 输出负担。

推荐渐进：

1. scene 级别引用 chapter。
2. scene outline 引用 beat。
3. 需要局部重写时引用 segment。
4. 需要严肃溯源时再加 span。

## Source Coverage

source ingestion 的完整体应支持 coverage map：

```ts
type SourceCoverage = {
  sourceId: string;
  usedChapterIds: string[];
  unusedChapterIds: string[];
  denseScenes: {
    sceneId: string;
    sourceRefs: SourceRef[];
  }[];
  warnings: string[];
};
```

它回答：

- 哪些章节被使用。
- 哪些章节被删减。
- 哪些 scene 来源过散。
- 哪些关键 beat 没有进入剧本。

这比简单“章节数 >= 3”更接近真实长文本工程能力。

## 与 LLM 长上下文的关系

最终理解和改编仍由 LLM 完成，但不应该裸丢全文。

source ingestion 负责组织上下文：

```text
Architect prompt
  -> source summary
  -> chapter index
  -> relevant segments
  -> event cards
  -> user preferences

Writer prompt
  -> scene card
  -> sourceRefs
  -> selected excerpts
  -> character context
```

这样做的价值：

- 减少 prompt 体积。
- 降低注意力发散。
- 支持可解释改编。
- 支持局部重生成。
- 支持来源覆盖检查。

## Phase 1 / Phase 2 分界

当前 Phase 1 只做：

- `parseNovelChapters`。
- chapter-level sourceRefs。
- 基础 diagnostics。

下一阶段可以做：

- `SourceSegment` 类型草案。
- chapter summary / event beat mock。
- adaptation plan 中显示 source coverage。
- UI 中展示 scene 对应章节。

暂不做：

- embedding index。
- 全文 RAG。
- 段落级人工编辑。
- 字符级 span 标注。

原则：先让章节锚点和 scene outline 跑通，再升级 segment 和 beat。
