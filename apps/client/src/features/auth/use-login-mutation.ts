import { useMutation } from "@tanstack/react-query";
import { loginUser } from "@/features/auth/auth.service";
import type { LoginForm } from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

export const useLoginMutation = () => {
	const { setToken } = useSession();

	return useMutation({
		mutationFn: async (payload: LoginForm) => {
			return loginUser(payload.username, payload.password);
		},
		onSuccess: (response) => {
			if (response.token) {
				setToken(response.token);
			}
		},
	});
};
