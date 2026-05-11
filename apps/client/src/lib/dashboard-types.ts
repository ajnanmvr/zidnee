import type {
	AdminChangePasswordPayload,
	ChangePasswordPayload,
	ConfirmAdmissionPayload,
	CreateCounsellorPayload,
	CreateCoursePayload,
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
export type CreateRoleForm = CreateRolePayload;
export type CreateUserForm = CreateUserPayload;
export type CreateMentorForm = CreateMentorPayload;
export type CreateCounsellorForm = CreateCounsellorPayload;
export type CreateCourseForm = CreateCoursePayload;
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
