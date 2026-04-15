import type { JWTPayload, PermissionCheck } from "@repo/schema";
import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../modules/auth/auth.token.js";
import { PermissionService } from "../modules/rbac/rbac.service.js";
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
	return (req: Request, _res: Response, next: NextFunction): void => {
		try {
			if (!req.user) {
				throw new AuthenticationError("User not authenticated");
			}

			const checksArray = Array.isArray(checks) ? checks : [checks];
			const userPermissions = req.user.permissionIds
				.map((permissionId) => PermissionService.findById(permissionId))
				.filter(
					(permission): permission is NonNullable<typeof permission> =>
						permission !== null,
				);

			const hasPermission = checksArray.every((check) =>
				userPermissions.some(
					(permission) =>
						permission.resource === check.resource &&
						permission.action === check.action,
				),
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
