import { useQuery } from "@tanstack/react-query";
import { fetchMe, fetchPermissions, fetchRoles, fetchUsers } from "@/lib/api";

export const dashboardQueryKeys = {
	me: (token: string) => ["me", token] as const,
	users: (token: string) => ["users", token] as const,
	roles: (token: string) => ["roles", token] as const,
	permissions: (token: string) => ["permissions", token] as const,
};

export const useMeQuery = (token: string) => {
	return useQuery({
		queryKey: dashboardQueryKeys.me(token),
		queryFn: () => fetchMe(token),
		enabled: Boolean(token),
	});
};

export const useUsersQuery = (token: string) => {
	return useQuery({
		queryKey: dashboardQueryKeys.users(token),
		queryFn: () => fetchUsers(token),
		enabled: Boolean(token),
	});
};

export const useRolesQuery = (token: string) => {
	return useQuery({
		queryKey: dashboardQueryKeys.roles(token),
		queryFn: () => fetchRoles(token),
		enabled: Boolean(token),
	});
};

export const usePermissionsQuery = (token: string) => {
	return useQuery({
		queryKey: dashboardQueryKeys.permissions(token),
		queryFn: () => fetchPermissions(token),
		enabled: Boolean(token),
	});
};
