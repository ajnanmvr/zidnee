import type { MentorSubstitution } from "@repo/schema";
import mongoose, { type Model, Schema, type Types } from "mongoose";

export type MentorSubstitutionDocument = Omit<MentorSubstitution, "id"> & {
	_id: Types.ObjectId;
};

const mentorSubstitutionSchema = new Schema<MentorSubstitutionDocument>(
	{
		originalMentorId: {
			type: String,
			required: true,
			index: true,
		},
		substituteMentorId: {
			type: String,
			required: true,
			index: true,
		},
		startDate: {
			type: Date,
			required: true,
			index: true,
		},
		endDate: {
			type: Date,
			required: true,
			index: true,
		},
		reason: {
			type: String,
			required: false,
		},
		createdBy: {
			type: String,
			required: true,
			index: true,
		},
	},
	{
		timestamps: true,
		versionKey: false,
	},
);

// Index for efficient querying by date range and mentor
mentorSubstitutionSchema.index(
	{ originalMentorId: 1, startDate: 1, endDate: 1 },
	{ name: "original_mentor_date_range" },
);

mentorSubstitutionSchema.index(
	{ substituteMentorId: 1, startDate: 1, endDate: 1 },
	{ name: "substitute_mentor_date_range" },
);

mentorSubstitutionSchema.index(
	{ endDate: 1 },
	{ name: "end_date_index" },
);

export const MentorSubstitutionModel =
	(mongoose.models
		.MentorSubstitution as Model<MentorSubstitutionDocument> | undefined) ??
	mongoose.model<MentorSubstitutionDocument>(
		"MentorSubstitution",
		mentorSubstitutionSchema,
	);
