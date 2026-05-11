import type { PermissionKey } from "@repo/schema";
import { Router } from "express";
import {
	authMiddleware,
	requirePermissionKey,
} from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import { listStudentsController } from "./student.controller.js";

const router: ReturnType<typeof Router> = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /api/students:
 *   get:
 *     tags:
 *       - Students
 *     summary: List all students
 *     description: Retrieve a paginated list of students (requires STUDENT_READ permission)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, COMPLETED, DROPPED]
 *     responses:
 *       200:
 *         description: List of students with ZID, name, level, and status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Student'
 */
router.get(
	"/",
	requirePermissionKey("STUDENT_READ" satisfies PermissionKey),
	asyncHandler(listStudentsController),
);

export default router;
