import type { Student } from "@repo/schema";
import mongoose, { type Model, Schema, type Types } from "mongoose";

export type StudentDocument = Omit<
	Student,
	"id" | "leadId" | "mentorId" | "counsellorId" | "batchId"
> & {
	_id: Types.ObjectId;
	leadId: Types.ObjectId;
	mentorId?: Types.ObjectId;
	counsellorId?: Types.ObjectId;
	batchId?: Types.ObjectId;
	admittedAt: Date;
};

const studentSchema = new Schema<StudentDocument>(
	{
		zid: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},
		leadId: {
			type: Schema.Types.ObjectId,
			ref: "Lead",
			required: true,
			unique: true,
			index: true,
		},
		name: {
			type: String,
			required: true,
		},
		phone: {
			type: String,
			required: true,
			index: true,
		},
		mentorId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: false,
		},
		counsellorId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: false,
		},
		batchId: {
			type: Schema.Types.ObjectId,
			ref: "Batch",
			required: false,
		},
		batchType: {
			type: String,
			enum: ["1_TO_1", "GROUP"],
			required: false,
		},
		status: {
			type: String,
			required: true,
			default: "ACTIVE",
		},
		admittedAt: {
			type: Date,
			required: true,
		},
	},
	{
		timestamps: true,
		versionKey: false,
	},
);

export const StudentModel =
	(mongoose.models.Student as Model<StudentDocument> | undefined) ??
	mongoose.model<StudentDocument>("Student", studentSchema);
