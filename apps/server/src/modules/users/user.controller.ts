import { CreateUserPayloadSchema } from "@repo/schema";
import type { Request, Response } from "express";
import {
	ConflictError,
	NotFoundError,
	ValidationError,
} from "../../utils/index.js";
import { hashPassword } from "../auth/auth.password.js";
import { requireStringValue } from "../rbac/rbac.http.js";
import {
	getUserWithRelations,
	RoleService,
	UserService,
} from "../rbac/rbac.service.js";

export const createUserController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const result = CreateUserPayloadSchema.safeParse(req.body);

	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	const existingByEmail = await UserService.findByEmail(result.data.email);
	if (existingByEmail) {
		throw new ConflictError("Email already in use");
	}

	const existingByUsername = await UserService.findByUsername(
		result.data.username,
	);
	if (existingByUsername) {
		throw new ConflictError("Username already in use");
	}

	const defaultRole = (await RoleService.findAll()).find(
		(role) => role.name === "User",
	);

	if (!defaultRole) {
		throw new NotFoundError("Default user role");
	}

	const password = await hashPassword(result.data.password);
	const createdUser = await UserService.create({
		username: result.data.username,
		email: result.data.email,
		password,
		name: result.data.name,
		roleIds: [defaultRole.id],
		isActive: true,
	});

	res.status(201).json({
		ok: true,
		...(await getUserWithRelations(createdUser)),
	});
};

export const listUsersController = async (
	_req: Request,
	res: Response,
): Promise<void> => {
	const users = await UserService.findAll();
	const usersWithRelations = await Promise.all(
		users.map((user) => getUserWithRelations(user)),
	);

	res.json({
		ok: true,
		users: usersWithRelations,
	});
};

export const getUserController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const userId = requireStringValue(req.params.userId, "userId");
	const user = await UserService.findById(userId);

	if (!user) {
		throw new NotFoundError("User");
	}

	res.json({
		ok: true,
		...(await getUserWithRelations(user)),
	});
};

export const assignRoleController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const userId = requireStringValue(req.params.userId, "userId");
	const roleId = requireStringValue(req.body.roleId, "roleId");

	const user = await UserService.findById(userId);
	if (!user) {
		throw new NotFoundError("User");
	}

	const role = await RoleService.findById(roleId);
	if (!role) {
		throw new NotFoundError("Role");
	}

	const updatedUser = await UserService.addRole(userId, roleId);
	if (!updatedUser) {
		throw new Error("Failed to assign role");
	}

	res.json({
		ok: true,
		...(await getUserWithRelations(updatedUser)),
	});
};

export const removeRoleController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const userId = requireStringValue(req.params.userId, "userId");
	const roleId = requireStringValue(req.body.roleId, "roleId");

	const user = await UserService.findById(userId);
	if (!user) {
		throw new NotFoundError("User");
	}

	const updatedUser = await UserService.removeRole(userId, roleId);
	if (!updatedUser) {
		throw new Error("Failed to remove role");
	}

	res.json({
		ok: true,
		...(await getUserWithRelations(updatedUser)),
	});
};
