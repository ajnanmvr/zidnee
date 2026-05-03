import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/session";
import { createTimeSlot } from "@/features/time-slots/time-slots.service";
import { timeSlotsQueryKeys } from "@/features/time-slots/time-slots.queries";

export const useCreateTimeSlotMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: { label: string }) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return createTimeSlot(token, payload);
		},
		onSuccess: async () => {
			if (!token) {
				return;
			}

			await queryClient.invalidateQueries({
				queryKey: timeSlotsQueryKeys.timeSlots(token),
			});
		},
	});
};