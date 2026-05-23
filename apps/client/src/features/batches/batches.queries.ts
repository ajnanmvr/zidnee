import { BatchesResponseSchema } from "@repo/schema";
import { useQuery } from "@tanstack/react-query";
import { requestWithSchema } from "@/api/request";

export const batchesQueryKeys = {
	batches: (token: string, scope: "mine" | "all" = "all") => ["batches", token, scope] as const,
	batchesByMentor: (token: string, mentorId: string) =>
		["batches", token, mentorId] as const,
	batch: (token: string, batchId: string) => ["batch", token, batchId] as const,
};

export const useBatchesQuery = (token: string, options?: { scope?: "mine" | "all" }) => {
	return useQuery({
		queryKey: batchesQueryKeys.batches(token, options?.scope ?? "all"),
		queryFn: () =>
			requestWithSchema(
				`/batches${options?.scope ? `?scope=${options.scope}` : ""}`,
				BatchesResponseSchema,
				"GET",
				undefined,
				token,
			),
		enabled: Boolean(token),
	});
};

export const useBatchesByMentorQuery = (token: string, mentorId: string) => {
	return useQuery({
		queryKey: batchesQueryKeys.batchesByMentor(token, mentorId),
		queryFn: () =>
			requestWithSchema(
				`/batches?mentorId=${mentorId}`,
				BatchesResponseSchema,
				"GET",
				undefined,
				token,
			),
		enabled: Boolean(token && mentorId),
	});
};
