import type { TimeSlot } from "@repo/schema";
import mongoose, { type Model, Schema, type Types } from "mongoose";

export type TimeSlotDocument = Omit<TimeSlot, "id"> & {
	_id: Types.ObjectId;
};

const timeSlotSchema = new Schema<TimeSlotDocument>(
	{
		label: {
			type: String,
			required: true,
			trim: true,
			maxlength: 120,
			unique: true,
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

export const TimeSlotModel =
	(mongoose.models.TimeSlot as Model<TimeSlotDocument> | undefined) ??
	mongoose.model<TimeSlotDocument>("TimeSlot", timeSlotSchema);