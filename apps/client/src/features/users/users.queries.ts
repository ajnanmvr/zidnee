import { useQuery } from "@tanstack/react-query";
import { fetchUsers } from "@/features/users/users.service";

export const usersQueryKeys = {
	users: (token: string) => ["users", token] as const,
};

export const useUsersQuery = (token: string) => {
	return useQuery({
		queryKey: usersQueryKeys.users(token),
		queryFn: () => fetchUsers(token),
		enabled: Boolean(token),
	});
};
