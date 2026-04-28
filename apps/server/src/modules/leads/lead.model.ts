import type { Lead } from "@repo/schema";
import mongoose, { type Model, Schema, type Types } from "mongoose";
import type { LeadDemo } from "@repo/schema";

export type LeadDocument = Omit<Lead, "id" | "createdBy"> & {
	_id: Types.ObjectId;
	createdBy: Types.ObjectId;
	demos?: LeadDemo[];
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
		nextFollowUpAt: {
			type: Date,
			required: true,
			index: true,
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
					demoRequired: { type: Boolean, required: false },
					lastContactedAt: { type: Date, required: false },
					nextFollowUpAt: { type: Date, required: false },
					customNextFollowUpAt: { type: Date, required: false },
					admissionRequestedAt: { type: Date, required: false },
					admissionCounsellorId: {
						type: Schema.Types.ObjectId,
						ref: "User",
						required: false,
					},
					admissionCompletedAt: { type: Date, required: false },
					studentId: {
						type: Schema.Types.ObjectId,
						ref: "Student",
						required: false,
					},
					note: { type: String, required: false },
				},
			],
			required: false,
			default: [],
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
