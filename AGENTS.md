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

## Coding Style & Naming Conventions

Follow `.editorconfig`: UTF-8, LF endings, two-space indentation, final newline, and trimmed trailing whitespace except in Markdown. Prettier uses 100 columns, single quotes, semicolons, and trailing commas. Name React components and panel files in `PascalCase` such as `ScriptEditorPanel.tsx`; name core utilities in `camelCase` such as `serializeDocumentToYaml.ts`. Prefer typed domain boundaries in `src/core/` over UI-specific data shaping inside components.

## Testing Guidelines

There is currently no dedicated test runner or `test` script. For every change, at minimum run `pnpm lint`, `pnpm build`, and relevant manual checks in `pnpm dev`. When adding automated tests later, colocate them near the code they cover or under a clear test directory, and use names like `*.test.ts` or `*.test.tsx`.

## Commit & Pull Request Guidelines

Use short branches such as `feat/yaml-export`, `fix/yaml-validation`, or `docs/update-schema-notes`. Commit messages follow concise Conventional Commit style, for example `feat: add scene outline confirmation` or `docs: update workflow notes`. Each PR should do one thing and complete the template in `.github/pull_request_template.md`: purpose, changes, verification, submission fit, and reuse disclosure. Include screenshots or short recordings for visible UI changes.

## Security & Configuration Tips

Do not commit API keys, tokens, private URLs, or non-public chat logs. If code is reused from another project or third-party source, disclose the source, scope, and modifications in the PR and update documentation when relevant.
