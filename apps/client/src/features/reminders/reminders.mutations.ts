import type {
	CreateReminderPayload,
	UpdateReminderPayload,
} from "@repo/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "../../lib/session.js";
import {
	createReminder,
	deleteReminder,
	getAllReminders,
	getStudentReminders,
	updateReminder,
} from "./reminders.service.js";
import { useHasPermission } from "@/lib/hooks/use-has-permission";

export const reminderQueryKeys = {
	all: ["reminders"] as const,
	allReminders: () => [...reminderQueryKeys.all, "all"] as const,
	forStudent: (studentId: string) =>
		[...reminderQueryKeys.all, "student", studentId] as const,
};

export const useGetStudentReminders = (studentId: string) => {
	const { token } = useSession();

	return useQuery({
		queryKey: reminderQueryKeys.forStudent(studentId),
		queryFn: async () => {
			if (!token) return [];
			return getStudentReminders(token, studentId);
		},
		enabled: Boolean(token && studentId),
	});
};

export const useGetAllReminders = (filters?: {
	isDone?: boolean;
	sortBy?: "date" | "createdAt";
	sortOrder?: "asc" | "desc";
	scope?: "mine" | "all";
	enabled?: boolean;
}) => {
	const { token } = useSession();
	const enabled = filters?.enabled ?? true;
	const canReadAll = useHasPermission("REMINDER_READ_ALL");
	const scope = filters?.scope === "all" && !canReadAll ? "mine" : filters?.scope;

	return useQuery({
		queryKey: [...reminderQueryKeys.allReminders(), { ...filters, scope }],
		queryFn: async () => {
			if (!token) return [];
			return getAllReminders(token, { ...filters, scope });
		},
		enabled: Boolean(token) && enabled,
	});
};

export const useCreateReminderMutation = (studentId: string) => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: CreateReminderPayload) => {
			if (!token) throw new Error("No token");
			return createReminder(token, studentId, payload);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: reminderQueryKeys.forStudent(studentId),
			});
			queryClient.invalidateQueries({
				queryKey: reminderQueryKeys.allReminders(),
			});
		},
	});
};

export const useUpdateReminderMutation = (studentId: string) => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			reminderId,
			payload,
		}: {
			reminderId: string;
			payload: UpdateReminderPayload;
		}) => {
			if (!token) throw new Error("No token");
			return updateReminder(token, reminderId, payload);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: reminderQueryKeys.forStudent(studentId),
			});
			queryClient.invalidateQueries({
				queryKey: reminderQueryKeys.allReminders(),
			});
		},
	});
};

export const useDeleteReminderMutation = (studentId: string) => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (reminderId: string) => {
			if (!token) throw new Error("No token");
			return deleteReminder(token, reminderId);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: reminderQueryKeys.forStudent(studentId),
			});
			queryClient.invalidateQueries({
				queryKey: reminderQueryKeys.allReminders(),
			});
		},
	});
};
