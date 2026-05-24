import type {
	CreateReminderPayload,
	Reminder,
	UpdateReminderPayload,
} from "@repo/schema";
import { AppError } from "../../utils/errors.util.js";
import { type ReminderDocument, ReminderModel } from "./reminder.model.js";
import { UserModel } from "../users/user.model.js";
import { StudentModel } from "../students/student.model.js";

const toReminder = (doc: ReminderDocument): Reminder => {
	const assignedTo = doc.assignedTo?.toString() ?? doc.createdBy.toString();

	return {
		id: doc._id.toString(),
		linkedPerson: {
			id: doc.linkedPersonId.toString(),
			type: doc.linkedPersonType as "mentor" | "student",
		},
		date: doc.date,
		note: doc.note,
		isDone: doc.isDone,
		createdBy: doc.createdBy.toString(),
		assignedTo,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	};
};

export const ReminderService = {
	createReminder: async (
		linkedPersonId: string,
		linkedPersonType: "mentor" | "student",
		createdBy: string,
		payload: CreateReminderPayload,
	): Promise<Reminder> => {
		const reminder = await ReminderModel.create({
			linkedPersonId,
			linkedPersonType,
			createdBy,
			assignedTo: createdBy,
			date: payload.date,
			note: payload.note,
		});

		return toReminder(reminder.toObject() as ReminderDocument);
	},

	getRemindersByPerson: async (
		linkedPersonId: string,
		linkedPersonType: "mentor" | "student",
	): Promise<Reminder[]> => {
		const reminders = await ReminderModel.find({
			linkedPersonId,
			linkedPersonType,
		})
			.sort({ date: -1 })
			.lean<ReminderDocument[]>();

		return reminders.map(toReminder);
	},

	getAllReminders: async (filters?: {
		isDone?: boolean;
		sortBy?: "date" | "createdAt";
		sortOrder?: "asc" | "desc";
		scope?: "mine" | "all";
		userId?: string;
	}): Promise<Reminder[]> => {
		const query: Record<string, unknown> = {};

		if (filters?.isDone !== undefined) {
			query.isDone = filters.isDone;
		}
		if (filters?.scope === "mine" && filters.userId) {
			const mentorIds = await UserModel.find({
				counsellorId: filters.userId,
			} as any).distinct("_id");

			const studentIds =
				mentorIds.length > 0
					? await StudentModel.find({ mentorId: { $in: mentorIds } }).distinct("_id")
					: [];

			const scopeOr: Array<Record<string, unknown>> = [
				{ assignedTo: filters.userId },
			];

			if (mentorIds.length > 0) {
				scopeOr.push({
					linkedPersonType: "mentor",
					linkedPersonId: { $in: mentorIds },
				});
			}

			if (studentIds.length > 0) {
				scopeOr.push({
					linkedPersonType: "student",
					linkedPersonId: { $in: studentIds },
				});
			}

			query.$or = scopeOr;
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

	getReminderById: async (reminderId: string): Promise<Reminder | null> => {
		const reminder = await ReminderModel.findById(reminderId).lean<ReminderDocument | null>();
		return reminder ? toReminder(reminder) : null;
	},

	deleteReminder: async (reminderId: string): Promise<Reminder | null> => {
		const deleted = await ReminderModel.findByIdAndDelete(reminderId).lean<ReminderDocument | null>();
		return deleted ? toReminder(deleted) : null;
	},
};
