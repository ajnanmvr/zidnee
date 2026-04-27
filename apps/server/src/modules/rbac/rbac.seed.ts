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
