import { useQuery } from "@tanstack/react-query";
import { fetchCounsellorReport } from "@/features/reports/reports.service";

export const reportsQueryKeys = {
	counsellor: (
		token: string,
		params: { counsellorId?: string; from: string; to: string },
	) => ["reports", token, "counsellor", params] as const,
};

export const useCounsellorReportQuery = (
	token: string,
	params: { counsellorId?: string; from: string; to: string },
) => {
	return useQuery({
		queryKey: reportsQueryKeys.counsellor(token, params),
		queryFn: async () => (await fetchCounsellorReport(token, params)).report,
		enabled: Boolean(token),
		placeholderData: (previous) => previous,
	});
};
