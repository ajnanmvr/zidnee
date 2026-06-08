import { z } from "zod";
import { BatchTypeSchema } from "./batch.schema.js";
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

const PhoneNumberSchema = z.preprocess(
	(value) =>
		typeof value === "string" ? value.trim().replace(/[\s\-().]/g, "") : value,
	z
		.string()
		.min(8)
		.max(20)
		.regex(/^[+]?\d{8,20}$/, "Enter a valid phone number with country code"),
);

const OptionalTextSchema = z.preprocess((value) => {
	if (typeof value === "string" && value.trim() === "") {
		return undefined;
	}

	return value;
}, z.string().trim().min(1).max(255).optional());

export const LeadTimeslotSchema = z.object({
	startTime: z.string().min(1),
	endTime: z.string().min(1),
});

export const LeadPreferredPlanSchema = z.object({
	timesPerWeek: z.number().int().positive(),
	durationMinutes: z.number().int().positive(),
});

export type LeadPreferredPlan = z.infer<typeof LeadPreferredPlanSchema>;

export const LeadFormDataSchema = z
	.object({
		name: z.string().min(1).max(255),
		dateOfBirth: z.coerce.date(),
		residingCountry: z.string().min(1).max(100),
		level: z.string().min(1).max(20),
		gender: z.enum(["male", "female"]),
		primaryWhatsappNumber: PhoneNumberSchema,
		alternateWhatsappNumber: PhoneNumberSchema,
		studentInfo: z.string().min(1).max(1000),
		preferredLanguage: z.enum([
			"Malayalam Only",
			"English Only",
			"Malayalam - English Mixed",
		]),
		preferredSchedule: z.string().min(1).max(150).optional(),
		preferredDays: z.array(z.string().min(1)).min(1).optional(),
		preferredPlan: LeadPreferredPlanSchema.optional(),
		preferredStartTime: z.string().min(1).optional(),
		preferredTimeslots: z.array(LeadTimeslotSchema).default([]),
		email: z.email().max(255),
		courseType: BatchTypeSchema.optional(),
		price: z.number().int().nonnegative().optional(),
		hearAboutUs: z.string().min(1).max(255),
		demoAvailability: z.string().min(1).max(100).optional(),
		preferredMentorGender: z.enum(["male", "female", "both"]).optional(),
	})
	.superRefine((data, ctx) => {
		if (data.courseType === "GROUP") {
			if (!data.preferredTimeslots || data.preferredTimeslots.length === 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["preferredTimeslots"],
					message: "Choose at least one preferred class timing.",
				});
			}
			return;
		}

		if (!data.preferredDays || data.preferredDays.length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["preferredDays"],
				message: "Choose at least one preferred day.",
			});
		}

		if (!data.preferredPlan) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["preferredPlan"],
				message: "Choose a plan for individual courses.",
			});
		}

		if (!data.preferredStartTime) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["preferredStartTime"],
				message: "Choose a preferred class time.",
			});
		}

		if (!data.preferredTimeslots || data.preferredTimeslots.length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["preferredTimeslots"],
				message: "Preferred class timing is required.",
			});
		}

		if (!data.demoAvailability) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["demoAvailability"],
				message: "Choose when we can give a demo.",
			});
		}

		if (!data.preferredMentorGender) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["preferredMentorGender"],
				message: "Choose a preferred mentor gender.",
			});
		}
	});

export type LeadFormData = z.infer<typeof LeadFormDataSchema>;

export const LeadDemoSchema = z.object({
	mentorId: ObjectIdStringSchema.optional(),
	requestedAt: z.date().optional(),
	assignedAt: z.date().optional(),
	demoScheduledFor: z.date().optional(),
	completedAt: z.date().optional(),
	note: z.string().max(500).optional(),
});

export type LeadDemo = z.infer<typeof LeadDemoSchema>;

export const LeadSchema = z.object({
	id: ObjectIdStringSchema,
	slNo: z.number().int().positive().optional(),
	name: z.string().max(255).optional(),
	phone: PhoneNumberSchema,
	isOrganic: z.boolean().default(false),
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
	preferredPlan: LeadPreferredPlanSchema.optional(),
	preferredTimeslots: z.array(LeadTimeslotSchema).default([]),
	price: z.number().int().nonnegative().optional(),
	hearAboutUs: z.string().max(255).optional(),
	demoAvailability: z.string().max(100).optional(),
	preferredMentorGender: z.enum(["male", "female", "both"]).optional(),
	email: z.string().email().max(255).optional(),
	courseType: BatchTypeSchema.optional(),
	nextFollowUpAt: z.date(),
	demos: z.array(LeadDemoSchema).default([]),
	closeReason: z.string().max(500).optional(),
	deletedBy: z.string().max(255).optional(),
	deletedAt: z.date().optional(),
	admissionRequestedAt: z.date().optional(),
	studentId: ObjectIdStringSchema.optional(),
	profilePic: z.string().url().optional(),
	createdAt: z.date().optional(),
	updatedAt: z.date().optional(),
});

export type Lead = z.infer<typeof LeadSchema>;

export const CreateLeadPayloadSchema = z.object({
	phone: PhoneNumberSchema,
	assignedTo: ObjectIdStringSchema.optional(),
	name: OptionalTextSchema,
	email: z.string().email().max(255).optional(),
	isOrganic: z.boolean().default(false),
	customNextFollowUpAt: z.coerce.date().optional(),
});

export type CreateLeadPayload = z.infer<typeof CreateLeadPayloadSchema>;

export const UpdateLeadPayloadSchema = z
	.object({
		status: LeadStatusSchema.optional(),
		phone: PhoneNumberSchema.optional(),
		name: OptionalTextSchema,
		level: OptionalTextSchema,
		assignedTo: ObjectIdStringSchema.optional(),
		demoRequestAssignedTo: ObjectIdStringSchema.optional(),
		gender: z.enum(["male", "female"]).optional(),
		dateOfBirth: z.coerce.date().optional(),
		residingCountry: z.string().max(100).optional(),
		email: z.string().email().max(255).optional(),
		primaryWhatsappNumber: PhoneNumberSchema.optional(),
		alternateWhatsappNumber: PhoneNumberSchema.optional(),
		studentInfo: z.string().max(1000).optional(),
		preferredLanguage: z
			.enum(["Malayalam Only", "English Only", "Malayalam - English Mixed"])
			.optional(),
		preferredSchedule: z.string().max(150).optional(),
		preferredDays: z.array(z.string().min(1)).optional(),
		preferredPlan: LeadPreferredPlanSchema.optional(),
		preferredTimeslots: z.array(LeadTimeslotSchema).optional(),
		courseType: BatchTypeSchema.optional(),
		price: z.number().int().nonnegative().optional(),
		hearAboutUs: z.string().max(255).optional(),
		demoAvailability: z.string().max(100).optional(),
		preferredMentorGender: z.enum(["male", "female", "both"]).optional(),
		isOrganic: z.boolean().optional(),
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

export const SubmitLeadFormPayloadSchema = z
	.object({
		name: z.string().min(1).max(255),
		dateOfBirth: z.coerce.date(),
		residingCountry: z.string().min(1).max(100),
		level: z.string().min(1).max(20),
		gender: z.enum(["male", "female"]),
		primaryWhatsappNumber: PhoneNumberSchema,
		alternateWhatsappNumber: PhoneNumberSchema,
		studentInfo: z.string().max(1000).optional(),
		preferredLanguage: z.enum([
			"Malayalam Only",
			"English Only",
			"Malayalam - English Mixed",
		]),
		preferredSchedule: z.string().max(150).optional(),
		preferredDays: z.array(z.string().min(1)).optional(),
		preferredPlan: LeadPreferredPlanSchema.optional(),
		preferredStartTime: z.string().min(1).optional(),
		preferredTimeslots: z.array(LeadTimeslotSchema).optional(),
		email: z.string().email().max(255),
		courseType: BatchTypeSchema.optional(),
		price: z.number().int().nonnegative().optional(),
		hearAboutUs: z.string().min(1).max(255),
		demoAvailability: z.string().max(100).optional(),
		preferredMentorGender: z.enum(["male", "female", "both"]).optional(),
		token: z.string().min(1),
	})
	.superRefine((data, ctx) => {
		if (data.courseType === "GROUP") {
			if (!data.preferredTimeslots || data.preferredTimeslots.length === 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["preferredTimeslots"],
					message: "Choose at least one preferred class timing.",
				});
			}
			return;
		}

		if (!data.preferredPlan) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["preferredPlan"],
				message: "Choose a plan for individual courses.",
			});
		}

		if (!data.preferredStartTime) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["preferredStartTime"],
				message: "Choose a preferred class time.",
			});
		}

		if (!data.preferredTimeslots || data.preferredTimeslots.length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["preferredTimeslots"],
				message: "Preferred class timing is required.",
			});
		}
	});

export type SubmitLeadFormPayload = z.infer<typeof SubmitLeadFormPayloadSchema>;
