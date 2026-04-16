import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
	buildPermissionMap,
	hasAllPermissions,
	hasAnyPermission,
	hasPermission,
	mergePermissions,
} from "@/modules/rbac/rbac.permissions.js";

const readUsersPermission = {
	id: randomUUID(),
	key: "USER_READ",
	name: "Read users",
	resource: "users",
	action: "read",
};

const createUsersPermission = {
	id: randomUUID(),
	key: "USER_CREATE",
	name: "Create users",
	resource: "users",
	action: "create",
};

describe("rbac permission helpers", () => {
	it("builds keyed permission maps", () => {
		const map = buildPermissionMap([
			readUsersPermission,
			createUsersPermission,
		] as any);

		expect(map.USER_READ?.id).toBe(readUsersPermission.id);
		expect(map.USER_CREATE?.id).toBe(createUsersPermission.id);
	});

	it("checks single, any, and all permissions", () => {
		const permissions = [readUsersPermission, createUsersPermission] as any;

		expect(
			hasPermission(permissions, { key: "USER_READ" }),
		).toBe(true);
		expect(
			hasAnyPermission(permissions, [
				{ key: "USER_DELETE" },
				{ key: "USER_CREATE" },
			]),
		).toBe(true);
		expect(
			hasAllPermissions(permissions, [
				{ key: "USER_READ" },
				{ key: "USER_CREATE" },
			]),
		).toBe(true);
	});

	it("deduplicates merged permission arrays by id", () => {
		const merged = mergePermissions([
			[readUsersPermission, createUsersPermission],
			[readUsersPermission],
		] as any);

		expect(merged).toHaveLength(2);
		expect(merged.map((permission) => permission.id)).toContain(
			readUsersPermission.id,
		);
	});
});
