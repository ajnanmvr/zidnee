import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authQueryKeys } from "@/features/auth/auth.queries";
import { rolesQueryKeys } from "@/features/roles/roles.queries";
import { createRole } from "@/features/roles/roles.service";
import type { CreateRoleForm } from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

export const useCreateRoleMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: CreateRoleForm) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return createRole(token, payload);
		},
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: rolesQueryKeys.roles(token),
				}),
				queryClient.invalidateQueries({
					queryKey: authQueryKeys.me(token),
				}),
			]);
		},
	});
};
