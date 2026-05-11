import { useMutation, useQueryClient } from "@tanstack/react-query";
import { timeSlotsQueryKeys } from "@/features/time-slots/time-slots.queries";
import { updateTimeSlot } from "@/features/time-slots/time-slots.service";
import { useSession } from "@/lib/session";

export const useUpdateTimeSlotMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			payload,
		}: {
			id: string;
			payload: {
				durationMinutes?: number;
				timesPerWeek?: number;
				isActive?: boolean;
			};
		}) => {
			if (!token) throw new Error("Missing session token");
			return updateTimeSlot(token, id, payload);
		},
		onSuccess: async () => {
			if (!token) return;
			await queryClient.invalidateQueries({
				queryKey: timeSlotsQueryKeys.timeSlots(token),
			});
		},
	});
};
