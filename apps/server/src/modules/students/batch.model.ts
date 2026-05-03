import type { Batch } from "@repo/schema";
import mongoose, { type Model, Schema, type Types } from "mongoose";

export type BatchDocument = Omit<Batch, "id" | "mentorId"> & {
	_id: Types.ObjectId;
	mentorId: Types.ObjectId;
};

const batchSchema = new Schema<BatchDocument>(
	{
		name: {
			type: String,
			required: true,
			index: true,
		},
		type: {
			type: String,
			enum: ["GROUP", "INDIVIDUAL"],
			required: true,
		},
		level: {
			type: String,
			required: true,
		},
		mentorId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		description: {
			type: String,
			required: false,
		},
		isActive: {
			type: Boolean,
			required: true,
			default: true,
			index: true,
		},
	},
	{
		timestamps: true,
		versionKey: false,
	},
);

export const BatchModel =
	(mongoose.models.Batch as Model<BatchDocument> | undefined) ??
	mongoose.model<BatchDocument>("Batch", batchSchema);
