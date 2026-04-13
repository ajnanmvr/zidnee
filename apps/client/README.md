# Web Client

This app is a Vite + React frontend that uses the shared `LoginSchema` from `@repo/schema`.

## Commands

- `pnpm dev` from the repo root runs the whole workspace
- `pnpm --filter @repo/web dev` starts this app only
- `pnpm --filter @repo/web build` builds the app
- `pnpm --filter @repo/web lint` runs Biome checks

## Notes

- Linting is handled by Biome, not ESLint.
- The login form posts to the Express API at `http://localhost:3001/login`.
