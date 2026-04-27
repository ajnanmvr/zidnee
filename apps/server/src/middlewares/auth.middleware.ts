import {
	getPermissionKeyFromResourceAction,
	type JWTPayload,
	type PermissionCheck,
	type PermissionKey,
} from "@repo/schema";
import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../modules/auth/auth.token.js";
import {
	getEffectivePermissions,
	PermissionService,
} from "../modules/rbac/rbac.service.js";
import {
	AuthenticationError,
	AuthorizationError,
} from "../utils/errors.util.js";

declare global {
	namespace Express {
		interface Request {
			user?: JWTPayload;
		}
	}
}

/**
 * Extract and verify JWT token from Authorization header
 */
export const authMiddleware = (
	req: Request,
	_res: Response,
	next: NextFunction,
): void => {
	try {
		const authHeader = req.headers.authorization;

		if (authHeader?.startsWith("Bearer ") !== true) {
			throw new AuthenticationError("Missing or invalid authorization header");
		}

		const token = authHeader.slice(7);
		const decoded = verifyToken(token);

		if (!decoded) {
			throw new AuthenticationError("Invalid or expired token");
		}

		req.user = decoded;
		next();
	} catch (error) {
		next(error);
	}
};

/**
 * Check if user has specific permission(s)
 */
export const requirePermission = (
	checks: PermissionCheck | PermissionCheck[],
) => {
	return requirePermissionKey(
		(Array.isArray(checks) ? checks : [checks]).map((check) => check.key),
	);
};

export const requirePermissionByResourceAction = (
	checks:
		| { resource: string; action: string }
		| Array<{ resource: string; action: string }>,
) => {
	const checksArray = Array.isArray(checks) ? checks : [checks];
	const keys = checksArray.map((check) => {
		const key = getPermissionKeyFromResourceAction(
			check.resource,
			check.action,
		);
		if (!key) {
			throw new AuthorizationError(
				`No hardcoded permission key found for ${check.resource}:${check.action}`,
			);
		}

		return key;
	});

	return requirePermissionKey(keys);
};

export const requirePermissionKey = (keys: PermissionKey | PermissionKey[]) => {
	return async (
		req: Request,
		_res: Response,
		next: NextFunction,
	): Promise<void> => {
		try {
			if (!req.user) {
				throw new AuthenticationError("User not authenticated");
			}

			const checksArray = Array.isArray(keys) ? keys : [keys];
			const userPermissions = req.user.roleIds.length
				? await getEffectivePermissions(req.user.roleIds)
				: await PermissionService.findByIds(req.user.permissionIds);

			const hasPermission = checksArray.every((requiredKey) =>
				userPermissions.some((permission) => permission.key === requiredKey),
			);

			if (!hasPermission) {
				throw new AuthorizationError(
					"Insufficient permissions for this action",
				);
			}

			next();
		} catch (error) {
			next(error);
		}
	};
};

/**
 * Require specific roles or permissions
 * For now, we'll check if user has required role
 */
export const requireRole = (roleIds: string[]) => {
	return (req: Request, _res: Response, next: NextFunction): void => {
		try {
			if (!req.user) {
				throw new AuthenticationError("User not authenticated");
			}

			const user = req.user;
			const hasRole = roleIds.some((roleId) => user.roleIds.includes(roleId));

			if (!hasRole) {
				throw new AuthorizationError("Insufficient role for this action");
			}

			next();
		} catch (error) {
			next(error);
		}
	};
};
