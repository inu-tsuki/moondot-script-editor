# PR #3 Review: Screenplay Document Types

> 最近更新：2026-06-06
> 对应分支：`feat/screenplay-model`
> 对应提交：`3dc03e7 feat: add screenplay document types`（含前置 `c72ae5c docs: plan screenplay document model`）

## 审阅结论

PR #3 落地了月点核心数据模型的 **类型层**：

- 在 `c72ae5c` 中将已有架构讨论系统化地固化为新文档（`screenplay-ast-structure.md`、`document-workspace-boundary.md`），并更新了全系列知识库文档，明确了 `ScreenplayDocument` 权威地位和 YAML/Fountain/VN 边界关系。
- 在 `3dc03e7` 中新增 `src/core/screenplay/types.ts`、`demoDocument.ts`、`index.ts`，并将 `App.tsx` 的临时 mock 数据迁移到了强类型结构。

类型设计整体对齐规划文档，ID 前缀约束使用 TS 模板字面量实现。Demo document 覆盖 3 章、2 角色、1 场景，满足提交就绪样例要求。

**但此分支的目标是"类型 + 类型对应的 UI 展示"，尚不含运行时校验和完整 YAML serializer；这是 PR 边界合理的地方，也是审阅需要明确记录的设计缺口。**

---

## Review 观察

### 1. 类型设计 Gap

#### ① `ScriptStructure` 缺少 `startSceneId`

- **规划文档**（`screenplay-ast-structure.md` 第 209 行）：明确"YAML serializer 可以从数组顺序推导 `startSceneId` 和 `nextSceneId`"，并在下一节给出了 branching 时 `startSceneId: SceneId` 的字段形态。
- **代码实现**：`ScriptStructure` 只有 `type: 'linear'`，没有 `startSceneId` 字段。
- **影响**：YAML serializer 当前在 `App.tsx` 里写死 `startSceneId: yamlString(activeScene?.id ?? '')`，没有从 document 结构里读取，是 serializer 绕过 document 的体现。后续 serializer 单独抽出后需要决定是由 serializer 自行推导，还是让 document 明确保存该字段。

#### ② `SourceChapter.text` 可选但校验约定不完整

- **类型定义**：`text?: string`，可选。
- **规划文档**（`screenplay-ast-validation.md`）："章节正文不能全为空。"
- **当前状态**：此分支没有校验层，可选是合理的 MVP 设计；但 `text` 缺失时 demo document 提供的是完整文本，部分边界场景（如纯标题行）没有 demo 覆盖。这在后续 validation 分支需要跟进。

#### ③ `createNextBlockId` 的 ID 生成策略有碰撞风险

- **代码实现**（`App.tsx` 第 46 行）：`blk_${String(blocks.length + 1).padStart(3, '0')}`，基于 `blocks.length` 生成下一个 ID。
- **问题**：删除 block 后再添加，会与历史 ID 重复。规划文档（`screenplay-ast-structure.md`）明确"稳定 ID，方便局部编辑和局部重生成"，但这个工厂并不稳定。
- **建议**：后续 operations 层应使用单调递增计数器或取现有 ID 集合中最大序号 +1，而不是取 `length + 1`。

---

### 2. App.tsx 设计问题

#### ① YAML serializer 内联在 `useMemo` 里

- **当前状态**：整个 YAML 生成逻辑写在 `App.tsx` 的 `useMemo` 里（约 50 行）。
- **规划文档**（`screenplay-ast-contract.md`）："导出器命名为 `serializeDocumentToYaml`"，隐含它应是独立模块。
- **影响**：YAML serializer 不可被 validation 层调用、不可被独立测试，也让 App.tsx 承担了本不属于它的序列化职责。

#### ② `countChaptersInText` 与 document 章节数独立计算

- **代码实现**（`App.tsx` 第 33 行）：用正则从 `sourceText` 数章节标题，与 document 内部 `sourceChapters` 分开维护，取 `Math.max`。
- **问题**：`sourceText` 和 `screenplayDocument.source.chapters` 之间没有显式绑定；用户修改 textarea 时，document 内部的章节不会更新。两者实际上描述的是两份"来源"，容易造成章节计数歧义。
- **建议**：source ingestion 应统一由 parser 负责，parser 输出的 chapters 写入 document；`countChaptersInText` 的正则计数应只在 parser 内部使用，App 层只读 `document.source.chapters.length`。

#### ③ `generatedAt` 缺失于 YAML projection

- **规范要求**（`script-yaml-schema.md`）：`project` 节点下需包含 `generatedAt`（ISO 8601）。
- **当前实现**：YAML 字符串里只有 `title`、`language`、`targetMedium`、`sourceType`，没有 `generatedAt` 字段。

#### ④ YAML projection 只序列化 `activeScene`（第一个场景）

- **当前实现**：`sceneYaml` 只处理 `activeScene = screenplayDocument.script.scenes[0]`，忽略了其它场景节点。
- **影响**：demo document 只有 1 个场景，当前看不出问题；但改编生成后出现多场景时，YAML 输出将不完整。

---

### 3. 文档 Gap

#### ① `screenplay-ast-structure.md` 建议步骤与实际拆分不符

- **文档建议**（该文档末尾）：分三步提交——docs commit、types commit、validation commit（"引入 Zod"）。
- **实际拆分**：docs commit 和 types commit 已完成；validation commit 被拆入后续 `feat/screenplay-validation-yaml` stacked PR（且决定不引入 Zod）。这是合理的工程取舍，但文档里关于"引入 Zod"的建议应在知识库里说明已退回原因（已在 `pr-002-screenplay-ast.md` 的观察 ④ 中记录，此处不再单独处理）。

---

## 本分支后续处理状态

此分支在 stacked PR 中作为第一层。以下 Gap 已在后续 PR 修复：

- PR #4 已抽取 `serializeDocumentToYaml`，不再内联于 App.tsx。
- PR #4 已补充 `generatedAt` 和 `nextSceneId` 到 YAML projection。
- PR #4 已实现 `validateScreenplayDocument` 运行时校验。
- PR #5 已实现 `parseNovelChapters`，统一 source ingestion；App.tsx 移除 `countChaptersInText` 正则。
- PR #5 已将 block ID 工厂迁入 `operations.ts`，改为读取全 document 中现有 block 最大序号 +1，修复 `blocks.length + 1` 的碰撞风险。

仍保留为后续 PR 事项：

- `ScriptStructure` 是否保留 `startSceneId` 字段，待 branching / VN 导出上线前再决策。当前 YAML serializer 由 `script.scenes[]` 顺序推导 `startSceneId`。

---

## 原始后续动作

1. **抽取 serializer**：把 YAML 生成逻辑从 `App.tsx` 移到 `src/core/serialization/serializeDocumentToYaml.ts`，并补充 `generatedAt`、全场景序列和 `nextSceneId`。
2. **统一 source ingestion**：新增 `parseNovelChapters`，让 `sourceText → document.source.chapters` 路径唯一；App.tsx 只读 document 内部章节数。
3. **修正 ID 工厂**：`createNextBlockId` 或等价工厂应取现有 ID 集合的最大序号 +1，或使用单调计数器，避免删除后再添加导致 ID 重复。
4. **补充运行时校验**：在后续 PR 中实现 `validateScreenplayDocument`，覆盖 `chapter.text` 空校验、ID 唯一性和对白角色引用完整性。

---

## 可粘贴到 GitHub PR 的 Review Comment

```md
### PR Review & Alignment Notes

Type definitions in `src/core/screenplay/types.ts` and `demoDocument.ts` align well with the `screenplay-ast-structure.md` spec. ID prefix constraints via TS template literals are clean. The 3-chapter demo document meets the submission readiness sample requirement.

A few gaps identified:

**Types:**
- `ScriptStructure` has no `startSceneId`; the YAML serializer currently inlines `activeScene?.id` without reading from the document structure.
- `createNextBlockId` in `App.tsx` uses `blocks.length + 1`, which is not stable after deletions.

**App.tsx / YAML:**
- YAML serializer is inlined in `useMemo`; should be extracted to `serializeDocumentToYaml`.
- `generatedAt` is missing from the YAML projection (required by `script-yaml-schema.md`).
- Only `activeScene` (scenes[0]) is serialized; other scenes are silently dropped.
- `countChaptersInText` regex and `document.source.chapters` are two separate chapter sources; ingestion should be unified.

All implementation gaps above are addressed in stacked follow-up PRs (#4 and #5). This branch is clean as a type foundation PR.
```
