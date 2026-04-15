import { CreateRolePayloadSchema, UpdateRolePayloadSchema } from "@repo/schema";
import type { Request, Response } from "express";
import {
	ConflictError,
	NotFoundError,
	ValidationError,
} from "../../utils/index.js";
import { requireStringValue } from "../rbac/rbac.http.js";
import {
	getRoleWithPermissions,
	PermissionService,
	RoleService,
} from "../rbac/rbac.service.js";

const ensurePermissionIdsExist = (permissionIds: string[]): void => {
	for (const permissionId of permissionIds) {
		if (!PermissionService.findById(permissionId)) {
			throw new ValidationError({
				permissionIds: [`Permission ${permissionId} not found`],
			});
		}
	}
};

export const createRoleController = async (
	_req: Request,
	res: Response,
): Promise<void> => {
	const result = CreateRolePayloadSchema.safeParse(_req.body);
	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	const existingRoles = RoleService.findAll();
	if (existingRoles.some((role) => role.name === result.data.name)) {
		throw new ConflictError("Role with this name already exists");
	}

	ensurePermissionIdsExist(result.data.permissionIds);

	const role = RoleService.create({
		name: result.data.name,
		description: result.data.description,
		permissionIds: result.data.permissionIds,
		isSystem: false,
	});

	res.status(201).json({
		ok: true,
		role: getRoleWithPermissions(role),
	});
};

export const listRolesController = async (
	_req: Request,
	res: Response,
): Promise<void> => {
	res.json({
		ok: true,
		roles: RoleService.findAll().map(getRoleWithPermissions),
	});
};

export const getRoleController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const roleId = requireStringValue(req.params.roleId, "roleId");
	const role = RoleService.findById(roleId);

	if (!role) {
		throw new NotFoundError("Role");
	}

	res.json({
		ok: true,
		role: getRoleWithPermissions(role),
	});
};

export const updateRoleController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const roleId = requireStringValue(req.params.roleId, "roleId");
	const result = UpdateRolePayloadSchema.safeParse(req.body);

	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	const role = RoleService.findById(roleId);
	if (!role) {
		throw new NotFoundError("Role");
	}

	if (role.isSystem) {
		throw new ValidationError({
			roleId: ["Cannot update system roles"],
		});
	}

	if (result.data.name) {
		const existingRoles = RoleService.findAll();
		if (
			existingRoles.some(
				(existingRole) =>
					existingRole.name === result.data.name && existingRole.id !== roleId,
			)
		) {
			throw new ConflictError("Role with this name already exists");
		}
	}

	if (result.data.permissionIds) {
		ensurePermissionIdsExist(result.data.permissionIds);
	}

	const updatedRole = RoleService.update(roleId, result.data);
	if (!updatedRole) {
		throw new Error("Failed to update role");
	}

	res.json({
		ok: true,
		role: getRoleWithPermissions(updatedRole),
	});
};

export const deleteRoleController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const roleId = requireStringValue(req.params.roleId, "roleId");
	const role = RoleService.findById(roleId);

	if (!role) {
		throw new NotFoundError("Role");
	}

	if (role.isSystem) {
		throw new ValidationError({
			roleId: ["Cannot delete system roles"],
		});
	}

	const deleted = RoleService.delete(roleId);
	if (!deleted) {
		throw new Error("Failed to delete role");
	}

	res.json({
		ok: true,
		message: "Role deleted successfully",
	});
};
