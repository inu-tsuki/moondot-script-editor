# PR #2 Review: Screenplay AST & Validation

> 最近更新：2026-06-06  
> 对应分支：`feat/screenplay-ast`  
> 对应提交：`4ea4151 feat: add screenplay document validation`

## 审阅结论

PR #2 落地了月点核心的数据模型与校验机制：

- 定义了 v0.1 的 `ScreenplayDocument` / `ScreenplayAst` 强类型体系，利用 TS 模板字面量对 ID 前缀约束进行了规范化设计。
- 实现了基础 `validateScreenplayDocument` 运行时校验（Diagnostics），对唯一性 ID、空字段、非空场景块及引用完整性提供了运行时排查能力。
- 提供了可供 UI 使用的 Demo 级 mock 数据，并在 `App.tsx` 中对接了校验逻辑和 YAML 序列化投影展示。

编译和打包（`pnpm build`）均通过，核心功能可正常跑通。虽然该分支存在若干设计对齐 Gap，但均非严重阻碍性（Blocker）错误，可在后续 PR 中以修复或演进的形式进行对准。

## Review 观察

对比规范设计文档，主要有以下对齐 Gap 与设计取舍：

### 1. 运行时校验的 Gap

#### ① 缺失“小说文本/章节正文”空校验
- **规范要求**（[screenplay-ast-validation.md](../../knowledge/validation/screenplay-ast-validation.md)）：“小说文本不能为空，章节正文不能全为空。”
- **代码实现**：在 [validateScreenplayDocument.ts](../../../src/core/validation/validateScreenplayDocument.ts) 中仅校验了章节数 `chapters.length` 和章节标题，未校验 `chapter.text` 本身。

#### ② 场景标题空校验的严重性不一致
- **规范要求**（[screenplay-ast-validation.md](../../knowledge/validation/screenplay-ast-validation.md)）：每个 scene “必须有 heading、title、blocks”，暗示应属于 Error。
- **代码实现**：代码里空场景标题仅触发了 `warning`，需统一是升级为 Error，还是在规范里改为 Warning 级。

#### ③ 对白角色不存在的级别冲突
- **规范要求**（[screenplay-ast-validation.md](../../knowledge/validation/screenplay-ast-validation.md)）：“角色表为空，但对白块出现了角色名。这些不一定阻止导出，但应产生 warning。”
- **代码实现**：代码里如果 Dialogue 块中引用的 `characterId` 不在 `characters` 表中，会返回 `error` diagnostic（`missing_dialogue_character`）。当前 UI 仍展示 YAML，是否阻止导出需由后续导出器或提交检查定义。

#### ④ 偏离 Zod 技术选型与缺省改编质量校验
- **设计取舍**：PR 规划中提到“引入 Zod”，实际为了避免在 MVP 阶段增加重量级运行时依赖，退回了手写的 TypeScript 校验函数。
- **缺失质量校验**：关于心理描写 Verbatim 复制、无动作/对白场景和章节覆盖不均等“改编质量校验”尚未在当前运行时校验器中实现。此类校验属于未来二期规划，应在提示词和 LLM 后端进行逻辑处理。

### 2. YAML Projection 序列化 Gap

#### ① 缺失 `generatedAt` 字段
- **规范要求**（[script-yaml-schema.md](../../knowledge/schema/script-yaml-schema.md)）：`project` 节点下需包含 ISO 8601 格式的生成时间 `generatedAt`。
- **当前状态**：TS 的 `ScreenplayProject` 类型仅有 `createdAt` / `updatedAt`，在 YAML 拼装阶段该字段被完全丢弃。

#### ② 仅序列化单个场景（Active Scene）
- **实现限制**：目前 `yamlPreview` 中仅序列化了首个场景（`activeScene = screenplayDocument.script.scenes[0]`），忽略了其他可能存在的场景节点，不符合多场景文档的完整序列化。

#### ③ 缺失 `nextSceneId` 字段
- **规范要求**（[script-yaml-schema.md](../../knowledge/schema/script-yaml-schema.md)）：场景节点需要 `nextSceneId` 来表达线性链条。在 YAML 拼装中此字段暂未实现。

## 本分支后续处理状态

在同一 `feat/screenplay-ast` 分支内，review 后已继续处理：

- 已补充 `chapter.text` 空文本校验。
- 已将空场景标题从 `warning` 调整为 `error`。
- 已在 UI/input 边界补充小说来源文本为空的 diagnostic。
- 已抽取 `serializeDocumentToYaml`，不再由 `App.tsx` 临时拼接 YAML。
- YAML projection 已覆盖完整 `script.scenes[]`，并生成 `generatedAt` 和线性 `nextSceneId`。
- 已补充小说 source ingestion / 章节解析，但明确它只负责来源摄取，不承担小说到剧本转换。
- 已补充小说改编 prompt / mock fallback 骨架，作为未来 LLM agent 接入点。

仍保留为后续 PR 的事项：

- `missing_dialogue_character` 继续保持 `error`，因为这是 AST 引用断裂；如果未来接收“带角色名但未入库”的 LLM 输出，应在导入/修复层产生 warning 或自动建角色。
- 标准 YAML 库暂不引入，当前仍使用轻量手写 serializer。
- Zod 暂不引入，当前仍使用手写 TypeScript validation。
- 真实模型调用层暂不接入，当前只保留 prompt 协议和 mock fallback。
- 改编质量 heuristics 暂不做运行时强校验，后续放到 LLM 生成、修复和质量审查链路。

## 原始后续动作

1. **修正校验规则的级别**：
   - 补全 `validateScreenplayDocument.ts` 中对 `chapter.text` 的空文本校验。
   - 确定对白角色缺失是 `error` 还是 `warning`，并统一代码与文档的对齐。
2. **完善 YAML 序列化**：
   - 在 `App.tsx` 中重构 YAML 生成器，使其能够渲染完整的 `scenes` 数组（而不仅仅是 activeScene），并计算/渲染 `nextSceneId` 和 `generatedAt`。
   - 在后期版本中考虑引入标准 YAML 库防止转义失效导致 YAML 格式损坏。
3. **更正规范文档说明**：
   - 在 `screenplay-ast-validation.md` 中补充说明 Zod 选型的退回原因与改编质量校验的延迟处理原因。

## 可粘贴到 GitHub PR 的 Review Comment

```md
### PR Review & Alignment Notes:

The implementation of `ScreenplayDocument` types and custom `validateScreenplayDocument` validation looks solid and builds successfully (`pnpm build`).

A few minor gaps/differences were identified during review. Follow-up commits in the same branch have already addressed:
- Chapter text empty validation.
- Empty scene title severity alignment.
- Source text empty diagnostic at the UI/input boundary.
- Full scenes list YAML serialization.
- `generatedAt` and linear `nextSceneId` in the generated YAML projection.

Remaining intentional deferrals:
- `missing_dialogue_character` remains an `error`, because it is an AST reference integrity issue.
- **YAML library**:
  - The current serializer is still hand-written for MVP simplicity; a standard YAML package can replace it later behind `serializeDocumentToYaml`.
- **Zod & Quality Checks**:
  - Manual TypeScript validation is implemented instead of Zod for MVP simplicity.
  - Adaptation quality heuristics (NLP-based) are deferred to LLM/backend generation stages.

Future PRs can focus on the real model API layer, a standard YAML package, and quality heuristics.
```
