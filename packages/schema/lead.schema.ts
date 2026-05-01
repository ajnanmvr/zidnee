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

const OptionalTextSchema = z.preprocess(
	(value) => {
		if (typeof value === "string" && value.trim() === "") {
			return undefined;
		}

		return value;
	},
	z.string().trim().min(1).max(255).optional(),
);

export const LeadFormDataSchema = z.object({
	studentName: z.string().min(1).max(255),
	dateOfBirth: z.coerce.date(),
	residingCountry: z.string().min(1).max(100),
	standardApplyingFor: z.string().min(1).max(20),
	gender: z.enum(["male", "female"]),
	primaryWhatsappNumber: PhoneNumberSchema,
	alternateWhatsappNumber: PhoneNumberSchema.optional(),
	studentInfo: z.string().min(1).max(1000),
	preferredLanguage: z.enum(["Malayalam Only", "English Only", "Malayalam - English Mixed"]),
	preferredSchedule: z.string().min(1).max(100),
	preferredDays: z.array(z.string().min(1)).min(1),
	preferredTimeslots: z.array(z.string().min(1)).min(1),
	startClassWhen: z.string().min(1).max(100),
	hearAboutUs: z.string().min(1).max(255),
	demoAvailability: z.string().min(1).max(100),
	preferredMentorGender: z.enum(["male", "female", "both"]),
});

export type LeadFormData = z.infer<typeof LeadFormDataSchema>;

export const LeadDemoSchema = z.object({
	mentorId: ObjectIdStringSchema.optional(),
	requestedAt: z.date().optional(),
	assignedAt: z.date().optional(),
	demoScheduledFor: z.date().optional(),
	completedAt: z.date().optional(),
	demoRequired: z.boolean().default(false),
	lastContactedAt: z.date().optional(),
	nextFollowUpAt: z.date().optional(),
	customNextFollowUpAt: z.date().optional(),
	admissionRequestedAt: z.date().optional(),
	admissionCounsellorId: ObjectIdStringSchema.optional(),
	admissionCompletedAt: z.date().optional(),
	studentId: ObjectIdStringSchema.optional(),
	note: z.string().max(500).optional(),
});

export type LeadDemo = z.infer<typeof LeadDemoSchema>;

export const LeadSchema = z.object({
	id: ObjectIdStringSchema,
	name: z.string().max(255).optional(),
	phone: PhoneNumberSchema,
	level: z.string().max(100).optional(),
	assignedTo: ObjectIdStringSchema.optional(),
	createdBy: ObjectIdStringSchema,
	formSent: z.boolean().default(false),
	formCompleted: z.boolean().default(false),
	studentName: z.string().max(255).optional(),
	dateOfBirth: z.date().optional(),
	residingCountry: z.string().max(100).optional(),
	standardApplyingFor: z.string().max(20).optional(),
	gender: z.enum(["male", "female"]).optional(),
	primaryWhatsappNumber: PhoneNumberSchema.optional(),
	alternateWhatsappNumber: PhoneNumberSchema.optional(),
	studentInfo: z.string().max(1000).optional(),
	preferredLanguage: z.enum(["Malayalam Only", "English Only", "Malayalam - English Mixed"]).optional(),
	preferredSchedule: z.string().max(100).optional(),
	preferredDays: z.array(z.string()).default([]),
	preferredTimeslots: z.array(z.string()).default([]),
	startClassWhen: z.string().max(100).optional(),
	hearAboutUs: z.string().max(255).optional(),
	demoAvailability: z.string().max(100).optional(),
	preferredMentorGender: z.enum(["male", "female", "both"]).optional(),
	followUpCount: z.number().int().min(0).default(0),
	nextFollowUpAt: z.date(),
	demos: z.array(LeadDemoSchema).default([]),
	createdAt: z.date().optional(),
	updatedAt: z.date().optional(),
});

export type Lead = z.infer<typeof LeadSchema>;

export const CreateLeadPayloadSchema = z.object({
	phone: PhoneNumberSchema,
	assignedTo: ObjectIdStringSchema.optional(),
	name: OptionalTextSchema,
	customNextFollowUpAt: z.coerce.date().optional(),
});

export type CreateLeadPayload = z.infer<typeof CreateLeadPayloadSchema>;

export const UpdateLeadPayloadSchema = z.object({
	phone: PhoneNumberSchema.optional(),
	name: OptionalTextSchema,
	level: OptionalTextSchema,
	assignedTo: ObjectIdStringSchema.optional(),
}).refine(
	(value) => value.phone !== undefined || value.name !== undefined || value.level !== undefined || value.assignedTo !== undefined,
	{ message: "At least one field must be provided" },
);

export type UpdateLeadPayload = z.infer<typeof UpdateLeadPayloadSchema>;

export const PostponeLeadFollowUpPayloadSchema = z.object({
	customNextFollowUpAt: z.coerce.date(),
	note: z.string().max(500).optional(),
});

export type PostponeLeadFollowUpPayload = z.infer<
	typeof PostponeLeadFollowUpPayloadSchema
>;

export const RedemoLeadPayloadSchema = z.object({
	mentorId: ObjectIdStringSchema.optional(),
	note: z.string().max(500).optional(),
});

export type RedemoLeadPayload = z.infer<typeof RedemoLeadPayloadSchema>;

export const AssignDemoPayloadSchema = z.object({
	mentorId: ObjectIdStringSchema,
	demoScheduledFor: z.coerce.date(),
});

export type AssignDemoPayload = z.infer<typeof AssignDemoPayloadSchema>;

export const GenerateFormLinkResponseSchema = z.object({
	formLink: z.string().url(),
});

export type GenerateFormLinkResponse = z.infer<typeof GenerateFormLinkResponseSchema>;

export const SubmitLeadFormPayloadSchema = z.object({
	studentName: z.string().min(1).max(255),
	dateOfBirth: z.coerce.date(),
	residingCountry: z.string().min(1).max(100),
	standardApplyingFor: z.string().min(1).max(20),
	gender: z.enum(["male", "female"]),
	primaryWhatsappNumber: PhoneNumberSchema,
	alternateWhatsappNumber: PhoneNumberSchema.optional(),
	studentInfo: z.string().min(1).max(1000),
	preferredLanguage: z.enum(["Malayalam Only", "English Only", "Malayalam - English Mixed"]),
	preferredSchedule: z.string().min(1).max(100),
	preferredDays: z.array(z.string().min(1)).min(1),
	preferredTimeslots: z.array(z.string().min(1)).min(1),
	startClassWhen: z.string().min(1).max(100),
	hearAboutUs: z.string().min(1).max(255),
	demoAvailability: z.string().min(1).max(100),
	preferredMentorGender: z.enum(["male", "female", "both"]),
	token: z.string().min(1),
});

export type SubmitLeadFormPayload = z.infer<typeof SubmitLeadFormPayloadSchema>;
