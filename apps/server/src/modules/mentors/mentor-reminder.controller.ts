import {
	CreateReminderPayloadSchema,
	ReminderResponseSchema,
	RemindersResponseSchema,
	UpdateReminderPayloadSchema,
} from "@repo/schema";
import type { Request, Response } from "express";
import { NotFoundError, ValidationError } from "../../utils/errors.util.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import { requireStringValue } from "../rbac/rbac.http.js";
import { MentorActivityService } from "./mentor-activity.service.js";
import { MentorReminderService } from "./mentor-reminder.service.js";

export const createMentorReminderController = asyncHandler(
	async (req: Request, res: Response): Promise<void> => {
		const mentorId = requireStringValue(req.params.mentorId, "mentorId");
		const performedBy = requireStringValue(req.user?.userId, "userId");

		const result = CreateReminderPayloadSchema.safeParse(req.body);
		if (!result.success) {
			throw new ValidationError(result.error.flatten().fieldErrors);
		}

		const reminder = await MentorReminderService.createReminder(
			mentorId as string,
			performedBy,
			result.data,
		);

		// Map to mentor-specific reminder shape expected by client
		const mapped = {
			id: reminder.id,
			mentorId: reminder.linkedPerson.id,
			date: reminder.date,
			note: reminder.note,
			isDone: reminder.isDone,
			createdBy: reminder.createdBy,
			assignedTo: reminder.assignedTo,
			createdAt: reminder.createdAt,
			updatedAt: reminder.updatedAt,
		};

		console.debug("Sending mentor create reminder response:", mapped);
		await MentorActivityService.logActivity({
			mentorId,
			type: "REMINDER_CREATED",
			performedBy: requireStringValue(req.user?.userId, "userId"),
			performedByName: req.user?.username ?? "Unknown",
			description: "Created a mentor reminder",
			note: result.data.note,
			newValue: {
				date: result.data.date.toISOString(),
				note: result.data.note,
			},
		});
		res.status(201).json({ ok: true, reminder: mapped });
	},
);

export const getMentorRemindersController = asyncHandler(
	async (req: Request, res: Response): Promise<void> => {
		const mentorId = requireStringValue(req.params.mentorId, "mentorId");

		const reminders = await MentorReminderService.getRemindersByMentor(
			mentorId as string,
		);

		const mapped = reminders.map((r) => ({
			id: r.id,
			mentorId: r.linkedPerson.id,
			date: r.date,
			note: r.note,
			isDone: r.isDone,
			createdBy: r.createdBy,
			assignedTo: r.assignedTo,
			createdAt: r.createdAt,
			updatedAt: r.updatedAt,
		}));

		console.debug("Sending mentor reminders list response (count=", mapped.length, "):", mapped);
		res.json({ ok: true, reminders: mapped });
	},
);

export const updateMentorReminderController = asyncHandler(
	async (req: Request, res: Response): Promise<void> => {
		const reminderId = requireStringValue(req.params.reminderId, "reminderId");

		const result = UpdateReminderPayloadSchema.safeParse(req.body);
		if (!result.success) {
			throw new ValidationError(result.error.flatten().fieldErrors);
		}

		const reminder = await MentorReminderService.updateReminder(
			reminderId as string,
			result.data,
		);

		if (!reminder) {
			throw new NotFoundError("Reminder");
		}

		const mapped = {
			id: reminder.id,
			mentorId: reminder.linkedPerson.id,
			date: reminder.date,
			note: reminder.note,
			isDone: reminder.isDone,
			createdBy: reminder.createdBy,
			assignedTo: reminder.assignedTo,
			createdAt: reminder.createdAt,
			updatedAt: reminder.updatedAt,
		};

		console.debug("Sending mentor update reminder response:", mapped);
		await MentorActivityService.logActivity({
			mentorId: reminder.linkedPerson.id,
			type: "REMINDER_UPDATED",
			performedBy: requireStringValue(req.user?.userId, "userId"),
			performedByName: req.user?.username ?? "Unknown",
			description: "Updated a mentor reminder",
			newValue: result.data,
		});
		res.json({ ok: true, reminder: mapped });
	},
);

export const deleteMentorReminderController = asyncHandler(
	async (req: Request, res: Response): Promise<void> => {
		const reminderId = requireStringValue(req.params.reminderId, "reminderId");

		const reminder = await MentorReminderService.deleteReminder(reminderId as string);

		if (reminder) {
			await MentorActivityService.logActivity({
				mentorId: reminder.linkedPerson.id,
				type: "REMINDER_DELETED",
				performedBy: requireStringValue(req.user?.userId, "userId"),
				performedByName: req.user?.username ?? "Unknown",
				description: "Deleted a mentor reminder",
				note: reminder.note,
				oldValue: {
					date: reminder.date.toISOString(),
					note: reminder.note,
					isDone: reminder.isDone,
				},
			});
		}

		res.json({ ok: true, message: "Reminder deleted successfully" });
	},
);
