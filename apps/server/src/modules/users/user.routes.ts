import { Router } from "express";
import {
	authMiddleware,
	requirePermission,
} from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import {
	assignRoleController,
	getUserController,
	listUsersController,
	removeRoleController,
} from "./user.controller.js";

const router: ReturnType<typeof Router> = Router();

router.use(authMiddleware);

router.get("/", requirePermission({ resource: "users", action: "read" }), asyncHandler(listUsersController));
router.get("/:userId", requirePermission({ resource: "users", action: "read" }), asyncHandler(getUserController));
router.post("/:userId/roles", requirePermission({ resource: "users", action: "update" }), asyncHandler(assignRoleController));
router.delete("/:userId/roles", requirePermission({ resource: "users", action: "update" }), asyncHandler(removeRoleController));

export default router;
