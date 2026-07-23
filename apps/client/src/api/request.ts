import { type ApiErrorResponse, ApiErrorResponseSchema } from "@repo/schema";
import axios from "axios";
import toast from "react-hot-toast";
import { api } from "@/api/client";
import { queryClient } from "@/lib/query-client";
import { useSessionStore } from "@/lib/stores/session.store";

type Validator<T> = {
	safeParse: (
		value: unknown,
	) => { success: true; data: T } | { success: false };
};

export class ApiError extends Error {
	public readonly status: number;
	public readonly payload: ApiErrorResponse;
	public readonly code?: string;

	public constructor(
		status: number,
		payload: ApiErrorResponse,
		message?: string,
		code?: string,
	) {
		super(message ?? payload.message ?? "Request failed");
		this.name = "ApiError";
		this.status = status;
		this.payload = payload;
		this.code = code;
	}
}

export const isTimeoutError = (error: unknown): boolean => {
	if (error instanceof ApiError) {
		return error.code === "ECONNABORTED" || /timeout/i.test(error.message);
	}
	return false;
};

const authHeaders = (token: string) => ({
	Authorization: `Bearer ${token}`,
});

const isSessionFailure = (
	path: string,
	status: number,
	payload: ApiErrorResponse,
): boolean => {
	if (status === 401) {
		return true;
	}

	const message = payload.message?.toLowerCase() ?? "";
	if (path === "/auth/me" && status === 404) {
		return true;
	}

	return (
		message.includes("token") ||
		message.includes("not authenticated") ||
		message.includes("user not found") ||
		message.includes("invalid session")
	);
};

const handleSessionFailure = () => {
	const { token, clearToken } = useSessionStore.getState();
	if (!token) {
		return;
	}

	clearToken();
	queryClient.clear();
};

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
			const payload = apiError.success ? apiError.data : {};
			if (isSessionFailure(path, status, payload)) {
				// prompt user to logout on auth/session failures
				try {
					if (typeof window !== "undefined") {
						const confirmed = window.confirm(
							"Your session appears to be invalid or expired. Log out now?",
						);
						if (confirmed) {
							handleSessionFailure();
							toast.success("Logged out");
							window.location.href = "/login";
						} else {
							// still clear session silently to avoid inconsistent state
							handleSessionFailure();
						}
					}
				} catch (e) {
					// fallback to immediate logout on error
					handleSessionFailure();
				}
			}
			throw new ApiError(
				status,
				payload,
				apiError.success ? apiError.data.message : error.message,
				error.code,
			);
		}

		throw error;
	}

	const parsed = schema.safeParse(raw);
	if (!parsed.success) {
		console.error(
			"Response validation failed. Expected schema:",
			schema,
			"Received:",
			raw,
		);
		throw new Error("Response validation failed");
	}

	return parsed.data;
};
