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
	name: "Read users",
	resource: "users",
	action: "read",
};

const createUsersPermission = {
	id: randomUUID(),
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

		expect(map["users:read"]?.id).toBe(readUsersPermission.id);
		expect(map["users:create"]?.id).toBe(createUsersPermission.id);
	});

	it("checks single, any, and all permissions", () => {
		const permissions = [readUsersPermission, createUsersPermission] as any;

		expect(
			hasPermission(permissions, { resource: "users", action: "read" }),
		).toBe(true);
		expect(
			hasAnyPermission(permissions, [
				{ resource: "users", action: "delete" },
				{ resource: "users", action: "create" },
			]),
		).toBe(true);
		expect(
			hasAllPermissions(permissions, [
				{ resource: "users", action: "read" },
				{ resource: "users", action: "create" },
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
