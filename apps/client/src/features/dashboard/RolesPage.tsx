import { useMemo, useState } from "react";
import { HiLockClosed, HiPencilSquare, HiPlus, HiShieldCheck, HiTrash } from "react-icons/hi2";
import { Link } from "react-router-dom";
import { ApiError } from "@/api/request";
import { ConfirmDialog } from "@/components/dashboard-ui";
import { usePermissionsQuery } from "@/features/permissions/permissions.queries";
import { useRolesQuery } from "@/features/roles/roles.queries";
import { useDeleteRoleMutation } from "@/features/roles/use-role-management-mutations";
import { useSession } from "@/lib/session";

const TYPE_BADGE: Record<string, { bg: string; text: string }> = {
	admin:      { bg: "bg-rose-100",    text: "text-rose-700" },
	mentor:     { bg: "bg-violet-100",  text: "text-violet-700" },
	counsellor: { bg: "bg-blue-100",    text: "text-blue-700" },
	sales:      { bg: "bg-amber-100",   text: "text-amber-700" },
	general:    { bg: "bg-gray-100",    text: "text-gray-600" },
};

function typeBadge(type?: string | null): { bg: string; text: string } {
	return TYPE_BADGE[type ?? "general"] ?? { bg: "bg-gray-100", text: "text-gray-600" };
}

export const RolesPage = () => {
	const { token } = useSession();
	const rolesQuery = useRolesQuery(token);
	const permissionsQuery = usePermissionsQuery(token);
	const deleteRoleMutation = useDeleteRoleMutation();

	const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);
	const [banner, setBanner] = useState("");

	const permissionsById = useMemo(() => {
		const m = new Map<string, string>();
		for (const p of permissionsQuery.data?.permissions ?? []) m.set(p.id, p.name);
		return m;
	}, [permissionsQuery.data?.permissions]);

	const roleToDelete = rolesQuery.data?.roles.find((r) => r.id === deleteRoleId) ?? null;

	const handleDeleteRole = async () => {
		if (!roleToDelete) return;
		if (roleToDelete.isSystem) {
			setBanner("System roles cannot be deleted.");
			setDeleteRoleId(null);
			return;
		}
		try {
			await deleteRoleMutation.mutateAsync(roleToDelete.id);
			setBanner("Role deleted successfully.");
			setDeleteRoleId(null);
		} catch (error) {
			setBanner(
				error instanceof ApiError
					? (error.payload.message ?? "Unable to delete role")
					: error instanceof Error ? error.message : "Unable to delete role",
			);
		}
	};

	const roles = rolesQuery.data?.roles ?? [];

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
						<HiLockClosed className="h-5 w-5 text-rose-600" />
					</div>
					<div>
						<h1 className="text-lg font-bold text-gray-900">Roles & Permissions</h1>
						<p className="mt-0.5 text-sm text-gray-500">
							{roles.length} role{roles.length !== 1 ? "s" : ""} · Access control configuration
						</p>
					</div>
				</div>
				<Link
					to="/roles/create"
					className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
				>
					<HiPlus className="h-4 w-4" />
					Create Role
				</Link>
			</div>

			{banner ? (
				<div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
					{banner}
				</div>
			) : null}

			{/* Loading */}
			{rolesQuery.isLoading ? (
				<div className="flex justify-center py-16">
					<div className="h-6 w-6 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
				</div>
			) : roles.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
					<HiShieldCheck className="mx-auto h-10 w-10 text-gray-200" />
					<p className="mt-2 text-sm text-gray-400">No roles found.</p>
				</div>
			) : (
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{roles.map((role) => {
						const permNames = role.permissionIds
							.map((id) => permissionsById.get(id))
							.filter((n): n is string => Boolean(n));
						const shown = permNames.slice(0, 6);
						const extra = permNames.length - shown.length;
						const badge = typeBadge(role.type);

						return (
							<div
								key={role.id}
								className="group flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
							>
								{/* Card header */}
								<div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
									<div className="flex items-center gap-3 min-w-0">
										<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50">
											<HiShieldCheck className="h-5 w-5 text-rose-500" />
										</div>
										<div className="min-w-0">
											<div className="flex items-center gap-2">
												<p className="text-sm font-bold text-gray-900 truncate">{role.name}</p>
												{role.isSystem ? (
													<span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
														System
													</span>
												) : null}
											</div>
											<span className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${badge.bg} ${badge.text}`}>
												{role.type ?? "general"}
											</span>
										</div>
									</div>
									<div className="flex shrink-0 items-center gap-1">
										<Link
											to={`/roles/${role.id}/edit`}
											title="Edit role"
											className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
										>
											<HiPencilSquare className="h-4 w-4" />
										</Link>
										<button
											type="button"
											title={role.isSystem ? "System role cannot be deleted" : "Delete role"}
											disabled={role.isSystem}
											onClick={() => setDeleteRoleId(role.id)}
											className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
										>
											<HiTrash className="h-4 w-4" />
										</button>
									</div>
								</div>

								{/* Description */}
								<div className="px-5 py-3">
									{role.description ? (
										<p className="text-xs text-gray-500 leading-relaxed">{role.description}</p>
									) : (
										<p className="text-xs text-gray-400 italic">No description</p>
									)}
								</div>

								{/* Permissions */}
								<div className="flex-1 px-5 pb-4">
									<p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
										{permNames.length} Permission{permNames.length !== 1 ? "s" : ""}
									</p>
									{permNames.length === 0 ? (
										<p className="text-xs text-gray-400">No permissions assigned</p>
									) : (
										<div className="flex flex-wrap gap-1.5">
											{shown.map((name) => (
												<span
													key={name}
													className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700"
												>
													{name}
												</span>
											))}
											{extra > 0 ? (
												<Link
													to={`/roles/${role.id}/edit`}
													className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[11px] font-medium text-gray-500 hover:bg-gray-100"
												>
													+{extra} more
												</Link>
											) : null}
										</div>
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}

			<ConfirmDialog
				open={Boolean(deleteRoleId)}
				title="Delete role"
				description={`Are you sure you want to delete "${roleToDelete?.name}"? This cannot be undone.`}
				confirmLabel="Delete"
				busy={deleteRoleMutation.isPending}
				tone="danger"
				onConfirm={handleDeleteRole}
				onCancel={() => setDeleteRoleId(null)}
			/>
		</div>
	);
};
