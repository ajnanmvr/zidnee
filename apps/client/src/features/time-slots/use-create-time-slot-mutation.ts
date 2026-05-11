import type { TimeSlotsResponse } from "@repo/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { timeSlotsQueryKeys } from "@/features/time-slots/time-slots.queries";
import { createTimeSlot } from "@/features/time-slots/time-slots.service";
import { useSession } from "@/lib/session";

export const useCreateTimeSlotMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: {
			durationMinutes: number;
			timesPerWeek: number;
		}) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return createTimeSlot(token, payload);
		},
		onSuccess: async (result) => {
			if (!token) {
				return;
			}

			// Update the active authenticated cache immediately so UI reflects creation without waiting.
			queryClient.setQueryData<TimeSlotsResponse>(
				timeSlotsQueryKeys.timeSlots(token),
				(previous) => {
					if (!previous) {
						return previous;
					}

					const alreadyPresent = previous.timeSlots.some(
						(slot) => slot.id === result.timeSlot.id,
					);
					if (alreadyPresent) {
						return previous;
					}

					return {
						...previous,
						timeSlots: [result.timeSlot, ...previous.timeSlots],
					};
				},
			);

			await queryClient.invalidateQueries({
				queryKey: ["time-slots"],
			});
		},
	});
};
