import { PermissionsResponseSchema } from "@repo/schema";
import { requestWithSchema } from "@/api/request";

export const fetchPermissions = async (token: string) => {
	return requestWithSchema(
		"/permissions",
		PermissionsResponseSchema,
		"GET",
		undefined,
		token,
	);
};
