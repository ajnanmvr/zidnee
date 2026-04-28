import { z } from "zod";
import { LeadSchema, LeadDemoSchema } from "./lead.schema.js";

const LeadDemoResponseSchema = LeadDemoSchema.extend({
	requestedAt: z.string().datetime().nullable(),
	assignedAt: z.string().datetime().nullable(),
	demoScheduledFor: z.string().datetime().nullable(),
	completedAt: z.string().datetime().nullable(),
	lastContactedAt: z.string().datetime().nullable(),
	nextFollowUpAt: z.string().datetime().nullable(),
	customNextFollowUpAt: z.string().datetime().nullable(),
	admissionRequestedAt: z.string().datetime().nullable(),
	admissionCompletedAt: z.string().datetime().nullable(),
});

export const LeadResponseSchema = LeadSchema.omit({
	createdAt: true,
	updatedAt: true,
}).extend({
	nextFollowUpAt: z.string().datetime(),
	demos: z.array(LeadDemoResponseSchema),
});

export type LeadResponse = z.infer<typeof LeadResponseSchema>;

export const LeadResponseEnvelopeSchema = z.object({
	ok: z.boolean(),
	lead: LeadResponseSchema,
});

export type LeadResponseEnvelope = z.infer<typeof LeadResponseEnvelopeSchema>;

export const LeadsResponseSchema = z.object({
	ok: z.boolean(),
	leads: z.array(LeadResponseSchema),
});

export type LeadsResponse = z.infer<typeof LeadsResponseSchema>;
