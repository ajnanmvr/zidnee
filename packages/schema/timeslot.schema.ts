import { z } from "zod";
import { ObjectIdStringSchema } from "./rbac.schema.js";

export const TimeSlotSchema = z.object({
	id: ObjectIdStringSchema,
	label: z.string().min(1).max(120),
	isActive: z.boolean().default(true),
	createdAt: z.date().optional(),
	updatedAt: z.date().optional(),
});

export type TimeSlot = z.infer<typeof TimeSlotSchema>;

export const CreateTimeSlotPayloadSchema = z.object({
	label: z.string().min(1).max(120),
});

export type CreateTimeSlotPayload = z.infer<typeof CreateTimeSlotPayloadSchema>;

export const UpdateTimeSlotPayloadSchema = z.object({
	label: z.string().min(1).max(120).optional(),
	isActive: z.boolean().optional(),
});

export type UpdateTimeSlotPayload = z.infer<typeof UpdateTimeSlotPayloadSchema>;

export const TimeSlotResponseSchema = TimeSlotSchema.omit({
	createdAt: true,
	updatedAt: true,
}).extend({
	createdAt: z.string().datetime().nullable(),
	updatedAt: z.string().datetime().nullable(),
});

export type TimeSlotResponse = z.infer<typeof TimeSlotResponseSchema>;

export const TimeSlotResponseEnvelopeSchema = z.object({
	ok: z.boolean(),
	timeSlot: TimeSlotResponseSchema,
});

export type TimeSlotResponseEnvelope = z.infer<typeof TimeSlotResponseEnvelopeSchema>;

export const TimeSlotsResponseSchema = z.object({
	ok: z.boolean(),
	timeSlots: z.array(TimeSlotResponseSchema),
});

export type TimeSlotsResponse = z.infer<typeof TimeSlotsResponseSchema>;