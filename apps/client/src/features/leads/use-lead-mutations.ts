import { useMutation, useQueryClient } from "@tanstack/react-query";
import { leadsQueryKeys } from "@/features/leads/leads.queries";
import { createLead, postponeLeadFollowUp } from "@/features/leads/leads.service";
import type {
	CreateLeadForm,
	PostponeLeadFollowUpForm,
} from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

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

			await queryClient.invalidateQueries({
				queryKey: leadsQueryKeys.dueFollowUps(token),
			});
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
		onSuccess: async () => {
			if (!token) {
				return;
			}

			await queryClient.invalidateQueries({
				queryKey: leadsQueryKeys.dueFollowUps(token),
			});
		},
	});
};
