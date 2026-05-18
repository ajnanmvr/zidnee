import type {
	CreateReminderPayload,
	Reminder,
	UpdateReminderPayload,
} from "@repo/schema";
import { ReminderService } from "../reminders/reminder.service.js";

export const MentorReminderService = {
	createReminder: async (
		mentorId: string,
		createdBy: string,
		payload: CreateReminderPayload,
	): Promise<Reminder> => {
		return ReminderService.createReminder(mentorId, "mentor", createdBy, payload);
	},

	getRemindersByMentor: async (mentorId: string): Promise<Reminder[]> => {
		return ReminderService.getRemindersByPerson(mentorId, "mentor");
	},

	getAllReminders: ReminderService.getAllReminders,

	updateReminder: async (
		reminderId: string,
		payload: UpdateReminderPayload,
	): Promise<Reminder | null> => {
		return ReminderService.updateReminder(reminderId, payload);
	},

	deleteReminder: async (reminderId: string): Promise<Reminder | null> => {
		return ReminderService.deleteReminder(reminderId);
	},
};
