# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Zidnee is a CRM + student-lifecycle + follow-up platform (Lead → optional Demo → Form → Student with ZID → Counsellor → Batch → Completed/Dropped). The guiding question for every feature: **"Who should be contacted right now?"**

The authoritative product/architecture spec is [.github/copilot-instructions.md](.github/copilot-instructions.md) (plus [docs/ZIDNEE-MASTER-PLAN.md](docs/ZIDNEE-MASTER-PLAN.md)). Read it before designing a new module; if a request conflicts with it, follow it and call out the conflict.

## Monorepo

pnpm workspaces + Turbo. Biome (tabs, double quotes) is the only linter/formatter — no ESLint/Prettier.

- `apps/server` (`@repo/api`) — Express 5 + Mongoose 9, ESM, TypeScript
- `apps/client` (`@repo/web`) — React 19 + Vite + Tailwind 4, TanStack Query/Table, Zustand, react-hook-form
- `packages/schema` (`@repo/schema`) — shared Zod schemas, inferred types, `PERMISSION_CATALOG`, app constants
- `packages/typescript-config` — shared tsconfig presets

`@repo/schema` is consumed from its compiled `dist/`. **After editing anything in `packages/schema`, run `pnpm build:schema`** or the server/client won't see the change.

## Commands

```sh
pnpm install
pnpm build:schema            # required before first run and after schema edits
pnpm dev:api                 # tsx watch, port from PORT (default 3001)
pnpm dev:web                 # Vite; API base from VITE_API_BASE_URL (default http://localhost:3001/api)
pnpm dev                     # everything via turbo

pnpm test:api                                        # vitest run (server only; client has no tests)
pnpm --filter @repo/api exec vitest run test/modules/rbac.service.test.ts   # single file
pnpm --filter @repo/api exec vitest run -t "name"    # single test by name

pnpm check-types             # tsc across workspace
pnpm lint                    # biome check (client defines lint)
pnpm fix                     # biome check --write . (also fix:api / fix:web)
pnpm build:all               # schema → web → api
```

Server env: copy `apps/server/.env.example` (`MONGO_URI`, `JWT_SECRET`, `APP_URL`, AWS S3 vars for uploads). Swagger UI is served at `/api/docs` from JSDoc `@swagger` comments in route files.

Note: `seed` and `swagger:generate` scripts in `apps/server/package.json` point to `scripts/seed.ts` / `scripts/generate-swagger.ts`, which do not currently exist.

## Server architecture

Strict layering: **Route → Middleware → Controller → Service → Model**, organized per domain under `apps/server/src/modules/<domain>/` (`*.routes.ts`, `*.controller.ts`, `*.service.ts`, `*.model.ts`). All module routers are mounted in [apps/server/src/routes/index.ts](apps/server/src/routes/index.ts) under `/api`; public form endpoints are mounted separately in [apps/server/src/app.ts](apps/server/src/app.ts).

- **Imports must be relative with `.js` extensions** (e.g. `../../utils/errors.util.js`). The `@/` alias exists only for vitest; `postbuild` runs `scripts/check-no-aliases.mjs` and fails the build if `@/` leaks into `dist/`.
- **Controllers** are thin: validate `req.body` with a `@repo/schema` Zod schema via `safeParse` → throw `ValidationError` on failure → call a service → `res.json({ ok: true, ... })`. Wrap them with `asyncHandler` (from `middlewares/error.middleware.ts`) in the router; no try/catch in controllers.
- **Errors**: throw the `AppError` subclasses in [apps/server/src/utils/errors.util.ts](apps/server/src/utils/errors.util.ts) (`ValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `ConflictError`); the central error middleware maps them to responses.
- **RBAC**: User → Role → Permissions[]. The permission catalog is hardcoded in [packages/schema/permission-catalog.ts](packages/schema/permission-catalog.ts); never hardcode role names in logic. Protect routes with `authMiddleware` + `requirePermission(...)` / `requirePermissionByResourceAction(...)` from [apps/server/src/middlewares/auth.middleware.ts](apps/server/src/middlewares/auth.middleware.ts). JWT carries userId/roleId/permissions.
- **ZID** generation ([modules/zid/zid.service.ts](apps/server/src/modules/zid/zid.service.ts)) uses an atomic per-prefix sequence collection; format `PREFIX+NUMBER`, starting at 11, never reused.

### Domain rules that affect code

- Follow-up engine is **query-based only** — no cron jobs, background schedulers, or separate reminder engines. Due = `customNextFollowUpAt ?? nextFollowUpAt` `<= now`. Auto schedule by attempt count: 1–3 → +1d, 4–6 → +2d, 7–10 → +7d, >10 → +30d.
- Every interaction creates an immutable Note/activity record; don't store interaction data on the follow-up fields.
- Progress belongs to Batch; follow-up belongs to Student. Inactive students reappear when `inactiveUntil <= now`.
- Never hard-delete domain records; archive (`archivedAt`).
- No `any`; infer types from Zod schemas rather than duplicating them.

## Tests

Vitest in `apps/server/test/**/*.test.ts`. [test/setup.ts](apps/server/test/setup.ts) spins up `mongodb-memory-server` and connects Mongoose globally, so tests hit a real in-memory Mongo. Focus tests on services, middleware, and core engines (follow-up, ZID); supertest is available for HTTP-level tests against `app.ts`.

## Client architecture

- Uses `@/` → `src` alias (fine here; the alias ban is server-only).
- [src/router.tsx](apps/client/src/router.tsx) defines all routes with `lazy()` pages; dashboard routes sit under `DashboardLayout` behind `RequireAuth`. Sidebar items come from `features/dashboard/useNavigationItems.ts`, gated by `lib/hooks/use-has-permission.ts`.
- `src/features/<domain>/` holds per-domain `*.service.ts` (axios calls through `api/client.ts` / `api/request.ts`), `*.queries.ts` (TanStack Query hooks), and `use-*-mutation.ts` hooks. Route-level pages mostly live in `features/dashboard/`.
- Session/auth token state: `lib/stores/session.store.ts` (Zustand) + `lib/session.tsx`.
- Public (unauthenticated) student form pages live in `features/public/`.

## Deployment

Push to `master` triggers [.github/workflows/deploy.yml](.github/workflows/deploy.yml): SSH to EC2, `pnpm install --frozen-lockfile`, build schema + API, `pm2 restart zidnee-api` ([ecosystem.config.js](ecosystem.config.js)). The client deploys separately (Vercel, `apps/client/vercel.json`). Day-to-day work happens on `dev`.

## Keeping docs in sync

Per project convention, meaningful changes should also update:
- [docs/IMPLEMENTATION-STATUS.md](docs/IMPLEMENTATION-STATUS.md) — module progress (statuses: Not Started / In Progress / Implemented / Harden Needed)
- [docs/PROJECT-STRUCTURE.md](docs/PROJECT-STRUCTURE.md) — when folders, scripts, or package responsibilities change
- [docs/postman/](docs/postman/) collection + route `@swagger` comments — when API routes or request shapes change
- [.github/copilot-instructions.md](.github/copilot-instructions.md) — when architecture or domain rules change
