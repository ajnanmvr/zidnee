import type { ActivityType } from "@repo/schema";
import mongoose, { type Model, Schema, type Types } from "mongoose";

export interface LeadActivityDocument {
	_id: Types.ObjectId;
	leadId: Types.ObjectId;
	performedBy: Types.ObjectId;
	type: ActivityType;
	description: string;
	note?: string;
	oldValue?: Record<string, unknown>;
	newValue?: Record<string, unknown>;
	createdAt: Date;
}

const leadActivitySchema = new Schema<LeadActivityDocument>(
	{
		leadId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: "Lead",
			index: true,
		},
			type: {
				type: String,
				required: true,
				enum: ["CREATED", "UPDATED", "FOLLOW_UP_POSTPONED", "STATUS_CHANGED", "ASSIGNED", "DELETED", "FORM_SENT", "FORM_REVOKED", "DEMO_REQUESTED", "DEMO_SCHEDULED", "DEMO_COMPLETED", "DEMO_COUNSELLOR_ASSIGNED", "DEMO_CANCELLED", "DEMO_REDONE", "ADMISSION_REQUESTED", "ADMISSION_CONFIRMED", "STUDENT_CREATED"],
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

export const LeadActivityModel: Model<LeadActivityDocument> = mongoose.model(
	"LeadActivity",
	leadActivitySchema,
) as Model<LeadActivityDocument>;
