import type { PermissionKey } from "@repo/schema";
import { Router } from "express";
import {
	authMiddleware,
	requirePermissionKey,
} from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import {
	assignDemoMentorController,
	confirmAdmissionController,
	createLeadController,
	deleteLeadController,
	getLeadByIdController,
	listAdmissionLeadsController,
	listLeadsController,
	listPendingDemoRequestsController,
	listDemoRequestsController,
	markDemoCompletedController,
	requestAdmissionController,
	requestLeadDemoController,
	redemoLeadController,
	postponeLeadFollowUpController,
	updateLeadController,
} from "./lead.controller.js";
import { getLeadActivitiesController } from "./activity.controller.js";

const router: ReturnType<typeof Router> = Router();

router.use(authMiddleware);

router.post(
	"/",
	requirePermissionKey("LEAD_CREATE" satisfies PermissionKey),
	asyncHandler(createLeadController),
);

router.get(
	"/",
	requirePermissionKey("LEAD_READ" satisfies PermissionKey),
	asyncHandler(listLeadsController),
);

router.get(
	"/for-demo",
	requirePermissionKey("LEAD_READ" satisfies PermissionKey),
	asyncHandler(listPendingDemoRequestsController),
);

router.get(
	"/demo-requests",
	requirePermissionKey("LEAD_READ" satisfies PermissionKey),
	asyncHandler(listDemoRequestsController),
);

router.get(
	"/admissions",
	requirePermissionKey("LEAD_READ" satisfies PermissionKey),
	asyncHandler(listAdmissionLeadsController),
);

router.get(
	"/:leadId",
	requirePermissionKey("LEAD_READ" satisfies PermissionKey),
	asyncHandler(getLeadByIdController),
);

router.patch(
	"/:leadId",
	requirePermissionKey("LEAD_UPDATE" satisfies PermissionKey),
	asyncHandler(updateLeadController),
);

router.patch(
	"/:leadId/follow-up/postpone",
	requirePermissionKey("LEAD_UPDATE" satisfies PermissionKey),
	asyncHandler(postponeLeadFollowUpController),
);

router.patch(
	"/:leadId/demo/request",
	requirePermissionKey("LEAD_UPDATE" satisfies PermissionKey),
	asyncHandler(requestLeadDemoController),
);

router.patch(
	"/:leadId/demo/complete",
	requirePermissionKey("LEAD_UPDATE" satisfies PermissionKey),
	asyncHandler(markDemoCompletedController),
);

router.patch(
	"/:leadId/demo/redemo",
	requirePermissionKey("LEAD_UPDATE" satisfies PermissionKey),
	asyncHandler(redemoLeadController),
);

router.patch(
	"/:leadId/admission/request",
	requirePermissionKey("LEAD_UPDATE" satisfies PermissionKey),
	asyncHandler(requestAdmissionController),
);

router.patch(
	"/:leadId/admission/confirm",
	requirePermissionKey("LEAD_UPDATE" satisfies PermissionKey),
	asyncHandler(confirmAdmissionController),
);

router.patch(
	"/:leadId/demo/assign",
	requirePermissionKey("LEAD_UPDATE" satisfies PermissionKey),
	asyncHandler(assignDemoMentorController),
);

router.delete(
	"/:leadId",
	requirePermissionKey("LEAD_DELETE" satisfies PermissionKey),
	asyncHandler(deleteLeadController),
);

router.get(
	"/:leadId/activities",
	requirePermissionKey("LEAD_READ" satisfies PermissionKey),
	asyncHandler(getLeadActivitiesController),
);

export default router;
