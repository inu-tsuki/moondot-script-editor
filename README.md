# 月点

月点是一款 AI 剧本创作工作台。它面向故事创作者、短剧创作者和互动叙事创作者；当前 MVP 从小说改编切入，把多章节小说文本转换为可编辑的结构化剧本，并导出符合说明文档的 YAML 剧本数据。

本仓库从七牛云 XEngineer 第三批次第三题“AI 小说转剧本工具”出发。当前已完成 Phase 2 的改编工作流基础切片和 Phase 2.5 的工作台 UI 地基：核心 document、scene outline 确认、YAML 导出、中央手稿编辑区、基础语义块操作和前端测试护栏已经建立。下一阶段将进入真实模型调用、prompt contract 和 demo 收口。

## 产品定位

月点不是一次性的文本转换脚本，也不是完整专业编剧 IDE。它的第一版定位是：

> 一个以导入和转换为入口的剧本编辑器：从小说长文本生成 `ScreenplayDocument`，再通过语义块编辑器继续打磨，最后导出 YAML。

项目核心不是 YAML 模板，而是可编辑的 `ScreenplayDocument`。其中 project metadata、source refs 和 character registry 提供剧本草稿上下文，`script: ScreenplayAst` 承载场景和语义块。YAML 是官方提交要求下的结构化序列化结果；Fountain-like 文本预览和其他格式导出都属于可选 projection。

## MVP 目标

MVP 要完成一条可演示链路：

1. 导入小说文本，支持 3 个章节以上的长文本样例。
2. 解析章节和主要叙事信息。
3. 生成 `ScreenplayDocument`，其中 `script` 包括场景、动作、对白、旁白、转场和批注等语义块。
4. 提供基础语义块编辑能力，让生成结果可以继续打磨。
5. 将 document 序列化为 YAML，并提供 Schema 文档解释字段设计原因。

`3+` 章节是提交演示和长文本工程能力证明，不是工具的普通输入硬限制。普通试跑可以少于 3 章，但正式 demo 会覆盖 3 个以上章节。

## MVP 范围

当前范围内：

- React + TypeScript + Vite 前端应用。
- 小说文本导入和章节解析。
- `ScreenplayDocument` / `ScreenplayAst` 类型定义和运行时校验。
- document / AST 驱动的结构化预览和基础编辑。
- YAML 导出。
- 可选 Fountain-like 剧本阅读预览。
- 轻量模型调用层和 mock fallback。

当前范围外：

- 完整专业编剧 IDE。
- 多人协作、CRDT、LSP、Tree-sitter 等重型编辑器能力。
- 完整 Fountain 解析器。
- 完整 Ren'Py、Naninovel、Word 或 PDF 导出。
- 资产管理、节点图和大型 Story IDE。

## 产品方向

短期目标是提交一个完整、清晰、可演示的月点 MVP。它应该让评审看到三件事：

- 长文本和多章节输入可以被稳定切分、理解和改编。
- 生成结果不是普通文本拼接，而是有 `ScreenplayDocument`、Schema 和 diagnostics 支撑的结构化剧本。
- 作者可以在 UI 中继续打磨剧本，而不是被迫直接编辑 YAML。

长期方向是支持更多 AI 创作入口，例如小说改编、灵感生成、大纲扩写和世界观生成；并把同一份 `ScreenplayDocument` 投影到不同创作场景：影视/短剧剧本、Fountain-like 阅读稿、视觉小说脚本片段，以及面向角色、场景和节奏分析的编辑辅助能力。

## 当前状态

- Phase 0：需求、范围、文档库和开发流程已建立。
- Phase 1：React + TypeScript + Vite 脚手架、`ScreenplayDocument`、validation、source ingestion、YAML projection 和基础语义块编辑已建立。
- Phase 2：Adaptation Plan / Scene Outline / 确认写入 / YAML 复制下载链路已完成基础切片。
- Phase 2.5：Workbench UI Foundation 已完成基础切片，包括 Tailwind、UI primitives、panel extraction、WorkbenchLayout、output tabs、document-backed reading surface、基础语义编辑控件和工业化手稿视觉收口。
- Engineering：Vitest / Testing Library / Playwright 前端测试护栏已接入，作为横向质量轨道维护。
- Phase 3：待启动，重点是真实模型调用层、prompt contract、mock fallback、导出体验和 demo 强化。
- Demo：待录制和补充链接。

## 文档

主要文档入口：

- [docs/README.md](docs/README.md)：文档库索引和放置规则。
- [docs/knowledge/requirements/xengineer-ai-novel-to-script.md](docs/knowledge/requirements/xengineer-ai-novel-to-script.md)：题目需求整理。
- [docs/knowledge/requirements/submission-rules.md](docs/knowledge/requirements/submission-rules.md)：作品提交和评审规则整理。
- [docs/knowledge/product/vision.md](docs/knowledge/product/vision.md)：月点长期产品愿景和 IDE 边界。
- [docs/planning/submission-fit-review.md](docs/planning/submission-fit-review.md)：brainstorm 与提交需求的适配审计。
- [docs/planning/roadmap/README.md](docs/planning/roadmap/README.md)：阶段路线。
- [docs/planning/roadmap/phase-2-5-workbench-ui-foundation.md](docs/planning/roadmap/phase-2-5-workbench-ui-foundation.md)：工作台 UI 地基规划。
- [docs/planning/next-direction.md](docs/planning/next-direction.md)：下一阶段 PR 顺序和近期原则。
- [docs/planning/engineering/frontend-test-harness.md](docs/planning/engineering/frontend-test-harness.md)：前端测试护栏和 e2e 运行边界。
- [docs/planning/development-workflow.md](docs/planning/development-workflow.md)：PR、commit 和第一次提交后的开发流程。
- [docs/knowledge/architecture/screenplay-ast-contract.md](docs/knowledge/architecture/screenplay-ast-contract.md)：`ScreenplayDocument` / `ScreenplayAst` 核心模型契约。
- [docs/knowledge/architecture/document-workspace-boundary.md](docs/knowledge/architecture/document-workspace-boundary.md)：`ScreenplayDocument` 与未来 workspace / project 层边界。
- [docs/knowledge/interaction/workbench-layout.md](docs/knowledge/interaction/workbench-layout.md)：工作台布局和中央编辑区方向。
- [docs/knowledge/schema/script-yaml-schema.md](docs/knowledge/schema/script-yaml-schema.md)：剧本 YAML Schema 草案。
- [docs/knowledge/interaction/semantic-block-editing.md](docs/knowledge/interaction/semantic-block-editing.md)：MVP 语义块编辑体验。

## 开发流程

本项目采用短分支和短 PR 开发。每个 PR 只做一件事，并说明：

- 目的和范围。
- 实现内容。
- 验证方法。
- 是否复用旧项目代码或第三方代码。
- 这次改动如何对应提交需求。

当前已完成的主要 PR 方向：

1. `feat/app-scaffold`：搭建 React + TypeScript + Vite 脚手架。
2. `feat/screenplay-*`：定义文档模型、validation、YAML projection、source ingestion 和基础语义块编辑。
3. `feat/adaptation-*`：建立 Adaptation Plan、生成前偏好、scene outline 确认和 Writer 写入链路。
4. `feat/yaml-export-actions`：实现 YAML 复制、下载和导出前 validation 状态。
5. `feat/workbench-*`：接入 Tailwind、抽出 UI primitives / panels、建立 WorkbenchLayout、output tabs、中央手稿阅读面和基础语义编辑控件。
6. `chore/frontend-test-harness`：接入 Vitest / Testing Library / Playwright，建立核心操作、组件和浏览器布局回归测试。

接下来优先进入 Phase 3：接入轻量模型调用层，强化 Architect / Writer 的 prompt contract、错误恢复和 mock fallback，并把 demo 路径收紧到可提交状态。

完整流程见 [docs/planning/development-workflow.md](docs/planning/development-workflow.md)。

## 复用与原创性

本项目会参考相邻项目中的架构经验，但第一次提交不包含复用代码。若后续复用 `playground/ai-visual-novel-engine`、`playground/kmd` 或其他项目中的代码片段，会在对应 PR 描述和 README 中明确说明来源、范围和改动方式。

当前复用策略见 [docs/knowledge/reuse/adjacent-projects.md](docs/knowledge/reuse/adjacent-projects.md)。

## 运行

安装依赖：

```sh
pnpm install
```

启动开发服务器：

```sh
pnpm dev
```

检查代码和构建。普通改动按 `AGENTS.md` 的约定优先运行：

```sh
pnpm format:check
pnpm lint
pnpm build
pnpm test
```

涉及 UI、editor、toolbar、output panel 或响应式布局时，额外运行浏览器测试：

```sh
pnpm e2e
```

`pnpm test` 使用 Vitest + Testing Library 覆盖核心 screenplay 操作和 React 组件行为。`pnpm e2e` 使用 Playwright 覆盖工作台 smoke、output tabs、中央剧本块工具栏和窄屏布局回退。

Playwright 固定使用 `127.0.0.1:5173`，并通过系统 Chromium 运行浏览器测试。Arch / pacman 环境下应使用 `/usr/bin/chromium`，不要运行 `pnpm exec playwright install` 下载 Playwright 托管浏览器。运行 e2e 前请确认 5173 空闲，或已经由当前分支的 `pnpm dev --host 127.0.0.1 --port 5173 --strictPort` 提供服务。

如果当前 shell 设置了 `HTTP_PROXY` / `HTTPS_PROXY` / `ALL_PROXY`，运行 e2e 时显式绕过本地地址：

```sh
env NO_PROXY=127.0.0.1,localhost no_proxy=127.0.0.1,localhost pnpm e2e
```

## Demo

Demo 视频链接待补充。

正式 demo 应覆盖：

- 输入 3 个以上章节的小说文本。
- 生成结构化 `ScreenplayDocument`。
- 在语义块编辑界面中修改或增加内容。
- 导出 YAML。
- 展示 YAML Schema 文档位置。
