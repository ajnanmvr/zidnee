import type { User } from "@repo/schema";
import mongoose, { type Model, Schema, type Types } from "mongoose";

export type UserDocument = Omit<User, "id"> & {
	_id: Types.ObjectId;
};

const userSchema = new Schema<UserDocument>(
	{
		email: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},
		password: {
			type: String,
			required: true,
		},
		name: {
			type: String,
			required: true,
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
