import { z } from "zod";
import { ObjectIdStringSchema } from "./rbac.schema.js";

export const MentorReminderSchema = z.object({
	id: ObjectIdStringSchema,
	mentorId: ObjectIdStringSchema,
	date: z.coerce.date(),
	note: z.string().min(1).max(500),
	isDone: z.boolean().default(false),
	createdBy: ObjectIdStringSchema,
	assignedTo: ObjectIdStringSchema,
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export type MentorReminder = z.infer<typeof MentorReminderSchema>;

export const CreateMentorReminderPayloadSchema = z.object({
	date: z.coerce.date(),
	note: z.string().min(1).max(500),
});

export type CreateMentorReminderPayload = z.infer<
	typeof CreateMentorReminderPayloadSchema
>;

export const UpdateMentorReminderPayloadSchema = z.object({
	isDone: z.boolean().optional(),
	note: z.string().min(1).max(500).optional(),
	date: z.coerce.date().optional(),
});

export type UpdateMentorReminderPayload = z.infer<
	typeof UpdateMentorReminderPayloadSchema
>;

export const MentorRemindersResponseSchema = z.object({
	ok: z.boolean(),
	reminders: z.array(MentorReminderSchema),
});

export const MentorReminderResponseSchema = z.object({
	ok: z.boolean(),
	reminder: MentorReminderSchema.nullable(),
});
