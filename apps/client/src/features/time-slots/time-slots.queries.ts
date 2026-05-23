import { TimeSlotsResponseSchema } from "@repo/schema";
import { useQuery } from "@tanstack/react-query";
import { requestWithSchema } from "@/api/request";

export const timeSlotsQueryKeys = {
	timeSlots: (token: string | null, scope: "mine" | "all" | "public" = "all") =>
		["time-slots", token ?? "public", scope] as const,
};

export const useTimeSlotsQuery = (
	token: string,
	options?: { scope?: "mine" | "all"; enabled?: boolean },
) => {
	const enabled = options?.enabled ?? true;
	return useQuery({
		queryKey: timeSlotsQueryKeys.timeSlots(token, options?.scope ?? "all"),
		queryFn: () =>
			requestWithSchema(
				`/time-slots${options?.scope ? `?scope=${options.scope}` : ""}`,
				TimeSlotsResponseSchema,
				"GET",
				undefined,
				token,
			),
		enabled: Boolean(token) && enabled,
	});
};

export const usePublicTimeSlotsQuery = () => {
	return useQuery({
		queryKey: timeSlotsQueryKeys.timeSlots(null),
		queryFn: () =>
			requestWithSchema(
				"/form/options/time-slots",
				TimeSlotsResponseSchema,
				"GET",
			),
	});
};
