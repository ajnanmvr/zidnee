import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dashboardQueryKeys } from "@/features/dashboard/dashboard.queries.js";
import { createRole } from "@/lib/api.js";
import type { CreateRoleForm } from "@/lib/dashboard-types.js";
import { useSession } from "@/lib/session.js";

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
					queryKey: dashboardQueryKeys.roles(token),
				}),
				queryClient.invalidateQueries({
					queryKey: dashboardQueryKeys.me(token),
				}),
			]);
		},
	});
};
