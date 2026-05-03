import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { LeadActivityResponse } from "@repo/schema";
import { fetchLeadActivities } from "@/features/leads/leads.service";
import { leadsQueryKeys } from "@/features/leads/leads.queries";

const currentMonthKey = () => {
	const now = new Date();
	return `${now.getFullYear()}-${now.getMonth()}`;
};

export const countActivitiesThisMonth = (activities: LeadActivityResponse[]) => {
	const monthKey = currentMonthKey();
	return activities.filter((activity) => {
		const date = new Date(activity.createdAt);
		return `${date.getFullYear()}-${date.getMonth()}` === monthKey;
	}).length;
};

export const getLatestActivity = (activities: LeadActivityResponse[]) => activities[0] ?? null;

export const useLeadActivitiesMap = (token: string, leadIds: string[]) => {
	const uniqueLeadIds = useMemo(() => Array.from(new Set(leadIds.filter(Boolean))), [leadIds]);
	const queries = useQueries({
		queries: uniqueLeadIds.map((leadId) => ({
			queryKey: leadsQueryKeys.activities(token, leadId),
			queryFn: () => fetchLeadActivities(token, leadId),
			enabled: Boolean(token) && Boolean(leadId),
		})),
	});

	const activitiesByLeadId = useMemo(() => {
		const map = new Map<string, LeadActivityResponse[]>();
		uniqueLeadIds.forEach((leadId, index) => {
			const result = queries[index];
			map.set(leadId, result?.data?.activities ?? []);
		});
		return map;
	}, [queries, uniqueLeadIds]);

	return {
		activitiesByLeadId,
		isLoading: queries.some((result) => result.isLoading),
		isError: queries.some((result) => result.isError),
	};
};