import { z } from "zod";
import { ObjectIdStringSchema } from "./rbac.schema.js";

export const LeadStatusSchema = z.enum([
	"FOLLOW_UP",
	"FORM_SENT",
	"FORM_FILLED",
	"DEMO_REQUEST",
	"DEMO_ASSIGNED",
	"DEMO_COMPLETED",
	"DEMO_CANCELLED",
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

const OptionalTextSchema = z.preprocess((value) => {
	if (typeof value === "string" && value.trim() === "") {
		return undefined;
	}

	return value;
}, z.string().trim().min(1).max(255).optional());

export const LeadTimeslotSnapshotSchema = z.object({
	label: z.string().min(1).max(120),
	timesPerWeek: z.number().int().positive(),
	durationMinutes: z.number().int().positive(),
});

export type LeadTimeslotSnapshot = z.infer<typeof LeadTimeslotSnapshotSchema>;

export const LeadFormDataSchema = z.object({
	name: z.string().min(1).max(255),
	dateOfBirth: z.coerce.date(),
	residingCountry: z.string().min(1).max(100),
	level: z.string().min(1).max(20),
	gender: z.enum(["male", "female"]),
	primaryWhatsappNumber: PhoneNumberSchema,
	alternateWhatsappNumber: PhoneNumberSchema.optional(),
	studentInfo: z.string().min(1).max(1000),
	preferredLanguage: z.enum([
		"Malayalam Only",
		"English Only",
		"Malayalam - English Mixed",
	]),
	preferredSchedule: z.string().min(1).max(150),
	preferredDays: z.array(z.string().min(1)).min(1),
	preferredTimeslots: z.array(LeadTimeslotSnapshotSchema).min(1),
	price: z.number().int().nonnegative().optional(),
	startClassWhen: z.string().min(1).max(100),
	hearAboutUs: z.string().min(1).max(255),
	demoAvailability: z.string().min(1).max(100),
	preferredMentorGender: z.enum(["male", "female", "both"]),
});

export type LeadFormData = z.infer<typeof LeadFormDataSchema>;

export const LeadDemoSchema = z.object({
	counsellorId: ObjectIdStringSchema.optional(), // Counsellor managing this demo attempt
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
	demoRequestAssignedTo: ObjectIdStringSchema.optional(),
	createdBy: ObjectIdStringSchema,
	formSent: z.boolean().default(false),
	formCompleted: z.boolean().default(false),
	status: LeadStatusSchema.optional(),
	dateOfBirth: z.date().optional(),
	residingCountry: z.string().max(100).optional(),
	gender: z.enum(["male", "female"]).optional(),
	primaryWhatsappNumber: PhoneNumberSchema.optional(),
	alternateWhatsappNumber: PhoneNumberSchema.optional(),
	studentInfo: z.string().max(1000).optional(),
	preferredLanguage: z
		.enum(["Malayalam Only", "English Only", "Malayalam - English Mixed"])
		.optional(),
	preferredSchedule: z.string().max(150).optional(),
	preferredDays: z.array(z.string()).default([]),
	preferredTimeslots: z.array(LeadTimeslotSnapshotSchema).default([]),
	price: z.number().int().nonnegative().optional(),
	startClassWhen: z.string().max(100).optional(),
	hearAboutUs: z.string().max(255).optional(),
	demoAvailability: z.string().max(100).optional(),
	preferredMentorGender: z.enum(["male", "female", "both"]).optional(),
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

export const UpdateLeadPayloadSchema = z
	.object({
		phone: PhoneNumberSchema.optional(),
		name: OptionalTextSchema,
		level: OptionalTextSchema,
		assignedTo: ObjectIdStringSchema.optional(),
		demoRequestAssignedTo: ObjectIdStringSchema.optional(),
		gender: z.enum(["male", "female"]).optional(),
		dateOfBirth: z.coerce.date().optional(),
		residingCountry: z.string().max(100).optional(),
		primaryWhatsappNumber: PhoneNumberSchema.optional(),
		alternateWhatsappNumber: PhoneNumberSchema.optional(),
		studentInfo: z.string().max(1000).optional(),
		preferredLanguage: z
			.enum(["Malayalam Only", "English Only", "Malayalam - English Mixed"])
			.optional(),
		preferredSchedule: z.string().max(150).optional(),
		preferredDays: z.array(z.string().min(1)).optional(),
		preferredTimeslots: z.array(LeadTimeslotSnapshotSchema).optional(),
		price: z.number().int().nonnegative().optional(),
		startClassWhen: z.string().max(100).optional(),
		hearAboutUs: z.string().max(255).optional(),
		demoAvailability: z.string().max(100).optional(),
		preferredMentorGender: z.enum(["male", "female", "both"]).optional(),
	})
	.refine((value) => Object.values(value).some((v) => v !== undefined), {
		message: "At least one field must be provided",
	});

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
	counsellorId: ObjectIdStringSchema.optional(),
	note: z.string().max(500).optional(),
});

export type RedemoLeadPayload = z.infer<typeof RedemoLeadPayloadSchema>;

export const AssignDemoPayloadSchema = z.object({
	mentorId: ObjectIdStringSchema,
	demoScheduledFor: z.coerce.date(),
});

export type AssignDemoPayload = z.infer<typeof AssignDemoPayloadSchema>;

export const AssignDemoCounsellorPayloadSchema = z.object({
	counsellorId: ObjectIdStringSchema,
});

export type AssignDemoCounsellorPayload = z.infer<
	typeof AssignDemoCounsellorPayloadSchema
>;

export const GenerateFormLinkResponseSchema = z.object({
	formLink: z.string().url(),
});

export const DeleteLeadPayloadSchema = z.object({
	note: z.string().min(1).max(500),
});

export type DeleteLeadPayload = z.infer<typeof DeleteLeadPayloadSchema>;

export type GenerateFormLinkResponse = z.infer<
	typeof GenerateFormLinkResponseSchema
>;

export const SubmitLeadFormPayloadSchema = z.object({
	name: z.string().min(1).max(255),
	dateOfBirth: z.coerce.date(),
	residingCountry: z.string().min(1).max(100),
	level: z.string().min(1).max(20),
	gender: z.enum(["male", "female"]),
	primaryWhatsappNumber: PhoneNumberSchema,
	alternateWhatsappNumber: PhoneNumberSchema.optional(),
	studentInfo: z.string().max(1000).optional(),
	preferredLanguage: z.enum([
		"Malayalam Only",
		"English Only",
		"Malayalam - English Mixed",
	]),
	preferredSchedule: z.string().min(1).max(150),
	preferredDays: z.array(z.string().min(1)).min(1),
	preferredTimeslots: z.array(LeadTimeslotSnapshotSchema).min(1),
	price: z.number().int().nonnegative().optional(),
	startClassWhen: z.string().min(1).max(100),
	hearAboutUs: z.string().min(1).max(255),
	demoAvailability: z.string().min(1).max(100),
	preferredMentorGender: z.enum(["male", "female", "both"]),
	token: z.string().min(1),
});

export type SubmitLeadFormPayload = z.infer<typeof SubmitLeadFormPayloadSchema>;
