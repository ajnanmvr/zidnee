import {
	CourseResponseEnvelopeSchema,
	type CreateCoursePayload,
	CreateCoursePayloadSchema,
} from "@repo/schema";
import { requestWithSchema } from "@/api/request";

export const createCourse = async (
	token: string,
	payload: CreateCoursePayload,
) => {
	const validated = CreateCoursePayloadSchema.parse(payload);
	return requestWithSchema(
		"/courses",
		CourseResponseEnvelopeSchema,
		"POST",
		validated,
		token,
	);
};
