import type { PermissionKey } from "@repo/schema";
import { Router } from "express";
import {
	authMiddleware,
	requirePermissionKey,
} from "../../middlewares/auth.middleware.js";
import { RoleService, UserService, getUserWithRelations } from "../rbac/rbac.service.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import {
	assignRoleController,
	changeMyPasswordController,
	changeUserPasswordController,
	createCounsellorController,
	createMentorController,
	createUserController,
	deleteUserController,
	getUserController,
	listUsersController,
	removeRoleController,
	setUserStatusController,
	updateUserController,
} from "./user.controller.js";

const router: ReturnType<typeof Router> = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /api/users:
 *   post:
 *     tags:
 *       - Users
 *     summary: Create a new user
 *     description: Create a new user (requires USER_CREATE permission)
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
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               roleId:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created
 *   get:
 *     tags:
 *       - Users
 *     summary: List all users
 *     description: Retrieve all users (requires USER_READ permission)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
router.post(
	"/",
	requirePermissionKey("USER_CREATE" satisfies PermissionKey),
	asyncHandler(createUserController),
);
router.post(
	"/counsellors",
	requirePermissionKey("USER_CREATE" satisfies PermissionKey),
	asyncHandler(createCounsellorController),
);
router.post(
	"/mentors",
	requirePermissionKey("USER_CREATE" satisfies PermissionKey),
	asyncHandler(createMentorController),
);
router.get(
	"/",
	requirePermissionKey("USER_READ" satisfies PermissionKey),
	asyncHandler(listUsersController),
);

router.get(
	"/sales",
	requirePermissionKey("SALES_USERS_READ" satisfies PermissionKey),
	asyncHandler(async (_req, res): Promise<void> => {
		// Return users that have the sales role
		const salesRole = (await RoleService.findAll()).find((r) => r.type === "sales");
		if (!salesRole) {
			res.json({ ok: true, users: [] });
			return;
		}

		const users = await UserService.findAll();
		const sales = users.filter((u) => (u.roleIds ?? []).some((id) => id === salesRole.id));
		const usersWithRelations = await Promise.all(
			sales.map((user) => getUserWithRelations(user)),
		);

		res.json({ ok: true, users: usersWithRelations });
	}),
);

/**
 * @swagger
 * /api/users/me/password:
 *   patch:
 *     tags:
 *       - Users
 *     summary: Change own password
 *     description: Change the current user's password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
router.patch("/me/password", asyncHandler(changeMyPasswordController));

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user by ID
 *     description: Retrieve a specific user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: User details
 *   patch:
 *     tags:
 *       - Users
 *     summary: Update user
 *     description: Update user information
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *         description: User updated
 *   delete:
 *     tags:
 *       - Users
 *     summary: Delete user
 *     description: Delete a user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       204:
 *         description: User deleted
 */
router.get(
	"/:userId",
	requirePermissionKey("USER_READ" satisfies PermissionKey),
	asyncHandler(getUserController),
);
router.patch(
	"/:userId",
	requirePermissionKey("USER_UPDATE" satisfies PermissionKey),
	asyncHandler(updateUserController),
);

/**
 * @swagger
 * /api/users/{userId}/status:
 *   patch:
 *     tags:
 *       - Users
 *     summary: Set user status
 *     description: Set user active/inactive status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch(
	"/:userId/status",
	requirePermissionKey("USER_UPDATE" satisfies PermissionKey),
	asyncHandler(setUserStatusController),
);

/**
 * @swagger
 * /api/users/{userId}/password:
 *   patch:
 *     tags:
 *       - Users
 *     summary: Change user password
 *     description: Change another user's password (requires USER_UPDATE permission)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated
 */
router.patch(
	"/:userId/password",
	requirePermissionKey("USER_CHANGE_PASSWORD" satisfies PermissionKey),
	asyncHandler(changeUserPasswordController),
);
router.delete(
	"/:userId",
	requirePermissionKey("USER_DELETE" satisfies PermissionKey),
	asyncHandler(deleteUserController),
);

/**
 * @swagger
 * /api/users/{userId}/roles:
 *   post:
 *     tags:
 *       - Users
 *     summary: Assign role to user
 *     description: Assign a role to a user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roleId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Role assigned
 *   delete:
 *     tags:
 *       - Users
 *     summary: Remove role from user
 *     description: Remove a role from a user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Role removed
 */
router.post(
	"/:userId/roles",
	requirePermissionKey("USER_UPDATE" satisfies PermissionKey),
	asyncHandler(assignRoleController),
);
router.delete(
	"/:userId/roles",
	requirePermissionKey("USER_UPDATE" satisfies PermissionKey),
	asyncHandler(removeRoleController),
);

export default router;
