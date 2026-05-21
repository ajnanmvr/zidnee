import { z } from "zod";
import { ObjectIdStringSchema } from "./rbac.schema.js";

export const MentorSubstitutionSchema = z.object({
	id: ObjectIdStringSchema,
	originalMentorId: ObjectIdStringSchema,
	substituteMentorId: ObjectIdStringSchema,
	startDate: z.coerce.date(),
	endDate: z.coerce.date(),
	reason: z.string().max(500).optional(),
	createdBy: ObjectIdStringSchema,
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export type MentorSubstitution = z.infer<typeof MentorSubstitutionSchema>;

export const CreateMentorSubstitutionPayloadSchema = z.object({
	originalMentorId: ObjectIdStringSchema,
	substituteMentorId: ObjectIdStringSchema,
	startDate: z.coerce.date(),
	endDate: z.coerce.date(),
	reason: z.string().max(500).optional(),
});

export type CreateMentorSubstitutionPayload = z.infer<
	typeof CreateMentorSubstitutionPayloadSchema
>;

export const UpdateMentorSubstitutionPayloadSchema = z.object({
	endDate: z.coerce.date().optional(),
	reason: z.string().max(500).optional(),
});

export type UpdateMentorSubstitutionPayload = z.infer<
	typeof UpdateMentorSubstitutionPayloadSchema
>;

// Response schemas
export const MentorSubstitutionResponseSchema = z.object({
	ok: z.boolean(),
	substitution: MentorSubstitutionSchema.nullable(),
});

export const MentorSubstitutionsResponseSchema = z.object({
	ok: z.boolean(),
	substitutions: z.array(MentorSubstitutionSchema),
});

// Enum for substitution status
export const MentorSubstitutionStatusSchema = z.enum([
	"today",
	"upcoming",
	"past-due",
	"active",
]);

export type MentorSubstitutionStatus = z.infer<
	typeof MentorSubstitutionStatusSchema
>;
