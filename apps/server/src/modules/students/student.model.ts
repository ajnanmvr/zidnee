import type { Student } from "@repo/schema";
import mongoose, { type Model, Schema, type Types } from "mongoose";
import { FOLLOW_UP_PERIOD_MS } from "@repo/schema";

export type StudentDocument = Omit<
	Student,
	"id" | "leadId" | "processId" | "admittedBy" | "mentorId" | "batchId"
> & {
	_id: Types.ObjectId;
	leadId: Types.ObjectId;
	processId?: Types.ObjectId;
	admittedBy: Types.ObjectId;
	mentorId?: Types.ObjectId;
	batchId?: Types.ObjectId;
	nextFollowUpAt?: Date;
	customNextFollowUpAt?: Date;
	admittedAt: Date;
	classStartConfirmedAt?: Date;
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
		processId: {
			type: Schema.Types.ObjectId,
			ref: "StudentProcess",
			required: false,
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
		profilePic: {
			type: String,
			required: false,
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
					timeslots: [
						new Schema(
							{
								startTime: { type: String, required: true },
								endTime: { type: String, required: true },
							},
							{ _id: false },
						),
					],
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
		processLabel: {
			type: String,
			required: false,
			trim: true,
			maxlength: 150,
		},
		oralAssessmentDone: {
			type: Boolean,
			required: false,
			default: false,
		},
		writtenAssessmentDone: {
			type: Boolean,
			required: false,
			default: false,
		},
		levelAssessmentDone: {
			type: Boolean,
			required: false,
			default: false,
		},
		nextFollowUpAt: {
			type: Date,
			required: false,
			default: () => new Date(Date.now() + FOLLOW_UP_PERIOD_MS.student),
			index: true,
		},
		customNextFollowUpAt: {
			type: Date,
			required: false,
			index: true,
		},
		status: {
			type: String,
			required: true,
			enum: ["STUDENT", "BREAK", "DROPPED", "COMPLETED"],
			default: "STUDENT",
		},
		admittedAt: {
			type: Date,
			required: true,
		},
		classStartConfirmedAt: {
			type: Date,
			required: false,
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
