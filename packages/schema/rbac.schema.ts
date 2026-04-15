import { z } from "zod";

// Permissions
export const PermissionSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1).max(100),
	description: z.string().max(500).optional(),
	resource: z.string().min(1).max(100), // e.g., "users", "posts", "roles"
	action: z.string().min(1).max(100), // e.g., "create", "read", "update", "delete"
	createdAt: z.date().optional(),
	updatedAt: z.date().optional(),
});

export type Permission = z.infer<typeof PermissionSchema>;

// Roles with custom permission composition
export const RoleSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1).max(100),
	description: z.string().max(500).optional(),
	permissionIds: z.array(z.string().uuid()),
	isSystem: z.boolean().default(false), // System roles cannot be deleted
	createdAt: z.date().optional(),
	updatedAt: z.date().optional(),
});

export type Role = z.infer<typeof RoleSchema>;

// Users with role assignments
export const UserSchema = z.object({
	id: z.string().uuid(),
	email: z.email(),
	password: z.string(), // hashed password
	name: z.string().min(1).max(255),
	roleIds: z.array(z.string().uuid()),
	isActive: z.boolean().default(true),
	createdAt: z.date().optional(),
	updatedAt: z.date().optional(),
});

export type User = z.infer<typeof UserSchema>;

// Auth Payloads
export const LoginPayloadSchema = z.object({
	email: z.email(),
	password: z.string().min(8),
});

export type LoginPayload = z.infer<typeof LoginPayloadSchema>;

export const RegisterPayloadSchema = z.object({
	email: z.email(),
	password: z.string().min(8).max(255),
	name: z.string().min(1).max(255),
});

export type RegisterPayload = z.infer<typeof RegisterPayloadSchema>;

// JWT Token Payload
export const JWTPayloadSchema = z.object({
	userId: z.string().uuid(),
	email: z.string().email(),
	roleIds: z.array(z.string().uuid()),
	permissionIds: z.array(z.string().uuid()),
	iat: z.number(),
	exp: z.number(),
});

export type JWTPayload = z.infer<typeof JWTPayloadSchema>;

// Response schemas
export const AuthResponseSchema = z.object({
	ok: z.boolean(),
	token: z.string().optional(),
	user: UserSchema.omit({ password: true }).optional(),
	errors: z.record(z.string(), z.array(z.string())).optional(),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const PermissionCheckSchema = z.object({
	resource: z.string(),
	action: z.string(),
});

export type PermissionCheck = z.infer<typeof PermissionCheckSchema>;

// Role Management Payloads
export const CreateRolePayloadSchema = z.object({
	name: z.string().min(1).max(100),
	description: z.string().max(500).optional(),
	permissionIds: z.array(z.string().uuid()),
});

export type CreateRolePayload = z.infer<typeof CreateRolePayloadSchema>;

export const UpdateRolePayloadSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	description: z.string().max(500).optional(),
	permissionIds: z.array(z.string().uuid()).optional(),
});

export type UpdateRolePayload = z.infer<typeof UpdateRolePayloadSchema>;

// Permission Management Payloads
export const CreatePermissionPayloadSchema = z.object({
	name: z.string().min(1).max(100),
	description: z.string().max(500).optional(),
	resource: z.string().min(1).max(100),
	action: z.string().min(1).max(100),
});

export type CreatePermissionPayload = z.infer<typeof CreatePermissionPayloadSchema>;
