import { z } from "zod";
import { LeadDemoSchema, LeadSchema, LeadStatusSchema } from "./lead.schema.js";

const LeadDemoResponseSchema = LeadDemoSchema.extend({
	mentorId: z.string().nullable().optional(),
	requestedAt: z.string().datetime().nullable(),
	assignedAt: z.string().datetime().nullable(),
	demoScheduledFor: z.string().datetime().nullable(),
	completedAt: z.string().datetime().nullable(),
	note: z.string().nullable().optional(),
});

export const LeadResponseSchema = LeadSchema.extend({
	status: LeadStatusSchema,
	nextFollowUpAt: z.string().datetime(),
	dateOfBirth: z.string().datetime().nullable().optional(),
	email: z.string().email().max(255).nullable().optional(),
	courseType: z.enum(["GROUP", "INDIVIDUAL"]).nullable().optional(),
	price: z.number().int().nonnegative().optional(),
	createdAt: z.string().datetime().nullable().optional(),
	updatedAt: z.string().datetime().nullable().optional(),
	admissionRequestedAt: z.string().datetime().nullable().optional(),
	studentId: z.string().nullable().optional(),
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
	pagination: z
		.object({
			total: z.number(),
			page: z.number(),
			pageSize: z.number(),
			totalPages: z.number(),
		})
		.optional(),
});

export type LeadsResponse = z.infer<typeof LeadsResponseSchema>;
