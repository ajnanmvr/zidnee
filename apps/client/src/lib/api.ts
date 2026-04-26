import {
	type ApiErrorResponse,
	ApiErrorResponseSchema,
	LoginResponseSchema,
	MeResponseSchema,
	PermissionsResponseSchema,
	RoleResponseEnvelopeSchema,
	RolesResponseSchema,
	UsersResponseSchema,
} from "@repo/schema";

type Validator<T> = {
	safeParse: (
		value: unknown,
	) => { success: true; data: T } | { success: false };
};

const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001/api";

export class ApiError extends Error {
	public readonly status: number;
	public readonly payload: ApiErrorResponse;

	public constructor(
		status: number,
		payload: ApiErrorResponse,
		message?: string,
	) {
		super(message ?? payload.message ?? "Request failed");
		this.name = "ApiError";
		this.status = status;
		this.payload = payload;
	}
}

const authHeaders = (token: string) => ({
	Authorization: `Bearer ${token}`,
});

const requestJson = async <T>(
	path: string,
	schema: Validator<T>,
	options: RequestInit = {},
	token?: string,
): Promise<T> => {
	const response = await fetch(`${API_BASE_URL}${path}`, {
		...options,
		headers: {
			...(options.headers ?? {}),
			...(token ? authHeaders(token) : {}),
		},
	});

	const raw = await response.json();
	if (!response.ok) {
		const apiError = ApiErrorResponseSchema.safeParse(raw);
		throw new ApiError(
			response.status,
			apiError.success ? apiError.data : {},
			apiError.success ? apiError.data.message : undefined,
		);
	}

	const payload = schema.safeParse(raw);
	if (!payload.success) {
		throw new Error("Response validation failed");
	}

	return payload.data;
};

export const loginUser = async (username: string, password: string) => {
	return requestJson("/auth/login", LoginResponseSchema, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ username, password }),
	});
};

export const fetchMe = async (token: string) =>
	requestJson("/auth/me", MeResponseSchema, {}, token);
export const fetchUsers = async (token: string) =>
	requestJson("/users", UsersResponseSchema, {}, token);
export const fetchRoles = async (token: string) =>
	requestJson("/roles", RolesResponseSchema, {}, token);
export const fetchPermissions = async (token: string) =>
	requestJson("/permissions", PermissionsResponseSchema, {}, token);

export const createRole = async (
	token: string,
	payload: { name: string; description?: string; permissionIds: string[] },
) => {
	return requestJson(
		"/roles",
		RoleResponseEnvelopeSchema,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		},
		token,
	);
};
