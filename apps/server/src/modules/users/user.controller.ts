import {
	AdminChangePasswordPayloadSchema,
	CreateCounsellorPayloadSchema,
	CreateMentorPayloadSchema,
	ChangePasswordPayloadSchema,
	CreateUserPayloadSchema,
	SetUserStatusPayloadSchema,
	UpdateUserPayloadSchema,
} from "@repo/schema";
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import {
	AuthenticationError,
	ConflictError,
	NotFoundError,
	ValidationError,
} from "../../utils/index.js";
import { hashPassword, verifyPassword } from "../auth/auth.password.js";
import { requireStringValue } from "../rbac/rbac.http.js";
import {
	getUserWithRelations,
	RoleService,
	UserService,
} from "../rbac/rbac.service.js";
import {
	buildSequentialIdentity,
	USER_IDENTITY_PREFIXES,
} from "./user.identity.js";

const ensureRoleIdsExist = async (roleIds: string[]): Promise<void> => {
	for (const roleId of roleIds) {
		if (!(await RoleService.findById(roleId))) {
			throw new ValidationError({
				roleIds: [`Role ${roleId} not found`],
			});
		}
	}
};

const sanitizeSlug = (value: string): string =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 32) || "mentor";

const findRoleByName = async (roleName: string) => {
	return (await RoleService.findAll()).find((role) => role.name === roleName) ?? null;
};

const nextIdentity = async (kind: keyof typeof USER_IDENTITY_PREFIXES) => {
	const users = await UserService.findAll();
	const existingIds = users.map((user) =>
		kind === "mentor" ? user.mentorId : user.counsellorId,
	);

	return buildSequentialIdentity(USER_IDENTITY_PREFIXES[kind], existingIds);
};

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

	const roleIds = result.data.roleIds ?? [];
	if (roleIds.length > 0) {
		await ensureRoleIdsExist(roleIds);
	} else {
		const defaultRole = (await RoleService.findAll()).find(
			(role) => role.name === "User",
		);

		if (!defaultRole) {
			throw new NotFoundError("Default user role");
		}

		roleIds.push(defaultRole.id);
	}

	const password = await hashPassword(result.data.password);
	const createdUser = await UserService.create({
		username: result.data.username,
		email: result.data.email,
		password,
		name: result.data.name,
		roleIds,
		isActive: true,
	});

	res.status(201).json({
		ok: true,
		...(await getUserWithRelations(createdUser)),
	});
};

export const createMentorController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const result = CreateMentorPayloadSchema.safeParse(req.body);

	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	const mentorRole = await findRoleByName("Mentor");
	if (!mentorRole) {
		throw new NotFoundError("Mentor role");
	}

	if (result.data.counsellorId) {
		const counsellor = await UserService.findById(result.data.counsellorId);
		if (!counsellor) {
			throw new NotFoundError("Counsellor");
		}

		const counsellorRole = await findRoleByName("Counsellor");

		const isCounsellor = counsellorRole
			? counsellor.roleIds.some((roleId) => roleId === counsellorRole.id)
			: false;
		if (!isCounsellor) {
			throw new ValidationError({
				counsellorId: ["Selected user is not a counsellor"],
			});
		}
	}

	const slug = sanitizeSlug(result.data.name);
	const mentorId = await nextIdentity("mentor");
	const username = `${mentorId}-${slug}`;
	const email = `${username}@zidnee.local`;
	const password = randomUUID();

	const hashedPassword = await hashPassword(password);
	const createdUser = await UserService.create({
		username,
		email,
		password: hashedPassword,
		name: result.data.name,
		mentorId,
		counsellorId: result.data.counsellorId,
		roleIds: [mentorRole.id],
		isActive: true,
	});

	res.status(201).json({
		ok: true,
		...(await getUserWithRelations(createdUser)),
	});
};

export const createCounsellorController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const result = CreateCounsellorPayloadSchema.safeParse(req.body);

	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	const counsellorRole = await findRoleByName("Counsellor");
	if (!counsellorRole) {
		throw new NotFoundError("Counsellor role");
	}

	const slug = sanitizeSlug(result.data.name);
	const counsellorId = await nextIdentity("counsellor");
	const username = `${counsellorId}-${slug}`;
	const email = `${username}@zidnee.local`;
	const password = randomUUID();

	const hashedPassword = await hashPassword(password);
	const createdUser = await UserService.create({
		username,
		email,
		password: hashedPassword,
		name: result.data.name,
		counsellorId,
		roleIds: [counsellorRole.id],
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

export const updateUserController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const userId = requireStringValue(req.params.userId, "userId");
	const result = UpdateUserPayloadSchema.safeParse(req.body);

	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	const existingUser = await UserService.findById(userId);
	if (!existingUser) {
		throw new NotFoundError("User");
	}

	if (result.data.email) {
		const existingByEmail = await UserService.findByEmail(result.data.email);
		if (existingByEmail && existingByEmail.id !== userId) {
			throw new ConflictError("Email already in use");
		}
	}

	if (result.data.username) {
		const existingByUsername = await UserService.findByUsername(
			result.data.username,
		);
		if (existingByUsername && existingByUsername.id !== userId) {
			throw new ConflictError("Username already in use");
		}
	}

	if (result.data.roleIds) {
		await ensureRoleIdsExist(result.data.roleIds);
	}

	const updatedUser = await UserService.update(userId, {
		username: result.data.username,
		email: result.data.email,
		name: result.data.name,
		roleIds: result.data.roleIds,
	});

	if (!updatedUser) {
		throw new Error("Failed to update user");
	}

	res.json({
		ok: true,
		...(await getUserWithRelations(updatedUser)),
	});
};

export const setUserStatusController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const userId = requireStringValue(req.params.userId, "userId");
	const result = SetUserStatusPayloadSchema.safeParse(req.body);

	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	const existingUser = await UserService.findById(userId);
	if (!existingUser) {
		throw new NotFoundError("User");
	}

	const updatedUser = await UserService.update(userId, {
		isActive: result.data.isActive,
	});

	if (!updatedUser) {
		throw new Error("Failed to update user status");
	}

	res.json({
		ok: true,
		...(await getUserWithRelations(updatedUser)),
	});
};

export const changeUserPasswordController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const userId = requireStringValue(req.params.userId, "userId");
	const result = AdminChangePasswordPayloadSchema.safeParse(req.body);

	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	const existingUser = await UserService.findById(userId);
	if (!existingUser) {
		throw new NotFoundError("User");
	}

	const hashed = await hashPassword(result.data.newPassword);
	const updatedUser = await UserService.update(userId, {
		password: hashed,
	});

	if (!updatedUser) {
		throw new Error("Failed to update user password");
	}

	res.json({
		ok: true,
		message: "Password updated successfully",
	});
};

export const changeMyPasswordController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const actorId = req.user?.userId;
	if (!actorId) {
		throw new AuthenticationError("User not authenticated");
	}

	const result = ChangePasswordPayloadSchema.safeParse(req.body);
	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	const user = await UserService.findById(actorId);
	if (!user) {
		throw new NotFoundError("User");
	}

	const validPassword = await verifyPassword(
		result.data.currentPassword,
		user.password,
	);
	if (!validPassword) {
		throw new ValidationError({
			currentPassword: ["Current password is incorrect"],
		});
	}

	const hashed = await hashPassword(result.data.newPassword);
	const updatedUser = await UserService.update(actorId, {
		password: hashed,
	});

	if (!updatedUser) {
		throw new Error("Failed to update your password");
	}

	res.json({
		ok: true,
		message: "Password updated successfully",
	});
};

export const deleteUserController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const userId = requireStringValue(req.params.userId, "userId");
	const existingUser = await UserService.findById(userId);

	if (!existingUser) {
		throw new NotFoundError("User");
	}

	if (req.user?.userId === userId) {
		throw new ValidationError({
			userId: ["You cannot delete your own account"],
		});
	}

	const deleted = await UserService.delete(userId);
	if (!deleted) {
		throw new Error("Failed to delete user");
	}

	res.json({
		ok: true,
		message: "User deleted successfully",
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
