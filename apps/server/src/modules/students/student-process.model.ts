import type { StudentStatus } from "@repo/schema";
import mongoose, { type Model, Schema, type Types } from "mongoose";

export type StudentProcessTaskDocument = {
	key: string;
	label: string;
	completed: boolean;
	completedAt?: Date | null;
};

export type StudentProcessDocument = {
	_id: Types.ObjectId;
	studentId: Types.ObjectId;
	status: StudentStatus;
	label: string;
	tasks: StudentProcessTaskDocument[];
	createdAt: Date;
	updatedAt: Date;
};

const studentProcessTaskSchema = new Schema<StudentProcessTaskDocument>(
	{
		key: {
			type: String,
			required: true,
			trim: true,
			maxlength: 80,
		},
		label: {
			type: String,
			required: true,
			trim: true,
			maxlength: 150,
		},
		completed: {
			type: Boolean,
			required: true,
			default: false,
		},
		completedAt: {
			type: Date,
			required: false,
			default: null,
		},
	},
	{ _id: false },
);

const studentProcessSchema = new Schema<StudentProcessDocument>(
	{
		studentId: {
			type: Schema.Types.ObjectId,
			ref: "Student",
			required: true,
			unique: true,
			index: true,
		},
		status: {
			type: String,
			required: true,
			enum: ["STUDENT", "BREAK", "DROPPED"],
		},
		label: {
			type: String,
			required: true,
			trim: true,
			maxlength: 150,
		},
		tasks: {
			type: [studentProcessTaskSchema],
			required: true,
			default: [],
		},
	},
	{
		timestamps: true,
		versionKey: false,
	},
);

export const StudentProcessModel =
	(mongoose.models.StudentProcess as
		| Model<StudentProcessDocument>
		| undefined) ??
	mongoose.model<StudentProcessDocument>(
		"StudentProcess",
		studentProcessSchema,
	);

export const getStudentProcessTemplate = (status: StudentStatus) => {
	switch (status) {
		case "BREAK":
			return {
				label: "Break Process",
				tasks: [
					{
						key: "break-reason",
						label: "Capture break reason",
						completed: false,
					},
					{
						key: "break-duration",
						label: "Set break duration",
						completed: false,
					},
					{
						key: "resume-follow-up",
						label: "Plan resume follow-up",
						completed: false,
					},
				],
			};
		case "DROPPED":
			return {
				label: "Drop Process",
				tasks: [
					{
						key: "drop-reason",
						label: "Capture dropout reason",
						completed: false,
					},
					{
						key: "close-loop",
						label: "Close pending follow-ups",
						completed: false,
					},
					{
						key: "archive-student",
						label: "Archive student record",
						completed: false,
					},
				],
			};
		case "STUDENT":
		default:
			return {
				label: "Student Process",
				tasks: [
					{ key: "onboarding", label: "Complete onboarding", completed: false },
					{
						key: "batch-allocation",
						label: "Confirm batch allocation",
						completed: false,
					},
					{ key: "first-class", label: "Attend first class", completed: false },
				],
			};
	}
};
