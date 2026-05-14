import type { Reminder } from "@repo/schema";
import mongoose, { type Model, Schema, type Types } from "mongoose";

export type ReminderDocument = Omit<
	Reminder,
	"id" | "studentId" | "createdBy" | "assignedTo"
> & {
	_id: Types.ObjectId;
	studentId: Types.ObjectId;
	createdBy: Types.ObjectId;
	assignedTo: Types.ObjectId;
	date: Date;
	isDone: boolean;
	createdAt: Date;
	updatedAt: Date;
};

const reminderSchema = new Schema<ReminderDocument>(
	{
		studentId: {
			type: Schema.Types.ObjectId,
			ref: "Student",
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

export const ReminderModel: Model<ReminderDocument> = mongoose.model(
	"Reminder",
	reminderSchema,
	"reminders",
);
