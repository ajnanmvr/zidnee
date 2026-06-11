import { useQuery } from "@tanstack/react-query";
import { useHasAnyPermission } from "@/lib/hooks/use-has-permission";
import {
	fetchCounsellors,
	fetchMentors,
	fetchSalesUsers,
	fetchUsers,
} from "@/features/users/users.service";

const MENTOR_READ_ALL_KEYS = [
	"MENTOR_READ_ALL",
	"MENTOR_READ",
	"USER_READ",
	"LEAD_ASSIGN",
	"LEAD_DEMO_ASSIGN",
];

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

export const useMentorsQuery = (
	token: string,
	scope?: "mine" | "all",
	enabled = true,
) => {
	const canReadAllMentors = useHasAnyPermission(MENTOR_READ_ALL_KEYS);
	const resolvedScope = scope ?? (canReadAllMentors ? "all" : "mine");

	return useQuery({
		queryKey: [...usersQueryKeys.users(token), "mentors", resolvedScope] as const,
		queryFn: () => fetchMentors(token, resolvedScope),
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
