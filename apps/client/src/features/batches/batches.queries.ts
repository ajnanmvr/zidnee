import { useQuery } from "@tanstack/react-query";
import { requestWithSchema } from "@/api/request";
import { BatchesResponseSchema, BatchResponseEnvelopeSchema } from "@repo/schema";

export const batchesQueryKeys = {
	batches: (token: string) => ["batches", token] as const,
	batchesByMentor: (token: string, mentorId: string) => ["batches", token, mentorId] as const,
	batch: (token: string, batchId: string) => ["batch", token, batchId] as const,
};

export const useBatchesQuery = (token: string) => {
	return useQuery({
		queryKey: batchesQueryKeys.batches(token),
		queryFn: () => requestWithSchema("/batches", BatchesResponseSchema, "GET", undefined, token),
		enabled: Boolean(token),
	});
};

export const useBatchesByMentorQuery = (token: string, mentorId: string) => {
	return useQuery({
		queryKey: batchesQueryKeys.batchesByMentor(token, mentorId),
		queryFn: () =>
			requestWithSchema(`/batches?mentorId=${mentorId}`, BatchesResponseSchema, "GET", undefined, token),
		enabled: Boolean(token && mentorId),
	});
};
