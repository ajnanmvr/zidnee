import { useQuery } from "@tanstack/react-query";
import {
	fetchAdmissionLeads,
	fetchDemoRequests,
	fetchDueLeadFollowUps,
	fetchLeadActivities,
	fetchLeadById,
	fetchPendingDemoRequests,
} from "@/features/leads/leads.service";
import { useHasPermission } from "@/lib/hooks/use-has-permission";

export const leadsQueryKeys = {
	list: (
		token: string,
		scope: "all" | "mine" = "all",
		timeFilter: "all" | "today" = "all",
		status?: string,
		page: number = 1,
		limit: number = 25,
		sortBy: string = "nextFollowUpAt",
		sortOrder: "asc" | "desc" = "desc",
		search?: string,
		assignedTo?: string,
	) =>
		[
			"leads",
			"list",
			token,
			scope,
			timeFilter,
			status,
			page,
			limit,
			sortBy,
			sortOrder,
			search,
			assignedTo,
		] as const,
	demoRequests: (token: string) => ["leads", "demo-requests", token] as const,
	pendingDemoRequests: (token: string) => ["leads", "for-demo", token] as const,
	admissions: (token: string) => ["leads", "admissions", token] as const,
	detail: (token: string, leadId: string) =>
		["leads", "detail", leadId, token] as const,
	activities: (token: string, leadId: string) =>
		["leads", "activities", leadId, token] as const,
};

export const useDemoRequestsQuery = (token: string, enabled = true) => {
	return useQuery({
		queryKey: leadsQueryKeys.demoRequests(token),
		queryFn: () => fetchDemoRequests(token),
		enabled: Boolean(token) && enabled,
	});
};

export const usePendingDemoRequestsQuery = (token: string, enabled = true) => {
	return useQuery({
		queryKey: leadsQueryKeys.pendingDemoRequests(token),
		queryFn: () => fetchPendingDemoRequests(token),
		enabled: Boolean(token) && enabled,
	});
};

export const useAdmissionLeadsQuery = (token: string, enabled = true) => {
	return useQuery({
		queryKey: leadsQueryKeys.admissions(token),
		queryFn: () => fetchAdmissionLeads(token),
		enabled: Boolean(token) && enabled,
	});
};

export const useDueLeadFollowUpsQuery = (
	token: string,
	options?: {
		scope?: "all" | "mine";
		timeFilter?: "all" | "today";
		status?: string;
		page?: number;
		limit?: number;
		sortBy?: string;
		sortOrder?: "asc" | "desc";
		search?: string;
		assignedTo?: string;
		enabled?: boolean;
	},
) => {
	const requestedScope = options?.scope ?? "all";
	const canReadAll = useHasPermission("LEAD_READ_ALL");
	const scope = requestedScope === "all" && !canReadAll ? "mine" : requestedScope;
	const timeFilter = options?.timeFilter ?? "all";
	const status = options?.status;
	const page = options?.page ?? 1;
	const limit = options?.limit ?? 25;
	const sortBy = options?.sortBy ?? "nextFollowUpAt";
	const sortOrder = options?.sortOrder ?? "desc";
	const search = options?.search;
	const assignedTo = scope === "all" ? options?.assignedTo : undefined;
	const enabled = options?.enabled ?? true;

	return useQuery({
		queryKey: leadsQueryKeys.list(
			token,
			scope,
			timeFilter,
			status,
			page,
			limit,
			sortBy,
			sortOrder,
			search,
			assignedTo,
		),
		queryFn: () =>
			fetchDueLeadFollowUps(token, {
				scope,
				timeFilter,
				status,
				page,
				limit,
				sortBy,
				sortOrder,
				search,
				assignedTo,
			}),
		enabled: Boolean(token) && enabled,
	});
};

export const useLeadActivitiesQuery = (token: string, leadId: string) => {
	return useQuery({
		queryKey: leadsQueryKeys.activities(token, leadId),
		queryFn: () => fetchLeadActivities(token, leadId),
		enabled: Boolean(token) && Boolean(leadId),
	});
};

export const useLeadDetailQuery = (token: string, leadId: string) => {
	return useQuery({
		queryKey: leadsQueryKeys.detail(token, leadId),
		queryFn: () => fetchLeadById(token, leadId),
		enabled: Boolean(token) && Boolean(leadId),
	});
};
