# Implementation Status

Last updated: 2026-04-27

This file tracks module-by-module implementation status for Zidnee.

Status legend:
- Not Started
- In Progress
- Implemented
- Harden Needed

## Server Modules

Last updated: 2026-04-25
### Auth Module
  - Register, login, and current-user retrieval
  - Password hashing and JWT token lifecycle
  - Routes: POST /api/auth/login, GET /api/auth/me
  - Controllers with schema validation and structured errors
  - Username-based login flow aligned with the shared schema and seeded admin account
  - Middleware integration on protected endpoint
  - Refresh token or token revocation strategy
  - Account lockout/rate limiting
  - Email verification and password reset flows
  - auth.token and auth.password unit tests exist
  - end-to-end flow covered in app.test.ts
  - Add auth service layer for persistence-ready orchestration
  - Add abuse protection and refresh-token policy

### RBAC Core Module
  - Core role, permission, and user relation computation
  - Effective permission aggregation by role assignment
  - Hardcoded permission catalog with stable keys (for example USER_CREATE, ROLE_UPDATE, VIEW_REPORTS)
  - MongoDB/Mongoose persistence for users, roles, and permissions
  - Default seed roles and permissions (SuperAdmin/User)
  - Relation helpers: getUserWithRelations, getRoleWithPermissions
  - Permission merge and map helpers
  - Audit trail for role/permission changes
  - rbac.service and rbac.permissions test suites exist
  - Add transactional protections where needed

### Roles Module
  - Role CRUD with custom permission composition
  - Routes protected by auth + permission middleware
  - Create/list/get/update/delete role controllers
  - System-role protection (cannot mutate/delete system roles)
  - Validation for permission IDs and role-name conflicts
  - Role archival strategy (instead of hard delete)
  - Usage constraints when role is assigned to active users
  - Covered indirectly through app/auth flow and RBAC service tests
  - No dedicated role controller route tests yet
  - Add dedicated role route/controller tests
  - Introduce archivedAt-based soft-delete handling

### Permissions Module
  - Permission catalog read API for RBAC policy visibility
  - Hardcoded permission catalog source in shared schema package
  - Read-only endpoints for list/get permission visibility
  - Routes protected by auth + key-based permission middleware
  - Persistence bootstrap sync for hardcoded catalog against database
  - Backward-compat migration plan for legacy resource:action checks in external clients
  - Permission helper logic tested in rbac.permissions tests
  - No dedicated permission route/controller tests yet
  - Add route/controller test coverage
  - Add dependency checks before destructive changes

### Users Module
  - User listing, detail retrieval, role assignment/removal
  - Routes protected by auth + permission middleware
  - List/get users with role+permission relations
  - Assign/remove role operations
  - Update/delete user endpoints
  - Activate/deactivate user endpoint
  - Admin user-password reset endpoint
  - Current-user password change endpoint
  - User profile update and lifecycle state transitions
  - Active/inactive workflow safeguards
  - Covered partially by app/auth integration path
  - No dedicated user route/controller tests yet
  - Add user route/controller tests
  - Add service layer and persistence-backed operations

## Cross-Cutting Backend

### Middleware Layer
  - Authentication, authorization, async error handling
  - authMiddleware, requirePermissionKey, requirePermission, requireRole
  - errorMiddleware and asyncHandler
  - Request correlation IDs and structured logging context
  - Global request validation middleware pattern (optional)
  - auth.middleware and error.middleware tests exist
  - Add request tracing/log correlation
  - Add policy matrix tests across modules

### API Routing and App Bootstrap
  - Route registration and app-level middleware composition
  - Health endpoint
  - API mounts for auth, roles, permissions, users
  - Versioned API routing (for long-term compatibility)
  - app.test.ts validates health + auth flow
  - Introduce /api/v1 namespace strategy before broader expansion

## Zidnee Priority Domain Modules
- Status: Not Started
  - Pre-conversion lead lifecycle and sales ownership
- Implemented:
- Missing:
  - Lead schema, service, controllers, routes, tests
  - Ownership and follow-up integration points
  - None
  - Define Lead schemas in packages/schema and implement full module stack

### FollowUp Module
- Status: Not Started
- Scope:
  - Query-driven follow-up engine based on nextFollowUpAt/customNextFollowUpAt
- Implemented:
  - None
- Missing:
  - Follow-up model and query selectors
  - Sales and counsellor follow-up queues
  - Inactive handling logic
- Test coverage status:
  - None
- Next actions:
  - Implement follow-up engine first among pending business modules

### Note Module
- Status: Not Started
- Scope:
  - Immutable interaction history for all communication
- Implemented:
  - None
- Missing:
  - Note schema, creation flows, and linkage with follow-up interactions
- Test coverage status:
  - None
- Next actions:
  - Implement mandatory note-write on every interaction event

### Student Module
- Status: Not Started
- Scope:
  - Lead conversion target with ZID identity and counsellor ownership
- Implemented:
  - None
- Missing:
  - Student schema and lifecycle transitions
  - ZID generation and assignment flow
- Test coverage status:
  - None
- Next actions:
  - Implement with ZID engine and conversion workflow from Lead

### Counsellor Module
- Status: Not Started
- Scope:
  - Post-conversion ownership and follow-up accountability
- Implemented:
  - None
- Missing:
  - Counsellor assignment and ownership transitions
  - Counsellor follow-up queue integration
- Test coverage status:
  - None
- Next actions:
  - Implement after Student module baseline

### Batch Module
- Status: Not Started
- Scope:
  - Learning grouping and progress ownership
- Implemented:
  - None
- Missing:
  - Batch schema and progress tracking
  - Separation from student follow-up concerns
- Test coverage status:
  - None
- Next actions:
  - Implement after Student core is stable

### ZID Engine
- Status: Not Started
- Scope:
  - Atomic prefix-based identifier generation starting from 11
- Implemented:
  - None
- Missing:
  - Atomic sequence strategy per prefix
  - Collision and reuse prevention
- Test coverage status:
  - None
- Next actions:
  - Implement with strong concurrency guarantees and dedicated tests

## Shared Packages

### packages/schema
- Status: In Progress
- Scope:
  - Shared Zod schemas and inferred types
- Implemented:
  - Login and environment schemas
  - RBAC schemas and auth payload schemas
  - Shared API response schemas for login, me, users, roles, permissions, and error payloads
- Missing:
  - Lead, FollowUp, Note, Student, Counsellor, Batch, ZID schemas
- Test coverage status:
  - Indirectly validated via backend usage/tests
- Next actions:
  - Expand schema package before implementing pending business modules

## Frontend

### apps/client
- Status: Implemented
- Scope:
  - UI surface for platform workflows
- Implemented:
  - React Router app shell with protected dashboard routes
  - TanStack React Query data loading for auth, users, roles, and permissions
  - Shared Zod validation for login and role creation forms
  - Shared Zod response validation for API payloads from the monorepo schema package
  - Routed login page and componentized dashboard pages/layout
  - User creation flow with role assignment
  - Users table with edit, delete, activate/deactivate, and admin password reset actions
  - Roles table with edit and delete actions
  - My Profile password change form for current user
  - Vite build and alias setup
- Missing:
  - Frontend test coverage
  - Follow-up, note, lead, student, counsellor, and batch UI surfaces
- Test coverage status:
  - No frontend tests currently
- Next actions:
  - Add focused client tests for routing, login, and role creation
  - Expand workflow UI as the missing backend modules land

## Overall Execution Readiness
- Implemented foundations:
  - Auth baseline
  - RBAC baseline
  - Middleware and testing setup
- Highest-priority missing business engine:
  - FollowUp engine
- Recommended immediate build order:
  1. Lead
  2. FollowUp
  3. Note
  4. Student
  5. Counsellor
  6. Batch
  7. ZID engine hardening
