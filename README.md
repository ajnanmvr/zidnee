# Zidnee

A small pnpm monorepo with a Vite React client, an Express API, a shared Zod schema package, and shared TypeScript config.

## Packages

- `apps/client` - React + Vite app
- `apps/server` - Express API
- `packages/schema` - shared Zod schemas
- `packages/typescript-config` - shared TypeScript config presets

## Scripts

- `pnpm dev` - run all dev tasks through Turbo
- `pnpm build` - build all packages and apps
- `pnpm start:prod` - build the workspace, then run the API and built client
- `pnpm lint` - run lint tasks through Turbo
- `pnpm format` - format the workspace with Biome
- `pnpm check-types` - run TypeScript checks through Turbo

## Local Development

1. Install dependencies with `pnpm install`.
2. Start the API with `pnpm --filter @repo/api dev`.
3. Start the client with `pnpm --filter @repo/web dev`.
4. Open the Vite URL and submit the login form.

## Notes

- Biome is the workspace formatter and linter.
- Shared validation comes from `@repo/schema`.
- The server listens on `PORT` from `.env`, defaulting to `3001`.
