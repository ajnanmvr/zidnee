import type {
	AdminChangePasswordPayload,
	ChangePasswordPayload,
	CreateRolePayload,
	CreateUserPayload,
	LoginPayload,
	UpdateRolePayload,
	UpdateUserPayload,
} from "@repo/schema";

export type LoginForm = LoginPayload;
export type CreateRoleForm = CreateRolePayload;
export type CreateUserForm = CreateUserPayload;
export type UpdateRoleForm = UpdateRolePayload;
export type UpdateUserForm = UpdateUserPayload;
export type ChangePasswordForm = ChangePasswordPayload;
export type AdminChangePasswordForm = AdminChangePasswordPayload;
