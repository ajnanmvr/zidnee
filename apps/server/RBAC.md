# RBAC Authentication and Authorization

This document describes the current RBAC model in apps/server.

## Core Decision

Permissions are hardcoded and source-controlled as stable keys (for example USER_CREATE, ORDER_DELETE, VIEW_REPORTS).

Roles are dynamic and assign combinations of permission IDs that originate from the hardcoded permission catalog.

## Architecture

- Route -> Middleware -> Controller -> Service
- Validation and shared types come from @repo/schema
- Middleware enforces policy checks using permission keys

## Permission Catalog

The permission catalog lives in:
- packages/schema/permission-catalog.ts

It exports:
- PERMISSION_CATALOG
- PERMISSION_KEYS
- PermissionKey type
- getPermissionKeyFromResourceAction helper

Each permission defines:
- key
- name
- description
- resource
- action

## Current Auth/RBAC Flow

1. User authenticates via /api/auth/login or /api/auth/register
2. JWT includes userId, roleIds, and permissionIds
3. Protected routes use authMiddleware
4. Route policy uses requirePermissionKey with catalog keys
5. User permissions are resolved from assigned role permission IDs

## Current Routes

Public auth routes:
- POST /api/auth/login
- POST /api/auth/register

Protected auth route:
- GET /api/auth/me

Roles routes (key-guarded):
- GET /api/roles (ROLE_READ)
- GET /api/roles/:roleId (ROLE_READ)
- POST /api/roles (ROLE_CREATE)
- PATCH /api/roles/:roleId (ROLE_UPDATE)
- DELETE /api/roles/:roleId (ROLE_DELETE)

Permissions routes (catalog visibility only, key-guarded):
- GET /api/permissions (PERMISSION_READ)
- GET /api/permissions/:permissionId (PERMISSION_READ)

Users routes (key-guarded):
- GET /api/users (USER_READ)
- GET /api/users/:userId (USER_READ)
- POST /api/users/:userId/roles (USER_UPDATE)
- DELETE /api/users/:userId/roles (USER_UPDATE)

## Service Notes

The in-memory RBAC service currently:
- seeds permissions from PERMISSION_CATALOG
- seeds Admin and User system roles
- computes effective permissions from assigned roles
- treats permissions as immutable (no runtime create/update/delete)

## Testing

Current tests cover:
- auth middleware
- error middleware
- auth token/password helpers
- RBAC permission helpers
- RBAC service behavior
- app-level auth flow

Run tests:
- from repo root: pnpm test:api
- from server folder: npm run test
