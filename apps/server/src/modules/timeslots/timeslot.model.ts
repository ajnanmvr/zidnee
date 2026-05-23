import type { TimeSlot } from "@repo/schema";
import mongoose, { type Model, Schema, type Types } from "mongoose";

export type TimeSlotDocument = Omit<TimeSlot, "id"> & {
	_id: Types.ObjectId;
	createdBy?: Types.ObjectId | null;
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
		durationMinutes: {
			type: Number,
			required: true,
			min: 1,
			max: 300,
		},
		timesPerWeek: {
			type: Number,
			required: true,
			min: 1,
			max: 7,
		},
		isActive: {
			type: Boolean,
			required: true,
			default: true,
			index: true,
		},
		createdBy: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: false,
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
