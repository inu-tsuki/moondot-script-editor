# PR #5 Review: Novel Adaptation Workflow

> 最近更新：2026-06-06
> 对应分支：`feat/novel-adaptation-workflow`（base = `feat/screenplay-validation-yaml`）
> 对应提交：
> - `4d219b3 feat: add novel adaptation scaffold`
> - `0481c8a feat: stage novel adaptation workflow`

## 审阅结论

PR #5 完成了从"类型 + 校验 + 序列化"到"可运行 demo 管线"的最后一公里：

- 新增 `src/core/source-ingestion/parseNovelChapters.ts`：将 `sourceText` 解析为结构化 `NovelSource.chapters`，生成 diagnostics，取代了 PR #3/#4 遗留的正则字符计数。
- 新增 `src/core/adaptation/`（`types.ts`、`buildNovelAdaptationPrompt.ts`、`mockNovelAdaptation.ts`、`index.ts`）：建立了两阶段 LLM prompt 协议（Adaptation Architect + Screenplay Writer）和 mock fallback 骨架。
- 新增 `src/core/screenplay/operations.ts`：将 `createNextBlockId`、`appendBlockToFirstScene`、`updateBlockText`、`formatSceneHeading`、`getBlockCharacterId` 从 App.tsx 迁移为独立函数；**修复了 PR #3 review 记录的 ID 碰撞问题**，改为全 document 最大序号 +1 策略。
- `App.tsx` 接入 `parseNovelChapters` 和 `adaptNovelToScreenplayMock`，"生成"按钮从空壳变为可触发 mock 流程，diagnostics 面板整合三类来源（source text / parsedNovel / adaptationDiagnostics / documentDiagnostics）。
- 新增架构文档 `adaptation-workflow.md`，明确分章器和改编器的边界，以及 Phase 1 可做范围和后续模型调用层规划。

整体 **修复了 PR #3/#4 全部遗留 Gap 中属于此 PR 职责的部分**，可编译运行，mock demo 可复现。

---

## Review 观察

### 1. `parseNovelChapters` 设计

#### ① source ingestion / adaptation 边界明确

- 章节解析只输出 `SourceChapter[]` 和 `Diagnostic[]`，不产出 `SceneNode`，与 `adaptation-workflow.md` 的 "parseNovelChapters 不负责决定 scene 边界" 完全对齐。
- 无标题时回退为单章全文（`title: '全文'`），并产生 warning 引导用户手动分章——合理的 fallback。

#### ② 章节标题正则覆盖范围有限

```ts
/^\s*((第[零〇一二三四五六七八九十百千万两\d]{1,9}[章节回幕卷])|(Chapter\s+\d+))[\s:：、.-]*(.*)$/i
```

- 能识别"第X章"、"Chapter N"；不识别"CHAPTER ONE"、纯数字"1."、"第一部分"、"幕一"等变体。
- **已有 fallback 处理**：无法识别时产生 `chapter_heading_not_found` warning，用户被提示使用标准格式。
- 风险：如果 demo 视频使用非标准格式小说，可能在演示时显示 warning 而非 ready 状态，影响评审印象。**建议 README 和 demo 样例明确使用"第X章"格式。**

#### ③ 空章节正文在 parser 层产生 `warning`，在 validator 层产生 `error`

- `parseNovelChapters` 对空正文章节产生 `warning`（`empty_parsed_chapter_text`）。
- `validateScreenplayDocument`（当 `requireChapterText: true`）对空正文章节产生 `error`（`empty_chapter_text`）。
- 两条 diagnostic 都会显示在 UI 的 diagnostics 面板，可能对同一个问题产生两条提示。建议：
  - 要么 validator 不重复发送同等语义的诊断（检测到 parser 已发出时跳过）；
  - 要么文档里说明"parser 侧是来源解析警告，validator 侧是文档结构错误"，使用不同措辞明确区分。

---

### 2. `mockNovelAdaptation` 与 prompt 协议

#### ① 两阶段 prompt 骨架协议明确

- `buildNovelAdaptationPrompt`：Adaptation Architect 阶段，要求输出 JSON（sourceAnalysis、adaptationOptions、sceneOutline、risks 等）。
- `buildNovelSceneWriterPrompt`：Writer 阶段，要求输出兼容 `ScreenplayDocument v0.1` 的 JSON。
- `PromptMessage` 类型通过 `stage` 字段区分 `adaptation_planning` / `writer_brief`，可用于日志和追踪。
- **mock 和 prompt 的分离设计清晰**：`promptMessages` 会同步附在 `NovelAdaptationResult` 里，即使使用 mock，LLM 该发送的 prompt 也能在 UI 里展示和调试。

#### ② mock 以章节为单位生成 scene，与 prompt 协议有偏差

- prompt 协议（Architect 阶段）明确要求"不要默认一章等于一场戏"，允许跨章合并或单章拆分。
- mock 实现（`adaptNovelToScreenplayMock`）为每个章节生成一个 `SceneNode`，即一章 = 一场戏。
- **这是有意的 MVP 简化**，且 mock trace 里已标注"真实流程应先生成可跨章节合并/拆分的 scene outline"。
- **建议**：mock `info` diagnostic 消息里已说明此点；如果日后演示时观众注意到 3 章 = 3 场，PR 描述中应也明确说明这是 mock fallback 的已知简化。

#### ③ mock block ID 工厂跨场景全局计数正确

- `createBlockIdFactory` 在 `adaptNovelToScreenplayMock` 内维护局部计数器，跨所有 scene 产出唯一 `blk_NNN`，不依赖 `blocks.length`。
- **与 `operations.ts` 中的全文档最大序号策略不同**：两套工厂各自独立。如果未来 mock 结果合并进已有 document（而不是直接替换），可能产生 ID 冲突。当前 mock 是完整替换 `script`，无此风险；但应在后续"部分 patch" 场景下统一为同一策略。

---

### 3. App.tsx 与 `workingDocument` 设计

#### ① `workingDocument` = `screenplayDocument` + 实时 parsed chapters

```ts
const workingDocument = useMemo<ScreenplayDocument>(() => ({
  ...screenplayDocument,
  source: {
    type: 'novel',
    title: ...,
    chapters: parsedNovel.chapters,
  },
}), [parsedNovel.chapters, screenplayDocument]);
```

- 设计合理：`screenplayDocument` 保存编辑状态（scenes、characters），`workingDocument` 把实时解析的章节覆盖进去，用于校验和 YAML 序列化。
- **潜在风险**：`workingDocument` 强制 `source.type = 'novel'`，没有检查 `screenplayDocument.source.type`。如果未来支持其他 source 类型的 document，此处会强制覆盖。当前 MVP 全为 novel，可接受；长期需要条件分支。

#### ② `updateSourceText` 清空 `adaptationDiagnostics`

- 用户修改 sourceText 时，自动清空改编 diagnostics，避免旧 mock 结果的 diagnostic 残留。设计合理。

#### ③ `adaptationDiagnostics` 来自 mock，不含 parsedNovel 的 info 诊断位置

- `displayedDiagnostics` 的顺序：`[source text check, ...parsedNovel.diagnostics, ...adaptationDiagnostics, ...documentDiagnostics]`。
- 来自 parsedNovel 的 `chapter_heading_not_found` warning 会出现在改编 diagnostics 之前，符合"先报来源问题，再报生成问题，再报结构问题"的用户感知顺序。合理。

---

### 4. 文档对齐

#### ① `adaptation-workflow.md` 与 Phase 1 实现边界对齐

- 文档明确"当前可做：mock fallback，不做真实模型调用层"。
- 文档明确"后续模型调用层再做：generateAdaptationPlan、用户确认 plan、generateSceneDraft"。
- 代码实现的 mock 骨架和 prompt 协议不超出文档承诺的范围，正确。

#### ② `adaptation-workflow.md` 中对 `ai-visual-novel-engine` 的复用说明

- 文档引用了父项目的 Architect/Director/Writer 三角模式，并说明月点的对应关系。
- 按提交规范，**复用了思路但不是代码**——如果最终 PR 描述里没有写明此参考来源，会构成潜在的无效风险（`submission-rules.md`："复用自己过去的代码片段，但 PR 描述没有注明来源"）。
- **建议**：PR 描述中明确"adaptation workflow 参考了 `ai-visual-novel-engine` 的 Architect/Writer 分阶段模式，但代码从零实现，未直接复制"。

---

## 本分支后续处理状态

PR #3/#4 遗留 Gap 全部处理完毕：

- `countChaptersInText` → `parseNovelChapters`，source ingestion 统一化。
- `createNextBlockId` length + 1 → `operations.ts` 全文档最大序号 +1，ID 碰撞已修复。
- `countChaptersInText` 已从 App.tsx 移除（此分支 diff 中已见）。

仍保留为后续 PR 事项：

- 空章节正文双重 diagnostic（parser warning + validator error）的措辞或去重。
- mock ID 工厂和 `operations.ts` ID 工厂统一（当前仅在全替换场景下无冲突）。
- PR 描述中补充对 `ai-visual-novel-engine` Architect/Writer 思路的来源说明；若 PR 已创建，应同步更新 GitHub PR body。
- `workingDocument` 强制 `source.type = 'novel'` 的 guard，待其他 source 类型上线前处理。
- 生成前配置 UI（目标长度、风格、忠实度）未实现，是 TODO 中的下一步。
- 真实模型调用层、adaptation plan 预览确认、Fountain-like 导出仍在后续 PR 规划中。

---

## 可粘贴到 GitHub PR 的 Review Comment

```md
### PR Review & Alignment Notes

This PR connects the full pipeline: `sourceText → parseNovelChapters → workingDocument → mock adaptation → ScreenplayDocument → validateScreenplayDocument → serializeDocumentToYaml`. The "Generate" button now triggers a real (mock) flow.

Highlights:
- `parseNovelChapters` correctly scopes its responsibility to source ingestion only (no scene splitting).
- `operations.ts` fixes the ID collision bug from PR #3 (`createNextBlockId` now uses max existing ID + 1 across the full document).
- Two-stage prompt protocol (Architect + Writer) is clearly documented and separated from the mock fallback.

Observations:
- Empty chapter text triggers both a parser `warning` and a validator `error`. Consider distinct wording or deduplication to avoid confusing users with two messages about the same issue.
- Mock generates one scene per chapter, which contradicts the Architect prompt's "one chapter ≠ one scene" rule. The mock trace already annotates this; PR description should also note it explicitly.
- The `workingDocument` memo hardcodes `source.type: 'novel'`; acceptable for MVP, needs a guard when other source types are introduced.
- If the Architect/Writer workflow pattern was referenced from `ai-visual-novel-engine`, the PR description should mention this (per submission rules on source attribution).
```
