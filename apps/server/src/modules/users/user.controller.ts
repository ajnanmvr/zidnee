import type { Request, Response } from "express";
import {
	NotFoundError,
} from "../../utils/index.js";
import {
	RoleService,
	UserService,
	getUserWithRelations,
} from "../rbac/rbac.service.js";
import { requireStringValue } from "../rbac/rbac.http.js";

export const listUsersController = async (
	_req: Request,
	res: Response
): Promise<void> => {
	res.json({
		ok: true,
		users: UserService.findAll().map(getUserWithRelations),
	});
};

export const getUserController = async (
	req: Request,
	res: Response
): Promise<void> => {
	const userId = requireStringValue(req.params.userId, "userId");
	const user = UserService.findById(userId);

	if (!user) {
		throw new NotFoundError("User");
	}

	res.json({
		ok: true,
		...getUserWithRelations(user),
	});
};

export const assignRoleController = async (
	req: Request,
	res: Response
): Promise<void> => {
	const userId = requireStringValue(req.params.userId, "userId");
	const roleId = requireStringValue(req.body.roleId, "roleId");

	const user = UserService.findById(userId);
	if (!user) {
		throw new NotFoundError("User");
	}

	const role = RoleService.findById(roleId);
	if (!role) {
		throw new NotFoundError("Role");
	}

	const updatedUser = UserService.addRole(userId, roleId);
	if (!updatedUser) {
		throw new Error("Failed to assign role");
	}

	res.json({
		ok: true,
		...getUserWithRelations(updatedUser),
	});
};

export const removeRoleController = async (
	req: Request,
	res: Response
): Promise<void> => {
	const userId = requireStringValue(req.params.userId, "userId");
	const roleId = requireStringValue(req.body.roleId, "roleId");

	const user = UserService.findById(userId);
	if (!user) {
		throw new NotFoundError("User");
	}

	const updatedUser = UserService.removeRole(userId, roleId);
	if (!updatedUser) {
		throw new Error("Failed to remove role");
	}

	res.json({
		ok: true,
		...getUserWithRelations(updatedUser),
	});
};
