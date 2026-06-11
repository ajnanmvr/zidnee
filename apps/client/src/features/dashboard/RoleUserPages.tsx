import { AdminChangePasswordPayloadSchema } from "@repo/schema";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
	HiAcademicCap,
	HiBanknotes,
	HiChatBubbleLeftRight,
	HiCheck,
	HiChevronUpDown,
	HiLockClosed,
	HiMagnifyingGlass,
	HiPencilSquare,
	HiPower,
	HiShieldCheck,
	HiTrash,
	HiUserPlus,
} from "react-icons/hi2";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "@/api/request";
import { ConfirmDialog, Field, Modal } from "@/components/dashboard-ui";
import {
	useChangeUserPasswordMutation,
	useDeleteUserMutation,
	useSetUserStatusMutation,
} from "@/features/users/use-user-management-mutations";
import { useUsersQuery } from "@/features/users/users.queries";
import { useHasAnyPermission } from "@/lib/hooks/use-has-permission";
import { useSession } from "@/lib/session";

type RoleType = "admin" | "mentor" | "counsellor" | "sales";

const PERMISSION_PREFIX: Record<RoleType, string> = {
	admin: "ADMIN",
	mentor: "MENTOR",
	counsellor: "COUNSELLOR",
	sales: "SALES",
};

type RoleUsersPageProps = {
	title: string;
	description: string;
	roleType: RoleType;
	createPath: string;
};

const ROLE_THEME: Record<
	RoleType,
	{ icon: typeof HiShieldCheck; iconBg: string; iconText: string; ring: string; identityBadge: string }
> = {
	admin: {
		icon: HiShieldCheck,
		iconBg: "bg-violet-100",
		iconText: "text-violet-600",
		ring: "focus:border-violet-500 focus:ring-violet-100",
		identityBadge: "bg-violet-50 text-violet-700",
	},
	mentor: {
		icon: HiAcademicCap,
		iconBg: "bg-emerald-100",
		iconText: "text-emerald-600",
		ring: "focus:border-emerald-500 focus:ring-emerald-100",
		identityBadge: "bg-emerald-50 text-emerald-700",
	},
	counsellor: {
		icon: HiChatBubbleLeftRight,
		iconBg: "bg-sky-100",
		iconText: "text-sky-600",
		ring: "focus:border-sky-500 focus:ring-sky-100",
		identityBadge: "bg-sky-50 text-sky-700",
	},
	sales: {
		icon: HiBanknotes,
		iconBg: "bg-amber-100",
		iconText: "text-amber-600",
		ring: "focus:border-amber-500 focus:ring-amber-100",
		identityBadge: "bg-amber-50 text-amber-700",
	},
};

const AVATAR_COLORS = [
	"bg-teal-500", "bg-blue-500", "bg-violet-500", "bg-rose-500",
	"bg-amber-500", "bg-emerald-500", "bg-cyan-500", "bg-indigo-500",
];
const avatarColor = (id: string) => {
	let h = 0;
	for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
	return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length] ?? "bg-teal-500";
};

const getRoleIdentityLabel = (roleType: RoleType) => {
	if (roleType === "mentor") return "Mentor ID";
	if (roleType === "counsellor") return "Counsellor ID";
	if (roleType === "sales") return "Sales ID";
	return "Admin ID";
};

const getIdentity = (
	user: { zids?: Record<string, string>; mentorId?: string | null; counsellorId?: string | null },
	roleType: RoleType,
) =>
	(user.zids && user.zids[roleType]) ??
	(roleType === "mentor" ? user.mentorId : roleType === "counsellor" ? user.counsellorId : null) ??
	null;

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
	const [sortBy, setSortBy] = useState<"identity" | "name" | "counsellor">("identity");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
	const { control, handleSubmit, reset, setError } = useForm<{ newPassword: string }>({
		defaultValues: { newPassword: "" },
	});

	const allUsers = usersQuery.data?.users ?? [];
	const theme = ROLE_THEME[roleType];
	const Icon = theme.icon;
	const permissionPrefix = PERMISSION_PREFIX[roleType];
	const canCreate = useHasAnyPermission(["USER_CREATE", `${permissionPrefix}_CREATE`]);
	const canUpdate = useHasAnyPermission(["USER_UPDATE", `${permissionPrefix}_UPDATE`]);
	const canDelete = useHasAnyPermission(["USER_DELETE", `${permissionPrefix}_DELETE`]);

	const userNameById = new Map(allUsers.map((u) => [u.id, u.name]));
	const getCounsellorName = (counsellorId?: string) =>
		counsellorId ? (userNameById.get(counsellorId) ?? "—") : "—";

	const mentorCountByCounsellorId = useMemo(() => {
		const counts = new Map<string, number>();
		for (const user of allUsers) {
			if (user.counsellorId && user.roles.some((role) => (role.type ?? "admin") === "mentor")) {
				counts.set(user.counsellorId, (counts.get(user.counsellorId) ?? 0) + 1);
			}
		}
		return counts;
	}, [allUsers]);

	const users = useMemo(() => {
		const filtered = allUsers.filter((user) =>
			user.roles.some((role) => (role.type ?? "admin") === roleType),
		);

		const q = query.trim().toLowerCase();
		const searched = q
			? filtered.filter((user) => {
					const identity = (getIdentity(user, roleType) ?? user.username ?? "").toLowerCase();
					const counsellorName = getCounsellorName(user.counsellorId).toLowerCase();
					return (
						identity.includes(q) ||
						(user.name ?? "").toLowerCase().includes(q) ||
						(user.username ?? "").toLowerCase().includes(q) ||
						(user.email ?? "").toLowerCase().includes(q) ||
						counsellorName.includes(q)
					);
				})
			: filtered;

		const sorted = searched.slice().sort((a, b) => {
			const aIdentity = (getIdentity(a, roleType) ?? a.username ?? "").toLowerCase();
			const bIdentity = (getIdentity(b, roleType) ?? b.username ?? "").toLowerCase();
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
		try {
			await setUserStatusMutation.mutateAsync({ userId, isActive: !isActive });
			toast.success(!isActive ? "User activated successfully." : "User deactivated successfully.");
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Unable to update status");
				return;
			}
			toast.error(error instanceof Error ? error.message : "Unable to update status");
		}
	};

	const handleDeleteUser = async () => {
		if (!deleteUserId) return;
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
		if (!passwordUserId) return;

		const validation = AdminChangePasswordPayloadSchema.safeParse({ newPassword });
		if (!validation.success) {
			const passwordError = validation.error.flatten().fieldErrors.newPassword?.[0];
			if (passwordError) setError("newPassword", { type: "manual", message: passwordError });
			return;
		}

		try {
			await changeUserPasswordMutation.mutateAsync({ userId: passwordUserId, payload: validation.data });
			toast.success("Password updated successfully.");
			setPasswordUserId(null);
			reset({ newPassword: "" });
		} catch (error) {
			if (error instanceof ApiError) {
				const passwordError = error.payload.errors?.newPassword?.[0];
				if (passwordError) setError("newPassword", { type: "server", message: passwordError });
				toast.error(error.payload.message ?? "Unable to update password");
				return;
			}
			toast.error(error instanceof Error ? error.message : "Unable to update password");
		}
	};

	const cycleSort = (key: "identity" | "name" | "counsellor") => {
		if (sortBy === key) {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSortBy(key);
			setSortDir("asc");
		}
	};

	const SortHeader = ({ label, sortKey }: { label: string; sortKey: "identity" | "name" | "counsellor" }) => (
		<button
			type="button"
			onClick={() => cycleSort(sortKey)}
			className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-gray-400 transition hover:text-gray-600"
		>
			{label}
			<HiChevronUpDown className={`h-3.5 w-3.5 ${sortBy === sortKey ? "text-gray-600" : "text-gray-300"}`} />
		</button>
	);

	return (
		<div className="space-y-3">
			{/* Page header */}
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
				<div className="flex items-center gap-3">
					<div className={`flex h-10 w-10 items-center justify-center rounded-xl ${theme.iconBg}`}>
						<Icon className={`h-5 w-5 ${theme.iconText}`} />
					</div>
					<div>
						<h1 className="text-lg font-bold text-gray-900">{title}</h1>
						<p className="mt-0.5 text-sm text-gray-500">
							{users.length > 0 ? `${users.length} account${users.length !== 1 ? "s" : ""}` : "No accounts"} · {description}
						</p>
					</div>
				</div>
				{canCreate ? (
					<Link
						to={createPath}
						className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
					>
						<HiUserPlus className="h-4 w-4" aria-hidden="true" />
						Create {title.replace(/s$/, "")}
					</Link>
				) : null}
			</div>

			{/* Search toolbar */}
			<div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3">
				<div className="relative flex-1 min-w-50 max-w-sm">
					<HiMagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
					<input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search by ID, name, username, or email…"
						className={`w-full rounded-lg border border-gray-200 py-2 pl-10 pr-3 text-sm outline-none focus:ring-2 ${theme.ring}`}
					/>
				</div>
				{query ? (
					<button
						type="button"
						onClick={() => setQuery("")}
						className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50"
					>
						Clear
					</button>
				) : null}
			</div>

			{/* Table */}
			<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
				{usersQuery.isLoading ? (
					<div className="flex justify-center py-16">
						<div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
					</div>
				) : users.length === 0 ? (
					<div className="py-16 text-center">
						<Icon className="mx-auto h-10 w-10 text-gray-200" />
						<p className="mt-2 text-sm text-gray-400">
							{query ? `No ${title.toLowerCase()} match "${query}".` : `No ${title.toLowerCase()} yet.`}
						</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="min-w-full border-collapse text-sm">
							<thead>
								<tr className="border-b border-gray-100 bg-gray-50/80">
									<th className="py-2.5 pl-5 pr-4 text-left">
										<SortHeader label={identityHeader} sortKey="identity" />
									</th>
									<th className="px-4 py-2.5 text-left">
										<SortHeader label="Name" sortKey="name" />
									</th>
									{roleType === "mentor" ? (
										<th className="px-4 py-2.5 text-left">
											<SortHeader label="Counsellor" sortKey="counsellor" />
										</th>
									) : null}
									{roleType === "counsellor" ? (
										<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Mentors</th>
									) : null}
									<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Roles</th>
									<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Status</th>
									<th className="px-4 py-2.5 pr-5 text-right text-[11px] font-bold uppercase tracking-widest text-gray-400">Actions</th>
								</tr>
							</thead>
							<tbody>
								{users.map((user) => {
									const identity = getIdentity(user, roleType);
									return (
										<tr key={user.id} className="border-b border-gray-100 transition-colors hover:bg-slate-50">
											{/* Identity + avatar + name combined for scannability */}
											<td className="py-3 pl-5 pr-4">
												<div className="flex items-center gap-3 min-w-0">
													<div className={`h-8 w-8 shrink-0 rounded-full ${avatarColor(user.id)} flex items-center justify-center text-xs font-bold text-white`}>
														{(user.name ?? user.username ?? "?")[0]?.toUpperCase()}
													</div>
													{identity ? (
														<span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${theme.identityBadge}`}>
															{identity.toUpperCase()}
														</span>
													) : (
														<span className="text-xs text-gray-300">—</span>
													)}
												</div>
											</td>

											{/* Name + username */}
											<td className="px-4 py-3">
												<p className="font-semibold text-gray-900 leading-tight">{user.name || "—"}</p>
												{user.username ? <p className="text-[11px] text-gray-400 leading-snug">@{user.username}</p> : null}
											</td>

											{/* Counsellor (mentor rows only) */}
											{roleType === "mentor" ? (
												<td className="px-4 py-3">
													{user.counsellorId ? (
														<Link to={`/users/${user.counsellorId}/edit`} className="text-sm font-medium text-sky-700 hover:underline">
															{getCounsellorName(user.counsellorId)}
														</Link>
													) : (
														<span className="text-sm text-gray-400">Unassigned</span>
													)}
												</td>
											) : null}

											{/* Mentor count (counsellor rows only) */}
											{roleType === "counsellor" ? (
												<td className="px-4 py-3">
													<span className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
														{mentorCountByCounsellorId.get(user.id) ?? 0}
													</span>
												</td>
											) : null}

											{/* Roles */}
											<td className="px-4 py-3">
												<div className="flex flex-wrap gap-1.5">
													{user.roles.map((role) => (
														<span key={role.id} className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
															{role.name}
														</span>
													))}
												</div>
											</td>

											{/* Status */}
											<td className="px-4 py-3">
												<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600">
													<span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? "bg-emerald-500" : "bg-rose-400"}`} />
													{user.isActive ? "Active" : "Inactive"}
												</span>
											</td>

											{/* Actions */}
											<td className="px-4 py-3 pr-5">
												<div className="flex items-center justify-end gap-1.5">
													{canUpdate ? (
														<>
															<button
																type="button"
																onClick={() => navigate(`/users/${user.id}/edit`)}
																title="Edit"
																aria-label="Edit user"
																className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800"
															>
																<HiPencilSquare className="h-4 w-4" aria-hidden="true" />
															</button>
															<button
																type="button"
																onClick={() => { setPasswordUserId(user.id); reset({ newPassword: "" }); }}
																title="Change password"
																aria-label="Change password"
																className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
															>
																<HiLockClosed className="h-4 w-4" aria-hidden="true" />
															</button>
															<button
																type="button"
																onClick={() => void handleToggleStatus(user.id, user.isActive)}
																title={user.isActive ? "Deactivate" : "Activate"}
																aria-label={user.isActive ? "Deactivate user" : "Activate user"}
																className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
																	user.isActive
																		? "border-gray-200 text-gray-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
																		: "border-gray-200 text-gray-500 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
																}`}
															>
																<HiPower className="h-4 w-4" aria-hidden="true" />
															</button>
														</>
													) : null}
													{canDelete ? (
														<button
															type="button"
															onClick={() => setDeleteUserId(user.id)}
															title="Delete"
															aria-label="Delete user"
															className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
														>
															<HiTrash className="h-4 w-4" aria-hidden="true" />
														</button>
													) : null}
													{!canUpdate && !canDelete ? (
														<span className="text-xs text-gray-300">—</span>
													) : null}
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>

			<ConfirmDialog
				open={Boolean(deleteUserId)}
				title="Delete user"
				description="Are you sure you want to delete this user? This cannot be undone."
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
							<HiCheck className="h-4 w-4" aria-hidden="true" />
							{changeUserPasswordMutation.isPending ? "Saving..." : "Update password"}
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
