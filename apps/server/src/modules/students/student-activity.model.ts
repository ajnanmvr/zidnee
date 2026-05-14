import type { StudentActivityType } from "@repo/schema";
import mongoose, { type Model, Schema, type Types } from "mongoose";

export interface StudentActivityDocument {
	_id: Types.ObjectId;
	studentId: Types.ObjectId;
	performedBy: Types.ObjectId;
	type: StudentActivityType;
	description: string;
	note?: string;
	oldValue?: Record<string, unknown>;
	newValue?: Record<string, unknown>;
	createdAt: Date;
}

const studentActivitySchema = new Schema<StudentActivityDocument>(
	{
		studentId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: "Student",
			index: true,
		},
		type: {
			type: String,
			required: true,
			enum: [
				"CREATED",
				"UPDATED",
				"FOLLOW_UP_POSTPONED",
				"FOLLOW_UP_RECORDED",
				"STATUS_CHANGED",
				"PROCESS_LINKED",
				"PROCESS_UPDATED",
				"DELETED",
			],
		},
		performedBy: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: "User",
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

export const StudentActivityModel: Model<StudentActivityDocument> =
	mongoose.model("StudentActivity", studentActivitySchema) as Model<StudentActivityDocument>;