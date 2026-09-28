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
	admissionFee: z.number().int().nonnegative().optional(),
	createdAt: z.string().datetime().nullable().optional(),
	updatedAt: z.string().datetime().nullable().optional(),
	admissionRequestedAt: z.string().datetime().nullable().optional(),
	studentId: z.string().nullable().optional(),
	closeReason: z.string().nullable().optional(),
	deletedBy: z.string().nullable().optional(),
	deletedAt: z.string().datetime().nullable().optional(),
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

// Lightweight rows for the lead report. Unlike the paginated list, this
// includes converted and deleted (CLOSED) leads so outcomes can be counted.
export const LeadReportRowSchema = z.object({
	id: z.string(),
	status: LeadStatusSchema,
	assignedTo: z.string().nullable(),
	createdAt: z.string().datetime().nullable(),
});

export type LeadReportRow = z.infer<typeof LeadReportRowSchema>;

export const LeadReportResponseSchema = z.object({
	ok: z.boolean(),
	leads: z.array(LeadReportRowSchema),
});

export type LeadReportResponse = z.infer<typeof LeadReportResponseSchema>;

const PersonRefSchema = z
	.object({ id: z.string(), name: z.string() })
	.nullable();

// One row per demo attempt (a lead with a re-demo has several rows).
export const DemoReportRowSchema = z.object({
	leadId: z.string(),
	leadName: z.string().nullable(),
	slNo: z.number().nullable(),
	leadStatus: LeadStatusSchema,
	courseType: z.enum(["GROUP", "INDIVIDUAL"]).nullable(),
	level: z.string().nullable(),
	converted: z.boolean(),
	attempt: z.number().int().positive(),
	isLatest: z.boolean(),
	coordinator: PersonRefSchema,
	mentor: PersonRefSchema,
	sales: PersonRefSchema,
	requestedAt: z.string().datetime().nullable(),
	assignedAt: z.string().datetime().nullable(),
	scheduledFor: z.string().datetime().nullable(),
	completedAt: z.string().datetime().nullable(),
});

export type DemoReportRow = z.infer<typeof DemoReportRowSchema>;

export const DemoReportResponseSchema = z.object({
	ok: z.boolean(),
	demos: z.array(DemoReportRowSchema),
});

export type DemoReportResponse = z.infer<typeof DemoReportResponseSchema>;
