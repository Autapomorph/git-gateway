# Git Gateway - Developer Guidelines & Instructions

Git Gateway is a high-performance, secure Git API gateway and multi-framework auto-updater proxy for client applications (Tauri v2, Wails v3, Electron, Sparkle / WinSparkle, Generic HTTP). It enables client apps to interact with private and public Git repositories (fetching raw files, batch assets, localized release notes, and updates) without exposing secret API tokens or communicating directly with Git provider APIs.

## Tech Stack

- **Runtime & Language**: Node.js (>=24.0.0), TypeScript (strict mode, ES2024 target, ESM)
- **Web Framework**: Express v5, Serverless Vercel Handlers (`@vercel/node`)
- **Core Libraries**: `semver`, `gray-matter` (YAML frontmatter parsing), `mime-types`, `zod`, `dotenv`
- **Tooling & Build**: `tsup`, `tsc`, `eslint` (v9 flat config with airbnb-extended & typescript-eslint strict), `prettier`, `lint-staged`, `husky`
- **Deployment**: Docker, Docker Compose, Nginx reverse proxy, Vercel Serverless Functions

## Project Architecture & Organization

The project is built around a unified gateway handler pattern that runs equivalently on standalone Express / Node.js servers and Vercel serverless functions:

- **`src/server.ts`**: Entry point for Docker/standalone Node environment. Boots Express app.
- **`src/app.ts`**: Express application factory mounting middlewares, security headers, and router.
- **`src/router.ts`**: Core routing layer mapping `/api/v1/*` canonical routes to handlers.
- **`src/adapter.ts`**: Adapter bridge (`createAdapter`) converting Express request/response objects to unified `GatewayRequest` / `GatewayResponse`.
- **`src/handlers/`**: Framework-agnostic endpoint handlers:
  - `update/tauri.ts`: Tauri updater endpoint (`/api/v1/update/tauri/:target/:version`) with Content Negotiation (Tauri v1 & v2).
  - `update/wails.ts`: Wails v3 updater endpoint & manifest (`/api/v1/update/wails/check`, `manifest.json`).
  - `update/electron.ts`: Electron release manifest (`latest.yml`, `beta.yml`, etc.).
  - `update/sparkle.ts`: Sparkle / WinSparkle RSS 2.0 appcast feed (`/api/v1/update/sparkle/appcast.xml`).
  - `update/generic.ts`: Universal JSON update endpoint for custom clients.
  - `latest.ts`: Tauri static manifest generator (`latest.json`, `latest.stable.json`, `latest.prerelease.json`).
  - `download.ts`: Binary streaming & download proxy (`/api/v1/download`).
  - `file.ts` & `files.ts`: Single & batch raw file fetching from Git repositories.
  - `release-notes.ts`: Markdown/MDX release notes with YAML frontmatter & BCP 47 i18n support.
- **`src/lib/providers/`**: Pluggable Git providers implementing `GitProvider` interface:
  - GitHub (Cloud & Enterprise Server)
  - GitLab (Cloud & Self-Managed)
  - Gitea / Forgejo / Codeberg
  - GitVerse & GitFlic
  - Bitbucket Cloud
  - Azure DevOps
  - OneDev
- **`src/lib/updaters/`**: Domain helpers for updater protocols (Wails, Electron, Sparkle, Tauri).
- **`src/lib/config/`**: Environment variable validation and strongly-typed gateway settings.
- **`src/types/`**: Shared HTTP and internal TypeScript contracts.
- **`api/`**: Vercel serverless function entry points delegating to `src/handlers/`.

## Key Features & Supported Protocols

- **Multi-Provider Support**: Unified Git API abstraction across 8+ Git hosting platforms.
- **Token Shielding**: Keeps private Git access tokens server-side; client apps only communicate with Git Gateway.
- **Multi-Framework Auto-Updates**:
  - Tauri (v1 & v2 with Content Negotiation)
  - Wails v3 (Wails updater manifest protocol & architecture matching)
  - Electron (`latest.yml` / `beta.yml` format with SHA-512 hashes)
  - Sparkle & WinSparkle (RSS 2.0 XML appcasts with EdDSA signatures)
  - Generic / Custom updater clients
- **Multi-Channel Delivery**: Segregated `stable` and `prerelease` (beta/alpha) release channels via query parameter or `X-Update-Channel` header.
- **Binary Streaming**: Low-memory streaming proxy directly from release assets (`NodeJS.ReadableStream` / `ReadableStream`).
- **Rich Release Notes & i18n**: Serves version release notes in Markdown/MDX with YAML frontmatter and BCP 47 localization fallback chains (`FALLBACK_LANGUAGE`).
- **Strict & Clean REST Architecture**: Pure, canonical `/api/v1/*` API endpoints without URL legacy clutter.

## Development, Build & Lint Commands

- **Run dev environment**: `npm run dev` (tsup watch mode with automatic server restart)
- **Run production server**: `npm start` (`node dist/server.js`)
- **Build production server**: `npm run build:server` (typecheck + tsup bundle)
- **Compile & Lint check**: `npm run lint` (runs `typecheck` and `lint:js`)
- **Typecheck only**: `npm run typecheck` (`tsc --noEmit`)
- **Run ESLint only**: `npm run lint:js`
- **Apply Prettier formatting**: `npm run format` (or `npx prettier --write <file_path>`)

## Code Style & Best Practices

- **Strict Typing**: No `any` types allowed. Use `unknown`, proper generics, and narrow types with type guards.
- **No Unsafe Type Assertions**: Avoid `as unknown as Type` casts; design proper type interfaces and use structural typing.
- **Error Handling**: Always handle errors gracefully with meaningful HTTP status codes and messages; ensure headers are not already sent before writing error responses.
- **Clean Streaming**: Always handle stream piping properly and support both Node.js `Readable` and Web `ReadableStream`.
- **ESM Syntax**: Always use `.js` extension in local relative imports (e.g., `import { foo } from './bar.js';`).

## Git Guidelines

- **Commit, Push & Dangerous Operations**: The AI agent MUST NOT perform `git commit`, `git push`, or any potentially destructive git operations (such as resetting, deleting branches, or forcing changes) without explicit user approval or direct user instruction.

## AI Agent Hooks (Pre-completion Verification)

Before declaring any task complete, the AI agent MUST run the following command sequence whenever files are modified:

1. Run TypeScript typecheck: `npm run typecheck`
2. Format all code: `npm run format`
3. Run JS linting with auto-fix:
   - **Windows PowerShell**: `npm run lint:js -- -- --fix`
   - **All other shells (cmd.exe, Git Bash, WSL, macOS/Linux terminals)**: `npm run lint:js -- --fix`

## Definition of Done

A task is complete only if:

1. The AI Agent Hooks sequence is executed successfully.
2. TypeScript typecheck passes (`npm run typecheck`).
3. ESLint passes with zero errors and warnings.
4. Code is formatted with Prettier (`npm run format`).
