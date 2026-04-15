import { Router } from "express";
import {
	authMiddleware,
	requirePermission,
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
	requirePermission({ resource: "roles", action: "create" }),
	asyncHandler(createRoleController),
);
router.get(
	"/",
	requirePermission({ resource: "roles", action: "read" }),
	asyncHandler(listRolesController),
);
router.get(
	"/:roleId",
	requirePermission({ resource: "roles", action: "read" }),
	asyncHandler(getRoleController),
);
router.patch(
	"/:roleId",
	requirePermission({ resource: "roles", action: "update" }),
	asyncHandler(updateRoleController),
);
router.delete(
	"/:roleId",
	requirePermission({ resource: "roles", action: "delete" }),
	asyncHandler(deleteRoleController),
);

export default router;
