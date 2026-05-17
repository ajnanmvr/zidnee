import { z } from "zod";
import { ObjectIdStringSchema } from "./rbac.schema.js";

export const BatchTypeSchema = z.enum(["GROUP", "INDIVIDUAL"]);
export type BatchType = z.infer<typeof BatchTypeSchema>;

export const BatchSchema = z.object({
	id: ObjectIdStringSchema,
	groupId: z.string().min(1).max(20).optional(),
	name: z.string().min(1).max(255).optional(),
	type: BatchTypeSchema, // GROUP or INDIVIDUAL
	level: z.string().min(1).max(100),
	mentorId: ObjectIdStringSchema,
	counsellorId: ObjectIdStringSchema.optional(),
	description: z.string().max(500).optional(),
	isActive: z.boolean().default(true),
	createdAt: z.date().optional(),
	updatedAt: z.date().optional(),
});

export type Batch = z.infer<typeof BatchSchema>;

export const CreateBatchPayloadSchema = z.object({
	name: z.preprocess((value) => {
		if (typeof value === "string" && value.trim() === "") {
			return undefined;
		}

		return value;
	}, z.string().min(1).max(255).optional()),
	type: BatchTypeSchema,
	level: z.string().min(1).max(100),
	mentorId: ObjectIdStringSchema,
	counsellorId: ObjectIdStringSchema.optional(),
	description: z.string().max(500).optional(),
});

export type CreateBatchPayload = z.infer<typeof CreateBatchPayloadSchema>;

export const UpdateBatchPayloadSchema = z.object({
	name: z.preprocess((value) => {
		if (typeof value === "string" && value.trim() === "") {
			return undefined;
		}

		return value;
	}, z.string().min(1).max(255).optional()),
	type: BatchTypeSchema.optional(),
	level: z.string().min(1).max(100).optional(),
	mentorId: ObjectIdStringSchema.optional(),
	counsellorId: ObjectIdStringSchema.optional(),
	description: z.string().max(500).optional(),
	isActive: z.boolean().optional(),
});

export type UpdateBatchPayload = z.infer<typeof UpdateBatchPayloadSchema>;

export const BatchResponseSchema = BatchSchema.omit({
	createdAt: true,
	updatedAt: true,
}).extend({
	createdAt: z.string().datetime().nullable(),
	updatedAt: z.string().datetime().nullable(),
});

export type BatchResponse = z.infer<typeof BatchResponseSchema>;

export const BatchResponseEnvelopeSchema = z.object({
	ok: z.boolean(),
	batch: BatchResponseSchema,
});

export type BatchResponseEnvelope = z.infer<typeof BatchResponseEnvelopeSchema>;

export const BatchesResponseSchema = z.object({
	ok: z.boolean(),
	batches: z.array(BatchResponseSchema),
});

export type BatchesResponse = z.infer<typeof BatchesResponseSchema>;
