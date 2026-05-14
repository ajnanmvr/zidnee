import type { Lead, LeadDemo, LeadStatus } from "@repo/schema";
import mongoose, { type Model, Schema, type Types } from "mongoose";

export type LeadDocument = Omit<
	Lead,
	"id" | "createdBy" | "assignedTo" | "demoRequestAssignedTo"
> & {
	_id: Types.ObjectId;
	slNo?: number;
	createdBy: Types.ObjectId;
	assignedTo?: Types.ObjectId | { _id: Types.ObjectId } | null;
	demoRequestAssignedTo?: Types.ObjectId | { _id: Types.ObjectId } | null;
	demos?: LeadDemo[];
	status?: LeadStatus;
};

export interface LeadDocumentExt extends LeadDocument {
	formToken?: string;
	formTokenExpiresAt?: Date;
}
const leadSchema = new Schema(
	{
		name: {
			type: String,
			required: false,
			trim: true,
			maxlength: 255,
		},
		phone: {
			type: String,
			required: true,
			trim: true,
			index: true,
		},
		email: {
			type: String,
			required: false,
			trim: true,
			maxlength: 255,
			index: true,
		},
		courseType: {
			type: String,
			required: false,
			enum: ["INDIVIDUAL", "GROUP"],
		},
		slNo: {
			type: Number,
			required: false,
			unique: true,
			sparse: true,
			index: true,
		},
		level: {
			type: String,
			required: false,
			trim: true,
			maxlength: 100,
		},
		assignedTo: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: false,
		},
		demoRequestAssignedTo: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: false,
		},
		createdBy: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		formSent: {
			type: Boolean,
			required: true,
			default: false,
		},
		formCompleted: {
			type: Boolean,
			required: true,
			default: false,
		},
		status: {
			type: String,
			enum: [
				"FOLLOW_UP",
				"FORM_SENT",
				"FORM_FILLED",
				"DEMO_REQUEST",
				"DEMO_ASSIGNED",
				"DEMO_COMPLETED",
				"DEMO_CANCELLED",
				"CONVERTED",
				"CLOSED",
			],
			required: true,
			default: "FOLLOW_UP",
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
		preferredTimeslots: {
			type: [
				new Schema(
					{
						label: { type: String, required: true, trim: true, maxlength: 120 },
						timesPerWeek: { type: Number, required: true },
						durationMinutes: { type: Number, required: true },
					},
					{ _id: false },
				),
			],
			required: false,
			default: [],
			validate: {
				validator: (value: unknown[]) => value.length <= 1,
				message: "Only one preferred timeslot can be saved",
			},
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
		demoAvailability: {
			type: String,
			required: false,
			trim: true,
			maxlength: 100,
		},
		preferredMentorGender: {
			type: String,
			required: false,
			enum: ["male", "female", "both"],
		},
		formToken: {
			type: String,
			required: false,
			index: true,
		},
		formTokenExpiresAt: {
			type: Date,
			required: false,
			index: true,
		},
		nextFollowUpAt: {
			type: Date,
			required: true,
			index: true,
			default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // Default to now + 1 day
		},
		demos: {
			type: [
				{
					mentorId: {
						type: Schema.Types.ObjectId,
						ref: "User",
						required: false,
					},
					requestedAt: { type: Date, required: false },
					assignedAt: { type: Date, required: false },
					demoScheduledFor: { type: Date, required: false },
					completedAt: { type: Date, required: false },
					note: { type: String, required: false },
				},
			],
			required: false,
			default: [],
		},
		admissionRequestedAt: {
			type: Date,
			required: false,
		},
		studentId: {
			type: Schema.Types.ObjectId,
			ref: "Student",
			required: false,
		},
	},
	{
		timestamps: true,
		versionKey: false,
	},
);

export const LeadModel =
	(mongoose.models.Lead as Model<LeadDocument> | undefined) ??
	mongoose.model<LeadDocument>("Lead", leadSchema);
