import type { Permission } from "@repo/schema";
import mongoose, { type Model, Schema, type Types } from "mongoose";

export type PermissionDocument = Omit<Permission, "id"> & {
	_id: Types.ObjectId;
};

const permissionSchema = new Schema<PermissionDocument>(
	{
		key: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},
		name: {
			type: String,
			required: true,
		},
		description: {
			type: String,
			required: false,
		},
		resource: {
			type: String,
			required: true,
		},
		action: {
			type: String,
			required: true,
		},
	},
	{
		timestamps: true,
		versionKey: false,
	},
);

export const PermissionModel =
	(mongoose.models.Permission as Model<PermissionDocument> | undefined) ??
	mongoose.model<PermissionDocument>("Permission", permissionSchema);
