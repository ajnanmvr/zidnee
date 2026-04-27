import { useQuery } from "@tanstack/react-query";
import { fetchDueLeadFollowUps } from "@/features/leads/leads.service";

export const leadsQueryKeys = {
	dueFollowUps: (token: string) => ["leads", "due-follow-ups", token] as const,
};

export const useDueLeadFollowUpsQuery = (token: string) => {
	return useQuery({
		queryKey: leadsQueryKeys.dueFollowUps(token),
		queryFn: () => fetchDueLeadFollowUps(token),
		enabled: Boolean(token),
	});
};
