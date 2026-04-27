import { type ApiErrorResponse, ApiErrorResponseSchema } from "@repo/schema";
import axios from "axios";
import { api } from "@/api/client";

type Validator<T> = {
	safeParse: (
		value: unknown,
	) => { success: true; data: T } | { success: false };
};

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

export const requestWithSchema = async <T>(
	path: string,
	schema: Validator<T>,
	method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
	data?: unknown,
	token?: string,
): Promise<T> => {
	let raw: unknown;

	try {
		const response = await api.request({
			url: path,
			method,
			data,
			headers: token ? authHeaders(token) : undefined,
		});

		raw = response.data;
	} catch (error) {
		if (axios.isAxiosError(error)) {
			const status = error.response?.status ?? 500;
			const apiError = ApiErrorResponseSchema.safeParse(error.response?.data);
			throw new ApiError(
				status,
				apiError.success ? apiError.data : {},
				apiError.success ? apiError.data.message : error.message,
			);
		}

		throw error;
	}

	const parsed = schema.safeParse(raw);
	if (!parsed.success) {
		throw new Error("Response validation failed");
	}

	return parsed.data;
};
