import type { CreateTimeSlotPayload, TimeSlot } from "@repo/schema";
import { TimeSlotModel, type TimeSlotDocument } from "./timeslot.model.js";

const toTimeSlot = (doc: TimeSlotDocument): TimeSlot => ({
	id: doc._id.toString(),
	label: doc.label,
	isActive: doc.isActive,
	createdAt: doc.createdAt,
	updatedAt: doc.updatedAt,
});

export const TimeSlotService = {
	create: async (payload: CreateTimeSlotPayload): Promise<TimeSlot> => {
		const label = payload.label.trim();
		const timeSlot = await TimeSlotModel.create({ label });
		return toTimeSlot(timeSlot.toObject() as TimeSlotDocument);
	},

	findAll: async (): Promise<TimeSlot[]> => {
		const timeSlots = await TimeSlotModel.find({ isActive: true }).sort({ label: 1 }).lean<TimeSlotDocument[]>();
		return timeSlots.map(toTimeSlot);
	},
};