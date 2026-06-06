# PR #4 Review: Screenplay Validation & YAML Serializer

> 最近更新：2026-06-06
> 对应分支：`feat/screenplay-validation-yaml`（base = `feat/screenplay-model`）
> 对应提交：
> - `4ea4151 feat: add screenplay document validation`
> - `a2c8b49 docs: add screenplay ast review notes`（即 pr-002 review 文档入库）
> - `cbdcd33 feat: serialize screenplay document to yaml`

## 审阅结论

PR #4 在 PR #3 的类型层基础上完整落地了校验和序列化两层核心逻辑：

- 新增独立的 `src/core/validation/` 模块（`diagnostics.ts`、`validateScreenplayDocument.ts`、`index.ts`），实现了 Diagnostic 类型分级和覆盖 ID 唯一性、来源引用、角色引用、空字段等多项运行时校验。
- 新增独立的 `src/core/serialization/` 模块（`serializeDocumentToYaml.ts`、`index.ts`），将 PR #3 遗留在 `App.tsx` 中内联 50 行的 YAML 生成逻辑迁移为可独立调用、可测试的函数，并补齐了 `generatedAt`、完整 `scenes[]` 和 `nextSceneId`。
- `App.tsx` 通过调用 `serializeDocumentToYaml` 和 `validateScreenplayDocument` 接入这两层，删减了约 90 行临时代码。

整体 **解决了 PR #3 review 中列出的 serializer 内联、`generatedAt` 缺失、多场景丢失三大 Gap**。编译和打包通过。

---

## Review 观察

### 1. Validation 设计对齐

#### ① `requireChapterText` / `requireSubmissionReady` 选项设计合理

- `requireChapterText: true` 开启时才校验 `chapter.text` 空值；普通流程不强制，与规范文档"普通转换至少 1 章"的宽松要求对齐。
- `requireSubmissionReady: true` 开启时才追加"少于 3 章"警告；与 `screenplay-ast-validation.md` "提交就绪检查需要 3 章以上"一致。
- **App.tsx 当前两个选项都开了**（`requireChapterText: true, requireSubmissionReady: true`），意味着 demo document 内带有空 `text` 的章节会立即触发 error。这在当前 demo 数据都有正文时不产生问题，但如果 demo document 将来有纯摘要章节，需注意。

#### ② `missing_dialogue_character` 保持 `error`

- 规范文档（`screenplay-ast-validation.md`）："角色表为空，但对白块出现了角色名。这些不一定阻止导出，但应产生 warning。"
- 代码实现：`characterId` 不在 `characters` 中时 → `error`。
- **此处有显性取舍**：代码注释层面尚未记录原因（"AST 引用断裂是结构性错误"）。该理由合理，但应在知识库或此 review 中保留说明，避免将来混淆。
  - **已由 `pr-002` review 文档记录**，无需在本文中再单独修正。

#### ③ `empty_chapter_title` 仅为 `warning`，而非 `error`

- 章节标题为空时 → `warning`（"章节标题为空，可能影响来源追溯"）。
- 规范文档（`screenplay-ast-validation.md`）："章节标题不能全为空。"措辞略模糊；当前代码按 warning 处理，符合"章节标题只影响追溯质量，不阻止改编"的思路。
- 建议：在 `screenplay-ast-validation.md` 中补充"单章标题为空时 warning，全部章节标题均为空时升为 error"的说明，消除措辞歧义。

---

### 2. YAML Serializer 设计

#### ① `generatedAt` 回退策略正确但有一处隐患

`serializeDocumentToYaml` 中的 `generatedAt` 回退顺序：
```
options.generatedAt ?? document.project.updatedAt ?? document.project.createdAt ?? new Date().toISOString()
```

- 当三者都未提供时，`new Date()` 在 `useMemo` 外调用，每次 re-render 可能取到不同时间。
- **App.tsx 的实际做法**：`const [generatedAt] = useState(() => new Date().toISOString())`，在 state 初始化时固定，传入 serializer 的 `options.generatedAt`，规避了 re-render 抖动。设计合理，但理解需要同时看 serializer 和 App.tsx 两处，耦合关系隐含。

#### ② YAML 字符串转义覆盖有限

`escapeYamlString` 处理了 `\`、`"`、`\n`，但：

- 中文全角冒号（`：`）、书名号（`《》`）、直引号（`"`、`"`）不会破坏双引号 YAML 字符串，安全。
- 但 `\r`（Windows 换行）未被标准化；如果用户粘贴 Windows 格式小说文本，`chapter.text` 可能带 `\r`，进入 YAML 后会显示为 `\r`（即 `\r` 字面字符串）。
- 建议：在 serializer 输入层或 `escapeYamlString` 内加 `.replace(/\r/g, '')` 或 `normalizeNewlines`。

#### ③ `yamlStringList` 空数组输出一致性

PR #3 遗留：`yamlStringList([])` 在 PR #3 的内联 YAML 里输出 `[]`（直接拼接），在 PR #4 的 serializer 里：

```ts
values.length > 0 ? `[${values.map(yamlString).join(', ')}]` : '[]'
```

空数组输出 `[]`，与 YAML Schema 示例（`aliases: []`）一致，正确。

---

### 3. App.tsx 残留问题

#### ① `countChaptersInText` 正则仍然保留

- **此分支对 sourceText 的处理没有引入 `parseNovelChapters`**，仍用正则计数章节，然后传入 `chapterCount` 做 UI 展示和 diagnostic 标注。
- `validateScreenplayDocument` 则读的是 `screenplayDocument.source.chapters`（即 demo document 里的静态数据），两者实际对应的是不同章节来源。
- 此 Gap 是有意推迟（`parseNovelChapters` 被规划到后续 PR），但 diagnostic 消息和 UI "chapters" 计数仍依赖正则，与校验层读到的不是同一份数据。**这是后续 PR #5 修复的目标。**

#### ② 新增 block 的 ID 工厂未修复

- `createNextBlockId` 仍在 App.tsx 内用 `blocks.length + 1`，未迁移至 `operations.ts`。
- **此 Gap 在 PR #5 中通过引入 `operations.ts` 中的最大序号策略修复。**

---

## 本分支后续处理状态

- `generatedAt`、`nextSceneId`、全场景序列化已全部修复。
- Validation 模块独立，可被 tests 和改编 pipeline 调用。
- `countChaptersInText` / `parseNovelChapters` 分离和 ID 工厂稳定性由 PR #5 修复。

仍保留为后续事项：

- `screenplay-ast-validation.md` 中"章节标题不能全为空"措辞待细化（单章 warning / 全部 error）。
- `escapeYamlString` 的 `\r` 处理建议在后续引入标准 YAML 库时一并解决。
- `missing_dialogue_character` 的 `error` 级别设计已在 `pr-002` review 文档记录，后续模型导入层应在 importer 层生成 warning 而非直接写入断裂引用。

---

## 可粘贴到 GitHub PR 的 Review Comment

```md
### PR Review & Alignment Notes

This PR delivers the two most important core modules:
- `validateScreenplayDocument` with proper Diagnostic severity levels and opt-in submission/text checks.
- `serializeDocumentToYaml` extracted from App.tsx, now including `generatedAt`, full `scenes[]` list, and `nextSceneId`.

Gaps from PR #3 review (serializer inline, `generatedAt` missing, single-scene YAML) are all resolved.

Minor observations:
- `missing_dialogue_character` stays `error` (AST reference integrity) — rationale already documented in pr-002 review.
- `escapeYamlString` doesn't handle `\r` (Windows newline). Low risk for now; a standard YAML library will fix this later.
- `countChaptersInText` (regex) and `validateScreenplayDocument` (document.source.chapters) still read from two different sources. This is deferred to PR #5 (`parseNovelChapters` integration).
- `createNextBlockId` in App.tsx still uses `length + 1`. Deferred to PR #5 (`operations.ts`).
```
