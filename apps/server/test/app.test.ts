import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "@/app.js";
import { seedInitialSuperAdmin } from "@/modules/rbac/rbac.seed.js";
import { resetRbacStore } from "@/modules/rbac/rbac.service.js";

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

	it("creates lead with phone only and supports postpone from follow-up list", async () => {
		const loginResponse = await request(app).post("/api/auth/login").send({
			username: "admin",
			password: "123456",
		});

		expect(loginResponse.status).toBe(200);

		const createResponse = await request(app)
			.post("/api/leads")
			.set("Authorization", `Bearer ${loginResponse.body.token}`)
			.send({
				phone: "+919876543210",
			});

		expect(createResponse.status).toBe(201);
		expect(createResponse.body.ok).toBe(true);
		expect(createResponse.body.lead.phone).toBe("+919876543210");

		const leadId = createResponse.body.lead.id as string;

		const dueResponseBeforePostpone = await request(app)
			.get("/api/leads/follow-ups/due")
			.set("Authorization", `Bearer ${loginResponse.body.token}`);

		expect(dueResponseBeforePostpone.status).toBe(200);
		expect(dueResponseBeforePostpone.body.ok).toBe(true);
		expect(
			dueResponseBeforePostpone.body.leads.some(
				(lead: { id?: string }) => lead.id === leadId,
			),
		).toBe(true);

		const postponeTo = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
		const postponeResponse = await request(app)
			.patch(`/api/leads/${leadId}/follow-up/postpone`)
			.set("Authorization", `Bearer ${loginResponse.body.token}`)
			.send({
				customNextFollowUpAt: postponeTo,
			});

		expect(postponeResponse.status).toBe(200);
		expect(postponeResponse.body.ok).toBe(true);
		expect(postponeResponse.body.lead.customNextFollowUpAt).toBe(postponeTo);

		const dueResponseAfterPostpone = await request(app)
			.get("/api/leads/follow-ups/due")
			.set("Authorization", `Bearer ${loginResponse.body.token}`);

		expect(dueResponseAfterPostpone.status).toBe(200);
		expect(dueResponseAfterPostpone.body.ok).toBe(true);
		expect(
			dueResponseAfterPostpone.body.leads.some(
				(lead: { id?: string }) => lead.id === leadId,
			),
		).toBe(false);
	});
});
