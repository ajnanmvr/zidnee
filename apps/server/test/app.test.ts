import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "@/app.js";
import { resetRbacStore } from "@/modules/rbac/rbac.service.js";
import { seedInitialSuperAdmin } from "@/modules/rbac/rbac.seed.js";

describe("app routes", () => {
	beforeEach(async () => {
		await resetRbacStore();
		await seedInitialSuperAdmin();
	});

	it("GET /health returns ok", async () => {
		const response = await request(app).get("/health");

		expect(response.status).toBe(200);
		expect(response.body).toEqual({ ok: true });
	});

	it("login and fetch profile for the seeded initial user", async () => {
		const loginResponse = await request(app).post("/api/auth/login").send({
			username: "admin",
			password: "123456",
		});

		expect(loginResponse.status).toBe(200);
		expect(loginResponse.body.ok).toBe(true);
		expect(loginResponse.body.token).toBeTypeOf("string");

		const meResponse = await request(app)
			.get("/api/auth/me")
			.set("Authorization", `Bearer ${loginResponse.body.token}`);

		expect(meResponse.status).toBe(200);
		expect(meResponse.body.ok).toBe(true);
		expect(meResponse.body.email).toBe("admin@zidnee.local");
		expect(Array.isArray(meResponse.body.roles)).toBe(true);
		expect(Array.isArray(meResponse.body.permissions)).toBe(true);
		expect(
			meResponse.body.roles.some(
				(role: { name?: string }) => role.name === "SuperAdmin",
			),
		).toBe(true);
	});

	it("allows a user with USER_CREATE permission to add a user", async () => {
		const loginResponse = await request(app).post("/api/auth/login").send({
			username: "admin",
			password: "123456",
		});

		expect(loginResponse.status).toBe(200);

		const createResponse = await request(app)
			.post("/api/users")
			.set("Authorization", `Bearer ${loginResponse.body.token}`)
			.send({
				username: "newuser",
				email: "newuser@example.com",
				password: "123456",
				name: "New User",
			});

		expect(createResponse.status).toBe(201);
		expect(createResponse.body.ok).toBe(true);
		expect(createResponse.body.username).toBe("newuser");
		expect(createResponse.body.email).toBe("newuser@example.com");
	});
});
