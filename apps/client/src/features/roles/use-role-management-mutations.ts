import { useMutation, useQueryClient } from "@tanstack/react-query";
import { rolesQueryKeys } from "@/features/roles/roles.queries";
import { deleteRole, updateRole } from "@/features/roles/roles.service";
import type { UpdateRoleForm } from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

export const useUpdateRoleMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ roleId, payload }: { roleId: string; payload: UpdateRoleForm }) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return updateRole(token, roleId, payload);
		},
		onSuccess: async () => {
			if (!token) {
				return;
			}

			await queryClient.invalidateQueries({
				queryKey: rolesQueryKeys.roles(token),
			});
		},
	});
};

export const useDeleteRoleMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (roleId: string) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return deleteRole(token, roleId);
		},
		onSuccess: async () => {
			if (!token) {
				return;
			}

			await queryClient.invalidateQueries({
				queryKey: rolesQueryKeys.roles(token),
			});
		},
	});
};
