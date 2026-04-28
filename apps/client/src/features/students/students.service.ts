import { StudentsResponseSchema } from "@repo/schema";
import { requestWithSchema } from "@/api/request";

export const fetchStudents = async (token: string) => {
	return requestWithSchema(
		"/students",
		StudentsResponseSchema,
		"GET",
		undefined,
		token,
	);
};