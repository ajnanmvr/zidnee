import { hashPassword } from "../auth/auth.password.js";
import { RoleModel } from "../roles/role.model.js";
import { UserModel } from "../users/user.model.js";
import {
	ensureRbacDefaults,
	PermissionService,
	RoleService,
} from "./rbac.service.js";

export const INITIAL_SUPERADMIN_USERNAME = "admin";
export const INITIAL_SUPERADMIN_EMAIL = "admin@zidnee.local";
export const INITIAL_SUPERADMIN_PASSWORD = "123456";
export const INITIAL_SUPERADMIN_ROLE_NAME = "SuperAdmin";

const BASE_ROLE_DEFINITIONS = [
	{
		name: "Admin",
		type: "admin" as const,
		description: "Administrative role",
	},
	{
		name: "Mentor",
		type: "mentor" as const,
		description: "Mentor role",
	},
	{
		name: "Counsellor",
		type: "counsellor" as const,
		description: "Counsellor role",
	},
	{
		name: "Sales",
		type: "sales" as const,
		description: "Sales role",
	},
];

export const seedInitialSuperAdmin = async (): Promise<void> => {
	await ensureRbacDefaults();

	const permissionIds = (await PermissionService.findAll()).map(
		(permission) => permission.id,
	);

	await RoleModel.updateOne(
		{ name: INITIAL_SUPERADMIN_ROLE_NAME },
		{
			$set: {
				description: "System super administrator with full access",
				permissionIds,
				isSystem: true,
			},
			$setOnInsert: { name: INITIAL_SUPERADMIN_ROLE_NAME },
		},
		{ upsert: true },
	);

	const superAdminRole = (await RoleService.findAll()).find(
		(role) => role.name === INITIAL_SUPERADMIN_ROLE_NAME,
	);

	if (!superAdminRole) {
		throw new Error("SuperAdmin role not found");
	}

	const hashedPassword = await hashPassword(INITIAL_SUPERADMIN_PASSWORD);
	await UserModel.updateOne(
		{ username: INITIAL_SUPERADMIN_USERNAME },
		{
			$set: {
				username: INITIAL_SUPERADMIN_USERNAME,
				email: INITIAL_SUPERADMIN_EMAIL,
				password: hashedPassword,
				name: "Admin",
				roleIds: [superAdminRole.id],
				isActive: true,
			},
		},
		{ upsert: true },
	);
};

export const seedCoreRolesAndUsers = async (): Promise<void> => {
	await ensureRbacDefaults();

	const permissionIds = (await PermissionService.findAll()).map(
		(permission) => permission.id,
	);

	for (const roleDef of BASE_ROLE_DEFINITIONS) {
		await RoleModel.updateOne(
			{ name: roleDef.name },
			{
				$set: {
					type: roleDef.type,
					description: roleDef.description,
					permissionIds,
					isSystem: true,
				},
				$setOnInsert: { name: roleDef.name },
			},
			{ upsert: true },
		);
	}

	const allRoles = await RoleService.findAll();
	const roleMap = new Map(allRoles.map((role) => [role.name, role]));

	const adminRoleIds = BASE_ROLE_DEFINITIONS.map((roleDef) => {
		const role = roleMap.get(roleDef.name);
		if (!role) {
			throw new Error(`${roleDef.name} role not found after seeding`);
		}
		return role.id;
	});

	const seedUsers = [
		{
			username: "admin",
			email: "admin@zidnee.local",
			name: "System Admin",
			roleNames: ["Admin", "Mentor", "Counsellor", "Sales"],
		},
		{
			username: "mentor",
			email: "mentor@zidnee.local",
			name: "Seed Mentor",
			roleNames: ["Mentor"],
		},
		{
			username: "counsellor",
			email: "counsellor@zidnee.local",
			name: "Seed Counsellor",
			roleNames: ["Counsellor"],
		},
		{
			username: "sales",
			email: "sales@zidnee.local",
			name: "Seed Sales",
			roleNames: ["Sales"],
		},
	] as const;

	const hashedPassword = await hashPassword(INITIAL_SUPERADMIN_PASSWORD);

	for (const seedUser of seedUsers) {
		const roleIds =
			seedUser.username === "admin"
				? adminRoleIds
				: seedUser.roleNames.map((roleName) => {
					const role = roleMap.get(roleName);
					if (!role) {
						throw new Error(`${roleName} role not found for seeded user`);
					}
					return role.id;
				});

		await UserModel.updateOne(
			{ username: seedUser.username },
			{
				$set: {
					username: seedUser.username,
					email: seedUser.email,
					password: hashedPassword,
					name: seedUser.name,
					roleIds,
					isActive: true,
				},
			},
			{ upsert: true },
		);
	}
};
