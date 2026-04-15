import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import {
	getMeController,
	loginController,
	registerController,
} from "./auth.controller.js";

const router: ReturnType<typeof Router> = Router();

// Auth endpoints (public)
router.post("/login", asyncHandler(loginController));
router.post("/register", asyncHandler(registerController));

// Auth endpoints (protected)
router.get("/me", authMiddleware, asyncHandler(getMeController));

export default router;
