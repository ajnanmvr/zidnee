import { z } from "zod";
import { ObjectIdStringSchema } from "./rbac.schema.js";

export const StudentStatusSchema = z.enum(["ACTIVE", "COMPLETED", "DROPPED"]);

export type StudentStatus = z.infer<typeof StudentStatusSchema>;

export const StudentSchema = z.object({
	id: ObjectIdStringSchema,
	zid: z.string().min(1).max(20),
	leadId: ObjectIdStringSchema,
	name: z.string().min(1).max(255),
	phone: z.string().min(8).max(20),
	mentorId: ObjectIdStringSchema.optional(),
	counsellorId: ObjectIdStringSchema.optional(),
	batchId: ObjectIdStringSchema.optional(),
	batchType: z.enum(["1_TO_1", "GROUP"]).optional(),
	status: StudentStatusSchema,
	admittedAt: z.date(),
	createdAt: z.date().optional(),
	updatedAt: z.date().optional(),
});

export type Student = z.infer<typeof StudentSchema>;

export const ConfirmAdmissionPayloadSchema = z.object({
	counsellorId: ObjectIdStringSchema.optional(),
	batchType: z.enum(["1_TO_1", "GROUP"]).optional(), // Only for ONLINE_SCHOOL
	mentorId: ObjectIdStringSchema.optional(), // For ONLINE_SCHOOL
	batchId: ObjectIdStringSchema.optional(), // For ONLINE_SCHOOL GROUP
	note: z.string().max(500).optional(),
});

export type ConfirmAdmissionPayload = z.infer<
	typeof ConfirmAdmissionPayloadSchema
>;

export const StudentResponseSchema = StudentSchema.omit({
	admittedAt: true,
	createdAt: true,
	updatedAt: true,
}).extend({
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
