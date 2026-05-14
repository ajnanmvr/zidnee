import type {
	CreateReminderPayload,
	UpdateReminderPayload,
} from "@repo/schema";
import {
	CreateReminderPayloadSchema,
	ReminderResponseSchema,
	RemindersResponseSchema,
} from "@repo/schema";
import { requestWithSchema } from "../../api/request.js";

export const createReminder = async (
	token: string,
	studentId: string,
	payload: CreateReminderPayload,
) => {
	CreateReminderPayloadSchema.parse(payload);
	const response = await requestWithSchema(
		`/reminders/students/${studentId}`,
		ReminderResponseSchema,
		"POST",
		payload,
		token,
	);
	return response.reminder;
};

export const getStudentReminders = async (token: string, studentId: string) => {
	const response = await requestWithSchema(
		`/reminders/students/${studentId}`,
		RemindersResponseSchema,
		"GET",
		undefined,
		token,
	);
	return response.reminders;
};

export const getAllReminders = async (
	token: string,
	filters?: {
		isDone?: boolean;
		sortBy?: "date" | "createdAt";
		sortOrder?: "asc" | "desc";
	},
) => {
	const params = new URLSearchParams();
	if (filters?.isDone !== undefined) {
		params.append("isDone", String(filters.isDone));
	}
	if (filters?.sortBy) {
		params.append("sortBy", filters.sortBy);
	}
	if (filters?.sortOrder) {
		params.append("sortOrder", filters.sortOrder);
	}

	const response = await requestWithSchema(
		`/reminders${params.toString() ? `?${params.toString()}` : ""}`,
		RemindersResponseSchema,
		"GET",
		undefined,
		token,
	);
	return response.reminders;
};

export const updateReminder = async (
	token: string,
	reminderId: string,
	payload: UpdateReminderPayload,
) => {
	const response = await requestWithSchema(
		`/reminders/${reminderId}`,
		ReminderResponseSchema,
		"PATCH",
		payload,
		token,
	);
	return response.reminder;
};

export const deleteReminder = async (token: string, reminderId: string) => {
	await requestWithSchema(
		`/reminders/${reminderId}`,
		RemindersResponseSchema,
		"DELETE",
		undefined,
		token,
	);
};
