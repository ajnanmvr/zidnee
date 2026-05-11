import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createToken, verifyToken } from "@/modules/auth/auth.token.js";

describe("auth token helpers", () => {
	it("creates and verifies JWT tokens", () => {
		const payload = {
			userId: randomUUID(),
			username: "jwt-user",
			roleIds: [randomUUID()],
			permissionIds: [randomUUID()],
		};

		const token = createToken(payload);
		const decoded = verifyToken(token);

		expect(token).toBeTypeOf("string");
		expect(decoded?.userId).toBe(payload.userId);
		expect(decoded?.username).toBe(payload.username);
	});

	it("returns null for invalid token", () => {
		expect(verifyToken("invalid-token")).toBeNull();
	});
});
