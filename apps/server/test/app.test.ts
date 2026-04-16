import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "@/app.js";
import { resetRbacStore } from "@/modules/rbac/rbac.service.js";

describe("app routes", () => {
	beforeEach(async () => {
		await resetRbacStore();
	});

	it("GET /health returns ok", async () => {
		const response = await request(app).get("/health");

		expect(response.status).toBe(200);
		expect(response.body).toEqual({ ok: true });
	});

	it("register, login and fetch profile", async () => {
		const registerResponse = await request(app)
			.post("/api/auth/register")
			.send({
				email: "test@example.com",
				password: "password123",
				name: "Test User",
			});

		expect(registerResponse.status).toBe(201);
		expect(registerResponse.body.ok).toBe(true);
		expect(registerResponse.body.token).toBeTypeOf("string");

		const loginResponse = await request(app).post("/api/auth/login").send({
			email: "test@example.com",
			password: "password123",
		});

		expect(loginResponse.status).toBe(200);
		expect(loginResponse.body.ok).toBe(true);
		expect(loginResponse.body.token).toBeTypeOf("string");

		const meResponse = await request(app)
			.get("/api/auth/me")
			.set("Authorization", `Bearer ${loginResponse.body.token}`);

		expect(meResponse.status).toBe(200);
		expect(meResponse.body.ok).toBe(true);
		expect(meResponse.body.email).toBe("test@example.com");
		expect(Array.isArray(meResponse.body.roles)).toBe(true);
		expect(Array.isArray(meResponse.body.permissions)).toBe(true);
	});
});
