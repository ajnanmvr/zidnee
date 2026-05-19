import { z } from "zod";
import { BatchTypeSchema } from "./batch.schema.js";
import { ObjectIdStringSchema } from "./rbac.schema.js";
import { StudentStatusSchema } from "./student.schema.js";

export const StudentProcessTaskSchema = z.object({
	key: z.string().min(1).max(80),
	label: z.string().min(1).max(150),
	completed: z.boolean(),
	completedAt: z.string().datetime().nullable().optional(),
});

export type StudentProcessTask = z.infer<typeof StudentProcessTaskSchema>;

export const StudentProcessTaskResponseSchema = StudentProcessTaskSchema.extend({
	completedAt: z.string().datetime().nullable().optional(),
});

export type StudentProcessTaskResponse = z.infer<
	typeof StudentProcessTaskResponseSchema
>;

export const StudentProcessStudentResponseSchema = z.object({
	id: ObjectIdStringSchema,
	zid: z.string().min(1).max(20),
	name: z.string().max(255).optional(),
	phone: z.string().min(8).max(20),
	email: z.string().email().max(255),
	status: StudentStatusSchema,
	courseType: BatchTypeSchema.optional(),
	level: z.string().max(100).optional(),
	mentorId: ObjectIdStringSchema.optional(),
	batchId: ObjectIdStringSchema.optional(),
});

export type StudentProcessStudentResponse = z.infer<
	typeof StudentProcessStudentResponseSchema
>;

export const StudentProcessSchema = z.object({
	id: ObjectIdStringSchema,
	studentId: ObjectIdStringSchema,
	status: StudentStatusSchema,
	label: z.string().min(1).max(150),
	tasks: z.array(StudentProcessTaskSchema).default([]),
	createdAt: z.date().optional(),
	updatedAt: z.date().optional(),
});

export type StudentProcess = z.infer<typeof StudentProcessSchema>;

export const StudentProcessResponseSchema = StudentProcessSchema.omit({
	createdAt: true,
	updatedAt: true,
})
	.extend({
		tasks: z.array(StudentProcessTaskResponseSchema),
		student: StudentProcessStudentResponseSchema,
		createdAt: z.string().datetime(),
		updatedAt: z.string().datetime(),
	});

export type StudentProcessResponse = z.infer<
	typeof StudentProcessResponseSchema
>;

export const StudentProcessesResponseSchema = z.object({
	ok: z.boolean(),
	processes: z.array(StudentProcessResponseSchema),
});

export type StudentProcessesResponse = z.infer<
	typeof StudentProcessesResponseSchema
>;

export const StudentProcessEnvelopeSchema = z.object({
    ok: z.boolean(),
    process: StudentProcessResponseSchema,
});

export type StudentProcessEnvelope = z.infer<typeof StudentProcessEnvelopeSchema>;
