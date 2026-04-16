import mongoose, { type Model, Schema } from "mongoose";

export type UserDocument = {
	id: string;
	email: string;
	password: string;
	name: string;
	roleIds: string[];
	isActive: boolean;
	createdAt?: Date;
	updatedAt?: Date;
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
