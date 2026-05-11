import { AdminChangePasswordPayloadSchema } from "@repo/schema";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
	HiLockClosed,
	HiPencilSquare,
	HiPower,
	HiTrash,
	HiUserPlus,
} from "react-icons/hi2";
import { Link, useLocation } from "react-router-dom";
import { ApiError } from "@/api/request";
import { ActionButton } from "@/components/ActionButton";
import { ConfirmDialog, Field, Modal, Panel } from "@/components/dashboard-ui";
import {
	useChangeUserPasswordMutation,
	useDeleteUserMutation,
	useSetUserStatusMutation,
} from "@/features/users/use-user-management-mutations";
import { useUsersQuery } from "@/features/users/users.queries";
import type { AdminChangePasswordForm } from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

const matchesRoleType = (roleType: string, expectedType: string) =>
	roleType === expectedType;

export const UsersPage = () => {
	const { token } = useSession();
	const location = useLocation();
	const usersQuery = useUsersQuery(token);
	const deleteUserMutation = useDeleteUserMutation();
	const setUserStatusMutation = useSetUserStatusMutation();
	const changeUserPasswordMutation = useChangeUserPasswordMutation();
	const pageRoleType = location.search.includes("role=sales")
		? "sales"
		: "admin";
	const { control, handleSubmit, reset, setError } =
		useForm<AdminChangePasswordForm>({
			defaultValues: { newPassword: "" },
		});

	const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
	const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

	const handleToggleStatus = async (userId: string, isActive: boolean) => {
		try {
			await setUserStatusMutation.mutateAsync({
				userId,
				isActive: !isActive,
			});
			toast.success(
				!isActive
					? "User activated successfully."
					: "User deactivated successfully.",
			);
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Unable to update status");
				return;
			}

			toast.error(
				error instanceof Error ? error.message : "Unable to update status",
			);
		}
	};

	const handleDeleteUser = async () => {
		if (!deleteUserId) {
			return;
		}

		try {
			await deleteUserMutation.mutateAsync(deleteUserId);
			toast.success("User deleted successfully.");
			setDeleteUserId(null);
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Unable to delete user");
				return;
			}

			toast.error(
				error instanceof Error ? error.message : "Unable to delete user",
			);
		}
	};

	const users = useMemo(() => {
		return (
			usersQuery.data?.users.filter((user) =>
				user.roles.some((role) =>
					matchesRoleType(role.type ?? "admin", pageRoleType),
				),
			) ?? []
		);
	}, [pageRoleType, usersQuery.data?.users]);

	const onSubmitPassword = async (passwordForm: AdminChangePasswordForm) => {
		if (!passwordUserId) {
			return;
		}

		const validation = AdminChangePasswordPayloadSchema.safeParse(passwordForm);
		if (!validation.success) {
			const newPasswordError =
				validation.error.flatten().fieldErrors.newPassword?.[0];
			if (newPasswordError) {
				setError("newPassword", { type: "manual", message: newPasswordError });
			}
			return;
		}

		try {
			await changeUserPasswordMutation.mutateAsync({
				userId: passwordUserId,
				payload: validation.data,
			});
			toast.success("Password updated successfully.");
			setPasswordUserId(null);
			reset({ newPassword: "" });
		} catch (error) {
			if (error instanceof ApiError) {
				const newPasswordError = error.payload.errors?.newPassword?.[0];
				if (newPasswordError) {
					setError("newPassword", {
						type: "server",
						message: newPasswordError,
					});
				}
				toast.error(error.payload.message ?? "Unable to update password");
				return;
			}

			toast.error(
				error instanceof Error ? error.message : "Unable to update password",
			);
		}
	};

	return (
		<div className="grid gap-6">
			<Panel
				title={pageRoleType === "sales" ? "Sales" : "Users"}
				description="Team"
				action={
					<Link
						to={`/users/create?role=${pageRoleType}`}
						className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
					>
						<HiUserPlus className="h-4 w-4" aria-hidden="true" />
						{pageRoleType === "sales" ? "Create sales user" : "Create user"}
					</Link>
				}
			>
				<div className="overflow-x-auto rounded-3xl border border-gray-300">
					<table className="min-w-full border-collapse bg-white text-left text-sm">
						<thead className="bg-gray-50 text-xs uppercase tracking-[0.14em] text-gray-600">
							<tr>
								<th className="px-4 py-3 font-semibold">Name</th>
								<th className="px-4 py-3 font-semibold">Username</th>
								<th className="px-4 py-3 font-semibold">Roles</th>
								<th className="px-4 py-3 font-semibold">Status</th>
								<th className="px-4 py-3 font-semibold">Actions</th>
							</tr>
						</thead>
						<tbody>
							{users.map((user) => (
								<tr
									key={user.id}
									className="border-t border-gray-300 align-top"
								>
									<td className="px-4 py-3 font-semibold text-gray-900">
										{user.name}
									</td>
									<td className="px-4 py-3 text-gray-600">
										{user.username ?? "-"}
									</td>
									{/* email removed; using username */}
									<td className="px-4 py-3">
										<div className="flex flex-wrap gap-2">
											{user.roles.map((role) => (
												<span
													key={role.id}
													className="rounded-full border border-blue-600/20 bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600"
												>
													{role.name}
												</span>
											))}
										</div>
									</td>
									<td className="px-4 py-3">
										<span
											className={
												user.isActive
													? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
													: "rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700"
											}
										>
											{user.isActive ? "Active" : "Inactive"}
										</span>
									</td>
									<td className="px-4 py-3">
										<div className="flex flex-wrap items-center gap-2">
											<Link
												to={`/users/${user.id}/edit`}
												className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50"
												title="Edit user"
												aria-label="Edit user"
											>
												<HiPencilSquare
													className="h-4 w-4"
													aria-hidden="true"
												/>
											</Link>
											<ActionButton
												icon={
													<HiLockClosed
														className="h-4 w-4"
														aria-hidden="true"
													/>
												}
												tooltip="Change password"
												color="purple"
												onClick={() => {
													setPasswordUserId(user.id);
													reset({ newPassword: "" });
												}}
											/>
											<ActionButton
												icon={
													<HiPower className="h-4 w-4" aria-hidden="true" />
												}
												tooltip={
													user.isActive ? "Deactivate user" : "Activate user"
												}
												color={user.isActive ? "orange" : "green"}
												onClick={() =>
													handleToggleStatus(user.id, user.isActive)
												}
											/>
											<ActionButton
												icon={
													<HiTrash className="h-4 w-4" aria-hidden="true" />
												}
												tooltip="Delete user"
												color="red"
												onClick={() => setDeleteUserId(user.id)}
											/>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Panel>

			<Modal
				open={Boolean(passwordUserId)}
				title="Change user password"
				description="Security"
				onClose={() => setPasswordUserId(null)}
				footer={
					<>
						<button
							type="button"
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
							onClick={() => setPasswordUserId(null)}
						>
							Cancel
						</button>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
							onClick={() => void handleSubmit(onSubmitPassword)()}
							disabled={changeUserPasswordMutation.isPending}
						>
							<HiLockClosed className="h-4 w-4" aria-hidden="true" />
							{changeUserPasswordMutation.isPending
								? "Saving..."
								: "Update password"}
						</button>
					</>
				}
			>
				<form onSubmit={handleSubmit(onSubmitPassword)}>
					<Controller
						name="newPassword"
						control={control}
						render={({ field, fieldState }) => (
							<Field
								label="New password"
								type="password"
								value={field.value}
								onChange={field.onChange}
								error={fieldState.error?.message}
							/>
						)}
					/>
				</form>
			</Modal>

			<ConfirmDialog
				open={Boolean(deleteUserId)}
				title="Delete user"
				description="Are you sure you want to delete this user?"
				confirmLabel="Delete"
				busy={deleteUserMutation.isPending}
				tone="danger"
				onConfirm={handleDeleteUser}
				onCancel={() => setDeleteUserId(null)}
			/>
		</div>
	);
};
