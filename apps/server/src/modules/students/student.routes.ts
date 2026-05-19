import type { PermissionKey } from "@repo/schema";
import { Router } from "express";
import {
	authMiddleware,
	requirePermissionKey,
} from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import {
	listStudentsController,
	listStudentProcessesController,
	getStudentProcessController,
	recordStudentFollowUpController,
	updateStudentAssessmentController,
 	updateStudentController,
	uploadStudentProfilePicController,
} from "./student.controller.js";
import { getStudentActivitiesController } from "./student-activity.controller.js";
import { upload } from "../../middlewares/upload.middleware.js";

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
 *           enum: [STUDENT, BREAK, DROPPED]
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

router.get(
	"/processes",
	requirePermissionKey("STUDENT_READ" satisfies PermissionKey),
	asyncHandler(listStudentProcessesController),
);

router.get(
	"/processes/:processId",
	requirePermissionKey("STUDENT_READ" satisfies PermissionKey),
	asyncHandler(getStudentProcessController),
);

router.get(
	"/:studentId/activities",
	requirePermissionKey("STUDENT_READ" satisfies PermissionKey),
	asyncHandler(getStudentActivitiesController),
);

router.patch(
	"/:studentId/follow-up",
	requirePermissionKey("STUDENT_READ" satisfies PermissionKey),
	asyncHandler(recordStudentFollowUpController),
);

router.patch(
	"/:studentId/assessments",
	requirePermissionKey("STUDENT_READ" satisfies PermissionKey),
	asyncHandler(updateStudentAssessmentController),
);

router.patch(
	"/:studentId",
	requirePermissionKey("STUDENT_READ" satisfies PermissionKey),
	asyncHandler(updateStudentController),
);

router.post(
	"/:studentId/profile-pic",
	requirePermissionKey("STUDENT_READ" satisfies PermissionKey),
	upload.single("file"),
	asyncHandler(uploadStudentProfilePicController),
);

export default router;
