import { z } from "zod";
import { ObjectIdStringSchema } from "./rbac.schema.js";

export const ReminderSchema = z.object({
	id: ObjectIdStringSchema,
	linkedPerson: z.object({
		id: ObjectIdStringSchema,
		type: z.enum(["mentor", "student"]),
	}),
	date: z.coerce.date(),
	note: z.string().min(1).max(500),
	isDone: z.boolean().default(false),
	createdBy: ObjectIdStringSchema,
	assignedTo: ObjectIdStringSchema,
		createdAt: z.coerce.date(),
		updatedAt: z.coerce.date(),
});

export type Reminder = z.infer<typeof ReminderSchema>;

export const CreateReminderPayloadSchema = z.object({
	date: z.coerce.date(),
	note: z.string().min(1).max(500),
});

export type CreateReminderPayload = z.infer<typeof CreateReminderPayloadSchema>;

export const UpdateReminderPayloadSchema = z.object({
	isDone: z.boolean().optional(),
	note: z.string().min(1).max(500).optional(),
	date: z.coerce.date().optional(),
});

export type UpdateReminderPayload = z.infer<typeof UpdateReminderPayloadSchema>;

export const RemindersResponseSchema = z.object({
	ok: z.boolean(),
	reminders: z.array(ReminderSchema),
});

export const ReminderResponseSchema = z.object({
	ok: z.boolean(),
	reminder: ReminderSchema.nullable(),
});
