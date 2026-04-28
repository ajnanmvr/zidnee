import { useQuery } from "@tanstack/react-query";
import {
	fetchAdmissionLeads,
	fetchDemoRequests,
	fetchDueLeadFollowUps,
	fetchLeadActivities,
	fetchLeadById,
	fetchPendingDemoRequests,
} from "@/features/leads/leads.service";

export const leadsQueryKeys = {
	list: (
		token: string,
		scope: "all" | "mine" = "all",
		timeFilter: "all" | "today" = "all",
	) => ["leads", "list", token, scope, timeFilter] as const,
	demoRequests: (token: string) => ["leads", "demo-requests", token] as const,
	pendingDemoRequests: (token: string) => ["leads", "for-demo", token] as const,
	admissions: (token: string) => ["leads", "admissions", token] as const,
	detail: (token: string, leadId: string) =>
		["leads", "detail", leadId, token] as const,
	activities: (token: string, leadId: string) =>
		["leads", "activities", leadId, token] as const,
};

export const useDemoRequestsQuery = (token: string) => {
	return useQuery({
		queryKey: leadsQueryKeys.demoRequests(token),
		queryFn: () => fetchDemoRequests(token),
		enabled: Boolean(token),
	});
};

export const usePendingDemoRequestsQuery = (token: string) => {
	return useQuery({
		queryKey: leadsQueryKeys.pendingDemoRequests(token),
		queryFn: () => fetchPendingDemoRequests(token),
		enabled: Boolean(token),
	});
};

export const useAdmissionLeadsQuery = (token: string) => {
	return useQuery({
		queryKey: leadsQueryKeys.admissions(token),
		queryFn: () => fetchAdmissionLeads(token),
		enabled: Boolean(token),
	});
};

export const useDueLeadFollowUpsQuery = (
	token: string,
	options?: {
		scope?: "all" | "mine";
		timeFilter?: "all" | "today";
	},
) => {
	const scope = options?.scope ?? "all";
	const timeFilter = options?.timeFilter ?? "all";

	return useQuery({
		queryKey: leadsQueryKeys.list(token, scope, timeFilter),
		queryFn: () => fetchDueLeadFollowUps(token, { scope, timeFilter }),
		enabled: Boolean(token),
	});
};

export const useLeadActivitiesQuery = (
	token: string,
	leadId: string,
) => {
	return useQuery({
		queryKey: leadsQueryKeys.activities(token, leadId),
		queryFn: () => fetchLeadActivities(token, leadId),
		enabled: Boolean(token) && Boolean(leadId),
	});
};

export const useLeadDetailQuery = (
	token: string,
	leadId: string,
) => {
	return useQuery({
		queryKey: leadsQueryKeys.detail(token, leadId),
		queryFn: () => fetchLeadById(token, leadId),
		enabled: Boolean(token) && Boolean(leadId),
	});
};
