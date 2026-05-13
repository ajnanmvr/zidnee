import type { Student } from "@repo/schema";
import mongoose, { type Model, Schema, type Types } from "mongoose";

export type StudentDocument = Omit<
	Student,
	| "id"
	| "leadId"
	| "admittedBy"
	| "mentorId"
	| "batchId"
> & {
	_id: Types.ObjectId;
	leadId: Types.ObjectId;
	admittedBy: Types.ObjectId;
	mentorId?: Types.ObjectId;
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
			required: false,
			trim: true,
			maxlength: 255,
		},
		phone: {
			type: String,
			required: true,
			index: true,
			trim: true,
			maxlength: 20,
		},
		email: {
			type: String,
			required: true,
			trim: true,
			maxlength: 255,
			index: true,
		},
		courseType: {
			type: String,
			required: false,
			enum: ["INDIVIDUAL", "GROUP"],
		},
		level: {
			type: String,
			required: false,
			trim: true,
			maxlength: 100,
		},
		admittedBy: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		dateOfBirth: {
			type: Date,
			required: false,
		},
		residingCountry: {
			type: String,
			required: false,
			trim: true,
			maxlength: 100,
		},
		gender: {
			type: String,
			required: false,
			enum: ["male", "female"],
		},
		primaryWhatsappNumber: {
			type: String,
			required: false,
			trim: true,
			maxlength: 20,
		},
		alternateWhatsappNumber: {
			type: String,
			required: false,
			trim: true,
			maxlength: 20,
		},
		studentInfo: {
			type: String,
			required: false,
			trim: true,
			maxlength: 1000,
		},
		preferredLanguage: {
			type: String,
			required: false,
			enum: ["Malayalam Only", "English Only", "Malayalam - English Mixed"],
		},
		preferredSchedule: {
			type: String,
			required: false,
			trim: true,
			maxlength: 150,
		},
		preferredDays: {
			type: [String],
			required: false,
			default: [],
		},
		timeslot: {
			type: new Schema(
				{
					classesPerWeek: { type: Number, required: true },
					durationMinutes: { type: Number, required: true },
				},
				{ _id: false },
			),
			required: false,
		},
		price: {
			type: Number,
			required: false,
			min: 0,
		},
		startClassWhen: {
			type: String,
			required: false,
			trim: true,
			maxlength: 100,
		},
		hearAboutUs: {
			type: String,
			required: false,
			trim: true,
			maxlength: 255,
		},
		mentorId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: false,
		},
		batchId: {
			type: Schema.Types.ObjectId,
			ref: "Batch",
			required: false,
		},
		status: {
			type: String,
			required: true,
			enum: ["ADMISSION_PROCESS", "STUDENT", "BREAK", "DROPPED"],
			default: "ADMISSION_PROCESS",
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
