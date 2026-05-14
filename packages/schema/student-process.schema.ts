import { z } from "zod";
import { ObjectIdStringSchema } from "./rbac.schema.js";
import { StudentStatusSchema } from "./student.schema.js";

export const StudentProcessTaskSchema = z.object({
	key: z.string().min(1).max(80),
	label: z.string().min(1).max(150),
	completed: z.boolean(),
	completedAt: z.string().datetime().nullable().optional(),
});

export type StudentProcessTask = z.infer<typeof StudentProcessTaskSchema>;

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