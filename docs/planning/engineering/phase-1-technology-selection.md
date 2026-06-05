# Phase 1 Technology Selection

> 最近更新：2026-06-06  
> 状态：用于脚手架启动的当前决策。

## 选型原则

不同领域需要不同选型，但都必须围绕 `ScreenplayDocument`。其中 `script: ScreenplayAst` 是脚本树。

```text
Creative source
  -> source adapter
  -> chapter parser for novel source
  -> LLM planner / writer
  -> ScreenplayDocument
  -> validation diagnostics
  -> preview / editor
  -> YAML projection
  -> optional exporters
```

不要用某一个领域的工具统治全部系统：

- 不要让 YAML 模板统治 document。
- 不要让编辑器组件统治数据模型。
- 不要让 LLM prompt 统治导出格式。
- 不要让未来 VN 导出拖重 MVP。
- 不要让当前小说导入入口阻断未来灵感生成入口。

## 应用框架

推荐：React + TypeScript + Vite。

理由：

- `ai-visual-novel-engine` 已有 React/Vite 经验可参考。
- 本项目第一版更像工作台和生成器，React 组件化足够快。
- 当前不需要 KMD 那种 Vue + Pixi 运行时复杂度。

备选：Vue + TypeScript + Vite。

仅当决定直接复用 KMD 编辑器壳和 Monaco 集成方式时考虑。当前不推荐。

## 包管理和基础规范

推荐：

- pnpm 管理依赖和 lockfile。
- `.editorconfig` 统一编辑器基础格式。
- Prettier 统一代码格式。
- ESLint 做 TypeScript、React Hooks 和 React Refresh 检查。

暂不加入：

- 自动导入插件。
- Husky / lint-staged。
- 复杂 monorepo workspace 配置。

理由：

- pnpm lockfile 稳定，安装速度快。
- EditorConfig、Prettier、ESLint 是第一批 PR 就应该建立的低成本规范。
- 自动导入会增加构建魔法；当前文件数量少，手动 import 更清楚。
- Git hooks 可以等测试和提交节奏稳定后再加。

## 核心模型和校验

推荐：

- TypeScript 定义 `ScreenplayDocument` / `ScreenplayAst`。
- v0.1 使用手写 TypeScript runtime validation。
- 后续可引入 Zod 做运行时校验和类型推导。
- v0.1 使用手写 `serializeDocumentToYaml`。
- 后续可引入 `yaml` 或 `js-yaml` 替换 serializer 内部实现。

理由：

- 官方需要 YAML Schema 文档，但工程上需要运行时校验。
- 手写校验和 serializer 能降低 MVP 依赖和维护成本。
- Zod 能在后续为 UI、serializer、LLM response parser 提供同一份约束。
- 保持全 TypeScript 能降低前后端类型断裂。

## 模型调用

推荐：

- 轻量本地 API 层封装模型调用。
- 支持 OpenAI-compatible endpoint。
- 支持 mock fallback。

理由：

- 不应把 API key 暴露在浏览器里。
- 72 小时内不需要完整 Python FastAPI + Neo4j 后端。
- mock fallback 能保证 demo 和评审复现。

可选实现：

- 如果选择纯前端 demo：只允许用户手动填入临时 key，并在 README 明确风险；不推荐作为默认。
- 如果选择 Node API：用一个小型 server 或 Vite dev middleware 承接 `/api/generate`；推荐。
- 如果选择 Python FastAPI：可复用 `ai-visual-novel-engine` 的思路，但会增加仓库和启动复杂度；当前不推荐。

## 章节解析

推荐：先用确定性 TypeScript parser。

章节解析是当前 `novel` source adapter 的一部分。长期可以增加 inspiration seed、outline 或 world bible adapter，但 Phase 1 只实现小说文本入口。

能力范围：

- 识别 `第X章`、`Chapter X`、明显标题行。
- 少于 3 章时报 warning diagnostic，但不阻止普通转换。
- 提交就绪检查要求演示样例覆盖 3 个以上章节。
- 解析失败时允许用户手动分章。

不推荐第一版使用：

- Tree-sitter。
- Peggy。
- 完整中文 NLP 分词。

理由：输入小说章节边界比 DSL 语法简单，确定性解析足够。

## DSL / 编译

推荐：把“编译”理解为 AST projection / exporter。

第一版只实现：

- `ScreenplayDocument -> YAML`。
- `ScreenplayDocument -> preview blocks`。

可选：

- `ScreenplayDocument -> Fountain-like text`。
- `ScreenplayDocument -> Ren'Py sample`。

不做：

- Fountain parser。
- YAML + Fountain 双向读写。
- Ren'Py / Naninovel 完整工程导出。

## 编辑器体验

推荐：

- 结构化表单/列表编辑 AST。
- 支持增加语义块，例如 action、dialogue、narration、transition、note。
- 右侧 YAML projection 只读或可复制。
- 剧本阅读预览使用 CSS 渲染。
- Monaco 只用于 YAML/debug 面板，不作为主编辑面。

理由：

- 作者不应该被迫编辑 YAML。
- 作者也不应该被迫掌握 Fountain；Fountain-like 是预览/导出投影，不是主编辑器。
- Monaco 很适合代码和 YAML，但不适合作为第一版的剧本 WYSIWYG。
- 基础字段编辑足以证明“可进一步打磨”。

## Phase 1 目录建议

```text
src/
  core/
    screenplay/
    validation/
    serialization/
    source-ingestion/
    chapter-parser/
    adaptation/
  app/
    components/
    state/
    services/
```

## 第一批 PR 建议

- PR 1：项目脚手架、README 初稿、依赖说明。
- PR 2：`ScreenplayDocument` / `ScreenplayAst` 类型与 runtime validation。
- PR 3：source ingestion、章节解析和 diagnostics。
- PR 4：document -> YAML serializer。
- PR 5：基础 UI：输入、章节列表、预览、YAML 输出。
- PR 6：LLM/mock 改编管线。
