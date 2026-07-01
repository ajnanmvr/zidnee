import { useQuery } from "@tanstack/react-query";
import { fetchRoles } from "@/features/roles/roles.service";

export const rolesQueryKeys = {
	roles: (token: string, type?: string) => ["roles", token, type ?? "all"] as const,
};

export const useRolesQuery = (token: string, enabled = true, type?: string) => {
	return useQuery({
		queryKey: rolesQueryKeys.roles(token, type),
		queryFn: () => fetchRoles(token, type),
		enabled: Boolean(token) && enabled,
	});
};
