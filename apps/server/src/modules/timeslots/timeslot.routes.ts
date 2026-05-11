import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import {
	createTimeSlotController,
	deleteTimeSlotController,
	listTimeSlotsController,
	updateTimeSlotController,
} from "./timeslot.controller.js";

const router: ReturnType<typeof Router> = Router();

// Public endpoint for form options
router.get("/time-slots", asyncHandler(listTimeSlotsController));

// Authenticated endpoint used by dashboard pages
router.get("/", authMiddleware, asyncHandler(listTimeSlotsController));

router.use(authMiddleware);

router.post("/", asyncHandler(createTimeSlotController));

router.patch("/:id", asyncHandler(updateTimeSlotController));

router.delete("/:id", asyncHandler(deleteTimeSlotController));

export default router;
