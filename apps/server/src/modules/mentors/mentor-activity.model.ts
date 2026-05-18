import type { MentorActivity } from "@repo/schema";
import mongoose, { type Model, Schema, type Types } from "mongoose";

export type MentorActivityDocument = Omit<MentorActivity, "id" | "mentorId" | "performedBy"> & {
	_id: Types.ObjectId;
	mentorId: Types.ObjectId;
	performedBy: Types.ObjectId;
	createdAt: Date;
};

const mentorActivitySchema = new Schema<MentorActivityDocument>(
	{
		mentorId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: "User",
			index: true,
		},
		type: {
			type: String,
			required: true,
			enum: [
				"FOLLOW_UP_RECORDED",
				"FOLLOW_UP_CUSTOM_SET",
				"FOLLOW_UP_CUSTOM_CLEARED",
				"REMINDER_CREATED",
				"REMINDER_UPDATED",
				"REMINDER_DELETED",
			],
		},
		performedBy: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: "User",
		},
		performedByName: {
			type: String,
			required: true,
		},
		description: {
			type: String,
			required: true,
		},
		note: {
			type: String,
			required: false,
		},
		oldValue: {
			type: Schema.Types.Mixed,
			required: false,
		},
		newValue: {
			type: Schema.Types.Mixed,
			required: false,
		},
	},
	{
		timestamps: {
			createdAt: true,
			updatedAt: false,
		},
		versionKey: false,
	},
);

export const MentorActivityModel: Model<MentorActivityDocument> =
	(mongoose.models.MentorActivity as Model<MentorActivityDocument> | undefined) ??
	mongoose.model<MentorActivityDocument>("MentorActivity", mentorActivitySchema);