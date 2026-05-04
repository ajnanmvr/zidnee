import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/session";
import { updateTimeSlot } from "@/features/time-slots/time-slots.service";
import { timeSlotsQueryKeys } from "@/features/time-slots/time-slots.queries";

export const useUpdateTimeSlotMutation = () => {
  const { token } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: { durationMinutes?: number; timesPerWeek?: number; isActive?: boolean } }) => {
      if (!token) throw new Error("Missing session token");
      return updateTimeSlot(token, id, payload);
    },
    onSuccess: async () => {
      if (!token) return;
      await queryClient.invalidateQueries({ queryKey: timeSlotsQueryKeys.timeSlots(token) });
    },
  });
};
