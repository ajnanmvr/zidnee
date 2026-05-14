import {
	StudentActivitiesResponseSchema,
	StudentFollowUpPayloadSchema,
	StudentResponseEnvelopeSchema,
	StudentsResponseSchema,
} from "@repo/schema";
import { requestWithSchema } from "@/api/request";

export const fetchStudents = async (
	token: string,
	options?: {
		status?: string;
		search?: string;
		sortBy?: string;
		sortOrder?: "asc" | "desc";
		page?: number;
		limit?: number;
	},
) => {
	const query = new URLSearchParams();
	if (options?.status) query.set("status", options.status);
	if (options?.search) query.set("search", options.search);
	if (options?.sortBy) query.set("sortBy", options.sortBy);
	if (options?.sortOrder) query.set("sortOrder", options.sortOrder);
	if (options?.page) query.set("page", String(options.page));
	if (options?.limit) query.set("limit", String(options.limit));

	return requestWithSchema(
		`/students${query.toString() ? `?${query.toString()}` : ""}`,
		StudentsResponseSchema,
		"GET",
		undefined,
		token,
	);
};

export const fetchStudentActivities = async (token: string, studentId: string) => {
	return requestWithSchema(
		`/students/${studentId}/activities`,
		StudentActivitiesResponseSchema,
		"GET",
		undefined,
		token,
	);
};

export const recordStudentFollowUp = async (
	token: string,
	studentId: string,
	payload: { note: string },
) => {
	const validatedPayload = StudentFollowUpPayloadSchema.parse(payload);
	return requestWithSchema(
		`/students/${studentId}/follow-up`,
		StudentResponseEnvelopeSchema,
		"PATCH",
		validatedPayload,
		token,
	);
};
