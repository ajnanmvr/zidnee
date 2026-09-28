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
import { AUTH_CONSTANTS } from "@repo/schema";
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
	resolveUserZid,
	USER_IDENTITY_PREFIXES,
	withUserZidGuard,
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

type UserZidKind = "mentor" | "counsellor" | "sales" | "admin";

const isUserZidKind = (value: unknown): value is UserZidKind =>
	value === "mentor" ||
	value === "counsellor" ||
	value === "sales" ||
	value === "admin";

// Group mentors use ZMG; every other kind has a fixed prefix.
const zidPrefixForKind = (
	kind: string,
	mentorType: "individual" | "group" = "individual",
): string => {
	if (kind === "mentor") {
		return mentorType === "group"
			? USER_IDENTITY_PREFIXES.groupMentor
			: USER_IDENTITY_PREFIXES.mentor;
	}
	return isUserZidKind(kind) ? USER_IDENTITY_PREFIXES[kind] : kind.toUpperCase();
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
	// Generate (or take the manually typed) ZID for each role type present
	const zids: Record<string, string> = {};
	const zidEntries: Array<{ kind: string; prefix: string; field: string; zid: string }> = [];
	const allRoles = await RoleService.findByIds(roleIds);
	for (const role of allRoles) {
		if (!isUserZidKind(role.type) || zids[role.type]) continue;
		const prefix = zidPrefixForKind(role.type);
		const field = `zids.${role.type}`;
		const zid = await resolveUserZid({
			prefix,
			field,
			manual: result.data.zids?.[role.type],
		});
		zids[role.type] = zid;
		zidEntries.push({ kind: role.type, prefix, field, zid });
	}

	const createdUser = await withUserZidGuard(
		() =>
			UserService.create({
				username: result.data.username,
				email: normalizedEmail,
				password,
				name: result.data.name,
				gender: result.data.gender,
				roleIds,
				zids,
				// populate legacy mentorId for compatibility when generated
				mentorId: zids.mentor,
				isActive: true,
			}),
		zidEntries,
	);

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
	const mentorPrefix = zidPrefixForKind("mentor", isGroupMentor ? "group" : "individual");
	const mentorId = await resolveUserZid({
		prefix: mentorPrefix,
		field: "zid",
		manual: result.data.zid,
	});

	const username = result.data.username || mentorId;
	const email = `${username}@${AUTH_CONSTANTS.emailDomain}`;
	// For quick mentor creation, use a predictable initial password: mentorId repeated twice
	const password = `${mentorId}${mentorId}`;

	const hashedPassword = await hashPassword(password);
	const zids: Record<string, string> = { mentor: mentorId };

	const createdUser = await withUserZidGuard(
		() =>
			UserService.create({
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
			}),
		[{ kind: "mentor", prefix: mentorPrefix, field: "zid", zid: mentorId }],
	);

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

	const counsellorPrefix = zidPrefixForKind("counsellor");
	const counsellorId = await resolveUserZid({
		prefix: counsellorPrefix,
		field: "zid",
		manual: result.data.zid,
	});
	const username = result.data.username || counsellorId;
	const email = `${username}@${AUTH_CONSTANTS.emailDomain}`;
	const password = randomUUID();

	const hashedPassword = await hashPassword(password);
	const zids: Record<string, string> = { counsellor: counsellorId };

	const createdUser = await withUserZidGuard(
		() =>
			UserService.create({
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
			}),
		[{ kind: "counsellor", prefix: counsellorPrefix, field: "zid", zid: counsellorId }],
	);

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

	const targetMentorType = result.data.mentorType ?? existingMentorType;
	const zidsToSet: Record<string, string> = {
		...((existingUser as { zids?: Record<string, string> }).zids ?? {}),
	};
	const zidEntries: Array<{ kind: string; prefix: string; field: string; zid: string }> = [];

	// Explicitly provided ZIDs (manual correction, or the user's answer to a
	// conflict) win over generation, but must not belong to another user.
	const manualZids = result.data.zids ?? {};
	for (const [kind, value] of Object.entries(manualZids)) {
		const prefix = zidPrefixForKind(kind, targetMentorType);
		const field = `zids.${kind}`;
		zidsToSet[kind] = await resolveUserZid({
			prefix,
			field,
			manual: value,
			excludeUserId: userId,
		});
		zidEntries.push({ kind, prefix, field, zid: zidsToSet[kind] });
	}

	// Generate ZIDs for newly added role types, and a new mentor ZID when the
	// mentor type changes (ZM0 ↔ ZMG).
	const kindsToGenerate = new Set<string>();
	if (result.data.roleIds) {
		const incomingRoles = await RoleService.findByIds(result.data.roleIds);
		for (const role of incomingRoles) {
			if (isUserZidKind(role.type) && !zidsToSet[role.type]) {
				kindsToGenerate.add(role.type);
			}
		}
	}
	if (result.data.mentorType && result.data.mentorType !== existingMentorType) {
		kindsToGenerate.add("mentor");
	}
	for (const kind of kindsToGenerate) {
		if (manualZids[kind]) continue;
		const prefix = zidPrefixForKind(kind, targetMentorType);
		const field = `zids.${kind}`;
		zidsToSet[kind] = await resolveUserZid({ prefix, field, excludeUserId: userId });
		zidEntries.push({ kind, prefix, field, zid: zidsToSet[kind] });
	}

	const updatedUser = await withUserZidGuard(
		() =>
			UserService.update(userId, {
				username: result.data.username,
				email: normalizedEmail,
				name: result.data.name,
				mentorType: result.data.mentorType,
				roleIds: result.data.roleIds,
				counsellorId: result.data.counsellorId,
				zids: zidsToSet,
				// Keep legacy mentorId in sync with zids.mentor so display logic stays consistent
				...(zidsToSet.mentor ? { mentorId: zidsToSet.mentor } : {}),
			} as any),
		zidEntries,
	);

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
	const roleType = role.type;
	if (isUserZidKind(roleType)) {
		const currentZids = (updatedUser as any).zids ?? {};
		if (!currentZids[roleType]) {
			currentZids[roleType] = await resolveUserZid({
				prefix: zidPrefixForKind(roleType, updatedUser.mentorType ?? "individual"),
				field: "zid",
				manual: typeof req.body.zid === "string" ? req.body.zid : undefined,
				excludeUserId: userId,
			});
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
