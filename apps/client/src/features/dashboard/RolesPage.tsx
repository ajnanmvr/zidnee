import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Panel } from "@/components/dashboard-ui";
import {
	usePermissionsQuery,
	useRolesQuery,
} from "@/features/dashboard/dashboard.queries";
import { useSession } from "@/lib/session";

type PermissionView = {
	id: string;
	name: string;
	key: string;
	resource: string;
	action: string;
};

export const RolesPage = () => {
	const { token } = useSession();
	const rolesQuery = useRolesQuery(token);
	const permissionsQuery = usePermissionsQuery(token);

	const permissionsById = useMemo(() => {
		const lookup = new Map<string, PermissionView>();
		for (const permission of permissionsQuery.data?.permissions ?? []) {
			lookup.set(permission.id, {
				id: permission.id,
				name: permission.name,
				key: permission.key,
				resource: permission.resource,
				action: permission.action,
			});
		}
		return lookup;
	}, [permissionsQuery.data?.permissions]);

	return (
		<div className="grid gap-6">
			<Panel
				title="Role permissions"
				description="Access"
				action={
					<Link
						to="/roles/create"
						className="rounded-2xl bg-ink px-4 py-2 text-sm font-semibold text-surface transition hover:bg-brand"
					>
						Create role
					</Link>
				}
			>
				<div className="overflow-x-auto rounded-3xl border border-border">
					<table className="min-w-full border-collapse bg-surface text-left text-sm">
						<thead className="bg-surface-muted text-xs uppercase tracking-[0.14em] text-ink-soft">
							<tr>
								<th className="px-4 py-3 font-semibold">Role</th>
								<th className="px-4 py-3 font-semibold">Description</th>
								<th className="px-4 py-3 font-semibold">Permissions</th>
								<th className="px-4 py-3 font-semibold">Count</th>
							</tr>
						</thead>
						<tbody>
							{rolesQuery.data?.roles.map((role) => {
								const readablePermissions = role.permissionIds
									.map((permissionId) => permissionsById.get(permissionId)?.name)
									.filter((value): value is string => Boolean(value));

								return (
									<tr key={role.id} className="border-t border-border align-top">
										<td className="px-4 py-3 font-semibold text-ink">{role.name}</td>
										<td className="px-4 py-3 text-ink-soft">
											{role.description ?? "No description"}
										</td>
										<td className="px-4 py-3">
											<div className="flex flex-wrap gap-2">
												{readablePermissions.length > 0 ? (
													readablePermissions.map((permissionName) => (
														<span
															key={`${role.id}-${permissionName}`}
															className="rounded-full border border-brand/20 bg-brand-soft px-3 py-1 text-xs font-semibold text-brand"
														>
															{permissionName}
														</span>
													))
												) : (
													<span className="text-ink-soft">No permissions</span>
												)}
											</div>
										</td>
										<td className="px-4 py-3 font-semibold text-ink">
											{readablePermissions.length}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</Panel>
		</div>
	);
};
