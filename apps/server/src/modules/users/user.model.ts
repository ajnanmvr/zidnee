import type { User } from "@repo/schema";
import mongoose, { type Model, Schema, type Types } from "mongoose";

export type UserDocument = Omit<User, "id"> & {
	_id: Types.ObjectId;
};

const userSchema = new Schema<UserDocument>(
	{
		username: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},
		email: {
			type: String,
			index: false,
		},
		password: {
			type: String,
			required: true,
		},
		name: {
			type: String,
			required: true,
		},
		gender: {
			type: String,
			enum: ["male", "female"],
			required: false,
		},
		mentorId: {
			type: String,
			required: false,
			unique: true,
			sparse: true,
			index: true,
		},
		counsellorId: {
			type: String,
			required: false,
			unique: true,
			sparse: true,
			index: true,
		},
		roleIds: {
			type: [String],
			required: true,
			default: [],
		},
		isActive: {
			type: Boolean,
			required: true,
			default: true,
		},
	},
	{
		timestamps: true,
		versionKey: false,
	},
);

export const UserModel =
	(mongoose.models.User as Model<UserDocument> | undefined) ??
	mongoose.model<UserDocument>("User", userSchema);
