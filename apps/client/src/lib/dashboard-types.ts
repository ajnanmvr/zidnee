import type {
	AdminChangePasswordPayload,
	ChangePasswordPayload,
	CreateLeadPayload,
	CreateRolePayload,
	CreateUserPayload,
	LoginPayload,
	PostponeLeadFollowUpPayload,
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
export type CreateLeadForm = CreateLeadPayload;
export type PostponeLeadFollowUpForm = PostponeLeadFollowUpPayload;
