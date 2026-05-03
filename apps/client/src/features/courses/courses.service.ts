import { requestWithSchema } from "@/api/request";
import { CreateCoursePayloadSchema, type CreateCoursePayload, CourseResponseEnvelopeSchema } from "@repo/schema";

export const createCourse = async (token: string, payload: CreateCoursePayload) => {
	const validated = CreateCoursePayloadSchema.parse(payload);
	return requestWithSchema("/courses", CourseResponseEnvelopeSchema, "POST", validated, token);
};
