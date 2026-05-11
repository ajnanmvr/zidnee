import type { PermissionKey } from "@repo/schema";
import { Router } from "express";
import {
	authMiddleware,
	requirePermissionKey,
} from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import { listStudentsController } from "./student.controller.js";

const router: ReturnType<typeof Router> = Router();

router.use(authMiddleware);

router.get(
	"/",
	requirePermissionKey("STUDENT_READ" satisfies PermissionKey),
	asyncHandler(listStudentsController),
);

export default router;
