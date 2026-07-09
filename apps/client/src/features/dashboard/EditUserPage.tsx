import { useMemo } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "@/api/request";
import { Panel } from "@/components/dashboard-ui";
import { UserFormPanel } from "@/features/users/UserFormPanel";
import { useUpdateUserMutation } from "@/features/users/use-user-management-mutations";
import { useUsersQuery } from "@/features/users/users.queries";
import { useSession } from "@/lib/session";

type EditableUser = {
	id: string;
	name: string;
	username: string;
	email?: string;
	roles: Array<{ id: string; name: string; type: string }>;
	mentorType?: "individual" | "group";
	counsellorId?: string;
	zids?: Record<string, string>;
};

/** Picks the dedicated directory page to return to, based on the user's primary role. */
const resolveDirectoryPath = (roles?: Array<{ type?: string | null }>) => {
	const types = new Set((roles ?? []).map((role) => role.type));
	if (types.has("counsellor")) return "/counsellors";
	if (types.has("mentor")) return "/mentors";
	if (types.has("sales")) return "/sales-users";
	return "/admins";
};

export const EditUserPage = () => {
	const { userId = "" } = useParams();
	const navigate = useNavigate();
	const { token } = useSession();
	const usersQuery = useUsersQuery(token);
	const updateUserMutation = useUpdateUserMutation();

	const user = useMemo(
		() =>
			usersQuery.data?.users.find(
				(row) => row.id === userId,
			) as EditableUser | null,
		[userId, usersQuery.data?.users],
	);

	const handleSubmit = async (form: {
		name: string;
		username: string;
		email?: string;
		gender?: "male" | "female";
		mentorType?: "individual" | "group";
		roleIds: string[];
		counsellorId?: string;
		zids?: Record<string, string>;
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
					mentorType: form.mentorType,
					roleIds: form.roleIds,
					counsellorId: form.counsellorId,
					zids: form.zids,
				},
			});
			toast.success("User updated successfully!");
			navigate(resolveDirectoryPath(user?.roles));
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
						to="/admins"
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
