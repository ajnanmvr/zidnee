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
		status?: string,
		page: number = 1,
	) => ["leads", "list", token, scope, timeFilter, status, page] as const,
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
		status?: string;
		page?: number;
	},
) => {
	const scope = options?.scope ?? "all";
	const timeFilter = options?.timeFilter ?? "all";
	const status = options?.status;
	const page = options?.page ?? 1;

	return useQuery({
		queryKey: leadsQueryKeys.list(token, scope, timeFilter, status, page),
		queryFn: () => fetchDueLeadFollowUps(token, { scope, timeFilter, status, page }),
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
