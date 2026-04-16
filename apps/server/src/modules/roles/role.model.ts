import mongoose, { type Model, Schema } from "mongoose";

export type RoleDocument = {
	id: string;
	name: string;
	description?: string;
	permissionIds: string[];
	isSystem: boolean;
	createdAt?: Date;
	updatedAt?: Date;
};

const roleSchema = new Schema<RoleDocument>(
	{
		name: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},
		description: {
			type: String,
			required: false,
		},
		permissionIds: {
			type: [String],
			required: true,
			default: [],
		},
		isSystem: {
			type: Boolean,
			required: true,
			default: false,
		},
	},
	{
		timestamps: true,
		versionKey: false,
	},
);

export const RoleModel =
	(mongoose.models.Role as Model<RoleDocument> | undefined) ??
	mongoose.model<RoleDocument>("Role", roleSchema);
