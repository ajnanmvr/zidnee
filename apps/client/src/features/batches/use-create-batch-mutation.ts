import type { CreateBatchPayload } from "@repo/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { batchesQueryKeys } from "@/features/batches/batches.queries";
import { createBatch } from "@/features/batches/batches.service";
import { useSession } from "@/lib/session";

export const useCreateBatchMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: CreateBatchPayload) => {
			if (!token) throw new Error("Missing session token");
			return createBatch(token, payload);
		},
		onSuccess: async () => {
			if (!token) return;
			await queryClient.invalidateQueries({
				queryKey: batchesQueryKeys.batches(token),
			});
		},
	});
};
