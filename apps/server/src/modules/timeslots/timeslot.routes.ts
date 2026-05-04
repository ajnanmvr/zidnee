import { Router } from "express";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { createTimeSlotController, listTimeSlotsController, updateTimeSlotController, deleteTimeSlotController } from "./timeslot.controller.js";

const router: ReturnType<typeof Router> = Router();

router.get("/", asyncHandler(listTimeSlotsController));

router.use(authMiddleware);

router.post("/", asyncHandler(createTimeSlotController));

router.patch("/:id", asyncHandler(updateTimeSlotController));

router.delete("/:id", asyncHandler(deleteTimeSlotController));

export default router;