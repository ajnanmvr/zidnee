import {
	PERMISSION_CATALOG,
	PERMISSION_KEYS,
	type Permission,
	type PermissionKey,
	type Role,
	type User,
} from "@repo/schema";
import {
	type PermissionDocument,
	PermissionModel,
} from "../permissions/permission.model.js";
import { mergePermissions } from "./rbac.permissions.js";
import { type RoleDocument, RoleModel } from "../roles/role.model.js";
import { type UserDocument, UserModel } from "../users/user.model.js";

export type PublicUser = Omit<User, "password">;
export type RoleWithPermissions = Role & { permissions: Permission[] };
export type UserWithRelations = PublicUser & {
	roles: Role[];
	permissions: Permission[];
};

let defaultsInitialized = false;
let defaultsInitPromise: Promise<void> | null = null;

const toPermission = (doc: PermissionDocument): Permission => {
	return {
		id: doc._id.toString(),
		key: doc.key,
		name: doc.name,
		description: doc.description,
		resource: doc.resource,
		action: doc.action,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	};
};

const toRole = (doc: RoleDocument): Role => {
	return {
		id: doc._id.toString(),
		name: doc.name,
		description: doc.description,
		permissionIds: doc.permissionIds,
		isSystem: doc.isSystem,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	};
};

const toUser = (doc: UserDocument): User => {
	return {
		id: doc._id.toString(),
		email: doc.email,
		password: doc.password,
		name: doc.name,
		roleIds: doc.roleIds,
		isActive: doc.isActive,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	};
};

const initializeDefaults = async (): Promise<void> => {
	if (defaultsInitialized) {
		return;
	}

	if (defaultsInitPromise) {
		await defaultsInitPromise;
		return;
	}

	defaultsInitPromise = (async () => {
		for (const key of PERMISSION_KEYS) {
			const seed = PERMISSION_CATALOG[key];
			await PermissionModel.updateOne(
				{ key },
				{
					$set: {
						name: seed.name,
						description: seed.description,
						resource: seed.resource,
						action: seed.action,
					},
					$setOnInsert: { key },
				},
				{ upsert: true },
			);
		}

		const allPermissions = await PermissionModel.find()
			.select("_id action")
			.lean<Pick<PermissionDocument, "_id" | "action">[]>();

		const adminPermissionIds = allPermissions.map(
			(permission) => permission._id.toString(),
		);
		const userPermissionIds = allPermissions
			.filter(
				(permission) =>
					permission.action === "read" || permission.action === "view",
			)
			.map((permission) => permission._id.toString());

		await RoleModel.updateOne(
			{ name: "Admin" },
			{
				$set: {
					description: "Administrator with full access",
					permissionIds: adminPermissionIds,
					isSystem: true,
				},
				$setOnInsert: { name: "Admin" },
			},
			{ upsert: true },
		);

		await RoleModel.updateOne(
			{ name: "User" },
			{
				$set: {
					description: "Default user role with read permissions",
					permissionIds: userPermissionIds,
					isSystem: true,
				},
				$setOnInsert: { name: "User" },
			},
			{ upsert: true },
		);

		defaultsInitialized = true;
	})();

	try {
		await defaultsInitPromise;
	} finally {
		defaultsInitPromise = null;
	}
};

const collectPermissionsByIds = async (
	permissionIds: string[],
): Promise<Permission[]> => {
	if (permissionIds.length === 0) {
		return [];
	}

	const docs = await PermissionModel.find({
		_id: { $in: permissionIds },
	}).lean<
		PermissionDocument[]
	>();
	const byId = new Map(docs.map((doc) => [doc._id.toString(), toPermission(doc)]));

	return permissionIds
		.map((permissionId) => byId.get(permissionId) ?? null)
		.filter((permission): permission is Permission => permission !== null);
};

export const PermissionService = {
	create: async (key: PermissionKey): Promise<Permission> => {
		await initializeDefaults();
		const existingPermission = await PermissionModel.findOne({
			key,
		}).lean<PermissionDocument | null>();
		if (existingPermission) {
			return toPermission(existingPermission);
		}

		const seed = PERMISSION_CATALOG[key];
		const created = await PermissionModel.create({
			key,
			name: seed.name,
			description: seed.description,
			resource: seed.resource,
			action: seed.action,
		});

		return toPermission(created.toObject() as PermissionDocument);
	},

	findById: async (id: string): Promise<Permission | null> => {
		await initializeDefaults();
		const permission = await PermissionModel.findById(id).lean<PermissionDocument | null>();
		return permission ? toPermission(permission) : null;
	},

	findAll: async (): Promise<Permission[]> => {
		await initializeDefaults();
		const permissionDocs =
			await PermissionModel.find().lean<PermissionDocument[]>();
		return permissionDocs.map(toPermission);
	},

	findByIds: async (ids: string[]): Promise<Permission[]> => {
		await initializeDefaults();
		if (ids.length === 0) {
			return [];
		}

		const permissionDocs = await PermissionModel.find({
			_id: { $in: ids },
		}).lean<PermissionDocument[]>();
		const byId = new Map(
			permissionDocs.map((doc) => [doc._id.toString(), toPermission(doc)]),
		);
		return ids
			.map((id) => byId.get(id) ?? null)
			.filter((permission): permission is Permission => permission !== null);
	},

	findByKey: async (key: PermissionKey): Promise<Permission | null> => {
		await initializeDefaults();
		const permission = await PermissionModel.findOne({
			key,
		}).lean<PermissionDocument | null>();
		return permission ? toPermission(permission) : null;
	},

	update: async (
		id: string,
		data: Partial<Permission>,
	): Promise<Permission | null> => {
		void id;
		void data;
		return null;
	},

	delete: async (id: string): Promise<boolean> => {
		void id;
		return false;
	},
};

export const RoleService = {
	create: async (
		role: Omit<Role, "id" | "createdAt" | "updatedAt">,
	): Promise<Role> => {
		await initializeDefaults();
		const created = await RoleModel.create({
			name: role.name,
			description: role.description,
			permissionIds: role.permissionIds,
			isSystem: role.isSystem,
		});
		return toRole(created.toObject() as RoleDocument);
	},

	findById: async (id: string): Promise<Role | null> => {
		await initializeDefaults();
		const role = await RoleModel.findById(id).lean<RoleDocument | null>();
		return role ? toRole(role) : null;
	},

	findAll: async (): Promise<Role[]> => {
		await initializeDefaults();
		const roleDocs = await RoleModel.find().lean<RoleDocument[]>();
		return roleDocs.map(toRole);
	},

	findByIds: async (ids: string[]): Promise<Role[]> => {
		await initializeDefaults();
		if (ids.length === 0) {
			return [];
		}

		const roleDocs = await RoleModel.find({ _id: { $in: ids } }).lean<
			RoleDocument[]
		>();
		const byId = new Map(roleDocs.map((doc) => [doc._id.toString(), toRole(doc)]));

		return ids
			.map((id) => byId.get(id) ?? null)
			.filter((role): role is Role => role !== null);
	},

	update: async (id: string, data: Partial<Role>): Promise<Role | null> => {
		await initializeDefaults();
		const role = await RoleModel.findById(id).lean<RoleDocument | null>();
		if (!role || role.isSystem) {
			return null;
		}

		const updatedRole = await RoleModel.findByIdAndUpdate(
			id,
			{
				$set: {
					name: data.name,
					description: data.description,
					permissionIds: data.permissionIds,
				},
			},
			{ returnDocument: "after" },
		).lean<RoleDocument | null>();

		return updatedRole ? toRole(updatedRole) : null;
	},

	delete: async (id: string): Promise<boolean> => {
		await initializeDefaults();
		const role = await RoleModel.findById(id).lean<RoleDocument | null>();
		if (!role || role.isSystem) {
			return false;
		}

		const result = await RoleModel.findByIdAndDelete(id);
		return result !== null;
	},
};

export const UserService = {
	create: async (
		user: Omit<User, "id" | "createdAt" | "updatedAt">,
	): Promise<User> => {
		await initializeDefaults();
		const created = await UserModel.create({
			email: user.email,
			password: user.password,
			name: user.name,
			roleIds: user.roleIds,
			isActive: user.isActive,
		});
		return toUser(created.toObject());
	},

	findById: async (id: string): Promise<User | null> => {
		await initializeDefaults();
		const user = await UserModel.findById(id).lean<UserDocument | null>();
		return user ? toUser(user) : null;
	},

	findByEmail: async (email: string): Promise<User | null> => {
		await initializeDefaults();
		const user = await UserModel.findOne({ email }).lean<UserDocument | null>();
		return user ? toUser(user) : null;
	},

	findAll: async (): Promise<User[]> => {
		await initializeDefaults();
		const userDocs = await UserModel.find().lean<UserDocument[]>();
		return userDocs.map(toUser);
	},

	update: async (id: string, data: Partial<User>): Promise<User | null> => {
		await initializeDefaults();
		const updatedUser = await UserModel.findByIdAndUpdate(
			id,
			{
				$set: {
					email: data.email,
					password: data.password,
					name: data.name,
					roleIds: data.roleIds,
					isActive: data.isActive,
				},
			},
			{ returnDocument: "after" },
		).lean<UserDocument | null>();

		return updatedUser ? toUser(updatedUser) : null;
	},

	delete: async (id: string): Promise<boolean> => {
		await initializeDefaults();
		const result = await UserModel.findByIdAndDelete(id);
		return result !== null;
	},

	addRole: async (userId: string, roleId: string): Promise<User | null> => {
		await initializeDefaults();
		const updatedUser = await UserModel.findByIdAndUpdate(
			userId,
			{ $addToSet: { roleIds: roleId } },
			{ returnDocument: "after" },
		).lean<UserDocument | null>();

		return updatedUser ? toUser(updatedUser) : null;
	},

	removeRole: async (userId: string, roleId: string): Promise<User | null> => {
		await initializeDefaults();
		const updatedUser = await UserModel.findByIdAndUpdate(
			userId,
			{ $pull: { roleIds: roleId } },
			{ returnDocument: "after" },
		).lean<UserDocument | null>();

		return updatedUser ? toUser(updatedUser) : null;
	},
};

export const toPublicUser = (user: User): PublicUser => {
	const { password: _password, ...publicUser } = user;
	return publicUser;
};

export const getRoleWithPermissions = async (
	role: Role,
): Promise<RoleWithPermissions> => {
	return {
		...role,
		permissions: await collectPermissionsByIds(role.permissionIds),
	};
};

export const getEffectivePermissions = async (
	roleIds: string[],
): Promise<Permission[]> => {
	const roles = await RoleService.findByIds(roleIds);
	const permissionArrays = await Promise.all(
		roles.map((role) => collectPermissionsByIds(role.permissionIds)),
	);
	return mergePermissions(permissionArrays);
};

export const getEffectivePermissionIds = async (
	roleIds: string[],
): Promise<string[]> => {
	const permissions = await getEffectivePermissions(roleIds);
	return permissions.map((permission) => permission.id);
};

export const getUserWithRelations = async (
	user: User,
): Promise<UserWithRelations> => {
	return {
		...toPublicUser(user),
		roles: await RoleService.findByIds(user.roleIds),
		permissions: await getEffectivePermissions(user.roleIds),
	};
};

export const resetRbacStore = async (): Promise<void> => {
	defaultsInitialized = false;
	await Promise.all([
		UserModel.deleteMany({}),
		RoleModel.deleteMany({}),
		PermissionModel.deleteMany({}),
	]);
	await initializeDefaults();
};

export const ensureRbacDefaults = initializeDefaults;
