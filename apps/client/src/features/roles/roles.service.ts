import {
	MessageResponseSchema,
	RoleResponseEnvelopeSchema,
	RolesResponseSchema,
	type UpdateRolePayload,
} from "@repo/schema";
import { requestWithSchema } from "@/api/request";

export const fetchRoles = async (token: string) => {
	return requestWithSchema("/roles", RolesResponseSchema, "GET", undefined, token);
};

export const createRole = async (
	token: string,
	payload: { name: string; description?: string; permissionIds: string[] },
) => {
	return requestWithSchema(
		"/roles",
		RoleResponseEnvelopeSchema,
		"POST",
		payload,
		token,
	);
};

export const updateRole = async (
	token: string,
	roleId: string,
	payload: UpdateRolePayload,
) => {
	return requestWithSchema(
		`/roles/${roleId}`,
		RoleResponseEnvelopeSchema,
		"PATCH",
		payload,
		token,
	);
};

export const deleteRole = async (token: string, roleId: string) => {
	return requestWithSchema(
		`/roles/${roleId}`,
		MessageResponseSchema,
		"DELETE",
		undefined,
		token,
	);
};
