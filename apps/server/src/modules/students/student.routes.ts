import type { PermissionKey } from "@repo/schema";
import { Router } from "express";
import {
	authMiddleware,
	requireAnyPermissionKey,
	requirePermissionKey,
} from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import {
	listStudentsController,
	getStudentByIdController,
	listStudentProcessesController,
	listStudentProcessHistoryController,
	getStudentProcessController,
	markStudentProcessTaskController,
	setStudentProcessTaskCompletionController,
	completeStudentProcessController,
	deleteStudentProcessController,
	recordStudentFollowUpController,
	updateStudentAssessmentController,
 	updateStudentController,
	uploadStudentProfilePicController,
} from "./student.controller.js";
import { getStudentActivitiesController } from "./student-activity.controller.js";
import {
	uploadStudentProfilePicController as publicUploadStudentProfilePicController,
	getStudentPublicProfileStatusController,
	confirmStudentClassStartController,
	getStudentPublicProfileImageController,
} from "./student-profile-upload.controller.js";
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
	requireAnyPermissionKey([
		"STUDENT_READ_MY" satisfies PermissionKey,
		"STUDENT_READ_ALL" satisfies PermissionKey,
		"STUDENT_POSTER_DOWNLOAD" satisfies PermissionKey,
		"STUDENT_EXPORT" satisfies PermissionKey,
		// admittedBy=me/all view uses lead-read permissions, not student-read
		"LEADS_CONVERTED_READ" satisfies PermissionKey,
		"LEAD_READ_MY" satisfies PermissionKey,
		"LEAD_READ_ALL" satisfies PermissionKey,
	]),
	asyncHandler(listStudentsController),
);

router.get(
	"/processes",
	requireAnyPermissionKey([
		"STUDENT_PROCESS_READ_MY" satisfies PermissionKey,
		"STUDENT_PROCESS_READ_ALL" satisfies PermissionKey,
	]),
	asyncHandler(listStudentProcessesController),
);

router.get(
	"/process-history",
	requireAnyPermissionKey([
		"STUDENT_PROCESS_HISTORY_READ_MY" satisfies PermissionKey,
		"STUDENT_PROCESS_HISTORY_READ_ALL" satisfies PermissionKey,
	]),
	asyncHandler(listStudentProcessHistoryController),
);

router.get(
	"/processes/:processId",
	requireAnyPermissionKey([
		"STUDENT_PROCESS_READ_MY" satisfies PermissionKey,
		"STUDENT_PROCESS_READ_ALL" satisfies PermissionKey,
	]),
	asyncHandler(getStudentProcessController),
);

router.post(
    "/processes/:processId/tasks/:taskKey/complete",
    requirePermissionKey("STUDENT_UPDATE" satisfies PermissionKey),
    asyncHandler(markStudentProcessTaskController),
);

router.post(
	"/processes/:processId/tasks/:taskKey/set",
	requirePermissionKey("STUDENT_UPDATE" satisfies PermissionKey),
	asyncHandler(setStudentProcessTaskCompletionController),
);

router.post(
	"/processes/:processId/complete",
	requirePermissionKey("STUDENT_UPDATE" satisfies PermissionKey),
	asyncHandler(completeStudentProcessController),
);

router.delete(
	"/processes/:processId",
	requirePermissionKey("STUDENT_UPDATE" satisfies PermissionKey),
	asyncHandler(deleteStudentProcessController),
);

router.get(
	"/:studentId/activities",
	requireAnyPermissionKey([
		"STUDENT_PROFILE_READ" satisfies PermissionKey,
		"STUDENT_READ_MY" satisfies PermissionKey,
		"STUDENT_READ_ALL" satisfies PermissionKey,
	]),
	asyncHandler(getStudentActivitiesController),
);

router.get(
	"/:studentId",
	requireAnyPermissionKey([
		"STUDENT_PROFILE_READ" satisfies PermissionKey,
		"STUDENT_READ_MY" satisfies PermissionKey,
		"STUDENT_READ_ALL" satisfies PermissionKey,
	]),
	asyncHandler(getStudentByIdController),
);

router.patch(
	"/:studentId/follow-up",
	requireAnyPermissionKey([
		"STUDENT_READ_MY" satisfies PermissionKey,
		"STUDENT_READ_ALL" satisfies PermissionKey,
	]),
	asyncHandler(recordStudentFollowUpController),
);

router.patch(
	"/:studentId/assessments",
	requireAnyPermissionKey([
		"STUDENT_READ_MY" satisfies PermissionKey,
		"STUDENT_READ_ALL" satisfies PermissionKey,
	]),
	asyncHandler(updateStudentAssessmentController),
);

router.patch(
	"/:studentId",
	requireAnyPermissionKey([
		"STUDENT_READ_MY" satisfies PermissionKey,
		"STUDENT_READ_ALL" satisfies PermissionKey,
	]),
	asyncHandler(updateStudentController),
);

router.post(
	"/:studentId/profile-pic",
	requireAnyPermissionKey([
		"STUDENT_READ_MY" satisfies PermissionKey,
		"STUDENT_READ_ALL" satisfies PermissionKey,
	]),
	upload.single("file"),
	asyncHandler(uploadStudentProfilePicController),
);

export default router;

// Public routes (no authentication required)
export const publicStudentRoutes: ReturnType<typeof Router> = Router();

/**
 * @swagger
 * /form/student/{studentId}/profile-upload:
 *   post:
 *     tags:
 *       - Public
 *     summary: Upload student profile picture (public)
 *     description: Upload profile picture for a student without authentication
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profilePic:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile picture uploaded successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Student not found
 */
publicStudentRoutes.post(
	"/student/:studentId/profile-upload",
	upload.single("profilePic"),
	asyncHandler(publicUploadStudentProfilePicController),
);

publicStudentRoutes.get(
	"/student/:studentId/profile-status",
	asyncHandler(getStudentPublicProfileStatusController),
);

publicStudentRoutes.get(
	"/student/:studentId/profile-image",
	asyncHandler(getStudentPublicProfileImageController),
);

publicStudentRoutes.post(
  "/student/:studentId/confirm-class-start",
  asyncHandler(confirmStudentClassStartController),
);
