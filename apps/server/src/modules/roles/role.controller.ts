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

const ensurePermissionIdsExist = async (
	permissionIds: string[],
): Promise<void> => {
	for (const permissionId of permissionIds) {
		if (!(await PermissionService.findById(permissionId))) {
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

	const existingRoles = await RoleService.findAll();
	if (existingRoles.some((role) => role.name === result.data.name)) {
		throw new ConflictError("Role with this name already exists");
	}

	await ensurePermissionIdsExist(result.data.permissionIds);

	const role = await RoleService.create({
		name: result.data.name,
		type: result.data.type ?? "general",
		description: result.data.description,
		permissionIds: result.data.permissionIds,
		isSystem: false,
	});

	res.status(201).json({
		ok: true,
		role: await getRoleWithPermissions(role),
	});
};

export const listRolesController = async (
	_req: Request,
	res: Response,
): Promise<void> => {
	const roles = await RoleService.findAll();
	const rolesWithPermissions = await Promise.all(
		roles.map((role) => getRoleWithPermissions(role)),
	);

	res.json({
		ok: true,
		roles: rolesWithPermissions,
	});
};

export const getRoleController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const roleId = requireStringValue(req.params.roleId, "roleId");
	const role = await RoleService.findById(roleId);

	if (!role) {
		throw new NotFoundError("Role");
	}

	res.json({
		ok: true,
		role: await getRoleWithPermissions(role),
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

	const role = await RoleService.findById(roleId);
	if (!role) {
		throw new NotFoundError("Role");
	}

	if (role.isSystem) {
		throw new ValidationError({
			roleId: ["Cannot update system roles"],
		});
	}

	if (result.data.name) {
		const existingRoles = await RoleService.findAll();
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
		await ensurePermissionIdsExist(result.data.permissionIds);
	}

	const updatedRole = await RoleService.update(roleId, result.data);
	if (!updatedRole) {
		throw new Error("Failed to update role");
	}

	res.json({
		ok: true,
		role: await getRoleWithPermissions(updatedRole),
	});
};

export const deleteRoleController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const roleId = requireStringValue(req.params.roleId, "roleId");
	const role = await RoleService.findById(roleId);

	if (!role) {
		throw new NotFoundError("Role");
	}

	if (role.isSystem) {
		throw new ValidationError({
			roleId: ["Cannot delete system roles"],
		});
	}

	const deleted = await RoleService.delete(roleId);
	if (!deleted) {
		throw new Error("Failed to delete role");
	}

	res.json({
		ok: true,
		message: "Role deleted successfully",
	});
};
