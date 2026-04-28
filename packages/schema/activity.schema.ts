import { z } from "zod";
import { ObjectIdStringSchema } from "./rbac.schema.js";

export const ActivityTypeSchema = z.enum([
	"CREATED",
	"FOLLOW_UP_POSTPONED",
	"STATUS_CHANGED",
	"ASSIGNED",
	"DELETED",
	"FORM_SENT",
	"DEMO_REQUESTED",
	"DEMO_SCHEDULED",
	"DEMO_COMPLETED",
	"DEMO_REDONE",
	"ADMISSION_REQUESTED",
	"ADMISSION_CONFIRMED",
	"STUDENT_CREATED",
]);

export type ActivityType = z.infer<typeof ActivityTypeSchema>;

export const LeadActivitySchema = z.object({
	id: ObjectIdStringSchema,
	leadId: ObjectIdStringSchema,
	type: ActivityTypeSchema,
	performedBy: ObjectIdStringSchema,
	performedByName: z.string(),
	oldValue: z.record(z.string(), z.unknown()).optional(),
	newValue: z.record(z.string(), z.unknown()).optional(),
	description: z.string(),
	note: z.string().optional(),
	createdAt: z.date(),
});

export type LeadActivity = z.infer<typeof LeadActivitySchema>;

export const LeadActivityResponseSchema = LeadActivitySchema.omit({
	createdAt: true,
	leadId: true,
	performedBy: true,
}).extend({
	leadId: z.string(),
	performedBy: z.string(),
	createdAt: z.string().datetime(),
});

export type LeadActivityResponse = z.infer<typeof LeadActivityResponseSchema>;

export const LeadActivitiesResponseSchema = z.object({
	ok: z.boolean(),
	activities: z.array(LeadActivityResponseSchema),
});

export type LeadActivitiesResponse = z.infer<typeof LeadActivitiesResponseSchema>;
