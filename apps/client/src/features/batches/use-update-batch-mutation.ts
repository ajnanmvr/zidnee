import type { UpdateBatchPayload } from "@repo/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { batchesQueryKeys } from "./batches.queries";
import { updateBatch } from "./batches.service";
import { useSession } from "@/lib/session";

export const useUpdateBatchMutation = () => {
 	const { token } = useSession();
 	const queryClient = useQueryClient();

 	return useMutation({
 		mutationFn: async ({ batchId, payload }: { batchId: string; payload: UpdateBatchPayload }) => {
 			if (!token) throw new Error("Missing session token");
 			return updateBatch(token, batchId, payload);
 		},
 		onSuccess: async () => {
 			if (!token) return;
 			await queryClient.invalidateQueries({ queryKey: batchesQueryKeys.batches(token) });
 		},
 	});
};

export default useUpdateBatchMutation;
