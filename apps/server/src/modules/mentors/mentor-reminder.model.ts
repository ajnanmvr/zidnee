import type { MentorReminder } from "@repo/schema";
import mongoose, { type Model, Schema, type Types } from "mongoose";

export type MentorReminderDocument = Omit<
	MentorReminder,
	"id" | "mentorId" | "createdBy" | "assignedTo"
> & {
	_id: Types.ObjectId;
	mentorId: Types.ObjectId;
	createdBy: Types.ObjectId;
	assignedTo: Types.ObjectId;
	date: Date;
	isDone: boolean;
	createdAt: Date;
	updatedAt: Date;
};

const mentorReminderSchema = new Schema<MentorReminderDocument>(
	{
		mentorId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		date: {
			type: Date,
			required: true,
			index: true,
		},
		note: {
			type: String,
			required: true,
			trim: true,
			maxlength: 500,
		},
		isDone: {
			type: Boolean,
			default: false,
			index: true,
		},
		createdBy: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		assignedTo: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
	},
	{
		timestamps: true,
	},
);

export const MentorReminderModel: Model<MentorReminderDocument> =
	mongoose.model(
		"MentorReminder",
		mentorReminderSchema,
		"mentor_reminders",
	);
