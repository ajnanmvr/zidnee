import type { Lead, LeadStatus } from "@repo/schema";
import mongoose, { type Model, Schema, type Types } from "mongoose";

export type LeadDocument = Omit<Lead, "id"> & {
	_id: Types.ObjectId;
	lastContactedAt?: Date;
	customNextFollowUpAt?: Date;
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
		status: {
			type: String,
			required: true,
			default: "NEW",
			enum: [
				"NEW",
				"FOLLOW_UP",
				"FORM_SENT",
				"FORM_COMPLETED",
				"CONVERTED",
				"CLOSED",
			] satisfies LeadStatus[],
		},
		assignedTo: {
			type: String,
			required: false,
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
	},
	{
		timestamps: true,
		versionKey: false,
	},
);

export const LeadModel =
	(mongoose.models.Lead as Model<LeadDocument> | undefined) ??
	mongoose.model<LeadDocument>("Lead", leadSchema);
