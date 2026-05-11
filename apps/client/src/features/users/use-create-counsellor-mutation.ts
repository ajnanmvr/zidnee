import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersQueryKeys } from "@/features/users/users.queries";
import { createCounsellor } from "@/features/users/users.service";
import type { CreateCounsellorForm } from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

export const useCreateCounsellorMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: CreateCounsellorForm) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return createCounsellor(token, payload);
		},
		onSuccess: async () => {
			if (!token) {
				return;
			}

			await queryClient.invalidateQueries({
				queryKey: usersQueryKeys.users(token),
			});
		},
	});
};
