import { z } from "zod";
import { LeadSchema } from "./lead.schema.js";

export const LeadResponseSchema = LeadSchema.omit({
	createdAt: true,
	updatedAt: true,
	lastContactedAt: true,
	nextFollowUpAt: true,
	customNextFollowUpAt: true,
	demoRequestedAt: true,
	demoAssignedAt: true,
	demoScheduledFor: true,
	demoCompletedAt: true,
	admissionRequestedAt: true,
	admissionCompletedAt: true,
}).extend({
	lastContactedAt: z.string().datetime().nullable(),
	nextFollowUpAt: z.string().datetime(),
	customNextFollowUpAt: z.string().datetime().nullable(),
	demoRequestedAt: z.string().datetime().nullable(),
	demoAssignedAt: z.string().datetime().nullable(),
	demoScheduledFor: z.string().datetime().nullable(),
	demoCompletedAt: z.string().datetime().nullable(),
	admissionRequestedAt: z.string().datetime().nullable(),
	admissionCompletedAt: z.string().datetime().nullable(),
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
