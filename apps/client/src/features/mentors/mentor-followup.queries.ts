import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requestWithSchema } from "@/api/request";
import {
	MentorFollowUpResponseSchema,
	MentorFollowUpsResponseSchema,
} from "@repo/schema";
import { useSession } from "@/lib/session";
import { usersQueryKeys } from "@/features/users/users.queries";

export const mentorQueryKeys = {
	all: ["mentors"] as const,
	dueMentors: () => [...mentorQueryKeys.all, "due"] as const,
	mentorFollowUp: (mentorId: string) =>
		[...mentorQueryKeys.all, "followup", mentorId] as const,
};

export const useMentorsDueForFollowUpQuery = (token: string) => {
	return useQuery({
		queryKey: mentorQueryKeys.dueMentors(),
		queryFn: async () => {
			return requestWithSchema(
				"/mentors/followups/due",
				MentorFollowUpsResponseSchema,
				"GET",
				undefined,
				token,
			);
		},
		enabled: !!token,
	});
};

export const useMentorFollowUpQuery = (token: string, mentorId?: string) => {
	return useQuery({
		queryKey: mentorQueryKeys.mentorFollowUp(mentorId ?? ""),
		queryFn: async () => {
			return requestWithSchema(
				`/mentors/${mentorId}/followups`,
				MentorFollowUpResponseSchema,
				"GET",
				undefined,
				token,
			);
		},
		enabled: !!token && !!mentorId,
	});
};

export const useRecordMentorFollowUpMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (params: {
			mentorId: string;
			note?: string;
			nextFollowUpAt?: Date;
		}) => {
			if (!token) throw new Error("Missing session token");
			return requestWithSchema(
				`/mentors/${params.mentorId}/followups`,
				MentorFollowUpResponseSchema,
				"POST",
				{ note: params.note, nextFollowUpAt: params.nextFollowUpAt },
				token,
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: mentorQueryKeys.all });
			queryClient.invalidateQueries({ queryKey: usersQueryKeys.users(token) });
		},
	});
};

export const useSetMentorCustomFollowUpMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (params: {
			mentorId: string;
			customDate: Date;
		}) => {
			if (!token) throw new Error("Missing session token");
			return requestWithSchema(
				`/mentors/${params.mentorId}/followups/custom`,
				MentorFollowUpResponseSchema,
				"PATCH",
				{ customDate: params.customDate },
				token,
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: mentorQueryKeys.all });
			queryClient.invalidateQueries({ queryKey: usersQueryKeys.users(token) });
		},
	});
};

export const useClearMentorCustomFollowUpMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (mentorId: string) => {
			if (!token) throw new Error("Missing session token");
			return requestWithSchema(
				`/mentors/${mentorId}/followups/custom`,
				MentorFollowUpResponseSchema,
				"DELETE",
				undefined,
				token,
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: mentorQueryKeys.all });
			queryClient.invalidateQueries({ queryKey: usersQueryKeys.users(token) });
		},
	});
};
