import type { PermissionKey } from "@repo/schema";
import { Router } from "express";
import {
	authMiddleware,
	requirePermissionKey,
} from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import {
	createLeadController,
	listDueLeadFollowUpsController,
	postponeLeadFollowUpController,
} from "./lead.controller.js";

const router: ReturnType<typeof Router> = Router();

router.use(authMiddleware);

router.post(
	"/",
	requirePermissionKey("LEAD_CREATE" satisfies PermissionKey),
	asyncHandler(createLeadController),
);

router.get(
	"/follow-ups/due",
	requirePermissionKey("LEAD_READ" satisfies PermissionKey),
	asyncHandler(listDueLeadFollowUpsController),
);

router.patch(
	"/:leadId/follow-up/postpone",
	requirePermissionKey("LEAD_UPDATE" satisfies PermissionKey),
	asyncHandler(postponeLeadFollowUpController),
);

export default router;
