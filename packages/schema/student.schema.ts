import { z } from "zod";
import { BatchTypeSchema } from "./batch.schema.js";
import { ObjectIdStringSchema } from "./rbac.schema.js";

export const StudentStatusSchema = z.enum(["STUDENT", "BREAK", "DROPPED"]);

export type StudentStatus = z.infer<typeof StudentStatusSchema>;

export const StudentTimeslotSnapshotSchema = z.object({
	classesPerWeek: z.number().int().positive(),
	durationMinutes: z.number().int().positive(),
});

export type StudentTimeslotSnapshot = z.infer<
	typeof StudentTimeslotSnapshotSchema
>;

export const StudentSchema = z.object({
	id: ObjectIdStringSchema,
	zid: z.string().min(1).max(20),
	leadId: ObjectIdStringSchema,
	processId: ObjectIdStringSchema.optional(),
	processLabel: z.string().max(150).optional(),
	nextFollowUpAt: z.date().optional(),
	customNextFollowUpAt: z.date().optional(),
	name: z.string().max(255).optional(),
	phone: z.string().min(8).max(20),
	email: z.string().email().max(255),
	courseType: BatchTypeSchema.optional(),
	level: z.string().max(100).optional(),
	admittedBy: ObjectIdStringSchema,
	dateOfBirth: z.date().optional(),
	residingCountry: z.string().max(100).optional(),
	gender: z.enum(["male", "female"]).optional(),
	primaryWhatsappNumber: z.string().min(8).max(20).optional(),
	alternateWhatsappNumber: z.string().min(8).max(20).optional(),
	studentInfo: z.string().max(1000).optional(),
	preferredLanguage: z
		.enum(["Malayalam Only", "English Only", "Malayalam - English Mixed"])
		.optional(),
	preferredSchedule: z.string().max(150).optional(),
	preferredDays: z.array(z.string()).default([]),
	timeslot: StudentTimeslotSnapshotSchema.optional(),
	price: z.number().int().nonnegative().optional(),
	startClassWhen: z.string().max(100).optional(),
	hearAboutUs: z.string().max(255).optional(),
	mentorId: ObjectIdStringSchema.optional(),
	batchId: ObjectIdStringSchema.optional(),
	status: StudentStatusSchema,
	admittedAt: z.date(),
	createdAt: z.date().optional(),
	updatedAt: z.date().optional(),
});

export type Student = z.infer<typeof StudentSchema>;

export const ConfirmAdmissionPayloadSchema = z.object({
	counsellorId: ObjectIdStringSchema.optional(),
	batchType: z.enum(["1_TO_1", "GROUP"]).optional(),
	mentorId: ObjectIdStringSchema.optional(), // For ONLINE_SCHOOL
	batchId: ObjectIdStringSchema.optional(), // For ONLINE_SCHOOL GROUP
	note: z.string().max(500).optional(),
});

export type ConfirmAdmissionPayload = z.infer<
	typeof ConfirmAdmissionPayloadSchema
>;

export const StudentFollowUpPayloadSchema = z.object({
	note: z.string().min(1).max(500),
});

export type StudentFollowUpPayload = z.infer<
	typeof StudentFollowUpPayloadSchema
>;

export const StudentResponseSchema = StudentSchema.omit({
	dateOfBirth: true,
	admittedAt: true,
	createdAt: true,
	updatedAt: true,
}).extend({
	nextFollowUpAt: z.string().datetime().nullable().optional(),
	customNextFollowUpAt: z.string().datetime().nullable().optional(),
	dateOfBirth: z.string().datetime().nullable(),
	admittedAt: z.string().datetime(),
	createdAt: z.string().datetime().nullable(),
	updatedAt: z.string().datetime().nullable(),
});

export type StudentResponse = z.infer<typeof StudentResponseSchema>;

export const StudentResponseEnvelopeSchema = z.object({
	ok: z.boolean(),
	student: StudentResponseSchema,
});

export type StudentResponseEnvelope = z.infer<
	typeof StudentResponseEnvelopeSchema
>;

export const StudentsResponseSchema = z.object({
	ok: z.boolean(),
	students: z.array(StudentResponseSchema),
});

export type StudentsResponse = z.infer<typeof StudentsResponseSchema>;
