import { z } from "zod";
import { LeadSchema } from "./lead.schema.js";

export const LeadResponseSchema = LeadSchema.omit({
	createdAt: true,
	updatedAt: true,
	lastContactedAt: true,
	nextFollowUpAt: true,
	customNextFollowUpAt: true,
}).extend({
	lastContactedAt: z.string().datetime().nullable(),
	nextFollowUpAt: z.string().datetime(),
	customNextFollowUpAt: z.string().datetime().nullable(),
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
