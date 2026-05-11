import { useMemo, useState } from "react";
import { HiPencilSquare, HiShieldCheck, HiTrash } from "react-icons/hi2";
import { Link } from "react-router-dom";
import { ApiError } from "@/api/request";
import { ActionButton } from "@/components/ActionButton";
import { ConfirmDialog, Panel } from "@/components/dashboard-ui";
import { usePermissionsQuery } from "@/features/permissions/permissions.queries";
import { useRolesQuery } from "@/features/roles/roles.queries";
import { useDeleteRoleMutation } from "@/features/roles/use-role-management-mutations";
import { useSession } from "@/lib/session";

type PermissionView = {
	id: string;
	name: string;
};

export const RolesPage = () => {
	const { token } = useSession();
	const rolesQuery = useRolesQuery(token);
	const permissionsQuery = usePermissionsQuery(token);
	const deleteRoleMutation = useDeleteRoleMutation();

	const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);
	const [banner, setBanner] = useState("");

	const permissionsById = useMemo(() => {
		const lookup = new Map<string, PermissionView>();
		for (const permission of permissionsQuery.data?.permissions ?? []) {
			lookup.set(permission.id, {
				id: permission.id,
				name: permission.name,
			});
		}
		return lookup;
	}, [permissionsQuery.data?.permissions]);

	const roleToDelete =
		rolesQuery.data?.roles.find((role) => role.id === deleteRoleId) ?? null;

	const handleDeleteRole = async () => {
		if (!roleToDelete) {
			return;
		}

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
			if (error instanceof ApiError) {
				setBanner(error.payload.message ?? "Unable to delete role");
				return;
			}

			setBanner(
				error instanceof Error ? error.message : "Unable to delete role",
			);
		}
	};

	return (
		<div className="grid gap-6">
			<Panel
				title="Role permissions"
				description="Access"
				action={
					<Link
						to="/roles/create"
						className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
					>
						<HiShieldCheck className="h-4 w-4" aria-hidden="true" />
						Create role
					</Link>
				}
			>
				<div className="overflow-x-auto rounded-3xl border border-gray-300">
					<table className="min-w-full border-collapse bg-white text-left text-sm">
						<thead className="bg-gray-50 text-xs uppercase tracking-[0.14em] text-gray-600">
							<tr>
								<th className="px-4 py-3 font-semibold">Role</th>{" "}
								<th className="px-4 py-3 font-semibold">Type</th>{" "}
								<th className="px-4 py-3 font-semibold">Description</th>
								<th className="px-4 py-3 font-semibold">Permissions</th>
								<th className="px-4 py-3 font-semibold">Count</th>
								<th className="px-4 py-3 font-semibold">Actions</th>
							</tr>
						</thead>
						<tbody>
							{rolesQuery.data?.roles.map((role) => {
								const readablePermissions = role.permissionIds
									.map(
										(permissionId) => permissionsById.get(permissionId)?.name,
									)
									.filter((value): value is string => Boolean(value));

								return (
									<tr
										key={role.id}
										className="border-t border-gray-300 align-top"
									>
										<td className="px-4 py-3 font-semibold text-gray-900">
											{role.name}
										</td>
										<td className="px-4 py-3 text-sm text-gray-600">
											<span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 capitalize">
												{role.type ?? "general"}
											</span>
										</td>
										<td className="px-4 py-3 text-gray-600">
											{role.description ?? "No description"}
										</td>
										<td className="px-4 py-3">
											<div className="flex flex-wrap gap-2">
												{readablePermissions.length > 0 ? (
													readablePermissions.map((permissionName) => (
														<span
															key={`${role.id}-${permissionName}`}
															className="rounded-full border border-blue-600/20 bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600"
														>
															{permissionName}
														</span>
													))
												) : (
													<span className="text-gray-600">No permissions</span>
												)}
											</div>
										</td>
										<td className="px-4 py-3 font-semibold text-gray-900">
											{readablePermissions.length}
										</td>
										<td className="px-4 py-3">
											<div className="flex gap-2">
												<Link
													to={`/roles/${role.id}/edit`}
													className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50"
													title="Edit role"
													aria-label="Edit role"
												>
													<HiPencilSquare
														className="h-4 w-4"
														aria-hidden="true"
													/>
												</Link>
												<ActionButton
													icon={
														<HiTrash className="h-4 w-4" aria-hidden="true" />
													}
													tooltip={
														role.isSystem
															? "System role cannot be deleted"
															: "Delete role"
													}
													color="red"
													onClick={() => setDeleteRoleId(role.id)}
													disabled={role.isSystem}
												/>
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</Panel>

			<ConfirmDialog
				open={Boolean(deleteRoleId)}
				title="Delete role"
				description="Are you sure you want to delete this role?"
				confirmLabel="Delete"
				busy={deleteRoleMutation.isPending}
				tone="danger"
				onConfirm={handleDeleteRole}
				onCancel={() => setDeleteRoleId(null)}
			/>

			{banner ? (
				<p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
					{banner}
				</p>
			) : null}
		</div>
	);
};
