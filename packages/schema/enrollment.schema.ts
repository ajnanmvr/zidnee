import { z } from "zod";
import { ObjectIdStringSchema } from "./rbac.schema.js";

export const EnrollmentSchema = z.object({
	id: ObjectIdStringSchema,
	studentId: ObjectIdStringSchema,
	courseId: ObjectIdStringSchema.optional(),
	batchId: ObjectIdStringSchema.optional(),
	enrolledAt: z.date(),
	status: z.enum(["ACTIVE", "COMPLETED", "DROPPED"]).default("ACTIVE"),
	createdAt: z.date().optional(),
	updatedAt: z.date().optional(),
});

export type Enrollment = z.infer<typeof EnrollmentSchema>;

export const CreateEnrollmentPayloadSchema = z.object({
	studentId: ObjectIdStringSchema,
	courseId: ObjectIdStringSchema.optional(),
	batchId: ObjectIdStringSchema.optional(),
});

export type CreateEnrollmentPayload = z.infer<typeof CreateEnrollmentPayloadSchema>;

export const EnrollmentResponseSchema = EnrollmentSchema.omit({
	enrolledAt: true,
	createdAt: true,
	updatedAt: true,
}).extend({
	enrolledAt: z.string().datetime(),
	createdAt: z.string().datetime().nullable(),
	updatedAt: z.string().datetime().nullable(),
});

export type EnrollmentResponse = z.infer<typeof EnrollmentResponseSchema>;

export const EnrollmentsResponseSchema = z.object({
	ok: z.boolean(),
	enrollments: z.array(EnrollmentResponseSchema),
});

export type EnrollmentsResponse = z.infer<typeof EnrollmentsResponseSchema>;
