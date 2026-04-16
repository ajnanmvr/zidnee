import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import {
	getUserWithRelations,
	PermissionService,
	RoleService,
	resetRbacStore,
	UserService,
} from "@/modules/rbac/rbac.service.js";

describe("rbac service", () => {
	beforeEach(async () => {
		await resetRbacStore();
	});

	it("seeds default roles and permissions", async () => {
		const roleNames = (await RoleService.findAll()).map((role) => role.name);
		const allPermissions = await PermissionService.findAll();

		expect(roleNames).toContain("Admin");
		expect(roleNames).toContain("User");
		expect(allPermissions.length).toBeGreaterThan(0);
	});

	it("creates a user and resolves relations", async () => {
		const userRole = (await RoleService.findAll()).find(
			(role) => role.name === "User",
		);
		expect(userRole).toBeDefined();

		const user = await UserService.create({
			email: "service@example.com",
			password: "hash",
			name: "Service User",
			roleIds: [userRole!.id],
			isActive: true,
		});

		const withRelations = await getUserWithRelations(user);

		expect(withRelations.email).toBe("service@example.com");
		expect(withRelations.roles.length).toBe(1);
		expect(withRelations.permissions.length).toBeGreaterThan(0);
	});

	it("adds user roles without duplicates", async () => {
		const role = await RoleService.create({
			name: `Custom-${Date.now()}`,
			description: "Custom role",
			permissionIds: [],
			isSystem: false,
		});

		const user = await UserService.create({
			email: "dup@example.com",
			password: "hash",
			name: "Duplicate Role User",
			roleIds: [],
			isActive: true,
		});

		await UserService.addRole(user.id, role.id);
		const updatedUser = await UserService.addRole(user.id, role.id);

		expect(updatedUser?.roleIds).toEqual([role.id]);
	});

	it("finds users by email", async () => {
		const email = `email-${randomUUID()}@example.com`;
		await UserService.create({
			email,
			password: "hash",
			name: "Email User",
			roleIds: [],
			isActive: true,
		});

		const found = await UserService.findByEmail(email);
		expect(found?.email).toBe(email);
	});
});
