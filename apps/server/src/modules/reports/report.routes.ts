import type { PermissionKey } from "@repo/schema";
import { Router } from "express";
import {
	authMiddleware,
	requirePermissionKey,
} from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import { getCounsellorReportController } from "./report.controller.js";

const router: ReturnType<typeof Router> = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /api/reports/counsellor:
 *   get:
 *     tags: [Reports]
 *     summary: Counsellor report
 *     description: >
 *       Student status, break/drop details, follow-up quality, trends and
 *       distributions for one counsellor (or all counsellors) over a timeframe.
 *       Requires VIEW_REPORTS.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: counsellorId
 *         schema: { type: string }
 *         description: Omit to aggregate across all counsellors
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 */
router.get(
	"/counsellor",
	requirePermissionKey("VIEW_REPORTS" satisfies PermissionKey),
	asyncHandler(getCounsellorReportController),
);

export default router;
