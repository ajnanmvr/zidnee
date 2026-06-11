import type { PermissionKey } from "@repo/schema";
import { Router } from "express";
import {
	authMiddleware,
	requireAnyPermissionKey,
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
	assignUserCounsellorController,
	deleteUserController,
	getUserController,
	listCounsellorsController,
	listMentorsController,
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
	requireAnyPermissionKey([
		"USER_CREATE" satisfies PermissionKey,
		"ADMIN_CREATE" satisfies PermissionKey,
	]),
	asyncHandler(createUserController),
);
router.post(
	"/counsellors",
	requireAnyPermissionKey([
		"USER_CREATE" satisfies PermissionKey,
		"COUNSELLOR_CREATE" satisfies PermissionKey,
	]),
	asyncHandler(createCounsellorController),
);
router.post(
	"/mentors",
	requireAnyPermissionKey([
		"USER_CREATE" satisfies PermissionKey,
		"MENTOR_CREATE" satisfies PermissionKey,
	]),
	asyncHandler(createMentorController),
);
router.get(
	"/",
	requireAnyPermissionKey([
		"USER_READ" satisfies PermissionKey,
		"MENTOR_READ" satisfies PermissionKey,
		"COUNSELLOR_READ" satisfies PermissionKey,
		"ADMIN_READ" satisfies PermissionKey,
		"SALES_READ" satisfies PermissionKey,
		"SALES_USERS_READ" satisfies PermissionKey,
	]),
	asyncHandler(listUsersController),
);

router.get(
	"/counsellors",
	requireAnyPermissionKey([
		"COUNSELLOR_READ" satisfies PermissionKey,
		"LEAD_DEMO_REQUEST" satisfies PermissionKey,
		"LEAD_DEMO_ASSIGN" satisfies PermissionKey,
	]),
	asyncHandler(listCounsellorsController),
);

router.get(
	"/mentors",
	requireAnyPermissionKey([
		"MENTOR_READ" satisfies PermissionKey,
		"MENTOR_READ_MY" satisfies PermissionKey,
		"MENTOR_READ_ALL" satisfies PermissionKey,
		"LEAD_ASSIGN" satisfies PermissionKey,
		"LEAD_DEMO_ASSIGN" satisfies PermissionKey,
	]),
	asyncHandler(listMentorsController),
);

router.get(
	"/sales",
	requireAnyPermissionKey([
		"SALES_READ" satisfies PermissionKey,
		"SALES_USERS_READ" satisfies PermissionKey,
		"LEAD_ASSIGN" satisfies PermissionKey,
	]),
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
	requireAnyPermissionKey([
		"USER_READ" satisfies PermissionKey,
		"MENTOR_READ" satisfies PermissionKey,
		"COUNSELLOR_READ" satisfies PermissionKey,
		"ADMIN_READ" satisfies PermissionKey,
		"SALES_READ" satisfies PermissionKey,
	]),
	asyncHandler(getUserController),
);
router.patch(
	"/:userId/counsellor",
	requireAnyPermissionKey([
		"LEAD_ASSIGN" satisfies PermissionKey,
		"USER_UPDATE" satisfies PermissionKey,
		"MENTOR_UPDATE" satisfies PermissionKey,
	]),
	asyncHandler(assignUserCounsellorController),
);
router.patch(
	"/:userId",
	requireAnyPermissionKey([
		"USER_UPDATE" satisfies PermissionKey,
		"MENTOR_UPDATE" satisfies PermissionKey,
		"COUNSELLOR_UPDATE" satisfies PermissionKey,
		"ADMIN_UPDATE" satisfies PermissionKey,
		"SALES_UPDATE" satisfies PermissionKey,
	]),
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
	requireAnyPermissionKey([
		"USER_UPDATE" satisfies PermissionKey,
		"MENTOR_UPDATE" satisfies PermissionKey,
		"COUNSELLOR_UPDATE" satisfies PermissionKey,
		"ADMIN_UPDATE" satisfies PermissionKey,
		"SALES_UPDATE" satisfies PermissionKey,
	]),
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
	requireAnyPermissionKey([
		"USER_CHANGE_PASSWORD" satisfies PermissionKey,
		"MENTOR_UPDATE" satisfies PermissionKey,
		"COUNSELLOR_UPDATE" satisfies PermissionKey,
		"ADMIN_UPDATE" satisfies PermissionKey,
		"SALES_UPDATE" satisfies PermissionKey,
	]),
	asyncHandler(changeUserPasswordController),
);
router.delete(
	"/:userId",
	requireAnyPermissionKey([
		"USER_DELETE" satisfies PermissionKey,
		"MENTOR_DELETE" satisfies PermissionKey,
		"COUNSELLOR_DELETE" satisfies PermissionKey,
		"ADMIN_DELETE" satisfies PermissionKey,
		"SALES_DELETE" satisfies PermissionKey,
	]),
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
	requireAnyPermissionKey([
		"USER_UPDATE" satisfies PermissionKey,
		"MENTOR_UPDATE" satisfies PermissionKey,
		"COUNSELLOR_UPDATE" satisfies PermissionKey,
		"ADMIN_UPDATE" satisfies PermissionKey,
		"SALES_UPDATE" satisfies PermissionKey,
	]),
	asyncHandler(assignRoleController),
);
router.delete(
	"/:userId/roles",
	requireAnyPermissionKey([
		"USER_UPDATE" satisfies PermissionKey,
		"MENTOR_UPDATE" satisfies PermissionKey,
		"COUNSELLOR_UPDATE" satisfies PermissionKey,
		"ADMIN_UPDATE" satisfies PermissionKey,
		"SALES_UPDATE" satisfies PermissionKey,
	]),
	asyncHandler(removeRoleController),
);

export default router;
