import { Router } from "express";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { createTimeSlotController, listTimeSlotsController } from "./timeslot.controller.js";

const router: ReturnType<typeof Router> = Router();

router.get("/", asyncHandler(listTimeSlotsController));

router.use(authMiddleware);

router.post("/", asyncHandler(createTimeSlotController));

export default router;