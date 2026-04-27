import { LoginResponseSchema, MeResponseSchema } from "@repo/schema";
import { requestWithSchema } from "@/api/request";

export const loginUser = async (username: string, password: string) => {
	return requestWithSchema("/auth/login", LoginResponseSchema, "POST", {
		username,
		password,
	});
};

export const fetchMe = async (token: string) => {
	return requestWithSchema(
		"/auth/me",
		MeResponseSchema,
		"GET",
		undefined,
		token,
	);
};
