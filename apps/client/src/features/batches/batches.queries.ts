import { BatchesResponseSchema } from "@repo/schema";
import { useQuery } from "@tanstack/react-query";
import { requestWithSchema } from "@/api/request";
import { useHasPermission } from "@/lib/hooks/use-has-permission";

export const batchesQueryKeys = {
	batches: (token: string, scope: "mine" | "all" = "all") => ["batches", token, scope] as const,
	batchesByMentor: (token: string, mentorId: string) =>
		["batches", token, mentorId] as const,
	batch: (token: string, batchId: string) => ["batch", token, batchId] as const,
};

export const useBatchesQuery = (token: string, options?: { scope?: "mine" | "all" }) => {
	const canReadAll = useHasPermission("BATCH_READ_ALL");
	const scope = options?.scope === "all" && !canReadAll ? "mine" : options?.scope;
	return useQuery({
		queryKey: batchesQueryKeys.batches(token, scope ?? "all"),
		queryFn: () =>
			requestWithSchema(
				`/batches${scope ? `?scope=${scope}` : ""}`,
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
