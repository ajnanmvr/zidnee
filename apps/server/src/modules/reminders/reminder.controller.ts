import {
	CreateReminderPayloadSchema,
	ReminderResponseSchema,
	RemindersResponseSchema,
	UpdateReminderPayloadSchema,
} from "@repo/schema";
import type { Request, Response } from "express";
import { requireStringValue } from "../rbac/rbac.http.js";
import { ReminderService } from "./reminder.service.js";

export const createReminderController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const studentId = requireStringValue(req.params.studentId, "studentId");
	const createdBy = requireStringValue(req.user?.userId, "userId");
	const payload = CreateReminderPayloadSchema.parse(req.body);

	const reminder = await ReminderService.createReminder(
		studentId,
		createdBy,
		payload,
	);

	res.status(201).json(
		ReminderResponseSchema.parse({
			ok: true,
			reminder,
		}),
	);
};

export const getStudentRemindersController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const studentId = requireStringValue(req.params.studentId, "studentId");

	const reminders = await ReminderService.getRemindersByStudent(studentId);

	res.json(
		RemindersResponseSchema.parse({
			ok: true,
			reminders,
		}),
	);
};

export const getAllRemindersController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const isDone = req.query.isDone ? req.query.isDone === "true" : undefined;
	const sortBy = req.query.sortBy === "createdAt" ? "createdAt" : "date";
	const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";

	const reminders = await ReminderService.getAllReminders({
		isDone,
		sortBy,
		sortOrder,
	});

	res.json(
		RemindersResponseSchema.parse({
			ok: true,
			reminders,
		}),
	);
};

export const updateReminderController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const reminderId = requireStringValue(req.params.reminderId, "reminderId");
	const payload = UpdateReminderPayloadSchema.parse(req.body);

	const reminder = await ReminderService.updateReminder(reminderId, payload);

	res.json(
		ReminderResponseSchema.parse({
			ok: true,
			reminder,
		}),
	);
};

export const deleteReminderController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const reminderId = requireStringValue(req.params.reminderId, "reminderId");

	await ReminderService.deleteReminder(reminderId);

	res.json({
		ok: true,
		message: "Reminder deleted",
	});
};
