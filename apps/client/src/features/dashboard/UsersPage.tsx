import { AdminChangePasswordPayloadSchema } from "@repo/schema";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
	HiLockClosed,
	HiPencilSquare,
	HiPower,
	HiTrash,
	HiUserPlus,
} from "react-icons/hi2";
import { Link } from "react-router-dom";
import { ApiError } from "@/api/request";
import { ConfirmDialog, Field, Modal, Panel } from "@/components/dashboard-ui";
import {
	useChangeUserPasswordMutation,
	useDeleteUserMutation,
	useSetUserStatusMutation,
} from "@/features/users/use-user-management-mutations";
import { useUsersQuery } from "@/features/users/users.queries";
import type { AdminChangePasswordForm } from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

export const UsersPage = () => {
	const { token } = useSession();
	const usersQuery = useUsersQuery(token);
	const deleteUserMutation = useDeleteUserMutation();
	const setUserStatusMutation = useSetUserStatusMutation();
	const changeUserPasswordMutation = useChangeUserPasswordMutation();
	const { control, handleSubmit, reset, setError } =
		useForm<AdminChangePasswordForm>({
			defaultValues: { newPassword: "" },
		});

	const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
	const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
	const [banner, setBanner] = useState("");

	const handleToggleStatus = async (userId: string, isActive: boolean) => {
		setBanner("");

		try {
			await setUserStatusMutation.mutateAsync({
				userId,
				isActive: !isActive,
			});
			setBanner(
				!isActive
					? "User activated successfully."
					: "User deactivated successfully.",
			);
		} catch (error) {
			if (error instanceof ApiError) {
				setBanner(error.payload.message ?? "Unable to update status");
				return;
			}

			setBanner(
				error instanceof Error ? error.message : "Unable to update status",
			);
		}
	};

	const handleDeleteUser = async () => {
		if (!deleteUserId) {
			return;
		}

		setBanner("");

		try {
			await deleteUserMutation.mutateAsync(deleteUserId);
			setBanner("User deleted successfully.");
			setDeleteUserId(null);
		} catch (error) {
			if (error instanceof ApiError) {
				setBanner(error.payload.message ?? "Unable to delete user");
				return;
			}

			setBanner(
				error instanceof Error ? error.message : "Unable to delete user",
			);
		}
	};

	const onSubmitPassword = async (passwordForm: AdminChangePasswordForm) => {
		if (!passwordUserId) {
			return;
		}

		setBanner("");

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
			setBanner("Password updated successfully.");
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
				setBanner(error.payload.message ?? "Unable to update password");
				return;
			}

			setBanner(
				error instanceof Error ? error.message : "Unable to update password",
			);
		}
	};

	return (
		<div className="grid gap-6">
			<Panel
				title="Users"
				description="Team"
				action={
					<Link
						to="/users/create"
						className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-surface transition hover:brightness-105"
					>
						<HiUserPlus className="h-4 w-4" aria-hidden="true" />
						Create user
					</Link>
				}
			>
				<div className="overflow-x-auto rounded-3xl border border-border">
					<table className="min-w-full border-collapse bg-surface text-left text-sm">
						<thead className="bg-surface-muted text-xs uppercase tracking-[0.14em] text-ink-soft">
							<tr>
								<th className="px-4 py-3 font-semibold">Name</th>
								<th className="px-4 py-3 font-semibold">Username</th>
								<th className="px-4 py-3 font-semibold">Email</th>
								<th className="px-4 py-3 font-semibold">Roles</th>
								<th className="px-4 py-3 font-semibold">Status</th>
								<th className="px-4 py-3 font-semibold">Actions</th>
							</tr>
						</thead>
						<tbody>
							{usersQuery.data?.users.map((user) => (
								<tr key={user.id} className="border-t border-border align-top">
									<td className="px-4 py-3 font-semibold text-ink">
										{user.name}
									</td>
									<td className="px-4 py-3 text-ink-soft">
										{user.username ?? "-"}
									</td>
									<td className="px-4 py-3 text-ink-soft">{user.email}</td>
									<td className="px-4 py-3">
										<div className="flex flex-wrap gap-2">
											{user.roles.map((role) => (
												<span
													key={role.id}
													className="rounded-full border border-brand/20 bg-brand-soft px-3 py-1 text-xs font-semibold text-brand"
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
													? "rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-ink"
													: "rounded-full bg-danger-soft px-3 py-1 text-xs font-semibold text-ink"
											}
										>
											{user.isActive ? "Active" : "Inactive"}
										</span>
									</td>
									<td className="px-4 py-3">
										<div className="flex flex-wrap gap-2">
											<Link
												to={`/users/${user.id}/edit`}
												className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold text-ink transition hover:border-brand/30"
											>
												<HiPencilSquare
													className="h-3.5 w-3.5"
													aria-hidden="true"
												/>
												Edit
											</Link>
											<button
												type="button"
												className="inline-flex items-center gap-1 rounded-full border border-sky/30 bg-sky-soft px-3 py-1 text-xs font-semibold text-ink transition hover:brightness-105"
												onClick={() => {
													setPasswordUserId(user.id);
													reset({ newPassword: "" });
												}}
											>
												<HiLockClosed
													className="h-3.5 w-3.5"
													aria-hidden="true"
												/>
												Password
											</button>
											<button
												type="button"
												className={
													user.isActive
														? "inline-flex items-center gap-1 rounded-full border border-warm/30 bg-warm-soft px-3 py-1 text-xs font-semibold text-ink transition hover:brightness-105"
														: "inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-semibold text-ink transition hover:brightness-105"
												}
												onClick={() =>
													handleToggleStatus(user.id, user.isActive)
												}
											>
												<HiPower className="h-3.5 w-3.5" aria-hidden="true" />
												{user.isActive ? "Deactivate" : "Activate"}
											</button>
											<button
												type="button"
												className="inline-flex items-center gap-1 rounded-full border border-danger/30 bg-danger-soft px-3 py-1 text-xs font-semibold text-ink transition hover:brightness-105"
												onClick={() => setDeleteUserId(user.id)}
											>
												<HiTrash className="h-3.5 w-3.5" aria-hidden="true" />
												Delete
											</button>
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
							className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-ink"
							onClick={() => setPasswordUserId(null)}
						>
							Cancel
						</button>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl bg-sky px-4 py-2 text-sm font-semibold text-surface"
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

			{banner ? (
				<p className="rounded-2xl border border-brand/15 bg-brand-soft px-4 py-3 text-sm text-brand">
					{banner}
				</p>
			) : null}
		</div>
	);
};
