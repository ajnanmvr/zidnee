import type { PermissionKey } from "@repo/schema";
import { Router } from "express";
import {
	authMiddleware,
	requirePermissionKey,
} from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import {
	getPermissionController,
	listPermissionsController,
} from "./permission.controller.js";

const router: ReturnType<typeof Router> = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /api/permissions:
 *   get:
 *     tags:
 *       - Permissions
 *     summary: List all permissions
 *     description: Retrieve all available permissions in the system
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of permissions
 */
router.get(
	"/",
	requirePermissionKey("PERMISSION_READ" satisfies PermissionKey),
	asyncHandler(listPermissionsController),
);

/**
 * @swagger
 * /api/permissions/{permissionId}:
 *   get:
 *     tags:
 *       - Permissions
 *     summary: Get permission by ID
 *     description: Retrieve a specific permission
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: permissionId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Permission details
 */
router.get(
	"/:permissionId",
	requirePermissionKey("PERMISSION_READ" satisfies PermissionKey),
	asyncHandler(getPermissionController),
);

export default router;
