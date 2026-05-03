import type { Course } from "@repo/schema";
import mongoose, { type Model, Schema, type Types } from "mongoose";

export type CourseDocument = Omit<Course, "id"> & {
	_id: Types.ObjectId;
};

const courseSchema = new Schema<CourseDocument>(
	{
		name: {
			type: String,
			required: true,
			index: true,
		},
		level: {
			type: String,
			required: true,
		},
		description: {
			type: String,
			required: false,
		},
		prefix: {
			type: String,
			required: true,
			index: true,
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

export const CourseModel =
	(mongoose.models.Course as Model<CourseDocument> | undefined) ??
	mongoose.model<CourseDocument>("Course", courseSchema);
