import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import {
	getUserWithRelations,
	PermissionService,
	RoleService,
	resetRbacStore,
	UserService,
} from "../../src/modules/rbac/rbac.service.js";

describe("rbac service", () => {
	beforeEach(() => {
		resetRbacStore();
	});

	it("seeds default roles and permissions", () => {
		const roleNames = RoleService.findAll().map((role) => role.name);
		const allPermissions = PermissionService.findAll();

		expect(roleNames).toContain("Admin");
		expect(roleNames).toContain("User");
		expect(allPermissions.length).toBeGreaterThan(0);
	});

	it("creates a user and resolves relations", () => {
		const userRole = RoleService.findAll().find((role) => role.name === "User");
		expect(userRole).toBeDefined();

		const user = UserService.create({
			email: "service@example.com",
			password: "hash",
			name: "Service User",
			roleIds: [userRole!.id],
			isActive: true,
		});

		const withRelations = getUserWithRelations(user);

		expect(withRelations.email).toBe("service@example.com");
		expect(withRelations.roles.length).toBe(1);
		expect(withRelations.permissions.length).toBeGreaterThan(0);
	});

	it("adds user roles without duplicates", () => {
		const role = RoleService.create({
			name: `Custom-${Date.now()}`,
			description: "Custom role",
			permissionIds: [],
			isSystem: false,
		});

		const user = UserService.create({
			email: "dup@example.com",
			password: "hash",
			name: "Duplicate Role User",
			roleIds: [],
			isActive: true,
		});

		UserService.addRole(user.id, role.id);
		const updatedUser = UserService.addRole(user.id, role.id);

		expect(updatedUser?.roleIds).toEqual([role.id]);
	});

	it("finds users by email", () => {
		const email = `email-${randomUUID()}@example.com`;
		UserService.create({
			email,
			password: "hash",
			name: "Email User",
			roleIds: [],
			isActive: true,
		});

		const found = UserService.findByEmail(email);
		expect(found?.email).toBe(email);
	});
});
