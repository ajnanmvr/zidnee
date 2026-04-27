import type { PermissionKey } from "@repo/schema";
import { Router } from "express";
import {
	authMiddleware,
	requirePermissionKey,
} from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import {
	assignRoleController,
	changeMyPasswordController,
	changeUserPasswordController,
	createUserController,
	deleteUserController,
	getUserController,
	listUsersController,
	removeRoleController,
	setUserStatusController,
	updateUserController,
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
router.patch("/me/password", asyncHandler(changeMyPasswordController));
router.get(
	"/:userId",
	requirePermissionKey("USER_READ" satisfies PermissionKey),
	asyncHandler(getUserController),
);
router.patch(
	"/:userId",
	requirePermissionKey("USER_UPDATE" satisfies PermissionKey),
	asyncHandler(updateUserController),
);
router.patch(
	"/:userId/status",
	requirePermissionKey("USER_UPDATE" satisfies PermissionKey),
	asyncHandler(setUserStatusController),
);
router.patch(
	"/:userId/password",
	requirePermissionKey("USER_UPDATE" satisfies PermissionKey),
	asyncHandler(changeUserPasswordController),
);
router.delete(
	"/:userId",
	requirePermissionKey("USER_DELETE" satisfies PermissionKey),
	asyncHandler(deleteUserController),
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
