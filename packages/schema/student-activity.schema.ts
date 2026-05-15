import { z } from "zod";
import { ObjectIdStringSchema } from "./rbac.schema.js";

export const StudentActivityTypeSchema = z.enum([
	"CREATED",
	"UPDATED",
	"ASSESSMENT_UPDATED",
	"FOLLOW_UP_POSTPONED",
	"FOLLOW_UP_RECORDED",
	"STATUS_CHANGED",
	"PROCESS_LINKED",
	"PROCESS_UPDATED",
	"DELETED",
]);

export type StudentActivityType = z.infer<typeof StudentActivityTypeSchema>;

export const StudentActivitySchema = z.object({
	id: ObjectIdStringSchema,
	studentId: ObjectIdStringSchema,
	type: StudentActivityTypeSchema,
	performedBy: ObjectIdStringSchema,
	performedByName: z.string(),
	oldValue: z.record(z.string(), z.unknown()).optional(),
	newValue: z.record(z.string(), z.unknown()).optional(),
	description: z.string(),
	note: z.string().optional(),
	createdAt: z.date(),
});

export type StudentActivity = z.infer<typeof StudentActivitySchema>;

export const StudentActivityResponseSchema = StudentActivitySchema.omit({
	createdAt: true,
	studentId: true,
	performedBy: true,
}).extend({
	studentId: z.string(),
	performedBy: z.string(),
	createdAt: z.string().datetime(),
});

export type StudentActivityResponse = z.infer<
	typeof StudentActivityResponseSchema
>;

export const StudentActivitiesResponseSchema = z.object({
	ok: z.boolean(),
	activities: z.array(StudentActivityResponseSchema),
});

export type StudentActivitiesResponse = z.infer<
	typeof StudentActivitiesResponseSchema
>;
