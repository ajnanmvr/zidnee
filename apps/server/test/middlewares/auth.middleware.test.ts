import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	authMiddleware,
	requirePermission,
	requireRole,
} from "../../src/middlewares/auth.middleware.js";
import { createToken } from "../../src/modules/auth/auth.token.js";
import {
	PermissionService,
	resetRbacStore,
} from "../../src/modules/rbac/rbac.service.js";
import {
	AuthenticationError,
	AuthorizationError,
} from "../../src/utils/errors.util.js";

const createRequest = (value: Partial<Request>): Request => {
	return value as Request;
};

const createResponse = (): Response => {
	return {} as Response;
};

describe("auth middleware", () => {
	beforeEach(() => {
		resetRbacStore();
	});

	it("authMiddleware attaches req.user for valid token", () => {
		const token = createToken({
			userId: randomUUID(),
			email: "valid@example.com",
			roleIds: [randomUUID()],
			permissionIds: [],
		});

		const req = createRequest({
			headers: {
				authorization: `Bearer ${token}`,
			},
		});
		const next = vi.fn();

		authMiddleware(req, createResponse(), next);

		expect(next).toHaveBeenCalledWith();
		expect(req.user?.email).toBe("valid@example.com");
	});

	it("authMiddleware sends auth error on missing header", () => {
		const req = createRequest({ headers: {} });
		const next = vi.fn();

		authMiddleware(req, createResponse(), next);

		expect(next).toHaveBeenCalledTimes(1);
		expect(next.mock.calls[0]?.[0]).toBeInstanceOf(AuthenticationError);
	});

	it("requirePermission allows valid permission", () => {
		const permission = PermissionService.findAll()[0];
		const middleware = requirePermission({
			resource: permission.resource,
			action: permission.action,
		});

		const req = createRequest({
			user: {
				userId: randomUUID(),
				email: "permission@example.com",
				roleIds: [randomUUID()],
				permissionIds: [permission.id],
				iat: 0,
				exp: 0,
			},
		});
		const next = vi.fn();

		middleware(req, createResponse(), next);

		expect(next).toHaveBeenCalledWith();
	});

	it("requirePermission blocks missing permission", () => {
		const permission = PermissionService.findAll()[0];
		const middleware = requirePermission({
			resource: permission.resource,
			action: permission.action,
		});

		const req = createRequest({
			user: {
				userId: randomUUID(),
				email: "no-permission@example.com",
				roleIds: [randomUUID()],
				permissionIds: [],
				iat: 0,
				exp: 0,
			},
		});
		const next = vi.fn();

		middleware(req, createResponse(), next);

		expect(next).toHaveBeenCalledTimes(1);
		expect(next.mock.calls[0]?.[0]).toBeInstanceOf(AuthorizationError);
	});

	it("requireRole allows matching role", () => {
		const roleId = randomUUID();
		const middleware = requireRole([roleId]);
		const req = createRequest({
			user: {
				userId: randomUUID(),
				email: "role@example.com",
				roleIds: [roleId],
				permissionIds: [],
				iat: 0,
				exp: 0,
			},
		});
		const next = vi.fn();

		middleware(req, createResponse(), next);

		expect(next).toHaveBeenCalledWith();
	});
});