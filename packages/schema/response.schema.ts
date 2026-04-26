import { z } from "zod";
import { PermissionSchema, RoleSchema, UserSchema } from "./rbac.schema.js";

export const ApiErrorResponseSchema = z.object({
	message: z.string().optional(),
	errors: z.record(z.string(), z.array(z.string())).optional(),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

export const PublicUserResponseSchema = UserSchema.omit({
	password: true,
	createdAt: true,
	updatedAt: true,
});

export type PublicUserResponse = z.infer<typeof PublicUserResponseSchema>;

export const PermissionResponseSchema = PermissionSchema.omit({
	createdAt: true,
	updatedAt: true,
});

export type PermissionResponse = z.infer<typeof PermissionResponseSchema>;

export const RoleResponseSchema = RoleSchema.omit({
	createdAt: true,
	updatedAt: true,
});

export type RoleResponse = z.infer<typeof RoleResponseSchema>;

export const RoleWithPermissionsResponseSchema = RoleResponseSchema.extend({
	permissions: z.array(PermissionResponseSchema),
});

export type RoleWithPermissionsResponse = z.infer<
	typeof RoleWithPermissionsResponseSchema
>;

export const UserWithRelationsResponseSchema = PublicUserResponseSchema.extend({
	roles: z.array(RoleResponseSchema),
	permissions: z.array(PermissionResponseSchema),
});

export type UserWithRelationsResponse = z.infer<
	typeof UserWithRelationsResponseSchema
>;

export const LoginResponseSchema = z.object({
	ok: z.boolean(),
	token: z.string().optional(),
	user: PublicUserResponseSchema.optional(),
	message: z.string().optional(),
	errors: z.record(z.string(), z.array(z.string())).optional(),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const MeResponseSchema = z
	.object({
		ok: z.boolean(),
	})
	.extend(UserWithRelationsResponseSchema.shape);

export type MeResponse = z.infer<typeof MeResponseSchema>;

export const UsersResponseSchema = z.object({
	ok: z.boolean(),
	users: z.array(UserWithRelationsResponseSchema),
});

export type UsersResponse = z.infer<typeof UsersResponseSchema>;

export const RolesResponseSchema = z.object({
	ok: z.boolean(),
	roles: z.array(RoleWithPermissionsResponseSchema),
});

export type RolesResponse = z.infer<typeof RolesResponseSchema>;

export const PermissionsResponseSchema = z.object({
	ok: z.boolean(),
	permissions: z.array(PermissionResponseSchema),
});

export type PermissionsResponse = z.infer<typeof PermissionsResponseSchema>;

export const UserResponseSchema = z
	.object({
		ok: z.boolean(),
	})
	.extend(UserWithRelationsResponseSchema.shape);

export type UserResponse = z.infer<typeof UserResponseSchema>;

export const RoleResponseEnvelopeSchema = z.object({
	ok: z.boolean(),
	role: RoleWithPermissionsResponseSchema,
});

export type RoleResponseEnvelope = z.infer<typeof RoleResponseEnvelopeSchema>;
