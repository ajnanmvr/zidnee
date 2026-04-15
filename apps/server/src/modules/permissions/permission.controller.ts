import type { Request, Response } from "express";
import { CreatePermissionPayloadSchema } from "@repo/schema";
import {
	ConflictError,
	NotFoundError,
	ValidationError,
} from "../../utils/index.js";
import { PermissionService } from "../rbac/rbac.service.js";
import { requireStringValue } from "../rbac/rbac.http.js";

export const createPermissionController = async (
	_req: Request,
	res: Response
): Promise<void> => {
	const result = CreatePermissionPayloadSchema.safeParse(_req.body);
	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	const existingPermissions = PermissionService.findAll();
	if (
		existingPermissions.some(
			(permission) =>
				permission.resource === result.data.resource &&
				permission.action === result.data.action
		)
	) {
		throw new ConflictError(
			`Permission for ${result.data.resource}:${result.data.action} already exists`
		);
	}

	const permission = PermissionService.create({
		name: result.data.name,
		description: result.data.description,
		resource: result.data.resource,
		action: result.data.action,
	});

	res.status(201).json({
		ok: true,
		permission,
	});
};

export const listPermissionsController = async (
	_req: Request,
	res: Response
): Promise<void> => {
	res.json({
		ok: true,
		permissions: PermissionService.findAll(),
	});
};

export const getPermissionController = async (
	req: Request,
	res: Response
): Promise<void> => {
	const permissionId = requireStringValue(req.params.permissionId, "permissionId");
	const permission = PermissionService.findById(permissionId);

	if (!permission) {
		throw new NotFoundError("Permission");
	}

	res.json({
		ok: true,
		permission,
	});
};

export const deletePermissionController = async (
	req: Request,
	res: Response
): Promise<void> => {
	const permissionId = requireStringValue(req.params.permissionId, "permissionId");
	const permission = PermissionService.findById(permissionId);

	if (!permission) {
		throw new NotFoundError("Permission");
	}

	const deleted = PermissionService.delete(permissionId);
	if (!deleted) {
		throw new Error("Failed to delete permission");
	}

	res.json({
		ok: true,
		message: "Permission deleted successfully",
	});
};
