import type { PermissionKey } from "@repo/schema";
import { Router } from "express";
import {
	authMiddleware,
	requirePermissionKey,
} from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import {
	createReminderController,
	deleteReminderController,
	getAllRemindersController,
	getStudentRemindersController,
	updateReminderController,
} from "./reminder.controller.js";

const router: ReturnType<typeof Router> = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /api/reminders/students/{studentId}:
 *   post:
 *     tags:
 *       - Reminders
 *     summary: Create a reminder for a student
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateReminderPayload'
 *     responses:
 *       201:
 *         description: Reminder created
 */
router.post(
	"/students/:studentId",
	requirePermissionKey("STUDENT_READ" satisfies PermissionKey),
	asyncHandler(createReminderController),
);

/**
 * @swagger
 * /api/reminders/students/{studentId}:
 *   get:
 *     tags:
 *       - Reminders
 *     summary: Get all reminders for a student
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of reminders
 */
router.get(
	"/students/:studentId",
	requirePermissionKey("STUDENT_READ" satisfies PermissionKey),
	asyncHandler(getStudentRemindersController),
);

/**
 * @swagger
 * /api/reminders:
 *   get:
 *     tags:
 *       - Reminders
 *     summary: Get all reminders (paginated)
 *     parameters:
 *       - in: query
 *         name: isDone
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [date, createdAt]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: List of all reminders
 */
router.get(
	"/",
	requirePermissionKey("STUDENT_READ" satisfies PermissionKey),
	asyncHandler(getAllRemindersController),
);

/**
 * @swagger
 * /api/reminders/{reminderId}:
 *   patch:
 *     tags:
 *       - Reminders
 *     summary: Update a reminder
 *     parameters:
 *       - in: path
 *         name: reminderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateReminderPayload'
 *     responses:
 *       200:
 *         description: Reminder updated
 */
router.patch(
	"/:reminderId",
	requirePermissionKey("STUDENT_READ" satisfies PermissionKey),
	asyncHandler(updateReminderController),
);

/**
 * @swagger
 * /api/reminders/{reminderId}:
 *   delete:
 *     tags:
 *       - Reminders
 *     summary: Delete a reminder
 *     parameters:
 *       - in: path
 *         name: reminderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reminder deleted
 */
router.delete(
	"/:reminderId",
	requirePermissionKey("STUDENT_READ" satisfies PermissionKey),
	asyncHandler(deleteReminderController),
);

export default router;
