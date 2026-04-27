import {
	type AdminChangePasswordPayload,
	type ChangePasswordPayload,
	type CreateUserPayload,
	MessageResponseSchema,
	type UpdateUserPayload,
	UserResponseSchema,
	UsersResponseSchema,
} from "@repo/schema";
import { requestWithSchema } from "@/api/request";

export const fetchUsers = async (token: string) => {
	return requestWithSchema("/users", UsersResponseSchema, "GET", undefined, token);
};

export const createUser = async (token: string, payload: CreateUserPayload) => {
	return requestWithSchema("/users", UserResponseSchema, "POST", payload, token);
};

export const updateUser = async (
	token: string,
	userId: string,
	payload: UpdateUserPayload,
) => {
	return requestWithSchema(
		`/users/${userId}`,
		UserResponseSchema,
		"PATCH",
		payload,
		token,
	);
};

export const setUserStatus = async (
	token: string,
	userId: string,
	isActive: boolean,
) => {
	return requestWithSchema(
		`/users/${userId}/status`,
		UserResponseSchema,
		"PATCH",
		{ isActive },
		token,
	);
};

export const deleteUser = async (token: string, userId: string) => {
	return requestWithSchema(
		`/users/${userId}`,
		MessageResponseSchema,
		"DELETE",
		undefined,
		token,
	);
};

export const changeUserPassword = async (
	token: string,
	userId: string,
	payload: AdminChangePasswordPayload,
) => {
	return requestWithSchema(
		`/users/${userId}/password`,
		MessageResponseSchema,
		"PATCH",
		payload,
		token,
	);
};

export const changeMyPassword = async (
	token: string,
	payload: ChangePasswordPayload,
) => {
	return requestWithSchema(
		"/users/me/password",
		MessageResponseSchema,
		"PATCH",
		payload,
		token,
	);
};
