import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersQueryKeys } from "@/features/users/users.queries";
import { createMentor } from "@/features/users/users.service";
import type { CreateMentorForm } from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

export const useCreateMentorMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: CreateMentorForm) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return createMentor(token, payload);
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