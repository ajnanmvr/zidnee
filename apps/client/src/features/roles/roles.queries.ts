import { useQuery } from "@tanstack/react-query";
import { fetchRoles } from "@/features/roles/roles.service";

export const rolesQueryKeys = {
	roles: (token: string) => ["roles", token] as const,
};

export const useRolesQuery = (token: string) => {
	return useQuery({
		queryKey: rolesQueryKeys.roles(token),
		queryFn: () => fetchRoles(token),
		enabled: Boolean(token),
	});
};
