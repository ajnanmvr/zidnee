export const PERMISSION_CATALOG = {
	USER_CREATE: {
		name: "Create User",
		description: "Create a new user",
		resource: "users",
		action: "create",
	},
	USER_READ: {
		name: "Read User",
		description: "Read user information",
		resource: "users",
		action: "read",
	},
	USER_UPDATE: {
		name: "Update User",
		description: "Update user information",
		resource: "users",
		action: "update",
	},
	USER_DELETE: {
		name: "Delete User",
		description: "Delete user information",
		resource: "users",
		action: "delete",
	},
	ROLE_CREATE: {
		name: "Create Role",
		description: "Create a new role",
		resource: "roles",
		action: "create",
	},
	ROLE_READ: {
		name: "Read Role",
		description: "Read role information",
		resource: "roles",
		action: "read",
	},
	ROLE_UPDATE: {
		name: "Update Role",
		description: "Update role information",
		resource: "roles",
		action: "update",
	},
	ROLE_DELETE: {
		name: "Delete Role",
		description: "Delete a role",
		resource: "roles",
		action: "delete",
	},
	PERMISSION_READ: {
		name: "Read Permission",
		description: "Read permission information",
		resource: "permissions",
		action: "read",
	},
	ORDER_DELETE: {
		name: "Delete Order",
		description: "Delete order records",
		resource: "orders",
		action: "delete",
	},
	VIEW_REPORTS: {
		name: "View Reports",
		description: "View reporting dashboards and exports",
		resource: "reports",
		action: "view",
	},
} as const;

export type PermissionKey = keyof typeof PERMISSION_CATALOG;

export const PERMISSION_KEYS = Object.keys(
	PERMISSION_CATALOG,
) as PermissionKey[];

const permissionKeyByResourceAction = new Map<string, PermissionKey>(
	PERMISSION_KEYS.map((key) => {
		const value = PERMISSION_CATALOG[key];
		return [`${value.resource}:${value.action}`, key] as const;
	}),
);

export const getPermissionKeyFromResourceAction = (
	resource: string,
	action: string,
): PermissionKey | null => {
	return permissionKeyByResourceAction.get(`${resource}:${action}`) ?? null;
};
