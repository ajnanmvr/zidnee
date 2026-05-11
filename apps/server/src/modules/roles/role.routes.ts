import type { PermissionKey } from "@repo/schema";
import { Router } from "express";
import {
	authMiddleware,
	requirePermissionKey,
} from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import {
	createRoleController,
	deleteRoleController,
	getRoleController,
	listRolesController,
	updateRoleController,
} from "./role.controller.js";

const router: ReturnType<typeof Router> = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /api/roles:
 *   post:
 *     tags:
 *       - Roles
 *     summary: Create a new role
 *     description: Create a new role with permissions (requires ROLE_CREATE permission)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Role created
 *   get:
 *     tags:
 *       - Roles
 *     summary: List all roles
 *     description: Retrieve all roles
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles
 */
router.post(
	"/",
	requirePermissionKey("ROLE_CREATE" satisfies PermissionKey),
	asyncHandler(createRoleController),
);
router.get(
	"/",
	requirePermissionKey("ROLE_READ" satisfies PermissionKey),
	asyncHandler(listRolesController),
);

/**
 * @swagger
 * /api/roles/{roleId}:
 *   get:
 *     tags:
 *       - Roles
 *     summary: Get role by ID
 *     description: Retrieve a specific role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Role details
 *   patch:
 *     tags:
 *       - Roles
 *     summary: Update role
 *     description: Update role information
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Role updated
 *   delete:
 *     tags:
 *       - Roles
 *     summary: Delete role
 *     description: Delete a role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       204:
 *         description: Role deleted
 */
router.get(
	"/:roleId",
	requirePermissionKey("ROLE_READ" satisfies PermissionKey),
	asyncHandler(getRoleController),
);
router.patch(
	"/:roleId",
	requirePermissionKey("ROLE_UPDATE" satisfies PermissionKey),
	asyncHandler(updateRoleController),
);
router.delete(
	"/:roleId",
	requirePermissionKey("ROLE_DELETE" satisfies PermissionKey),
	asyncHandler(deleteRoleController),
);

export default router;
