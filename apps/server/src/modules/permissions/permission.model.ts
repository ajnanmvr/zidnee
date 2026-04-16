import type { PermissionKey } from "@repo/schema";
import mongoose, { type Model, Schema } from "mongoose";

export type PermissionDocument = {
	id: string;
	key: PermissionKey;
	name: string;
	description?: string;
	resource: string;
	action: string;
	createdAt?: Date;
	updatedAt?: Date;
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
