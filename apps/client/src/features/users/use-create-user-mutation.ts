import { useMutation, useQueryClient } from "@tanstack/react-query";
import { rolesQueryKeys } from "@/features/roles/roles.queries";
import { usersQueryKeys } from "@/features/users/users.queries";
import { createUser } from "@/features/users/users.service";
import type { CreateUserForm } from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

export const useCreateUserMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: CreateUserForm) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return createUser(token, payload);
		},
		onSuccess: async () => {
			if (!token) {
				return;
			}

			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: usersQueryKeys.users(token),
				}),
				queryClient.invalidateQueries({
					queryKey: rolesQueryKeys.roles(token),
				}),
			]);
		},
	});
};
