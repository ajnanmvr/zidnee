# RBAC (Role-Based Access Control) Authentication System

This document describes the complete RBAC authentication system implemented in the server.

## Overview

The system supports:
- **User authentication** (login/register with JWT tokens)
- **Role-based access control** (users can have multiple roles)
- **Custom permissions** (roles can combine custom permissions)
- **Permission composition** (users inherit all permissions from all assigned roles)
- **Zod validation** (all inputs validated with Zod schemas)
- **Type inference** (TypeScript types inferred from Zod schemas)

## Architecture

### Layer 1: Schemas (`@repo/schema/rbac.schema.ts`)

Defines all data structures using Zod:
- `PermissionSchema` - Individual permissions (resource:action pairs)
- `RoleSchema` - Roles containing permission combinations
- `UserSchema` - Users with role assignments
- `JWTPayloadSchema` - JWT token contents
- Request/response schemas for all endpoints

```typescript
// Infer types from schemas
type Permission = z.infer<typeof PermissionSchema>;
type Role = z.infer<typeof RoleSchema>;
type User = z.infer<typeof UserSchema>;
```

### Layer 2: Utilities (`src/utils/`)

#### `jwt.util.ts`
- `createToken()` - Create signed JWT tokens
- `verifyToken()` - Verify and decode JWT tokens
- `decodeToken()` - Decode JWT without verification

#### `password.util.ts`
- `hashPassword()` - Hash passwords with bcryptjs (10 salt rounds)
- `verifyPassword()` - Compare plaintext with hashed password

#### `permission.util.ts`
- `buildPermissionMap()` - Create lookup map by resource:action
- `hasPermission()` - Check single permission
- `hasAnyPermission()` - Check if user has any of required permissions
- `hasAllPermissions()` - Check if user has all required permissions
- `mergePermissions()` - Combine permissions from multiple roles

#### `errors.util.ts`
Custom error classes extending `AppError`:
- `ValidationError` (400) - Validation failures
- `AuthenticationError` (401) - Auth failed
- `AuthorizationError` (403) - Insufficient permissions
- `NotFoundError` (404) - Resource not found
- `ConflictError` (409) - Duplicate resource

### Layer 3: Middleware (`src/middlewares/`)

#### `auth.middleware.ts`
- `authMiddleware` - Extract and verify JWT from Authorization header
- `requirePermission()` - Check specific permission(s)
- `requireRole()` - Check role requirements

#### `error.middleware.ts`
- `errorMiddleware` - Global error handler with proper status codes
- `asyncHandler` - Wrapper for async route handlers

### Layer 4: Services (`src/modules/auth/services/auth.service.ts`)

In-memory data store with CRUD operations:

#### `UserService`
- `create()` - Create user with hashed password
- `findById()`, `findByEmail()`, `findAll()`
- `update()`, `delete()`
- `addRole()`, `removeRole()` - Manage user-role relationships

#### `RoleService`
- `create()` - Create custom role
- `findById()`, `findAll()`, `findByIds()`
- `update()` - Update role (prevents modifying system roles)
- `delete()` - Delete role (prevents deleting system roles)

#### `PermissionService`
- `create()` - Create new permission
- `findById()`, `findAll()`
- `update()`, `delete()`

**System Roles (cannot be deleted/modified):**
- **Admin** - All permissions
- **User** - Read-only permissions

**Default Permissions:**
- `users:create`, `users:read`, `users:update`, `users:delete`
- `roles:create`, `roles:read`, `roles:update`, `roles:delete`
- `permissions:create`, `permissions:read`, `permissions:update`, `permissions:delete`

### Layer 5: Controllers (`src/modules/auth/`)

#### `auth.controller.ts`
- `loginController()` - POST /auth/login
  - Validates credentials, verifies password, returns JWT token
  - JWT includes all user permissions across all roles
- `registerController()` - POST /auth/register
  - Creates user, assigns default "User" role, returns JWT
- `getMeController()` - GET /auth/me
  - Returns authenticated user with roles and permissions

#### `role.controller.ts`
- `createRoleController()` - POST /roles
- `listRolesController()` - GET /roles
- `getRoleController()` - GET /roles/:roleId
- `updateRoleController()` - PATCH /roles/:roleId
- `deleteRoleController()` - DELETE /roles/:roleId

#### `permission.controller.ts`
- `createPermissionController()` - POST /permissions
- `listPermissionsController()` - GET /permissions
- `getPermissionController()` - GET /permissions/:permissionId
- `deletePermissionController()` - DELETE /permissions/:permissionId

#### `user.controller.ts`
- `listUsersController()` - GET /users
- `getUserController()` - GET /users/:userId
- `assignRoleController()` - POST /users/:userId/roles
- `removeRoleController()` - DELETE /users/:userId/roles

### Layer 6: Routes (`src/modules/auth/auth.routes.ts`)

All routes are mounted at `/api/auth/`

**Public Routes:**
```
POST   /auth/login                    - User login
POST   /auth/register                 - User registration
```

**Protected Routes (require authentication):**
```
GET    /auth/me                       - Get current user
GET    /roles                         - List all roles
GET    /roles/:roleId                 - Get role details
POST   /roles                         - Create custom role
PATCH  /roles/:roleId                 - Update custom role
DELETE /roles/:roleId                 - Delete custom role

GET    /permissions                   - List all permissions
GET    /permissions/:permissionId     - Get permission details
POST   /permissions                   - Create permission
DELETE /permissions/:permissionId     - Delete permission

GET    /users                         - List all users
GET    /users/:userId                 - Get user details
POST   /users/:userId/roles           - Assign role to user
DELETE /users/:userId/roles           - Remove role from user
```

## Usage Examples

### 1. Register a User

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "name": "John Doe"
  }'
```

Response:
```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "roleIds": ["550e8400-e29b-41d4-a716-446655440001"],
    "isActive": true
  }
}
```

### 2. Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

### 3. Get Current User

```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer <token>"
```

Response:
```json
{
  "ok": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "roleIds": ["550e8400-e29b-41d4-a716-446655440001"]
  },
  "roles": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "User",
      "permissionIds": ["550e8400-e29b-41d4-a716-446655440100", ...]
    }
  ],
  "permissions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440100",
      "name": "Read User",
      "resource": "users",
      "action": "read"
    },
    ...
  ]
}
```

### 4. Create Custom Role

```bash
curl -X POST http://localhost:3001/api/roles \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Moderator",
    "description": "Can manage posts and comments",
    "permissionIds": [
      "550e8400-e29b-41d4-a716-446655440102",
      "550e8400-e29b-41d4-a716-446655440103"
    ]
  }'
```

### 5. Create Permission

```bash
curl -X POST http://localhost:3001/api/permissions \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Create Post",
    "resource": "posts",
    "action": "create",
    "description": "Allow creating new posts"
  }'
```

### 6. Assign Role to User

```bash
curl -X POST http://localhost:3001/api/users/<userId>/roles \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "roleId": "550e8400-e29b-41d4-a716-446655440001"
  }'
```

## Permission Composition

Users can have multiple roles, and permissions are merged:

```typescript
User: Jane
  ├─ Role: Editor
  │  ├─ Permission: posts:create
  │  ├─ Permission: posts:update
  │  └─ Permission: posts:delete
  │
  └─ Role: Reviewer
     ├─ Permission: posts:read
     └─ Permission: comments:read

// Jane's effective permissions:
// posts:create, posts:update, posts:delete, posts:read, comments:read
```

## Error Handling

All errors return consistent JSON responses:

```json
{
  "ok": false,
  "message": "Error message",
  "errors": {
    "fieldName": ["Error details", "More details"]
  }
}
```

Common HTTP Status Codes:
- 200 - Success
- 201 - Created
- 400 - Validation error
- 401 - Authentication failed
- 403 - Authorization failed (insufficient permissions)
- 404 - Resource not found
- 409 - Conflict (duplicate resource)
- 500 - Server error

## Type Safety

All types are inferred from Zod schemas for full type safety:

```typescript
// Automatic type inference
type Permission = z.infer<typeof PermissionSchema>;
type Role = z.infer<typeof RoleSchema>;
type User = z.infer<typeof UserSchema>;
type JWTPayload = z.infer<typeof JWTPayloadSchema>;

// Express Request with user
app.get('/protected', (req: Request, res: Response) => {
  if (req.user) {
    // TypeScript knows req.user is JWTPayload
    const userId = req.user.userId; // ✓ Properly typed
  }
});
```

## Security Features

1. **Password Hashing** - bcryptjs with 10 salt rounds
2. **JWT Tokens** - Signed with JWT_SECRET, expires in 7 days
3. **Type Safety** - Full TypeScript support with inferred types
4. **Input Validation** - All inputs validated with Zod schemas
5. **Error Handling** - No sensitive information in error messages
6. **System Roles Protection** - Admin and User roles cannot be deleted
7. **Async Error Handling** - Comprehensive error middleware

## Next Steps

To migrate to a persistent database:

1. Replace in-memory Maps with MongoDB/Prisma models
2. Update `UserService.hashPassword()` call location (currently in controller)
3. Implement indexes on email and role IDs
4. Add cascading deletion for roles/permissions
5. Add soft deletes for audit trail

Example Prisma migration:

```prisma
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  password  String
  name      String
  roles     Role[]    @relation("UserRoles")
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Role {
  id          String      @id @default(cuid())
  name        String      @unique
  description String?
  permissions Permission[]
  users       User[]      @relation("UserRoles")
  isSystem    Boolean     @default(false)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

model Permission {
  id          String   @id @default(cuid())
  name        String
  description String?
  resource    String
  action      String
  roles       Role[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([resource, action])
}
```

## Files Modified/Created

- ✅ `packages/schema/rbac.schema.ts` - New RBAC schemas
- ✅ `apps/server/package.json` - Added bcryptjs, jsonwebtoken
- ✅ `apps/server/src/utils/jwt.util.ts` - JWT operations
- ✅ `apps/server/src/utils/password.util.ts` - Password hashing
- ✅ `apps/server/src/utils/permission.util.ts` - Permission checks
- ✅ `apps/server/src/utils/errors.util.ts` - Custom error classes
- ✅ `apps/server/src/middlewares/auth.middleware.ts` - Auth middleware
- ✅ `apps/server/src/middlewares/error.middleware.ts` - Error handler
- ✅ `apps/server/src/modules/auth/auth.controller.ts` - Auth endpoints
- ✅ `apps/server/src/modules/auth/role.controller.ts` - Role management
- ✅ `apps/server/src/modules/auth/permission.controller.ts` - Permission management
- ✅ `apps/server/src/modules/auth/user.controller.ts` - User management
- ✅ `apps/server/src/modules/auth/services/auth.service.ts` - Data layer
- ✅ `apps/server/src/modules/auth/auth.routes.ts` - Route definitions
- ✅ `apps/server/src/app.ts` - Updated app configuration
