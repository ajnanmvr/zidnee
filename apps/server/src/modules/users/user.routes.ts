import type { PermissionKey } from "@repo/schema";
import { Router } from "express";
import {
	authMiddleware,
	requirePermissionKey,
} from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import {
	createUserController,
	assignRoleController,
	getUserController,
	listUsersController,
	removeRoleController,
} from "./user.controller.js";

const router: ReturnType<typeof Router> = Router();

router.use(authMiddleware);

router.post(
	"/",
	requirePermissionKey("USER_CREATE" satisfies PermissionKey),
	asyncHandler(createUserController),
);
router.get(
	"/",
	requirePermissionKey("USER_READ" satisfies PermissionKey),
	asyncHandler(listUsersController),
);
router.get(
	"/:userId",
	requirePermissionKey("USER_READ" satisfies PermissionKey),
	asyncHandler(getUserController),
);
router.post(
	"/:userId/roles",
	requirePermissionKey("USER_UPDATE" satisfies PermissionKey),
	asyncHandler(assignRoleController),
);
router.delete(
	"/:userId/roles",
	requirePermissionKey("USER_UPDATE" satisfies PermissionKey),
	asyncHandler(removeRoleController),
);

export default router;
