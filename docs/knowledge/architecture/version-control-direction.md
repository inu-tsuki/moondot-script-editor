# Version Control Direction

> 最近更新：2026-06-06  
> 状态：长期架构规划，不作为当前 MVP 交付承诺。

本文把 brainstorm 中“版本控制？”的问题沉淀为长期方向。月点需要版本控制，但它不应该被塞进 `ScreenplayDocument` 本体；它属于未来 `MoondotProject` / workspace 外层。

## 核心判断

月点的版本控制不是简单的 `documentVersion`。

需要区分四种“版本”：

- `documentVersion`：内部数据结构版本，例如 `ScreenplayDocument` v0.1。
- `schemaVersion`：YAML projection 的提交格式版本。
- `draft version`：作者正在写的第几版草稿。
- `generation / revision history`：AI 生成、局部改写、人工编辑和导出之间的历史记录。

当前代码只需要前两种。后两种属于长期 IDE 能力。

## 为什么不能塞进 ScreenplayDocument

`ScreenplayDocument` 是当前剧本草稿快照。它应该回答“当前剧本是什么”，而不是回答“它是怎么一步步变成这样的”。

如果把版本历史放进 document，会出现几个问题：

- 每次导出 YAML 都携带大量历史，体积膨胀。
- 局部改写、prompt、模型响应和 source 摘要会污染剧本 AST。
- 多个草稿分支和回滚会让当前 document 变成数据库。
- 长期协作、评论、权限和 presence 无法优雅落在单个 document 内。

因此版本控制应属于：

```text
MoondotProject
  -> current documents
  -> version history
  -> generation runs
  -> source store
  -> review / comment threads
```

## 长期版本对象

未来可以引入：

```ts
type VersionRecord = {
  id: `ver_${string}`;
  documentId: string;
  parentVersionId?: string;
  label?: string;
  createdAt: string;
  author: 'user' | 'agent';
  changeKind: 'manual_edit' | 'generation' | 'regeneration' | 'import' | 'repair';
  summary: string;
  snapshot?: ScreenplayDocument;
  patch?: DocumentPatch[];
  sourceRefs?: string[];
  generationRunId?: string;
};

type GenerationRunRecord = {
  id: `run_${string}`;
  createdAt: string;
  agentStage:
    | 'source_analysis'
    | 'adaptation_planning'
    | 'writer_brief'
    | 'scene_draft'
    | 'validation';
  inputSummary: string;
  outputRefs: string[];
  promptVersion: string;
  model?: string;
};
```

第一版不实现这些类型；它们只是约束现在的命名和边界。

## 快照还是 Patch

长期可以分阶段演进：

### Phase A：保存快照

每次关键生成或用户确认时保存完整 `ScreenplayDocument`。

优点：

- 实现简单。
- 回滚简单。
- 与当前 `ScreenplayDocument` 类型直接兼容。

缺点：

- 大文档重复存储。
- diff 和局部回滚不精细。

### Phase B：保存语义 patch

围绕稳定 ID 保存局部修改：

```ts
type DocumentPatch =
  | { op: 'replace_block_text'; blockId: string; text: string }
  | { op: 'insert_block'; sceneId: string; afterBlockId?: string; block: unknown }
  | { op: 'update_scene_heading'; sceneId: string; heading: unknown }
  | { op: 'replace_scene'; sceneId: string; scene: unknown };
```

优点：

- 可以解释每次改动。
- 支持局部回滚和局部重生成。
- 更适合 AI agent trace。

缺点：

- 需要更强的 schema 校验和 migration。
- 对稳定 ID 的要求更高。

MVP 不做 patch。当前最重要的是保持 scene / block / source 的稳定 ID，给未来 patch 留入口。

## 与制片版本的关系

brainstorm 中提到的剧本场景编号、修订日期和 production draft 标记属于另一个层面。

长期应区分：

- 创作版本：作者和 AI 在 IDE 内部迭代草稿。
- 制片版本：面向拍摄和制作管理的场景号、修订日期、颜色页、锁页等。

当前 MVP 不实现制片版本，但 `SceneNode` 的稳定 `id` 和未来 `sceneNumber` 可以为它留出口。

## 当前实现应该做什么

现在只做：

- 保持 `documentVersion` / `schemaVersion` 的边界。
- 保持 scene、block、chapter 的稳定 ID。
- 让 generation trace 不进入 `ScreenplayDocument` 本体。
- 在 review 文档和 roadmap 中记录多版本草稿属于长期 IDE。

暂不做：

- 保存版本历史。
- diff UI。
- 回滚。
- 草稿分支。
- 协作冲突处理。

## 触发拆分的时机

满足以下任一条件时，再正式实现版本层：

- 支持局部重生成并需要对比前后版本。
- 用户能保存多个草稿。
- 需要展示 AI 生成历史和 prompt 摘要。
- 需要撤销跨会话的改动。
- 需要多人协作或评论。

在此之前，版本控制只作为架构约束，不进入 MVP scope。
