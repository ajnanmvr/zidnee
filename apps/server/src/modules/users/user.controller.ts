import { randomUUID } from "node:crypto";
import {
	AdminChangePasswordPayloadSchema,
	ChangePasswordPayloadSchema,
	CreateCounsellorPayloadSchema,
	CreateMentorPayloadSchema,
	CreateUserPayloadSchema,
	SetUserStatusPayloadSchema,
	UpdateUserPayloadSchema,
} from "@repo/schema";
import { AUTH_CONSTANTS, ZID_CONSTANTS } from "@repo/schema";
import type { Request, Response } from "express";
import {
	AuthenticationError,
	AuthorizationError,
	ConflictError,
	NotFoundError,
	ValidationError,
} from "../../utils/index.js";
import { hashPassword, verifyPassword } from "../auth/auth.password.js";
import { requireStringValue } from "../rbac/rbac.http.js";
import {
	getEffectivePermissions,
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

const findRoleByName = async (roleName: string) => {
	return (
		(await RoleService.findAll()).find((role) => role.name === roleName) ?? null
	);
};

const findRoleByType = async (
	roleType: "admin" | "mentor" | "counsellor" | "sales",
) => {
	return (
		(await RoleService.findAll()).find((role) => role.type === roleType) ?? null
	);
};

// Multiple roles can share the same `type` (e.g. custom roles like
// "Operation Manager" alongside the seeded "Counsellor" role both have
// type "counsellor"). Use this when checking/listing "is this user a
// counsellor/mentor/etc." so custom roles of that type are included too.
const findRoleIdsByType = async (
	roleType: "admin" | "mentor" | "counsellor" | "sales",
): Promise<string[]> => {
	return (await RoleService.findAll())
		.filter((role) => role.type === roleType)
		.map((role) => role.id);
};

const nextIdentity = async (kind: keyof typeof USER_IDENTITY_PREFIXES) => {
	const users = await UserService.findAll();
	// Include both zids.[kind] and username so legacy users (whose ZID is only in username) are counted
	const existingIds = users.flatMap((user) => [
		(user as any).zids?.[kind],
		user.username,
	]);

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

	const normalizedEmail = result.data.email?.trim() || undefined;

	if (normalizedEmail) {
		const existingByEmail = await UserService.findByEmail(normalizedEmail);
		if (existingByEmail) {
			throw new ConflictError("Email already in use");
		}
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
	// Generate ZIDs for any role types present
	const zids: Record<string, string> = {};
	const allRoles = await RoleService.findByIds(roleIds);
	for (const role of allRoles) {
		const type = role.type as keyof typeof USER_IDENTITY_PREFIXES | undefined;
		if (type && USER_IDENTITY_PREFIXES[type]) {
			zids[type] = await nextIdentity(type as any);
		}
	}

	const createdUser = await UserService.create({
		username: result.data.username,
		email: normalizedEmail,
		password,
		name: result.data.name,
		gender: result.data.gender,
		roleIds,
		zids,
		// populate legacy mentorId for compatibility when generated
		mentorId: (zids as any).mentor,
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

	if (result.data.username) {
		const existingByUsername = await UserService.findByUsername(
			result.data.username,
		);
		if (existingByUsername) {
			throw new ConflictError("Username already in use");
		}
	}

	const mentorRole = await findRoleByType("mentor");
	if (!mentorRole) {
		throw new NotFoundError("Mentor role");
	}

	if (result.data.counsellorId) {
		const counsellor = await UserService.findById(result.data.counsellorId);
		if (!counsellor) {
			throw new NotFoundError("Counsellor");
		}

		const counsellorRoleIds = await findRoleIdsByType("counsellor");
		const isCounsellor = counsellor.roleIds.some((roleId) =>
			counsellorRoleIds.includes(roleId),
		);
		if (!isCounsellor) {
			throw new ValidationError({
				counsellorId: ["Selected user is not a counsellor"],
			});
		}
	}

	const mentorType = result.data.mentorType ?? "individual";
	const isGroupMentor = mentorType === "group";

	// Group mentors get ZMG prefix; individual mentors get ZM0 prefix
	let mentorId: string;
	if (isGroupMentor) {
		const users = await UserService.findAll();
		const existingIds = users.flatMap((u) => [(u as any).zids?.mentor, u.username]);
		mentorId = buildSequentialIdentity(ZID_CONSTANTS.prefixes.groupMentor, existingIds);
	} else {
		mentorId = await nextIdentity("mentor");
	}

	const username = result.data.username || mentorId;
	const email = `${username}@${AUTH_CONSTANTS.emailDomain}`;
	// For quick mentor creation, use a predictable initial password: mentorId repeated twice
	const password = `${mentorId}${mentorId}`;

	const hashedPassword = await hashPassword(password);
	const zids: Record<string, string> = { mentor: mentorId };

	const createdUser = await UserService.create({
		username,
		email,
		password: hashedPassword,
		name: result.data.name,
		gender: result.data.gender,
		roleIds: [mentorRole.id],
		zids,
		mentorType,
		// legacy field for compatibility
		mentorId,
		counsellorId: result.data.counsellorId,
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

	if (result.data.username) {
		const existingByUsername = await UserService.findByUsername(
			result.data.username,
		);
		if (existingByUsername) {
			throw new ConflictError("Username already in use");
		}
	}

	const counsellorRole = await findRoleByType("counsellor");
	if (!counsellorRole) {
		throw new NotFoundError("Counsellor role");
	}

	const counsellorId = await nextIdentity("counsellor");
	const username = result.data.username || counsellorId;
	const email = `${username}@${AUTH_CONSTANTS.emailDomain}`;
	const password = randomUUID();

	const hashedPassword = await hashPassword(password);
	const zids: Record<string, string> = { counsellor: counsellorId };

	const createdUser = await UserService.create({
		username,
		email,
		password: hashedPassword,
		name: result.data.name,
		gender: result.data.gender,
		roleIds: [counsellorRole.id],
		zids,
		// legacy field for compatibility
		counsellorId,
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

export const listMentorsController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	if (!req.user) {
		throw new AuthenticationError("User not authenticated");
	}

	const mentorRoleIds = await findRoleIdsByType("mentor");
	if (mentorRoleIds.length === 0) {
		res.json({ ok: true, users: [] });
		return;
	}

	const effectivePermissions = await getEffectivePermissions(req.user.roleIds);
	const permissionKeys = new Set(
		effectivePermissions.map((permission) => permission.key),
	);
	const hasReadAll =
		permissionKeys.has("MENTOR_READ_ALL") ||
		permissionKeys.has("MENTOR_READ") ||
		permissionKeys.has("USER_READ") ||
		permissionKeys.has("LEAD_ASSIGN") ||
		permissionKeys.has("LEAD_DEMO_ASSIGN");
	const hasReadMy = hasReadAll || permissionKeys.has("MENTOR_READ_MY");

	const scope = req.query.scope === "mine" ? "mine" : "all";

	if (scope === "all" && !hasReadAll) {
		throw new AuthorizationError("Insufficient permissions to view all mentors");
	}
	if (scope === "mine" && !hasReadMy) {
		throw new AuthorizationError("Insufficient permissions to view your mentors");
	}

	const users = await UserService.findAll();
	let mentors = users.filter((user) =>
		(user.roleIds ?? []).some((roleId) => mentorRoleIds.includes(roleId)),
	);

	if (scope === "mine") {
		mentors = mentors.filter((user) => user.counsellorId === req.user!.userId);
	}

	const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
	if (search) {
		mentors = mentors.filter((user) => {
			const zmId = ((user as any).zids?.mentor ?? (user as any).mentorId ?? "") as string;
			return [user.name ?? "", user.username ?? "", user.email ?? "", zmId]
				.join(" ")
				.toLowerCase()
				.includes(search);
		});
	}

	const usersWithRelations = await Promise.all(
		mentors.map((user) => getUserWithRelations(user)),
	);

	res.json({
		ok: true,
		users: usersWithRelations,
	});
};

export const listCounsellorsController = async (
	_req: Request,
	res: Response,
): Promise<void> => {
	const counsellorRoleIds = await findRoleIdsByType("counsellor");
	if (counsellorRoleIds.length === 0) {
		res.json({ ok: true, users: [] });
		return;
	}

	const users = await UserService.findAll();
	const counsellors = users.filter((user) =>
		(user.roleIds ?? []).some((roleId) => counsellorRoleIds.includes(roleId)),
	);
	const usersWithRelations = await Promise.all(
		counsellors.map((user) => getUserWithRelations(user)),
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

	const normalizedEmail = result.data.email?.trim() || undefined;

	const existingUser = await UserService.findById(userId);
	if (!existingUser) {
		throw new NotFoundError("User");
	}

	if (normalizedEmail) {
		const existingByEmail = await UserService.findByEmail(normalizedEmail);
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

	const existingMentorType = existingUser.mentorType ?? "individual";

	if (result.data.counsellorId) {
		const counsellor = await UserService.findById(result.data.counsellorId);
		if (!counsellor) {
			throw new NotFoundError("Counsellor");
		}

		const counsellorRoleIds = await findRoleIdsByType("counsellor");
		const isCounsellor = counsellor.roleIds.some((roleId) =>
			counsellorRoleIds.includes(roleId),
		);
		if (!isCounsellor) {
			throw new ValidationError({
				counsellorId: ["Selected user is not a counsellor"],
			});
		}

		const mentorRoleIds = await findRoleIdsByType("mentor");
		const isMentor = (result.data.roleIds ?? existingUser.roleIds).some(
			(roleId) => mentorRoleIds.includes(roleId),
		);
		if (!isMentor) {
			throw new ValidationError({
				counsellorId: ["Counsellor can only be assigned to mentor accounts"],
			});
		}
	}

	// If roles were provided, ensure missing ZIDs are generated for newly added role types
	const zidsToSet = (existingUser as any).zids ?? {};
	if (result.data.roleIds) {
		const incomingRoles = await RoleService.findByIds(result.data.roleIds);
		for (const role of incomingRoles) {
			const t = role.type as keyof typeof USER_IDENTITY_PREFIXES | undefined;
			if (t && !(zidsToSet as any)[t]) {
				(zidsToSet as any)[t] = await nextIdentity(t as any);
			}
		}
	}
	if (result.data.mentorType && result.data.mentorType !== existingMentorType) {
		if (result.data.mentorType === "group") {
			const users = await UserService.findAll();
			const existingIds = users.flatMap((user) => [(user as any).zids?.mentor, user.username]);
			zidsToSet.mentor = buildSequentialIdentity(ZID_CONSTANTS.prefixes.groupMentor, existingIds);
		} else {
			zidsToSet.mentor = await nextIdentity("mentor");
		}
	}
	// Allow explicitly provided ZIDs to override auto-generated values (e.g. manual ZM number correction)
	if (result.data.zids) {
		Object.assign(zidsToSet, result.data.zids);
	}

	const updatedUser = await UserService.update(userId, {
		username: result.data.username,
		email: normalizedEmail,
		name: result.data.name,
		mentorType: result.data.mentorType,
		roleIds: result.data.roleIds,
		counsellorId: result.data.counsellorId,
		zids: zidsToSet,
		// Keep legacy mentorId in sync with zids.mentor so display logic stays consistent
		...(zidsToSet.mentor ? { mentorId: zidsToSet.mentor } : {}),
	} as any);

	if (!updatedUser) {
		throw new Error("Failed to update user");
	}

	res.json({
		ok: true,
		...(await getUserWithRelations(updatedUser)),
	});
};

export const assignUserCounsellorController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const userId = requireStringValue(req.params.userId, "userId");
	const result = UpdateUserPayloadSchema.pick({ counsellorId: true }).safeParse(
		req.body,
	);

	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	const mentorRoleIds = await findRoleIdsByType("mentor");
	if (mentorRoleIds.length === 0) {
		throw new NotFoundError("Mentor role");
	}

	const counsellorId = result.data.counsellorId;
	if (!counsellorId) {
		throw new ValidationError({
			counsellorId: ["Counsellor is required"],
		});
	}

	const targetUser = await UserService.findById(userId);
	if (!targetUser) {
		throw new NotFoundError("User");
	}

	const isMentor = targetUser.roleIds.some((roleId) => mentorRoleIds.includes(roleId));
	if (!isMentor) {
		throw new ValidationError({
			counsellorId: ["Counsellor can only be assigned to mentor accounts"],
		});
	}

	const counsellor = await UserService.findById(counsellorId);
	if (!counsellor) {
		throw new NotFoundError("Counsellor");
	}

	const counsellorRoleIds = await findRoleIdsByType("counsellor");
	const isCounsellor = counsellor.roleIds.some((roleId) =>
		counsellorRoleIds.includes(roleId),
	);
	if (!isCounsellor) {
		throw new ValidationError({
			counsellorId: ["Selected user is not a counsellor"],
		});
	}

	const updatedUser = await UserService.update(userId, {
		counsellorId,
	});

	if (!updatedUser) {
		throw new Error("Failed to assign counsellor");
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

	// If the role has an associated ZID type, ensure the user has one
	const roleType = role.type as keyof typeof USER_IDENTITY_PREFIXES | undefined;
	if (roleType && USER_IDENTITY_PREFIXES[roleType]) {
		const currentZids = (updatedUser as any).zids ?? {};
		if (!currentZids[roleType]) {
			currentZids[roleType] = await nextIdentity(roleType as any);
			// keep legacy top-level field for mentor
			const legacy: any = {};
			if (roleType === "mentor") legacy.mentorId = currentZids[roleType];
			if (roleType === "counsellor")
				legacy.counsellorId = currentZids[roleType];
			const final = await UserService.update(userId, {
				...(legacy as any),
				zids: currentZids,
			});
			if (final) {
				res.json({ ok: true, ...(await getUserWithRelations(final)) });
				return;
			}
		}
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
