# CLAUDE.md

This file gives coding agents durable guidance for working in this repository. It should describe long-lived constraints, development principles, review expectations, and collaboration rhythm. Avoid time-sensitive status notes; agents should inspect the repository, roadmap, PRs, and package metadata for current state.

## Project Invariants

月点（Moondot）是一款 AI 剧本创作工作台。第一版入口是小说改编，但产品不应被写死为“只能处理小说章节”。长期上，灵感生成、大纲扩写、世界观生成和其他 source adapters 都应能进入同一套文档模型。

Core invariant:

```text
source input
  -> source ingestion / anchors
  -> adaptation workflow
  -> ScreenplayDocument
  -> validation
  -> projections / exports
```

- `ScreenplayDocument` 是主要编辑对象和应用事实源。
- `ScreenplayAst` / script blocks 承载剧本语义，而不是 YAML 模板。
- YAML 是提交与导出的 projection，不是内部主模型。
- Fountain-like、VN script、production reports 等都应作为 projection / exporter 处理。
- Source ingestion 只负责来源整理、章节/片段锚点和可追溯信息；小说到剧本的改编必须由 adaptation workflow / agent 完成，不能靠章节正则或 Fountain 文本解析伪装完成。
- Validation 是产品能力，不只是防御式代码。它要服务导出、UI 提示、模型输出修复和提交质量检查。

## Source Of Truth

When unsure, read the nearest source of truth instead of guessing.

- Official/user-facing product framing: `README.md`
- Documentation structure and placement rules: `docs/README.md`
- Roadmap and phase boundaries: `docs/planning/roadmap/`
- Immediate execution queue: `docs/planning/next-direction.md` and `docs/planning/TODO.md`
- Durable architecture knowledge: `docs/knowledge/architecture/`
- UI/interaction principles: `docs/knowledge/interaction/`
- Schema and export semantics: `docs/knowledge/schema/` and `docs/knowledge/export/`
- Historical PR review notes: `docs/planning/reviews/`

Do not duplicate volatile roadmap details here. If a detail can change after the next merge, link to the owning doc instead.

## Repository Discovery

Before coding:

- Check branch state with `git status --short --branch`.
- Inspect scripts and dependency versions from `package.json`; do not rely on this file for exact versions.
- Search with `rg` / `rg --files`.
- Read nearby code before introducing abstractions.
- Check current roadmap and TODO when choosing the next slice.

Expected local verification is whatever the repository exposes through package scripts. At minimum, run formatting, lint, build, and unit/component tests when touching code:

```sh
pnpm format:check
pnpm lint
pnpm build
pnpm test
```

If the change is UI-facing, editor-facing, toolbar-related, output-panel-related, or responsive-layout-related, also run Playwright e2e:

```sh
pnpm e2e
```

Playwright is configured for system Chromium at `/usr/bin/chromium` and fixed `127.0.0.1:5173`. Do not run `pnpm exec playwright install`; this repository should not download Playwright-managed browser binaries into the pnpm environment. Before e2e, ensure 5173 is free or already served by this branch via `pnpm dev --host 127.0.0.1 --port 5173 --strictPort`.

## Development Rhythm

Use short branches and short PRs. Each PR should do one thing and explain:

- purpose and scope;
- implementation summary;
- verification commands;
- relation to roadmap or submission requirements;
- reused code or external inspiration, when applicable.

Prefer this cadence:

1. Plan or update docs when the decision changes architecture, workflow, or product scope.
2. Implement one narrow slice.
3. Verify locally.
4. Open a PR.
5. Review and record follow-up when useful.
6. Merge, sync `main`, then start the next branch.

Stacked PRs are acceptable when code and planning must stay synchronized. In that case:

- base the upper PR on the lower PR branch;
- keep each PR reviewable on its own;
- after the lower PR merges, retarget or rebase the upper PR onto `main`;
- avoid hiding unrelated changes inside the stack.

## Coding Principles

- Keep domain logic in `src/core/` free of React dependencies.
- Use immutable updates for `ScreenplayDocument` and nested script structures.
- Preserve stable IDs and source references; do not replace traceable structures with ad hoc strings.
- Export core types and functions through local `index.ts` files.
- Add abstractions only when they reduce real duplication or clarify ownership.
- Prefer typed functions, discriminated unions, and explicit diagnostics over loose objects.
- Do not introduce a backend, model provider, database, or agent runtime unless the roadmap calls for that slice.
- Never expose API keys in browser code. Real model integration must keep mock fallback and a clear provider boundary.
- If changing prompt contracts, adaptation data structures, validators, or exporters, update the relevant docs in the same PR.

## UI Principles

月点 should feel like a workbench for writing and inspecting screenplays, not a landing page and not a fixed three-column form.

- The semantic script editor should receive the primary space.
- Source, outline, YAML, diagnostics, and previews are supporting panels.
- Use existing UI primitives before adding new CSS shapes.
- Keep layout state out of `ScreenplayDocument`.
- Keep AST semantic block editing as the primary editing model.
- Fountain-like rendering is a reading/projection language, not the main input format.
- Use `lucide-react` icons for toolbar/button iconography.
- Prefer Tailwind classes for new UI work. Existing CSS can be reduced gradually.
- Avoid one-off color/style decisions. If repeated, promote them into a primitive or documented pattern.
- Do not build full draggable dock behavior until a lighter workbench layout has proven insufficient.

When adding UI primitives:

- Keep them thin and composable.
- They should not know business state.
- They may encode project visual tokens, but not workflow logic.

## Documentation Principles

Docs are part of the product. Update them when decisions change.

- `docs/knowledge/` is for durable facts and principles.
- `docs/planning/` is for current execution strategy, roadmap, TODO, and review notes.
- `docs/archive/` is for obsolete plans and historical material.
- Do not place brainstorm-only ideas into current roadmap without submission-fit review.
- Do not state long-term IDE ambitions as current MVP commitments.
- Remove stale status claims instead of preserving them in place.

## Review Stance

When reviewing code, prioritize:

- behavioral regressions;
- data model drift;
- validation gaps;
- source trace loss;
- export/schema mismatch;
- UI layout or accessibility regressions;
- missing verification for the touched surface.

Lead with findings. If no issues are found, say so clearly and mention residual risk or test gaps.

## Claude / DeepSeek Collaboration

The intended workflow can use Claude for planning and review, while another coding agent such as DeepSeek performs implementation.

When acting as the planning/review agent:

- produce concrete implementation slices and acceptance criteria;
- keep decisions grounded in existing docs and code;
- identify risks before implementation starts;
- review diffs for regressions, architecture drift, and missing tests;
- avoid rewriting implementation details unless asked.

When handing work to an implementation agent:

- give it the relevant docs, target files, constraints, and verification commands;
- specify what must not change;
- require a small PR-sized result;
- ask it to report deviations instead of silently expanding scope.

When acting as the implementation agent:

- follow the roadmap and nearest planning doc;
- keep changes small and reviewable;
- update docs only when the implementation changes a durable decision;
- run the repository’s verification commands before opening a PR.
