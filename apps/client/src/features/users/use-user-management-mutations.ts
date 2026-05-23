import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersQueryKeys } from "@/features/users/users.queries";
import {
	assignUserCounsellor,
	changeMyPassword,
	changeUserPassword,
	deleteUser,
	setUserStatus,
	updateUser,
} from "@/features/users/users.service";
import type {
	AdminChangePasswordForm,
	ChangePasswordForm,
	UpdateUserForm,
} from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

export const useUpdateUserMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			userId,
			payload,
		}: {
			userId: string;
			payload: UpdateUserForm;
		}) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return updateUser(token, userId, payload);
		},
		onSuccess: async () => {
			if (!token) {
				return;
			}

			await queryClient.invalidateQueries({
				queryKey: usersQueryKeys.users(token),
			});
		},
	});
};

export const useAssignUserCounsellorMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			userId,
			counsellorId,
		}: {
			userId: string;
			counsellorId: string;
		}) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return assignUserCounsellor(token, userId, counsellorId);
		},
		onSuccess: async () => {
			if (!token) {
				return;
			}

			await queryClient.invalidateQueries({
				queryKey: usersQueryKeys.users(token),
			});
		},
	});
};

export const useDeleteUserMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (userId: string) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return deleteUser(token, userId);
		},
		onSuccess: async () => {
			if (!token) {
				return;
			}

			await queryClient.invalidateQueries({
				queryKey: usersQueryKeys.users(token),
			});
		},
	});
};

export const useSetUserStatusMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			userId,
			isActive,
		}: {
			userId: string;
			isActive: boolean;
		}) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return setUserStatus(token, userId, isActive);
		},
		onSuccess: async () => {
			if (!token) {
				return;
			}

			await queryClient.invalidateQueries({
				queryKey: usersQueryKeys.users(token),
			});
		},
	});
};

export const useChangeUserPasswordMutation = () => {
	const { token } = useSession();

	return useMutation({
		mutationFn: async ({
			userId,
			payload,
		}: {
			userId: string;
			payload: AdminChangePasswordForm;
		}) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return changeUserPassword(token, userId, payload);
		},
	});
};

export const useChangeMyPasswordMutation = () => {
	const { token } = useSession();

	return useMutation({
		mutationFn: async (payload: ChangePasswordForm) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return changeMyPassword(token, payload);
		},
	});
};
