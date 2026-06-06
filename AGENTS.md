# Repository Guidelines

## Project Structure & Module Organization

This is a Vite + React + TypeScript app for the 月点 AI script-editing workbench. Source lives in `src/`: `main.tsx` boots the app, `App.tsx` coordinates the workbench, `components/ui/` contains reusable UI primitives, and `components/panels/` contains feature panels. Core domain logic belongs in `src/core/`, grouped by capability: `screenplay/`, `adaptation/`, `source-ingestion/`, `serialization/`, and `validation/`. Product, architecture, roadmap, and review notes live in `docs/`. Generated output such as `dist/` and `.vite/` should not be edited by hand.

## Build, Test, and Development Commands

Use `pnpm` to match the checked-in lockfile.

- `pnpm install` installs dependencies.
- `pnpm dev` starts the local Vite development server.
- `pnpm build` runs TypeScript project builds, then creates the production bundle.
- `pnpm lint` runs ESLint across the repository.
- `pnpm format` applies Prettier to configured files.
- `pnpm format:check` verifies formatting without modifying files.
- `pnpm test` runs Vitest unit and component tests.
- `pnpm e2e` runs Playwright browser smoke and layout tests.

## Coding Style & Naming Conventions

Follow `.editorconfig`: UTF-8, LF endings, two-space indentation, final newline, and trimmed trailing whitespace except in Markdown. Prettier uses 100 columns, single quotes, semicolons, and trailing commas. Name React components and panel files in `PascalCase` such as `ScriptEditorPanel.tsx`; name core utilities in `camelCase` such as `serializeDocumentToYaml.ts`. Prefer typed domain boundaries in `src/core/` over UI-specific data shaping inside components.

## Testing Guidelines

Vitest + Testing Library cover core screenplay operations and React component behavior. Put tests under `tests/core/` or `tests/components/` and name them `*.test.ts` or `*.test.tsx`. Playwright e2e specs live in `tests/e2e/` and cover workbench smoke, output tabs, selected block toolbar layout, and mobile fallback.

For ordinary changes, run `pnpm format:check`, `pnpm lint`, `pnpm build`, and `pnpm test`. For UI, editor, toolbar, output panel, or responsive layout changes, also run `pnpm e2e`. Playwright is configured to use system Chromium at `/usr/bin/chromium` and fixed `127.0.0.1:5173`; do not run `pnpm exec playwright install`. Before e2e, ensure 5173 is free or served by this branch via `pnpm dev --host 127.0.0.1 --port 5173 --strictPort`.

## Commit & Pull Request Guidelines

Use short branches such as `feat/yaml-export`, `fix/yaml-validation`, or `docs/update-schema-notes`. Commit messages follow concise Conventional Commit style, for example `feat: add scene outline confirmation` or `docs: update workflow notes`. Each PR should do one thing and complete the template in `.github/pull_request_template.md`: purpose, changes, verification, submission fit, and reuse disclosure. Include screenshots or short recordings for visible UI changes.

## Security & Configuration Tips

Do not commit API keys, tokens, private URLs, or non-public chat logs. If code is reused from another project or third-party source, disclose the source, scope, and modifications in the PR and update documentation when relevant.
