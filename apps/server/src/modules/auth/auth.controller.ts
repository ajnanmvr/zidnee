import { LoginPayloadSchema, RegisterPayloadSchema } from "@repo/schema";
import type { Request, Response } from "express";
import {
	AuthenticationError,
	ConflictError,
	NotFoundError,
	ValidationError,
} from "../../utils/index.js";
import {
	getEffectivePermissionIds,
	getUserWithRelations,
	RoleService,
	toPublicUser,
	UserService,
} from "../rbac/rbac.service.js";
import { hashPassword, verifyPassword } from "./auth.password.js";
import { createToken } from "./auth.token.js";

const createAuthToken = (userId: string, email: string, roleIds: string[]) => {
	return createToken({
		userId,
		email,
		roleIds,
		permissionIds: getEffectivePermissionIds(roleIds),
	});
};

export const loginController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const result = LoginPayloadSchema.safeParse(req.body);

	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	const user = UserService.findByEmail(result.data.email);
	if (!user) {
		throw new AuthenticationError("Invalid email or password");
	}

	const isPasswordValid = await verifyPassword(
		result.data.password,
		user.password,
	);

	if (!isPasswordValid) {
		throw new AuthenticationError("Invalid email or password");
	}

	if (!user.isActive) {
		throw new AuthenticationError("User account is inactive");
	}

	const token = createAuthToken(user.id, user.email, user.roleIds);

	res.json({
		ok: true,
		token,
		user: toPublicUser(user),
	});
};

export const registerController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const result = RegisterPayloadSchema.safeParse(req.body);

	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	// Check if user already exists
	const existingUser = UserService.findByEmail(result.data.email);
	if (existingUser) {
		throw new ConflictError("Email already in use");
	}

	// Hash password
	const hashedPassword = await hashPassword(result.data.password);

	const defaultRole = RoleService.findAll().find(
		(role) => role.name === "User",
	);

	if (!defaultRole) {
		throw new Error("Default user role not found");
	}

	// Create new user
	const newUser = UserService.create({
		email: result.data.email,
		password: hashedPassword,
		name: result.data.name,
		roleIds: [defaultRole.id],
		isActive: true,
	});

	const token = createAuthToken(newUser.id, newUser.email, newUser.roleIds);

	res.status(201).json({
		ok: true,
		token,
		user: toPublicUser(newUser),
	});
};

export const getMeController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	if (!req.user) {
		throw new AuthenticationError("User not authenticated");
	}

	const user = UserService.findById(req.user.userId);
	if (!user) {
		throw new NotFoundError("User");
	}

	res.json({
		ok: true,
		...getUserWithRelations(user),
	});
};
