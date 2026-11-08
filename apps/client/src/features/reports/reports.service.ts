import { CounsellorReportResponseSchema } from "@repo/schema";
import { requestWithSchema } from "@/api/request";

export const fetchCounsellorReport = async (
	token: string,
	params: { counsellorId?: string; from: string; to: string },
) => {
	const search = new URLSearchParams({ from: params.from, to: params.to });
	if (params.counsellorId) search.set("counsellorId", params.counsellorId);

	return requestWithSchema(
		`/reports/counsellor?${search.toString()}`,
		CounsellorReportResponseSchema,
		"GET",
		undefined,
		token,
	);
};
