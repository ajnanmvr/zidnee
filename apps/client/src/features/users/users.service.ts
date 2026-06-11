import {
	type AdminChangePasswordPayload,
	type ChangePasswordPayload,
	type CreateCounsellorPayload,
	type CreateMentorPayload,
	type CreateUserPayload,
	MessageResponseSchema,
	type UpdateUserPayload,
	UserResponseSchema,
	UsersResponseSchema,
} from "@repo/schema";
import { requestWithSchema } from "@/api/request";

export const fetchUsers = async (token: string) => {
	return requestWithSchema(
		"/users",
		UsersResponseSchema,
		"GET",
		undefined,
		token,
	);
};

export const fetchMentors = async (
	token: string,
	scope: "mine" | "all" = "all",
) => {
	return requestWithSchema(
		`/users/mentors?scope=${scope}`,
		UsersResponseSchema,
		"GET",
		undefined,
		token,
	);
};

export const fetchSalesUsers = async (token: string) => {
	return requestWithSchema(
		"/users/sales",
		UsersResponseSchema,
		"GET",
		undefined,
		token,
	);
};

export const fetchCounsellors = async (token: string) => {
	return requestWithSchema(
		"/users/counsellors",
		UsersResponseSchema,
		"GET",
		undefined,
		token,
	);
};

export const createUser = async (token: string, payload: CreateUserPayload) => {
	return requestWithSchema(
		"/users",
		UserResponseSchema,
		"POST",
		payload,
		token,
	);
};

export const createMentor = async (
	token: string,
	payload: CreateMentorPayload,
) => {
	return requestWithSchema(
		"/users/mentors",
		UserResponseSchema,
		"POST",
		payload,
		token,
	);
};

export const createCounsellor = async (
	token: string,
	payload: CreateCounsellorPayload,
) => {
	return requestWithSchema(
		"/users/counsellors",
		UserResponseSchema,
		"POST",
		payload,
		token,
	);
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

export const assignUserCounsellor = async (
	token: string,
	userId: string,
	counsellorId: string,
) => {
	return requestWithSchema(
		`/users/${userId}/counsellor`,
		UserResponseSchema,
		"PATCH",
		{ counsellorId },
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
