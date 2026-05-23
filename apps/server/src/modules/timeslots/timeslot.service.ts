import type { CreateTimeSlotPayload, TimeSlot } from "@repo/schema";
import { Types } from "mongoose";
import { type TimeSlotDocument, TimeSlotModel } from "./timeslot.model.js";

const toTimeSlot = (doc: TimeSlotDocument): TimeSlot => ({
	id: doc._id.toString(),
	label: doc.label,
	durationMinutes: doc.durationMinutes,
	timesPerWeek: doc.timesPerWeek,
	isActive: doc.isActive,
	createdBy: doc.createdBy?.toString() ?? null,
	createdAt: doc.createdAt,
	updatedAt: doc.updatedAt,
});

const buildTimeSlotLabel = (durationMinutes: number, timesPerWeek: number) => {
	const minuteLabel = durationMinutes === 1 ? "minute class" : "minutes class";
	const weekLabel = timesPerWeek === 1 ? "time a week" : "times a week";
	return `${durationMinutes} ${minuteLabel}, ${timesPerWeek} ${weekLabel}`;
};

export const TimeSlotService = {
	create: async (payload: CreateTimeSlotPayload, createdBy?: string): Promise<TimeSlot> => {
		const label = buildTimeSlotLabel(
			payload.durationMinutes,
			payload.timesPerWeek,
		);
		const timeSlot = await TimeSlotModel.create({
			label,
			durationMinutes: payload.durationMinutes,
			timesPerWeek: payload.timesPerWeek,
			createdBy: createdBy && Types.ObjectId.isValid(createdBy) ? createdBy : undefined,
		});
		return toTimeSlot(timeSlot.toObject() as TimeSlotDocument);
	},

	findAll: async (filters?: { scope?: "mine" | "all"; userId?: string }): Promise<TimeSlot[]> => {
		const query: Record<string, unknown> = { isActive: true };
		if (filters?.scope === "mine" && filters.userId && Types.ObjectId.isValid(filters.userId)) {
			query.createdBy = new Types.ObjectId(filters.userId);
		}
		const timeSlots = await TimeSlotModel.find(query)
			.sort({ label: 1 })
			.lean<TimeSlotDocument[]>();
		return timeSlots.map(toTimeSlot);
	},

	update: async (
		id: string,
		payload: Partial<{
			durationMinutes: number;
			timesPerWeek: number;
			isActive: boolean;
		}>,
	): Promise<TimeSlot> => {
		const update: Partial<TimeSlotDocument> = {};
		if (payload.durationMinutes !== undefined)
			update.durationMinutes = payload.durationMinutes;
		if (payload.timesPerWeek !== undefined)
			update.timesPerWeek = payload.timesPerWeek;
		if (payload.isActive !== undefined) update.isActive = payload.isActive;

		if (
			update.durationMinutes !== undefined ||
			update.timesPerWeek !== undefined
		) {
			const existing = await TimeSlotModel.findById(
				id,
			).lean<TimeSlotDocument | null>();
			if (!existing) throw new Error("Time slot not found");
			const duration = update.durationMinutes ?? existing.durationMinutes;
			const times = update.timesPerWeek ?? existing.timesPerWeek;
			update.label = buildTimeSlotLabel(duration, times);
		}

		const timeSlot = await TimeSlotModel.findByIdAndUpdate(id, update, {
			new: true,
		}).lean<TimeSlotDocument | null>();
		if (!timeSlot) throw new Error("Time slot not found");
		return toTimeSlot(timeSlot);
	},

	remove: async (id: string): Promise<void> => {
		// soft delete
		await TimeSlotModel.findByIdAndUpdate(id, { isActive: false });
	},
};
