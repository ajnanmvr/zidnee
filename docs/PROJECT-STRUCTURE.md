# Project Structure and Current Settings

This document reflects the current monorepo layout and configuration.

## Overview

- Package manager: `pnpm@9.0.0`
- Monorepo orchestrator: `turbo`
- Formatting and linting: `Biome`
- Shared validation: `Zod`
- Frontend: `React + Vite`
- Backend: `Express + TypeScript`

## Repository Tree

```txt
zidnee/
├─ package.json
├─ pnpm-lock.yaml
├─ pnpm-workspace.yaml
├─ turbo.json
├─ biome.json
├─ README.md
├─ docs/
│  ├─ PROJECT-STRUCTURE.md
│  └─ IMPLEMENTATION-STATUS.md
├─ apps/
│  ├─ client/
│  │  ├─ package.json
│  │  ├─ README.md
│  │  ├─ index.html
│  │  ├─ vite.config.ts
│  │  ├─ tsconfig.json
│  │  ├─ tsconfig.app.json
│  │  ├─ tsconfig.node.json
│  │  ├─ public/
│  │  └─ src/
│  │     ├─ App.tsx
│  │     ├─ App.css
│  │     ├─ index.css
│  │     ├─ main.tsx
│  │     └─ assets/
│  └─ server/
│     ├─ package.json
│     ├─ tsconfig.json
│     ├─ .env.example
│     └─ src/
│        ├─ index.ts
│        ├─ config/
│        │  └─ env.ts
│        ├─ middlewares/
│        ├─ modules/
│        ├─ routes/
│        └─ utils/
└─ packages/
   ├─ schema/
   │  ├─ package.json
   │  ├─ tsconfig.json
   │  └─ index.ts
   └─ typescript-config/
      ├─ package.json
      ├─ base.json
      ├─ node.json
      └─ react-library.json
```

## Root Settings

### [package.json](package.json)

- `build`: runs `turbo run build`
- `dev`: runs `turbo run dev`
- `lint`: runs `turbo run lint`
- `format`: runs `biome format --write .`
- `check-types`: runs `turbo run check-types`
- Node engine: `>=18`
- Root dev dependencies:
  - `@biomejs/biome`
  - `turbo`
  - `typescript`

### [turbo.json](turbo.json)

- `build` depends on upstream builds.
- `build` caches `dist/**` outputs.
- `lint` is cacheable and does not produce outputs.
- `check-types` depends on upstream type checks.
- `dev` is persistent and not cached.

### [biome.json](biome.json)

- Biome is enabled for the repo.
- Git integration is enabled.
- Unknown files are not ignored by default.
- Formatter indentation uses tabs.
- Linter uses recommended rules.
- JavaScript formatter uses double quotes.
- import organization is enabled.

## Apps

### Client: [apps/client/package.json](apps/client/package.json)

- Name: `@repo/web`
- Type: ESM module
- Scripts:
  - `dev`: `vite`
  - `build`: `tsc -b && vite build`
  - `lint`: `biome check .`
  - `preview`: `vite preview`
- Dependencies:
  - `react`
  - `react-dom`
  - `@repo/schema`
- Dev dependencies:
  - `@repo/typescript-config`
  - Vite React plugin and TypeScript support packages
- Linting is handled by Biome, not ESLint.

#### Client TypeScript

- [apps/client/tsconfig.json](apps/client/tsconfig.json) references the app and node configs.
- [apps/client/tsconfig.app.json](apps/client/tsconfig.app.json) extends `@repo/typescript-config/base.json`.
- [apps/client/tsconfig.node.json](apps/client/tsconfig.node.json) extends `@repo/typescript-config/node.json`.
- App config is set up for Vite bundler mode, React JSX, strict locals/parameters, and no emit.
- Node config is set up for `vite.config.ts` with the same bundler-oriented checks.

#### Client Source

- [apps/client/src/main.tsx](apps/client/src/main.tsx) mounts React and checks that `#root` exists.
- [apps/client/src/App.tsx](apps/client/src/App.tsx) is a login form example.
- The form validates with `LoginSchema` from `@repo/schema`.
- The form posts to `http://localhost:3001/login`.
- [apps/client/src/index.css](apps/client/src/index.css) sets the global page styling.
- [apps/client/src/App.css](apps/client/src/App.css) styles the login card.
- [apps/client/src/assets](apps/client/src/assets) contains bundled static assets.

### Server: [apps/server/package.json](apps/server/package.json)

- Name: `@repo/api`
- Type: ESM module
- Scripts:
  - `dev`: `tsx watch src/index.ts`
  - `build`: `tsc -p tsconfig.json`
  - `start`: `node dist/index.js`
  - `check-types`: `tsc --noEmit`
- Dependencies:
  - `express`
  - `cors`
  - `dotenv`
  - `zod`
  - `@repo/schema`
- Dev dependencies:
  - `@repo/typescript-config`
  - `tsx`
  - `typescript`
  - Node and Express type packages

#### Server TypeScript

- [apps/server/tsconfig.json](apps/server/tsconfig.json) extends `../../packages/typescript-config/node.json`.
- Output goes to `dist`.
- Source root is `src`.
- Only `src/**/*.ts` is included.

#### Server Source

- [apps/server/src/index.ts](apps/server/src/index.ts) starts the Express app.
- It exposes:
  - `GET /health`
  - `POST /login`
- `POST /login` validates the body against `LoginSchema` and returns structured validation errors.
- [apps/server/src/config/env.ts](apps/server/src/config/env.ts) loads dotenv and exports runtime env values.
- `middlewares`, `modules`, `routes`, and `utils` are present but currently empty.

#### Server Environment

- [apps/server/.env.example](apps/server/.env.example) currently contains:
  - `PORT=3001`
- The app reads `PORT` and defaults to `3001` if it is missing.

## Packages

### Schema: [packages/schema/package.json](packages/schema/package.json)

- Name: `@repo/schema`
- Type: ESM module
- Exposes `./index.ts` as the package entry.
- Script:
  - `check-types`: `tsc -p tsconfig.json --noEmit`
- Dependency:
  - `zod`
- Dev dependency:
  - `@repo/typescript-config`
  - `typescript`

#### Schema TypeScript

- [packages/schema/tsconfig.json](packages/schema/tsconfig.json) extends `../typescript-config/base.json`.
- It is a no-emit type-check-only package.

#### Schema Source

- [packages/schema/index.ts](packages/schema/index.ts) exports `LoginSchema`.
- Current schema rules:
  - `email` must be a valid email value
  - `password` must be at least 8 characters

### TypeScript Config: [packages/typescript-config/package.json](packages/typescript-config/package.json)

- Package name: `@repo/typescript-config`
- This package contains shared `tsconfig` presets.
- Files:
  - [packages/typescript-config/base.json](packages/typescript-config/base.json)
  - [packages/typescript-config/node.json](packages/typescript-config/node.json)
  - [packages/typescript-config/react-library.json](packages/typescript-config/react-library.json)

#### Shared TS presets

- `base.json` sets common strict compiler options and ESM-oriented output.
- `node.json` extends `base.json` for Node.js runtimes.
- `react-library.json` extends `base.json` and enables `react-jsx`.

## Current Build and Runtime Behavior

- `pnpm dev` runs Turbo dev tasks across the workspace.
- `pnpm build` runs Turbo build tasks across the workspace.
- `pnpm lint` runs Turbo lint tasks across the workspace.
- `pnpm format` formats the workspace with Biome.
- `pnpm check-types` runs Turbo type checks across the workspace.

## Notes

- Biome is the source of truth for formatting and linting in this repo.
- ESLint is no longer used in the React app.
- Shared login validation lives in `@repo/schema` and is consumed by both the server and client.
- The monorepo currently uses a dist-based build for build caching.
- Module-by-module delivery tracking is maintained in [docs/IMPLEMENTATION-STATUS.md](docs/IMPLEMENTATION-STATUS.md).
