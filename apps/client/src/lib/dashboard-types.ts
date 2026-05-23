import type {
	AdminChangePasswordPayload,
	ChangePasswordPayload,
	ConfirmAdmissionPayload,
	CreateCounsellorPayload,
	CreateLeadPayload,
	CreateMentorPayload,
	CreateRolePayload,
	CreateTimeSlotPayload,
	CreateUserPayload,
	LoginPayload,
	PostponeLeadFollowUpPayload,
	UpdateLeadPayload,
	UpdateRolePayload,
	UpdateUserPayload,
} from "@repo/schema";

export type LoginForm = LoginPayload;
export type CreateRoleForm = {
	name: string;
	// allow empty string while the user hasn't selected a role type yet
	type?: CreateRolePayload["type"] | "";
	description?: string;
	permissionIds: string[];
};
export type CreateUserForm = CreateUserPayload;
export type CreateMentorForm = CreateMentorPayload;
export type CreateCounsellorForm = CreateCounsellorPayload;
export type CreateTimeSlotForm = CreateTimeSlotPayload;
export type UpdateRoleForm = UpdateRolePayload;
export type UpdateUserForm = UpdateUserPayload;
export type ChangePasswordForm = ChangePasswordPayload;
export type AdminChangePasswordForm = AdminChangePasswordPayload;
export type CreateLeadForm = CreateLeadPayload;
export type UpdateLeadForm = UpdateLeadPayload;
export type PostponeLeadFollowUpForm = PostponeLeadFollowUpPayload;
export type ConfirmAdmissionForm = ConfirmAdmissionPayload;
export type RedemoLeadForm = {
	note?: string;
};
