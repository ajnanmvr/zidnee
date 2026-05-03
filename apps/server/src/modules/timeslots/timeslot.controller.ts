import { CreateTimeSlotPayloadSchema } from "@repo/schema";
import type { Request, Response } from "express";
import { ValidationError } from "../../utils/errors.util.js";
import { TimeSlotService } from "./timeslot.service.js";

const toTimeSlotResponse = (timeSlot: Awaited<ReturnType<typeof TimeSlotService.create>>) => ({
	id: timeSlot.id,
	label: timeSlot.label,
	isActive: timeSlot.isActive,
	createdAt: timeSlot.createdAt?.toISOString() ?? null,
	updatedAt: timeSlot.updatedAt?.toISOString() ?? null,
});

export const listTimeSlotsController = async (_req: Request, res: Response): Promise<void> => {
	const timeSlots = await TimeSlotService.findAll();
	res.json({
		ok: true,
		timeSlots: timeSlots.map(toTimeSlotResponse),
	});
};

export const createTimeSlotController = async (req: Request, res: Response): Promise<void> => {
	const result = CreateTimeSlotPayloadSchema.safeParse(req.body);
	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	const timeSlot = await TimeSlotService.create(result.data);

	res.status(201).json({
		ok: true,
		timeSlot: toTimeSlotResponse(timeSlot),
	});
};