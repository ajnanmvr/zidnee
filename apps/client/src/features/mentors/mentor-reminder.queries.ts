import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
	CreateMentorReminderPayload,
	UpdateMentorReminderPayload,
} from "@repo/schema";
import {
	MentorReminderResponseSchema,
	MentorRemindersResponseSchema,
} from "@repo/schema";
import { requestWithSchema } from "@/api/request";
import { useSession } from "@/lib/session";

export const mentorReminderQueryKeys = {
	all: ["mentor-reminders"] as const,
	mentorReminders: (mentorId: string) =>
		[...mentorReminderQueryKeys.all, mentorId] as const,
};

export const useMentorRemindersQuery = (token: string, mentorId?: string) => {
	return useQuery({
		queryKey: mentorReminderQueryKeys.mentorReminders(mentorId ?? ""),
		queryFn: async () => {
			return requestWithSchema(
				`/mentors/${mentorId}/reminders`,
				MentorRemindersResponseSchema,
				"GET",
				undefined,
				token,
			);
		},
		enabled: !!token && !!mentorId,
	});
};

export const useCreateMentorReminderMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (params: {
			mentorId: string;
			payload: CreateMentorReminderPayload;
		}) => {
			if (!token) throw new Error("Missing session token");
			return requestWithSchema(
				`/mentors/${params.mentorId}/reminders`,
				MentorReminderResponseSchema,
				"POST",
				params.payload,
				token,
			);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: mentorReminderQueryKeys.mentorReminders(
					variables.mentorId,
				),
			});
		},
	});
};

export const useUpdateMentorReminderMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (params: {
			reminderId: string;
			mentorId: string;
			payload: UpdateMentorReminderPayload;
		}) => {
			if (!token) throw new Error("Missing session token");
			return requestWithSchema(
				`/mentors/${params.reminderId}/reminders`,
				MentorReminderResponseSchema,
				"PATCH",
				params.payload,
				token,
			);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: mentorReminderQueryKeys.mentorReminders(
					variables.mentorId,
				),
			});
		},
	});
};

export const useDeleteMentorReminderMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (params: {
			reminderId: string;
			mentorId: string;
		}) => {
			if (!token) throw new Error("Missing session token");
			return requestWithSchema(
				`/mentors/${params.reminderId}/reminders`,
				MentorReminderResponseSchema,
				"DELETE",
				undefined,
				token,
			);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: mentorReminderQueryKeys.mentorReminders(
					variables.mentorId,
				),
			});
		},
	});
};
