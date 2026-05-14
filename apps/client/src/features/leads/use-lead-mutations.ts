import type { UpdateLeadPayload } from "@repo/schema";
import {
	type QueryClient,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { leadsQueryKeys } from "@/features/leads/leads.queries";
import {
	assignDemoMentor,
	cancelLeadDemo,
	confirmAdmission,
	createLead,
	deleteLead,
	generateFormLink,
	markDemoCompleted,
	postponeLeadFollowUp,
	requestAdmission,
	requestLeadDemo,
	requestRedemo,
	revokeFormLink,
	updateLead,
} from "@/features/leads/leads.service";
import { studentsQueryKeys } from "@/features/students/students.queries";
import type {
	CreateLeadForm,
	PostponeLeadFollowUpForm,
} from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

const invalidateLeadQueries = async (
	queryClient: QueryClient,
	token: string,
	leadId?: string,
) => {
	await queryClient.invalidateQueries({
		queryKey: ["leads"],
	});

	if (leadId) {
		await queryClient.invalidateQueries({
			queryKey: leadsQueryKeys.detail(token, leadId),
		});
		await queryClient.invalidateQueries({
			queryKey: leadsQueryKeys.activities(token, leadId),
		});
	}
};

export const useCreateLeadMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: CreateLeadForm) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return createLead(token, payload);
		},
		onSuccess: async () => {
			if (!token) {
				return;
			}

			await invalidateLeadQueries(queryClient, token);
		},
	});
};

export const useUpdateLeadMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			leadId,
			payload,
		}: {
			leadId: string;
			payload: UpdateLeadPayload;
		}) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return updateLead(token, leadId, payload);
		},
		onSuccess: async (_data, variables) => {
			if (!token) {
				return;
			}

			await invalidateLeadQueries(queryClient, token, variables.leadId);
		},
	});
};

export const usePostponeLeadFollowUpMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			leadId,
			payload,
		}: {
			leadId: string;
			payload: PostponeLeadFollowUpForm;
		}) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return postponeLeadFollowUp(token, leadId, payload);
		},
		onSuccess: async (_data, variables) => {
			if (!token) {
				return;
			}

			await invalidateLeadQueries(queryClient, token, variables.leadId);
		},
	});
};

export const useDeleteLeadMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ leadId, note }: { leadId: string; note: string }) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return deleteLead(token, leadId, { note });
		},
		onSuccess: async (_data, variables) => {
			if (!token) {
				return;
			}

			await invalidateLeadQueries(queryClient, token, variables.leadId);
		},
	});
};

export const useRequestLeadDemoMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (leadId: string) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return requestLeadDemo(token, leadId);
		},
		onSuccess: async (_data, leadId) => {
			if (!token) {
				return;
			}

			await invalidateLeadQueries(queryClient, token, leadId);
		},
	});
};

export const useMarkDemoCompletedMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ leadId, note }: { leadId: string; note?: string }) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return markDemoCompleted(token, leadId, { note });
		},
		onSuccess: async (_data, variables) => {
			if (!token) {
				return;
			}

			await invalidateLeadQueries(queryClient, token, variables.leadId);
			await queryClient.invalidateQueries({
				queryKey: studentsQueryKeys.list(token),
			});
			// Invalidate demo query caches so demo pages refresh
			await queryClient.invalidateQueries({
				queryKey: leadsQueryKeys.demoRequests(token),
			});
			await queryClient.invalidateQueries({
				queryKey: leadsQueryKeys.pendingDemoRequests(token),
			});
		},
	});
};

export const useRequestRedemoMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			leadId,
			payload,
		}: {
			leadId: string;
			payload: { note?: string };
		}) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return requestRedemo(token, leadId, payload);
		},
		onSuccess: async (_data, variables) => {
			if (!token) {
				return;
			}

			await invalidateLeadQueries(queryClient, token, variables.leadId);
			await queryClient.invalidateQueries({
				queryKey: studentsQueryKeys.list(token),
			});
			// Invalidate demo query caches so demo pages refresh
			await queryClient.invalidateQueries({
				queryKey: leadsQueryKeys.demoRequests(token),
			});
			await queryClient.invalidateQueries({
				queryKey: leadsQueryKeys.pendingDemoRequests(token),
			});
		},
	});
};

export const useConfirmAdmissionMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			leadId,
			payload,
		}: {
			leadId: string;
			payload: { counsellorId?: string; note?: string };
		}) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return confirmAdmission(token, leadId, payload);
		},
		onSuccess: async (_data, variables) => {
			if (!token) {
				return;
			}

			await invalidateLeadQueries(queryClient, token, variables.leadId);
			await queryClient.invalidateQueries({
				queryKey: studentsQueryKeys.list(token),
			});
		},
	});
};

export const useRequestAdmissionMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			leadId,
			payload,
		}: {
			leadId: string;
			payload: { counsellorId?: string; note?: string };
		}) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return requestAdmission(token, leadId, payload);
		},
		onSuccess: async (_data, variables) => {
			if (!token) {
				return;
			}

			await invalidateLeadQueries(queryClient, token, variables.leadId);
			await queryClient.invalidateQueries({
				queryKey: studentsQueryKeys.list(token),
			});
		},
	});
};

export const useAssignDemoMentorMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			leadId,
			payload,
		}: {
			leadId: string;
			payload: { mentorId: string; demoScheduledFor: Date };
		}) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return assignDemoMentor(token, leadId, payload);
		},
		onSuccess: async (_data, variables) => {
			if (!token) {
				return;
			}

			await invalidateLeadQueries(queryClient, token, variables.leadId);
			// Invalidate demo query caches so both UnassignedDemosPage and ScheduledDemosPage refresh
			await queryClient.invalidateQueries({
				queryKey: leadsQueryKeys.demoRequests(token),
			});
			await queryClient.invalidateQueries({
				queryKey: leadsQueryKeys.pendingDemoRequests(token),
			});
		},
	});
};

export const useGenerateFormLinkMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (leadId: string) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return generateFormLink(token, leadId);
		},
		onSuccess: async (_data, leadId) => {
			if (!token) {
				return;
			}

			await invalidateLeadQueries(queryClient, token, leadId);
		},
	});
};

export const useRevokeFormLinkMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (leadId: string) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return revokeFormLink(token, leadId);
		},
		onSuccess: async (_data, leadId) => {
			if (!token) {
				return;
			}

			await invalidateLeadQueries(queryClient, token, leadId);
		},
	});
};

export const useCancelLeadDemoMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (leadId: string) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return cancelLeadDemo(token, leadId);
		},
		onSuccess: async (_data, leadId) => {
			if (!token) {
				return;
			}

			await invalidateLeadQueries(queryClient, token, leadId);
			// Invalidate demo query caches so demo pages refresh
			await queryClient.invalidateQueries({
				queryKey: leadsQueryKeys.demoRequests(token),
			});
			await queryClient.invalidateQueries({
				queryKey: leadsQueryKeys.pendingDemoRequests(token),
			});
		},
	});
};
