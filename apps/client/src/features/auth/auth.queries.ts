import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "@/features/auth/auth.service";

export const authQueryKeys = {
	me: (token: string) => ["me", token] as const,
};

export const useMeQuery = (token: string) => {
	return useQuery({
		queryKey: authQueryKeys.me(token),
		queryFn: () => fetchMe(token),
		enabled: Boolean(token),
	});
};
