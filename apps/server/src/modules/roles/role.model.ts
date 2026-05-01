import type { Role } from "@repo/schema";
import mongoose, { type Model, Schema, type Types } from "mongoose";

export type RoleDocument = Omit<Role, "id"> & {
	_id: Types.ObjectId;
};

const roleSchema = new Schema<RoleDocument>(
	{
		name: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},
		type: {
			type: String,
			enum: ["general", "mentor", "counsellor", "sales"],
			required: true,
			default: "general",
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
