import type { Enrollment } from "@repo/schema";
import mongoose, { type Model, Schema, type Types } from "mongoose";

export type EnrollmentDocument = Omit<
	Enrollment,
	"id" | "studentId" | "courseId" | "batchId"
> & {
	_id: Types.ObjectId;
	studentId: Types.ObjectId;
	courseId?: Types.ObjectId;
	batchId?: Types.ObjectId;
	enrolledAt: Date;
};

const enrollmentSchema = new Schema<EnrollmentDocument>(
	{
		studentId: {
			type: Schema.Types.ObjectId,
			ref: "Student",
			required: true,
			index: true,
		},
		courseId: {
			type: Schema.Types.ObjectId,
			ref: "Course",
			required: false,
		},
		batchId: {
			type: Schema.Types.ObjectId,
			ref: "Batch",
			required: false,
		},
		enrolledAt: {
			type: Date,
			required: true,
			default: () => new Date(),
		},
		status: {
			type: String,
			enum: ["ACTIVE", "COMPLETED", "DROPPED"],
			required: true,
			default: "ACTIVE",
			index: true,
		},
	},
	{
		timestamps: true,
		versionKey: false,
	},
);

export const EnrollmentModel =
	(mongoose.models.Enrollment as Model<EnrollmentDocument> | undefined) ??
	mongoose.model<EnrollmentDocument>("Enrollment", enrollmentSchema);
