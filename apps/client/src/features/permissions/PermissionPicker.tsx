import type { Permission } from "@repo/schema";
import { getPermissionCategory, PERMISSION_CATEGORY_ORDER } from "@repo/schema";
import { useMemo, useState } from "react";
import { HiInformationCircle } from "react-icons/hi2";
import { Modal } from "@/components/dashboard-ui";

type ResourceGroup = {
	resource: string;
	items: Permission[];
};

type CategoryGroup = {
	category: string;
	resources: ResourceGroup[];
};

const categoryRank = (category: string): number => {
	const index = PERMISSION_CATEGORY_ORDER.indexOf(category);
	return index === -1 ? PERMISSION_CATEGORY_ORDER.length : index;
};

type PermissionPickerProps = {
	permissions: Permission[];
	selectedPermissionIds: string[];
	onToggle: (permissionId: string) => void;
};

export const PermissionPicker = ({
	permissions,
	selectedPermissionIds,
	onToggle,
}: PermissionPickerProps) => {
	const [detailPermission, setDetailPermission] = useState<Permission | null>(null);

	const groupedPermissions = useMemo<CategoryGroup[]>(() => {
		const categories = new Map<string, Map<string, Permission[]>>();

		for (const permission of permissions) {
			const category = getPermissionCategory(permission.resource);
			const resources = categories.get(category) ?? new Map<string, Permission[]>();
			const items = resources.get(permission.resource) ?? [];
			items.push(permission);
			resources.set(permission.resource, items);
			categories.set(category, resources);
		}

		return Array.from(categories.entries())
			.sort(([left], [right]) => {
				const rankDiff = categoryRank(left) - categoryRank(right);
				return rankDiff !== 0 ? rankDiff : left.localeCompare(right);
			})
			.map(([category, resources]) => ({
				category,
				resources: Array.from(resources.entries())
					.sort(([left], [right]) => left.localeCompare(right))
					.map(([resource, items]) => ({
						resource,
						items: items.sort((left, right) => left.name.localeCompare(right.name)),
					})),
			}));
	}, [permissions]);

	return (
		<div className="grid gap-4">
			{groupedPermissions.map((category) => (
				<div
					key={category.category}
					className="rounded-3xl border border-gray-300 bg-gray-50 p-4"
				>
					<p className="text-xs font-bold uppercase tracking-[0.24em] text-gray-700">
						{category.category}
					</p>
					<div className="mt-3 grid gap-4">
						{category.resources.map((group) => (
							<div key={group.resource}>
								<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
									{group.resource}
								</p>
								<div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
									{group.items.map((permission) => {
										const selected = selectedPermissionIds.includes(permission.id);

										return (
											<div
												key={permission.id}
												className={
													selected
														? "flex items-start gap-2 rounded-2xl border border-blue-600 bg-blue-100 px-3 py-2 text-left transition"
														: "flex items-start gap-2 rounded-2xl border border-gray-300 bg-white px-3 py-2 text-left transition hover:border-blue-600/30"
												}
											>
												<button
													type="button"
													className="flex-1 text-left"
													onClick={() => onToggle(permission.id)}
												>
													<p className="text-xs font-semibold text-gray-900">
														{permission.name}
													</p>
													<p className="mt-0.5 text-[11px] text-gray-600">
														{permission.action} • {permission.key}
													</p>
												</button>
												<button
													type="button"
													title="View details"
													aria-label={`View details for ${permission.name}`}
													onClick={() => setDetailPermission(permission)}
													className="shrink-0 rounded-full p-1 text-gray-400 transition hover:bg-white hover:text-blue-600"
												>
													<HiInformationCircle className="h-4 w-4" aria-hidden="true" />
												</button>
											</div>
										);
									})}
								</div>
							</div>
						))}
					</div>
				</div>
			))}

			<Modal
				open={detailPermission !== null}
				title={detailPermission?.name ?? ""}
				description="Permission details"
				onClose={() => setDetailPermission(null)}
			>
				{detailPermission ? (
					<dl className="grid gap-3 text-sm sm:grid-cols-2">
						<div>
							<dt className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
								Key
							</dt>
							<dd className="mt-0.5 text-gray-900">{detailPermission.key}</dd>
						</div>
						<div>
							<dt className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
								Category
							</dt>
							<dd className="mt-0.5 text-gray-900">
								{getPermissionCategory(detailPermission.resource)}
							</dd>
						</div>
						<div>
							<dt className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
								Resource
							</dt>
							<dd className="mt-0.5 text-gray-900">{detailPermission.resource}</dd>
						</div>
						<div>
							<dt className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
								Action
							</dt>
							<dd className="mt-0.5 text-gray-900">{detailPermission.action}</dd>
						</div>
						<div className="sm:col-span-2">
							<dt className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
								Description
							</dt>
							<dd className="mt-0.5 text-gray-900">
								{detailPermission.description ?? "No description available."}
							</dd>
						</div>
					</dl>
				) : null}
			</Modal>
		</div>
	);
};
