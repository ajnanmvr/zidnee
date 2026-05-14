import type {
	CreateReminderPayload,
	Reminder,
	UpdateReminderPayload,
} from "@repo/schema";
import { AppError } from "../../utils/errors.util.js";
import { type ReminderDocument, ReminderModel } from "./reminder.model.js";

const toReminder = (doc: ReminderDocument): Reminder => {
	return {
		id: doc._id.toString(),
		studentId: doc.studentId.toString(),
		date: doc.date,
		note: doc.note,
		isDone: doc.isDone,
		createdBy: doc.createdBy.toString(),
		assignedTo: doc.assignedTo.toString(),
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	};
};

export const ReminderService = {
	createReminder: async (
		studentId: string,
		createdBy: string,
		payload: CreateReminderPayload,
	): Promise<Reminder> => {
		const reminder = await ReminderModel.create({
			studentId,
			createdBy,			assignedTo: createdBy,			date: payload.date,
			note: payload.note,
		});

		return toReminder(reminder.toObject() as ReminderDocument);
	},

	getRemindersByStudent: async (studentId: string): Promise<Reminder[]> => {
		const reminders = await ReminderModel.find({ studentId })
			.sort({ date: -1 })
			.lean<ReminderDocument[]>();

		return reminders.map(toReminder);
	},

	getAllReminders: async (filters?: {
		isDone?: boolean;
		sortBy?: "date" | "createdAt";
		sortOrder?: "asc" | "desc";
	}): Promise<Reminder[]> => {
		const query: Record<string, unknown> = {};

		if (filters?.isDone !== undefined) {
			query.isDone = filters.isDone;
		}

		const sortField = filters?.sortBy === "createdAt" ? "createdAt" : "date";
		const sortOrder = filters?.sortOrder === "asc" ? 1 : -1;

		const reminders = await ReminderModel.find(query)
			.sort({ [sortField]: sortOrder })
			.lean<ReminderDocument[]>();

		return reminders.map(toReminder);
	},

	updateReminder: async (
		reminderId: string,
		payload: UpdateReminderPayload,
	): Promise<Reminder | null> => {
		const updateData: Record<string, unknown> = {};

		if (payload.isDone !== undefined) {
			updateData.isDone = payload.isDone;
		}
		if (payload.note !== undefined) {
			updateData.note = payload.note;
		}
		if (payload.date !== undefined) {
			updateData.date = payload.date;
		}

		if (Object.keys(updateData).length === 0) {
			throw new AppError(400, "No fields to update");
		}

		const reminder = await ReminderModel.findByIdAndUpdate(
			reminderId,
			{ $set: updateData },
			{ returnDocument: "after" },
		).lean<ReminderDocument | null>();

		return reminder ? toReminder(reminder) : null;
	},

	deleteReminder: async (reminderId: string): Promise<void> => {
		await ReminderModel.findByIdAndDelete(reminderId);
	},
};
