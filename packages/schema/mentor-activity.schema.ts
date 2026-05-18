import { z } from "zod";
import { ObjectIdStringSchema } from "./rbac.schema.js";

export const MentorActivityTypeSchema = z.enum([
	"FOLLOW_UP_RECORDED",
	"FOLLOW_UP_CUSTOM_SET",
	"FOLLOW_UP_CUSTOM_CLEARED",
	"REMINDER_CREATED",
	"REMINDER_UPDATED",
	"REMINDER_DELETED",
]);

export type MentorActivityType = z.infer<typeof MentorActivityTypeSchema>;

export const MentorActivitySchema = z.object({
	id: ObjectIdStringSchema,
	mentorId: ObjectIdStringSchema,
	type: MentorActivityTypeSchema,
	performedBy: ObjectIdStringSchema,
	performedByName: z.string(),
	description: z.string(),
	note: z.string().optional(),
	oldValue: z.record(z.string(), z.unknown()).optional(),
	newValue: z.record(z.string(), z.unknown()).optional(),
	createdAt: z.date(),
});

export type MentorActivity = z.infer<typeof MentorActivitySchema>;

export const MentorActivityResponseSchema = MentorActivitySchema.omit({
	createdAt: true,
	mentorId: true,
	performedBy: true,
}).extend({
	mentorId: z.string(),
	performedBy: z.string(),
	createdAt: z.string().datetime(),
});

export type MentorActivityResponse = z.infer<
	typeof MentorActivityResponseSchema
>;

export const MentorActivitiesResponseSchema = z.object({
	ok: z.boolean(),
	activities: z.array(MentorActivityResponseSchema),
});

export type MentorActivitiesResponse = z.infer<
	typeof MentorActivitiesResponseSchema
>;