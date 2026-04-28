import { z } from "zod";
import { ObjectIdStringSchema } from "./rbac.schema.js";

export const LeadStatusSchema = z.enum([
	"NEW",
	"FOLLOW_UP",
	"FORM_SENT",
	"FORM_COMPLETED",
	"CONVERTED",
	"CLOSED",
]);

export type LeadStatus = z.infer<typeof LeadStatusSchema>;

const PhoneNumberSchema = z
	.string()
	.trim()
	.min(8)
	.max(20)
	.regex(/^[+]?\d{8,20}$/, "Phone number must contain only digits");

export const LeadSchema = z.object({
	id: ObjectIdStringSchema,
	name: z.string().max(255).optional(),
	phone: PhoneNumberSchema,
	level: z.string().max(100).optional(),
	assignedTo: ObjectIdStringSchema.optional(),
	createdBy: ObjectIdStringSchema,
	demoRequired: z.boolean().default(false),
	demoRequestedAt: z.date().optional(),
	demoMentorId: ObjectIdStringSchema.optional(),
	demoAssignedAt: z.date().optional(),
	demoScheduledFor: z.date().optional(),
	demoCompletedAt: z.date().optional(),
	admissionRequestedAt: z.date().optional(),
	admissionCounsellorId: ObjectIdStringSchema.optional(),
	admissionCompletedAt: z.date().optional(),
	studentId: ObjectIdStringSchema.optional(),
	formSent: z.boolean().default(false),
	formCompleted: z.boolean().default(false),
	followUpCount: z.number().int().min(0).default(0),
	lastContactedAt: z.date().optional(),
	nextFollowUpAt: z.date(),
	customNextFollowUpAt: z.date().optional(),
	createdAt: z.date().optional(),
	updatedAt: z.date().optional(),
});

export type Lead = z.infer<typeof LeadSchema>;

export const CreateLeadPayloadSchema = z.object({
	phone: PhoneNumberSchema,
	name: z.preprocess(
		(value) => {
			if (typeof value === "string" && value.trim() === "") {
				return undefined;
			}

			return value;
		},
		z.string().trim().min(1).max(255).optional(),
	),
	customNextFollowUpAt: z.coerce.date().optional(),
});

export type CreateLeadPayload = z.infer<typeof CreateLeadPayloadSchema>;

export const PostponeLeadFollowUpPayloadSchema = z.object({
	customNextFollowUpAt: z.coerce.date(),
	note: z.string().max(500).optional(),
});

export type PostponeLeadFollowUpPayload = z.infer<
	typeof PostponeLeadFollowUpPayloadSchema
>;

export const RedemoLeadPayloadSchema = z.object({
	mentorId: ObjectIdStringSchema,
	note: z.string().max(500).optional(),
});

export type RedemoLeadPayload = z.infer<typeof RedemoLeadPayloadSchema>;

export const AssignDemoPayloadSchema = z.object({
	mentorId: ObjectIdStringSchema,
	demoScheduledFor: z.coerce.date(),
});

export type AssignDemoPayload = z.infer<typeof AssignDemoPayloadSchema>;
