import type { PermissionKey } from "@repo/schema";
import { Router } from "express";
import {
	authMiddleware,
	requirePermissionKey,
} from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import {
	getPermissionController,
	listPermissionsController,
} from "./permission.controller.js";

const router: ReturnType<typeof Router> = Router();

router.use(authMiddleware);

router.get(
	"/",
	requirePermissionKey("PERMISSION_READ" satisfies PermissionKey),
	asyncHandler(listPermissionsController),
);
router.get(
	"/:permissionId",
	requirePermissionKey("PERMISSION_READ" satisfies PermissionKey),
	asyncHandler(getPermissionController),
);

export default router;
