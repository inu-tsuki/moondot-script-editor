# Document / Workspace Boundary

> 最近更新：2026-06-06  
> 状态：长期架构规划，不作为当前 MVP 交付承诺。  
> 用途：定义 `ScreenplayDocument` 和未来 `MoondotProject` / workspace 的边界，避免把整个项目的所有信息塞进一份文档。

## 核心结论

`ScreenplayDocument` 应被理解为“一个剧本草稿的可编辑语义快照”，不是月点项目里所有信息的总仓库。

MVP 可以把 project metadata、source summary、characters 和 `script: ScreenplayAst` 放进同一份 document，因为这能让生成、编辑、校验和 YAML 导出保持简单。但长期产品不能继续向 document 无限加字段。

长期健康结构应是：

```text
MoondotWorkspace
  -> projects[]

MoondotProject
  -> sources
  -> screenplay documents
  -> asset library
  -> generation runs
  -> version history
  -> project settings

ScreenplayDocument
  -> document metadata
  -> project metadata snapshot
  -> source refs / source summary
  -> character registry
  -> script: ScreenplayAst
```

## 为什么 MVP 可以内聚

当前 submission 的核心链路是：

```text
novel source
  -> ScreenplayDocument
  -> semantic editor
  -> YAML projection
```

把最小必要信息放进 document 有几个好处：

- 校验器可以一次性检查章节、角色、场景和对白引用。
- YAML serializer 不需要额外读取多个 store。
- demo 数据可以作为单个 mock document 加载。
- PR 2 的类型定义可以保持清楚，不提前实现 workspace 系统。

这种内聚是 MVP 的工程取舍，不是长期数据架构的终点。

## ScreenplayDocument 应包含什么

长期仍应保留在 document 内：

- `documentVersion`。
- 当前剧本草稿标题、语言、目标媒介等必要 metadata snapshot。
- 当前草稿依赖的 source refs 和轻量 source summary。
- 当前草稿使用的角色表和别名。
- `script: ScreenplayAst`。
- 支持编辑和导出的稳定 ID。

这些字段共同定义“这份剧本草稿是什么”。如果把它们拆得过早，MVP 的编辑、预览和导出会变得虚胖。

## 不应长期塞进 Document 的内容

以下内容不应成为 `ScreenplayDocument` 的常驻字段：

- 当前 UI tab、dock 布局、选中场景、滚动位置。
- diagnostics 结果列表。
- 完整 prompt 历史和模型请求响应全文。
- 大体量小说原文全文。
- 图片、音频、视频和制片资产。
- 多版本草稿历史。
- 协作 presence、评论线程、权限信息。
- VN runtime 存档或完整引擎工程文件。
- 全局用户设置和 provider key。

这些信息应进入独立层：

- UI state。
- validation result。
- source store。
- asset library。
- generation log。
- version history。
- collaboration state。
- export artifact。
- workspace / user settings。

## 未来外层类型草案

长期可以引入：

```ts
type MoondotWorkspace = {
  workspaceVersion: string;
  projects: MoondotProject[];
  userSettings?: WorkspaceSettings;
};

type MoondotProject = {
  id: ProjectId;
  title: string;
  sources: SourceRecord[];
  documents: ScreenplayDocumentRecord[];
  assets: AssetRecord[];
  generationRuns: GenerationRunRecord[];
  versions: VersionRecord[];
  settings: ProjectSettings;
};

type ScreenplayDocumentRecord = {
  id: DocumentId;
  title: string;
  current: ScreenplayDocument;
};
```

第一版不实现这些类型。它们用于约束命名和目录设计：不要把 workspace 级别的责任放进 `ScreenplayDocument`。

## 何时拆分

满足任一条件时，应考虑从 document 中拆出独立 store：

- 一个项目拥有多个剧本草稿。
- 需要保存完整小说原文、多个来源或大型素材。
- 需要展示模型生成历史、prompt 版本或修复记录。
- 需要支持版本对比、回滚或草稿分支。
- 需要支持多人协作、评论或权限。
- 导出目标开始生成独立工程文件，例如 Ren'Py project。

在这些能力出现前，MVP 继续使用单个 `ScreenplayDocument` 更稳。

## 版本与快照原则

长期版本控制不应只靠一份 document 自己承担。

建议原则：

- `ScreenplayDocument` 保存当前草稿快照。
- `version history` 保存 document 快照或 patch。
- `generation runs` 保存模型调用、prompt 摘要、输入摘要和产出引用。
- `source store` 保存原文和来源材料。
- document 内只保留回溯所需的轻量 `sourceRefs`，不默认复制所有原文。

这样既能让剧本草稿独立导出，也能让项目长期追踪“它是怎么生成和修改出来的”。

## 对当前实现的约束

`feat/screenplay-ast` 分支仍然只实现：

- `ScreenplayDocument` / `ScreenplayAst` 类型。
- demo/mock document。
- document 校验。

当前不实现：

- `MoondotWorkspace`。
- 完整 project store。
- generation log。
- version history。
- asset library。

但代码命名应为未来留出口：

- 核心类型目录推荐 `src/core/screenplay/`。
- source 处理放在 `src/core/source-ingestion/` 或相近目录。
- generation log 不应塞进 `ScreenplayDocument` 类型。
- UI state 不应塞进 `ScreenplayDocument` 类型。
