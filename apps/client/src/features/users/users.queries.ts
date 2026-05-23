import { useQuery } from "@tanstack/react-query";
import {
	fetchCounsellors,
	fetchMentors,
	fetchSalesUsers,
	fetchUsers,
} from "@/features/users/users.service";

export const usersQueryKeys = {
	users: (token: string) => ["users", token] as const,
};

export const useUsersQuery = (token: string, enabled = true) => {
	return useQuery({
		queryKey: usersQueryKeys.users(token),
		queryFn: () => fetchUsers(token),
		enabled: Boolean(token) && enabled,
	});
};

export const useMentorsQuery = (token: string, enabled = true) => {
	return useQuery({
		queryKey: [...usersQueryKeys.users(token), "mentors"] as const,
		queryFn: () => fetchMentors(token),
		enabled: Boolean(token) && enabled,
	});
};

export const useSalesUsersQuery = (token: string, enabled = true) => {
	return useQuery({
		queryKey: [...usersQueryKeys.users(token), "sales"] as const,
		queryFn: () => fetchSalesUsers(token),
		enabled: Boolean(token) && enabled,
	});
};

export const useCounsellorsQuery = (token: string, enabled = true) => {
	return useQuery({
		queryKey: [...usersQueryKeys.users(token), "counsellors"] as const,
		queryFn: () => fetchCounsellors(token),
		enabled: Boolean(token) && enabled,
	});
};
