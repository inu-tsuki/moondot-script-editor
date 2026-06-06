# Development Workflow

> 最近更新：2026-06-06

本文定义月点第一次提交后的开发流程。目标是留下清晰、可追溯的工程轨迹，让评审能看到项目如何从需求、架构、实现、验证一步步长出来。

## 基本原则

- 主分支保持可运行。
- 每个 PR 只做一件事。
- commit 和 PR 描述要能解释工程意图。
- 不在最后一天批量导入大量代码。
- 复用旧项目代码时，在 PR 和 README 中明确披露来源。
- 文档、脚手架、核心模型、生成链路和 UI 分阶段推进。

## Solo Maintainer Workflow

即使仓库只有一个维护者，也按短分支和短 PR 开发。PR 用来记录每次工程推进的意图、边界和验证方式：

- 为什么做这次改动。
- 改了哪些边界。
- 如何验证。
- 是否使用了旧代码或外部依赖。

推荐流程：

1. 从 `main` 拉出短分支。
2. 在分支上提交一组相关 commit。
3. 开 PR，并写清楚目的、实现和验证。
4. 自查后合并回 `main`。

## 分支命名

- `docs/update-schema-notes`
- `feat/app-scaffold`
- `feat/screenplay-ast`
- `feat/novel-import`
- `feat/yaml-export`
- `feat/semantic-editor`
- `feat/model-adapter`
- `fix/yaml-validation`

## Commit 规范

使用简短、可读的 Conventional Commit 风格：

- `docs: initialize project knowledge base`
- `docs: define development workflow`
- `feat: scaffold vite react app`
- `feat: add screenplay ast schema`
- `feat: export screenplay ast to yaml`
- `fix: preserve chapter source mapping`

一次 commit 应该表达一个明确意图。文档调整可以合并在同一个 docs commit 中，但不要把脚手架、模型、UI 和导出混成一笔。

## PR 描述模板

GitHub 默认 PR 模板放在 `.github/pull_request_template.md`。

```md
## Purpose

这次 PR 的目标和范围是什么？

## Changes

- 改动 1
- 改动 2

## Verification

- [ ] 手动验证：
- [ ] 自动测试：
- [ ] 构建：

## Submission Fit

这次改动如何支持月点的 AI 小说转剧本提交需求？

## Reuse Disclosure

本 PR 是否复用旧项目或第三方代码？如果有，说明来源、范围和修改方式。
```

## 第一次提交

第一次提交建议只做项目启动：

- 根目录 README。
- `docs/` 文档库。
- `.gitignore`。
- GitHub PR 模板。
- 开发流程文档。
- 需求、Schema、架构和提交规则整理。

建议 commit：

```sh
git add .github/pull_request_template.md .gitignore README.md docs/
git commit -m "docs: initialize project knowledge base"
```

如果还没有远程仓库，之后再创建 GitHub public repo 并推送：

```sh
git branch -M main
git remote add origin git@github.com:<owner>/<repo>.git
git push -u origin main
```

## 第一组 PR

推荐拆分：

1. `feat/app-scaffold`
   - 创建 React + TypeScript + Vite 应用。
   - 保证本地可启动。
2. `feat/screenplay-ast`
   - 定义 `ScreenplayDocument` / `ScreenplayAst` TypeScript 类型。
   - 定义 Zod 或等价运行时校验。
3. `feat/novel-import`
   - 实现文本粘贴/上传。
   - 实现章节边界解析。
4. `feat/yaml-export`
   - 实现 document 到 YAML projection。
   - 显示 YAML 预览和导出。
5. `feat/semantic-editor`
   - 实现场景和语义块的基础编辑。
   - 支持增加 action、dialogue、narration、transition、note。
6. `feat/model-adapter`
   - 实现轻量模型调用层。
   - 提供 mock fallback，保证 demo 可复现。

## Lightweight Stage Planning

每个阶段开工前，先写清楚 6 个要点：

1. 成功标准：做到什么程度可以合并？
2. 非目标：这次明确不做什么？
3. 输入和输出：这次改动接收什么，产出什么？
4. 风险：哪里最可能失控？
5. 验证：如何证明它能工作？
6. 提交需求映射：它服务官方题目的哪一条？

这个步骤应该轻量。通常一段 PR 描述或一小节 TODO 就够，不需要先写厚重方案。

## 提交前自查

每次合并前检查：

- `git status` 中没有意外文件。
- README 或相关文档已随功能更新。
- 如有运行命令，PR 中写明验证结果。
- 如有复用代码，PR 中披露来源。
- 主分支不会因为该 PR 进入不可运行状态。

## 验证分层

按 `AGENTS.md` 中的仓库约定执行验证：

- 普通改动运行 `pnpm format:check`、`pnpm lint`、`pnpm build` 和 `pnpm test`。
- UI、editor、toolbar、output panel 或 responsive layout 改动额外运行 `pnpm e2e`。
- Playwright 固定使用 `127.0.0.1:5173` 和系统 Chromium `/usr/bin/chromium`；不要运行 `pnpm exec playwright install`。
- 运行 e2e 前，确认 5173 空闲，或已经由当前分支的 `pnpm dev --host 127.0.0.1 --port 5173 --strictPort` 提供服务。
- 如果 e2e 因本地 server 可见性、端口或浏览器环境失败，PR 中要说明失败原因和已经完成的替代验证。

第一次公开仓库前额外检查：

- 没有密钥、token、私人 URL 或不可公开聊天内容。
- README 不承诺尚未实现的能力；未完成能力标注为规划或待补。
- 文档中的官方约束和工程解释分开表述。
