import type { Permission, PermissionCheck } from "@repo/schema";

export interface PermissionMap {
	[key: string]: Permission;
}

export const buildPermissionMap = (permissions: Permission[]): PermissionMap => {
	const map: PermissionMap = {};
	for (const permission of permissions) {
		map[`${permission.resource}:${permission.action}`] = permission;
	}
	return map;
};

export const hasPermission = (
	userPermissions: Permission[],
	check: PermissionCheck
): boolean => {
	const key = `${check.resource}:${check.action}`;
	return userPermissions.some((permission) => `${permission.resource}:${permission.action}` === key);
};

export const hasAnyPermission = (
	userPermissions: Permission[],
	checks: PermissionCheck[]
): boolean => {
	return checks.some((check) => hasPermission(userPermissions, check));
};

export const hasAllPermissions = (
	userPermissions: Permission[],
	checks: PermissionCheck[]
): boolean => {
	return checks.every((check) => hasPermission(userPermissions, check));
};

export const mergePermissions = (permissionArrays: Permission[][]): Permission[] => {
	const map = new Map<string, Permission>();
	for (const permissions of permissionArrays) {
		for (const permission of permissions) {
			map.set(permission.id, permission);
		}
	}
	return Array.from(map.values());
};