import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createToken, verifyToken } from "../../src/modules/auth/auth.token.js";

describe("auth token helpers", () => {
	it("creates and verifies JWT tokens", () => {
		const payload = {
			userId: randomUUID(),
			email: "jwt@example.com",
			roleIds: [randomUUID()],
			permissionIds: [randomUUID()],
		};

		const token = createToken(payload);
		const decoded = verifyToken(token);

		expect(token).toBeTypeOf("string");
		expect(decoded?.userId).toBe(payload.userId);
		expect(decoded?.email).toBe(payload.email);
	});

	it("returns null for invalid token", () => {
		expect(verifyToken("invalid-token")).toBeNull();
	});
});
