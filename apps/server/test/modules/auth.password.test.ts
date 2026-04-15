import { describe, expect, it } from "vitest";
import {
	hashPassword,
	verifyPassword,
} from "../../src/modules/auth/auth.password.js";

describe("auth password helpers", () => {
	it("hashes and verifies passwords", async () => {
		const password = "password123";
		const hash = await hashPassword(password);

		expect(hash).not.toBe(password);
		expect(await verifyPassword(password, hash)).toBe(true);
		expect(await verifyPassword("wrong-password", hash)).toBe(false);
	});
});
