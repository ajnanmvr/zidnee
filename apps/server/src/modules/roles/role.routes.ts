import type { PermissionKey } from "@repo/schema";
import { Router } from "express";
import {
	authMiddleware,
	requirePermissionKey,
} from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import {
	createRoleController,
	deleteRoleController,
	getRoleController,
	listRolesController,
	updateRoleController,
} from "./role.controller.js";

const router: ReturnType<typeof Router> = Router();

router.use(authMiddleware);

router.post(
	"/",
	requirePermissionKey("ROLE_CREATE" satisfies PermissionKey),
	asyncHandler(createRoleController),
);
router.get(
	"/",
	requirePermissionKey("ROLE_READ" satisfies PermissionKey),
	asyncHandler(listRolesController),
);
router.get(
	"/:roleId",
	requirePermissionKey("ROLE_READ" satisfies PermissionKey),
	asyncHandler(getRoleController),
);
router.patch(
	"/:roleId",
	requirePermissionKey("ROLE_UPDATE" satisfies PermissionKey),
	asyncHandler(updateRoleController),
);
router.delete(
	"/:roleId",
	requirePermissionKey("ROLE_DELETE" satisfies PermissionKey),
	asyncHandler(deleteRoleController),
);

export default router;
