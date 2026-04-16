import type { Request, Response } from "express";
import { NotFoundError } from "../../utils/index.js";
import { requireStringValue } from "../rbac/rbac.http.js";
import { PermissionService } from "../rbac/rbac.service.js";

export const listPermissionsController = async (
	_req: Request,
	res: Response,
): Promise<void> => {
	res.json({
		ok: true,
		permissions: PermissionService.findAll(),
	});
};

export const getPermissionController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const permissionId = requireStringValue(
		req.params.permissionId,
		"permissionId",
	);
	const permission = PermissionService.findById(permissionId);

	if (!permission) {
		throw new NotFoundError("Permission");
	}

	res.json({
		ok: true,
		permission,
	});
};
