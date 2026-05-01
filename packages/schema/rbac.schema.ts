import { z } from "zod";
import { PERMISSION_KEYS } from "./permission-catalog.js";

export const PermissionKeySchema = z.enum(PERMISSION_KEYS);
export const ObjectIdStringSchema = z
	.string()
	.regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

// Permissions
export const PermissionSchema = z.object({
	id: ObjectIdStringSchema,
	key: PermissionKeySchema,
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
	id: ObjectIdStringSchema,
	name: z.string().min(1).max(100),
	type: z.enum(["general", "mentor", "counsellor", "sales"]).default("general"),
	description: z.string().max(500).optional(),
	permissionIds: z.array(ObjectIdStringSchema),
	isSystem: z.boolean().default(false), // System roles cannot be deleted
	createdAt: z.date().optional(),
	updatedAt: z.date().optional(),
});

export type Role = z.infer<typeof RoleSchema>;

// Users with role assignments
export const UserSchema = z.object({
	id: ObjectIdStringSchema,
	username: z.string().min(1).max(100).optional(),
	email: z.email(),
	password: z.string(), // hashed password
	name: z.string().min(1).max(255),
	mentorId: z.string().min(1).max(100).optional(),
	counsellorId: z.string().min(1).max(100).optional(),
	roleIds: z.array(ObjectIdStringSchema),
	isActive: z.boolean().default(true),
	createdAt: z.date().optional(),
	updatedAt: z.date().optional(),
});

export type User = z.infer<typeof UserSchema>;

// Auth Payloads
export const LoginPayloadSchema = z.object({
	username: z.string().min(1).max(255),
	password: z.string().min(6),
});

export type LoginPayload = z.infer<typeof LoginPayloadSchema>;

export const RegisterPayloadSchema = z.object({
	username: z.string().min(1).max(100),
	email: z.email(),
	password: z.string().min(6).max(255),
	name: z.string().min(1).max(255),
});

export type RegisterPayload = z.infer<typeof RegisterPayloadSchema>;

export const CreateUserPayloadSchema = RegisterPayloadSchema.extend({
	roleIds: z.array(ObjectIdStringSchema).optional(),
});

export type CreateUserPayload = z.infer<typeof CreateUserPayloadSchema>;

export const CreateMentorPayloadSchema = z.object({
	name: z.string().min(1).max(255),
	counsellorId: ObjectIdStringSchema.optional(),
});

export type CreateMentorPayload = z.infer<typeof CreateMentorPayloadSchema>;

export const CreateCounsellorPayloadSchema = z.object({
	name: z.string().min(1).max(255),
});

export type CreateCounsellorPayload = z.infer<
	typeof CreateCounsellorPayloadSchema
>;

export const UpdateUserPayloadSchema = z.object({
	username: z.string().min(1).max(100).optional(),
	email: z.email().optional(),
	name: z.string().min(1).max(255).optional(),
	roleIds: z.array(ObjectIdStringSchema).optional(),
});

export type UpdateUserPayload = z.infer<typeof UpdateUserPayloadSchema>;

export const SetUserStatusPayloadSchema = z.object({
	isActive: z.boolean(),
});

export type SetUserStatusPayload = z.infer<typeof SetUserStatusPayloadSchema>;

export const ChangePasswordPayloadSchema = z.object({
	currentPassword: z.string().min(6).max(255),
	newPassword: z.string().min(6).max(255),
});

export type ChangePasswordPayload = z.infer<typeof ChangePasswordPayloadSchema>;

export const AdminChangePasswordPayloadSchema = z.object({
	newPassword: z.string().min(6).max(255),
});

export type AdminChangePasswordPayload = z.infer<
	typeof AdminChangePasswordPayloadSchema
>;

// JWT Token Payload
export const JWTPayloadSchema = z.object({
	userId: ObjectIdStringSchema,
	email: z.string().email(),
	roleIds: z.array(ObjectIdStringSchema),
	permissionIds: z.array(ObjectIdStringSchema),
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
	key: PermissionKeySchema,
});

export type PermissionCheck = z.infer<typeof PermissionCheckSchema>;

// Role Management Payloads
export const CreateRolePayloadSchema = z.object({
	name: z.string().min(1).max(100),
	type: z.enum(["general", "mentor", "counsellor", "sales"]).default("general"),
	description: z.string().max(500).optional(),
	permissionIds: z.array(ObjectIdStringSchema),
});

export type CreateRolePayload = z.infer<typeof CreateRolePayloadSchema>;

export const UpdateRolePayloadSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	type: z.enum(["general", "mentor", "counsellor", "sales"]).optional(),
	description: z.string().max(500).optional(),
	permissionIds: z.array(ObjectIdStringSchema).optional(),
});

export type UpdateRolePayload = z.infer<typeof UpdateRolePayloadSchema>;

// Permission Management Payloads
export const CreatePermissionPayloadSchema = z.object({
	key: PermissionKeySchema,
});

export type CreatePermissionPayload = z.infer<
	typeof CreatePermissionPayloadSchema
>;
