import type { Lead } from "@repo/schema";
import mongoose, { type Model, Schema, type Types } from "mongoose";

export type LeadDocument = Omit<Lead, "id" | "createdBy"> & {
	_id: Types.ObjectId;
	createdBy: Types.ObjectId;
	lastContactedAt?: Date;
	customNextFollowUpAt?: Date;
	demoRequestedAt?: Date;
	demoMentorId?: Types.ObjectId;
	demoAssignedAt?: Date;
	demoScheduledFor?: Date;
	demoCompletedAt?: Date;
	admissionRequestedAt?: Date;
	admissionCounsellorId?: Types.ObjectId;
	admissionCompletedAt?: Date;
	studentId?: Types.ObjectId;
};

const leadSchema = new Schema<LeadDocument>(
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
		level: {
			type: String,
			required: false,
			trim: true,
			maxlength: 100,
		},
		assignedTo: {
			type: String,
			required: false,
		},
		createdBy: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		demoRequired: {
			type: Boolean,
			required: true,
			default: false,
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
		followUpCount: {
			type: Number,
			required: true,
			default: 0,
		},
		lastContactedAt: {
			type: Date,
			required: false,
		},
		nextFollowUpAt: {
			type: Date,
			required: true,
			index: true,
		},
		customNextFollowUpAt: {
			type: Date,
			required: false,
			index: true,
		},
		demoRequestedAt: {
			type: Date,
			required: false,
			index: true,
		},
		demoMentorId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: false,
		},
		demoAssignedAt: {
			type: Date,
			required: false,
		},
		demoScheduledFor: {
			type: Date,
			required: false,
		},
		demoCompletedAt: {
			type: Date,
			required: false,
		},
		admissionRequestedAt: {
			type: Date,
			required: false,
		},
		admissionCounsellorId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: false,
		},
		admissionCompletedAt: {
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
