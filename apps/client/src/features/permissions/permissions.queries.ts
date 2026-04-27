import { useQuery } from "@tanstack/react-query";
import { fetchPermissions } from "@/features/permissions/permissions.service";

export const permissionsQueryKeys = {
	permissions: (token: string) => ["permissions", token] as const,
};

export const usePermissionsQuery = (token: string) => {
	return useQuery({
		queryKey: permissionsQueryKeys.permissions(token),
		queryFn: () => fetchPermissions(token),
		enabled: Boolean(token),
	});
};
