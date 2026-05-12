import { ApiError } from "@/api/request";
import { ActionButton } from "@/components/ActionButton";
import { ConfirmDialog, Field, Modal, Panel } from "@/components/dashboard-ui";
import {
	useChangeUserPasswordMutation,
	useDeleteUserMutation,
	useSetUserStatusMutation,
} from "@/features/users/use-user-management-mutations";
import { useUsersQuery } from "@/features/users/users.queries";
import { useSession } from "@/lib/session";
import {
	AdminChangePasswordPayloadSchema
} from "@repo/schema";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
	HiLockClosed,
	HiPencilSquare,
	HiPower,
	HiTrash,
	HiUserPlus,
	HiEye
} from "react-icons/hi2";
import { Link, useNavigate } from "react-router-dom";

type RoleUsersPageProps = {
	title: string;
	description: string;
	roleType: "admin" | "mentor" | "counsellor" | "sales";
	createPath: string;
};

const matchesRoleType = (roleType: string, expectedType: string) =>
	roleType === expectedType;

const getRoleIdentityLabel = (roleType: RoleUsersPageProps["roleType"]) => {
	if (roleType === "mentor") {
		return "Mentor ID";
	}

	if (roleType === "counsellor") {
		return "Counsellor ID";
	}

	if (roleType === "sales") {
		return "Sales ID";
	}

	return "Admin ID";
};

export const RoleUsersPage = ({
	title,
	description,
	roleType,
	createPath,
}: RoleUsersPageProps) => {
	const { token } = useSession();
	const usersQuery = useUsersQuery(token);
	const deleteUserMutation = useDeleteUserMutation();
	const setUserStatusMutation = useSetUserStatusMutation();
	const changeUserPasswordMutation = useChangeUserPasswordMutation();
	const navigate = useNavigate();
	const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
	const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
	const [query, setQuery] = useState<string>("");
	const [sortBy, setSortBy] = useState<"identity" | "name" | "counsellor">(
		"identity",
	);
	const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
	const { control, handleSubmit, reset, setError } = useForm<{
		newPassword: string;
	}>({
		defaultValues: { newPassword: "" },
	});
	const allUsers = usersQuery.data?.users ?? [];

	const userNameById = new Map(allUsers.map((u) => [u.id, u.name]));
	const getCounsellorName = (counsellorId?: string) => {
		if (!counsellorId) return "-";
		return userNameById.get(counsellorId) ?? "-";
	};

	const users = useMemo(() => {
		const filtered = allUsers.filter((user) =>
			user.roles.some((role) => matchesRoleType(role.type ?? "admin", roleType)),
		);

		const q = query.trim().toLowerCase();
		const searched = q
			? filtered.filter((user) => {
					const identity =
						(user.zids && (user.zids as any)[roleType]) ?? user.mentorId ?? user.counsellorId ?? user.username ?? "";
					const counsellorName = getCounsellorName(user.counsellorId).toLowerCase();
					return (
						identity.toLowerCase().includes(q) ||
						(user.name ?? "").toLowerCase().includes(q) ||
						counsellorName.includes(q)
					);
			  })
			: filtered;

		const sorted = searched.slice().sort((a, b) => {
			const aIdentity = ((a.zids && (a.zids as any)[roleType]) ?? a.mentorId ?? a.counsellorId ?? a.username ?? "").toLowerCase();
			const bIdentity = ((b.zids && (b.zids as any)[roleType]) ?? b.mentorId ?? b.counsellorId ?? b.username ?? "").toLowerCase();
			const aName = (a.name ?? "").toLowerCase();
			const bName = (b.name ?? "").toLowerCase();
			const aCounsellor = getCounsellorName(a.counsellorId).toLowerCase();
			const bCounsellor = getCounsellorName(b.counsellorId).toLowerCase();

			let cmp = 0;
			if (sortBy === "identity") cmp = aIdentity.localeCompare(bIdentity);
			else if (sortBy === "name") cmp = aName.localeCompare(bName);
			else cmp = aCounsellor.localeCompare(bCounsellor);

			return sortDir === "asc" ? cmp : -cmp;
		});

		return sorted;
	}, [allUsers, roleType, query, sortBy, sortDir]);
	const identityHeader = getRoleIdentityLabel(roleType);

	const handleToggleStatus = async (userId: string, isActive: boolean) => {
		// clear any existing banner state

			try {
				await setUserStatusMutation.mutateAsync({ userId, isActive: !isActive });
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

				toast.error(error instanceof Error ? error.message : "Unable to update status");
			}
	};

	const handleDeleteUser = async () => {
		if (!deleteUserId) {
			return;
		}

		// clear banner

		try {
			await deleteUserMutation.mutateAsync(deleteUserId);
			toast.success("User deleted successfully.");
			setDeleteUserId(null);
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Unable to delete user");
				return;
			}

			toast.error(error instanceof Error ? error.message : "Unable to delete user");
		}
	};

	const onSubmitPassword = async ({ newPassword }: { newPassword: string }) => {
		if (!passwordUserId) {
			return;
		}

		// clear banner

		const validation = AdminChangePasswordPayloadSchema.safeParse({
			newPassword,
		});
		if (!validation.success) {
			const passwordError =
				validation.error.flatten().fieldErrors.newPassword?.[0];
			if (passwordError) {
				setError("newPassword", { type: "manual", message: passwordError });
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
				const passwordError = error.payload.errors?.newPassword?.[0];
				if (passwordError) {
					setError("newPassword", { type: "server", message: passwordError });
				}
				toast.error(error.payload.message ?? "Unable to update password");
				return;
			}

			toast.error(error instanceof Error ? error.message : "Unable to update password");
		}
	};

	return (
		<div className="grid gap-6">
			<Panel
				title={title}
				description={description}
				action={
					<Link
						to={createPath}
						className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
					>
						<HiUserPlus className="h-4 w-4" aria-hidden="true" />
						Create {title.slice(0, -1)}
					</Link>
				}
			>
				<div className="mb-4 flex items-center gap-3">
					<Field
						label="Search"
						type="text"
						value={query}
						onChange={(v) => setQuery(v)}
						placeholder="Search by id, name or counsellor"
					/>
					<div className="ml-auto flex items-center gap-2">
						<select
							value={sortBy}
							onChange={(e) => setSortBy(e.target.value as any)}
							className="rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm"
						>
							<option value="identity">Sort: Identity</option>
							<option value="name">Sort: Name</option>
							<option value="counsellor">Sort: Counsellor</option>
						</select>
						<button
							type="button"
							onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
							className="rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm"
						>
							{sortDir === "asc" ? "Asc" : "Desc"}
						</button>
					</div>
				</div>

				<div className="overflow-x-auto rounded-3xl border border-gray-300">
					<table className="min-w-full border-collapse bg-white text-left text-sm">
						<thead className="bg-gray-50 text-xs uppercase tracking-[0.14em] text-gray-600">
							<tr>
								<th className="px-4 py-3 font-semibold">{identityHeader}</th>
								<th className="px-4 py-3 font-semibold">Name</th>
								{roleType === "mentor" && (
									<th className="px-4 py-3 font-semibold">Counsellor</th>
								)}
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
									<td className="px-4 py-3 text-gray-600 font-semibold">
										{(user.zids && (user.zids as any)[roleType]) ?? (roleType === "mentor" ? user.mentorId : user.counsellorId) ?? "-"}
									</td>
									<td className="px-4 py-3 font-semibold text-gray-900">
										{user.name}
									</td>
									{roleType === "mentor" && (
										<td className="px-4 py-3 text-gray-600">
											<Link
												to={user.counsellorId ? `/users/${user.counsellorId}/edit` : "#"}
												className="text-indigo-600 hover:underline"
											>
												{getCounsellorName(user.counsellorId)}
											</Link>
										</td>
									)}
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
											<button
												type="button"
												className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50"
												onClick={() => navigate(`/users/${user.id}`)}
												title="View user"
												aria-label="View user"
											>
												<HiEye className="h-4 w-4" aria-hidden="true" />
											</button>

											<button
												type="button"
												className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50"
												onClick={() => navigate(`/users/${user.id}/edit`)}
												title="Edit user"
												aria-label="Edit user"
											>
												<HiPencilSquare
													className="h-4 w-4"
													aria-hidden="true"
												/>
											</button>
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
													void handleToggleStatus(user.id, user.isActive)
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

			<ConfirmDialog
				open={Boolean(deleteUserId)}
				title="Delete user"
				description="Are you sure you want to delete this user?"
				confirmLabel="Delete"
				busy={deleteUserMutation.isPending}
				tone="danger"
				onConfirm={() => void handleDeleteUser()}
				onCancel={() => setDeleteUserId(null)}
			/>

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
							type="submit"
							form="role-password-form"
							className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
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
				<form id="role-password-form" onSubmit={handleSubmit(onSubmitPassword)}>
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
		</div>
	);
};

export const RoleUserCreatePage = () => {
	// Redirects to the unified create user page
	return null;
};
