import { Router } from "express";
import {
	authMiddleware,
	requirePermission,
} from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import {
	createPermissionController,
	deletePermissionController,
	getPermissionController,
	listPermissionsController,
} from "./permission.controller.js";

const router: ReturnType<typeof Router> = Router();

router.use(authMiddleware);

router.post(
	"/",
	requirePermission({ resource: "permissions", action: "create" }),
	asyncHandler(createPermissionController),
);
router.get(
	"/",
	requirePermission({ resource: "permissions", action: "read" }),
	asyncHandler(listPermissionsController),
);
router.get(
	"/:permissionId",
	requirePermission({ resource: "permissions", action: "read" }),
	asyncHandler(getPermissionController),
);
router.delete(
	"/:permissionId",
	requirePermission({ resource: "permissions", action: "delete" }),
	asyncHandler(deletePermissionController),
);

export default router;
