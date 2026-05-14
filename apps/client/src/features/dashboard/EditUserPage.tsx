import { useMemo } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "@/api/request";
import { Panel } from "@/components/dashboard-ui";
import { UserFormPanel } from "@/features/users/UserFormPanel";
import { useUpdateUserMutation } from "@/features/users/use-user-management-mutations";
import { useUsersQuery } from "@/features/users/users.queries";
import { useSession } from "@/lib/session";

export const EditUserPage = () => {
	const { userId = "" } = useParams();
	const navigate = useNavigate();
	const { token } = useSession();
	const usersQuery = useUsersQuery(token);
	const updateUserMutation = useUpdateUserMutation();

	const user = useMemo(
		() => usersQuery.data?.users.find((row) => row.id === userId) ?? null,
		[userId, usersQuery.data?.users],
	);

	const handleSubmit = async (form: {
		name: string;
		username: string;
		email?: string;
		gender?: "male" | "female";
		roleIds: string[];
		counsellorId?: string;
	}) => {
		if (!userId) {
			return;
		}

		try {
			await updateUserMutation.mutateAsync({
				userId,
				payload: {
					name: form.name,
					username: form.username,
					email: form.email,
					gender: form.gender,
					roleIds: form.roleIds,
					counsellorId: form.counsellorId,
				},
			});
			toast.success("User updated successfully!");
			navigate("/users");
		} catch (error) {
			if (error instanceof ApiError) {
				const serverErrors = error.payload.errors ?? {};
				const firstError =
					serverErrors.name?.[0] ??
					serverErrors.username?.[0] ??
					serverErrors.email?.[0] ??
					serverErrors.roleIds?.[0] ??
					error.payload.message;

				if (firstError) {
					toast.error(firstError);
				}
				return;
			}

			toast.error(
				error instanceof Error ? error.message : "Unable to update user",
			);
		}
	};

	if (!user) {
		return (
			<Panel
				title="Edit user"
				description="Update"
				action={
					<Link
						to="/users"
						className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
					>
						Back
					</Link>
				}
			>
				<p className="text-sm text-gray-600">User not found.</p>
			</Panel>
		);
	}

	return (
		<UserFormPanel
			mode="edit"
			user={user}
			onSubmit={handleSubmit}
			isLoading={updateUserMutation.isPending}
		/>
	);
};
