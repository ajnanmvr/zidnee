import { useMutation, useQueryClient } from "@tanstack/react-query";
import { timeSlotsQueryKeys } from "@/features/time-slots/time-slots.queries";
import { deleteTimeSlot } from "@/features/time-slots/time-slots.service";
import { useSession } from "@/lib/session";

export const useDeleteTimeSlotMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			if (!token) throw new Error("Missing session token");
			return deleteTimeSlot(token, id);
		},
		onSuccess: async () => {
			if (!token) return;
			await queryClient.invalidateQueries({
				queryKey: timeSlotsQueryKeys.timeSlots(token),
			});
		},
	});
};
