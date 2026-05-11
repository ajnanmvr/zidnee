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

/**
 * @swagger
 * /api/form/options/time-slots:
 *   get:
 *     tags:
 *       - Time Slots
 *     summary: Get available time slots (public)
 *     description: Retrieve available time slots for form options (public endpoint)
 *     responses:
 *       200:
 *         description: List of available time slots
 */
// Public endpoint for form options
router.get("/time-slots", asyncHandler(listTimeSlotsController));

/**
 * @swagger
 * /api/time-slots:
 *   post:
 *     tags:
 *       - Time Slots
 *     summary: Create time slot
 *     description: Create a new time slot
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               day:
 *                 type: string
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
 *     responses:
 *       201:
 *         description: Time slot created
 *   get:
 *     tags:
 *       - Time Slots
 *     summary: List time slots
 *     description: Retrieve all time slots
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of time slots
 */
// Authenticated endpoint used by dashboard pages
router.get("/", authMiddleware, asyncHandler(listTimeSlotsController));

router.use(authMiddleware);

router.post("/", asyncHandler(createTimeSlotController));

/**
 * @swagger
 * /api/time-slots/{id}:
 *   patch:
 *     tags:
 *       - Time Slots
 *     summary: Update time slot
 *     description: Update a time slot
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Time slot updated
 *   delete:
 *     tags:
 *       - Time Slots
 *     summary: Delete time slot
 *     description: Delete a time slot
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       204:
 *         description: Time slot deleted
 */
router.patch("/:id", asyncHandler(updateTimeSlotController));

router.delete("/:id", asyncHandler(deleteTimeSlotController));

export default router;
