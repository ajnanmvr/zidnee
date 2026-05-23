import {
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import type {
	CreateMentorSubstitutionPayload,
	UpdateMentorSubstitutionPayload,
} from "@repo/schema";
import {
	MentorSubstitutionResponseSchema,
	MentorSubstitutionsResponseSchema,
} from "@repo/schema";
import { requestWithSchema } from "@/api/request";
import { useSession } from "@/lib/session";

const SUBSTITUTIONS_QUERY_KEY = ["mentor-substitutions"];

export const useGetAllSubstitutions = (token: string) => {
	return useQuery({
		queryKey: [...SUBSTITUTIONS_QUERY_KEY, "all"],
		queryFn: async () => {
			const response = await requestWithSchema(
				"/mentors/substitutions/all",
				MentorSubstitutionsResponseSchema,
				"GET",
				undefined,
				token,
			);
			return response.substitutions;
		},
		enabled: !!token,
	});
};

export const useGetSubstitutionsByStatus = (
	token: string,
	status: string | null,
) => {
	return useQuery({
		queryKey: [...SUBSTITUTIONS_QUERY_KEY, "by-status", status],
		queryFn: async () => {
			const response = await requestWithSchema(
				`/mentors/substitutions/by-status?status=${encodeURIComponent(status ?? "")}`,
				MentorSubstitutionsResponseSchema,
				"GET",
				undefined,
				token,
			);
			return response.substitutions;
		},
		enabled: !!token && !!status,
	});
};

export const useGetMentorSubstitutions = (
	token: string,
	mentorId: string | null,
) => {
	return useQuery({
		queryKey: [...SUBSTITUTIONS_QUERY_KEY, "mentor", mentorId],
		queryFn: async () => {
			const response = await requestWithSchema(
				`/mentors/${mentorId}/substitutions`,
				MentorSubstitutionsResponseSchema,
				"GET",
				undefined,
				token,
			);
			return response.substitutions;
		},
		enabled: !!token && !!mentorId,
	});
};

export const useGetMentorAsOriginal = (
	token: string,
	mentorId: string | null,
) => {
	return useQuery({
		queryKey: [...SUBSTITUTIONS_QUERY_KEY, "original", mentorId],
		queryFn: async () => {
			const response = await requestWithSchema(
				`/mentors/${mentorId}/substitutions/as-original`,
				MentorSubstitutionsResponseSchema,
				"GET",
				undefined,
				token,
			);
			return response.substitutions;
		},
		enabled: !!token && !!mentorId,
	});
};

export const useGetMentorAsSubstitute = (
	token: string,
	mentorId: string | null,
) => {
	return useQuery({
		queryKey: [...SUBSTITUTIONS_QUERY_KEY, "substitute", mentorId],
		queryFn: async () => {
			const response = await requestWithSchema(
				`/mentors/${mentorId}/substitutions/as-substitute`,
				MentorSubstitutionsResponseSchema,
				"GET",
				undefined,
				token,
			);
			return response.substitutions;
		},
		enabled: !!token && !!mentorId,
	});
};

export const useCreateSubstitution = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: CreateMentorSubstitutionPayload) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			const response = await requestWithSchema(
				"/mentors/substitutions/create",
				MentorSubstitutionResponseSchema,
				"POST",
				payload,
				token,
			);
			return response.substitution;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: SUBSTITUTIONS_QUERY_KEY,
			});
		},
	});
};

export const useUpdateSubstitution = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			substitutionId,
			payload,
		}: {
			substitutionId: string;
			payload: UpdateMentorSubstitutionPayload;
		}) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			const response = await requestWithSchema(
				`/mentors/substitutions/${substitutionId}`,
				MentorSubstitutionResponseSchema,
				"PATCH",
				payload,
				token,
			);
			return response.substitution;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: SUBSTITUTIONS_QUERY_KEY,
			});
		},
	});
};

export const useDeleteSubstitution = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (substitutionId: string) => {
			if (!token) {
				throw new Error("Missing session token");
			}
			// call delete endpoint; some APIs return no body
			await requestWithSchema(
				`/mentors/substitutions/${substitutionId}`,
				MentorSubstitutionResponseSchema,
				"DELETE",
				undefined,
				token,
			);

			return substitutionId;
		},
		onSuccess: (deletedId: string) => {
			// Invalidate the substitutions queries so lists refresh
			queryClient.invalidateQueries({
				queryKey: SUBSTITUTIONS_QUERY_KEY,
			});

			// Also remove the deleted item from any cached mentor-specific lists to avoid waiting for refetch
			const keys = queryClient.getQueryCache().getAll().map((q) => q.queryKey);
			keys.forEach((key) => {
				if (Array.isArray(key) && key[0] === SUBSTITUTIONS_QUERY_KEY[0]) {
					queryClient.setQueryData(key, (old: any) => {
						if (!old || !Array.isArray(old)) return old;
						return old.filter((s: any) => s.id !== deletedId);
					});
				}
			});
		},
	});
};
