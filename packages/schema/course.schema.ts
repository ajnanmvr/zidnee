import { z } from "zod";
import { ObjectIdStringSchema } from "./rbac.schema.js";

export const CourseSchema = z.object({
	id: ObjectIdStringSchema,
	name: z.string().min(1).max(255),
	level: z.string().min(1).max(100),
	description: z.string().max(500).optional(),
	prefix: z.string().min(1).max(10), // e.g., "ZID", "ZIG"
	isActive: z.boolean().default(true),
	createdAt: z.date().optional(),
	updatedAt: z.date().optional(),
});

export type Course = z.infer<typeof CourseSchema>;

export const CreateCoursePayloadSchema = z.object({
	name: z.string().min(1).max(255),
	level: z.string().min(1).max(100),
	description: z.string().max(500).optional(),
	prefix: z.string().min(1).max(10),
});

export type CreateCoursePayload = z.infer<typeof CreateCoursePayloadSchema>;

export const UpdateCoursePayloadSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	level: z.string().min(1).max(100).optional(),
	description: z.string().max(500).optional(),
	prefix: z.string().min(1).max(10).optional(),
	isActive: z.boolean().optional(),
});

export type UpdateCoursePayload = z.infer<typeof UpdateCoursePayloadSchema>;

export const CourseResponseSchema = CourseSchema.omit({
	createdAt: true,
	updatedAt: true,
}).extend({
	createdAt: z.string().datetime().nullable(),
	updatedAt: z.string().datetime().nullable(),
});

export type CourseResponse = z.infer<typeof CourseResponseSchema>;

export const CourseResponseEnvelopeSchema = z.object({
	ok: z.boolean(),
	course: CourseResponseSchema,
});

export type CourseResponseEnvelope = z.infer<typeof CourseResponseEnvelopeSchema>;

export const CoursesResponseSchema = z.object({
	ok: z.boolean(),
	courses: z.array(CourseResponseSchema),
});

export type CoursesResponse = z.infer<typeof CoursesResponseSchema>;
