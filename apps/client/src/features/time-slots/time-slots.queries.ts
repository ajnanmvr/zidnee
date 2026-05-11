import { TimeSlotsResponseSchema } from "@repo/schema";
import { useQuery } from "@tanstack/react-query";
import { requestWithSchema } from "@/api/request";

export const timeSlotsQueryKeys = {
	timeSlots: (token: string | null) =>
		["time-slots", token ?? "public"] as const,
};

export const useTimeSlotsQuery = (token: string) => {
	return useQuery({
		queryKey: timeSlotsQueryKeys.timeSlots(token),
		queryFn: () =>
			requestWithSchema(
				"/time-slots",
				TimeSlotsResponseSchema,
				"GET",
				undefined,
				token,
			),
		enabled: Boolean(token),
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
