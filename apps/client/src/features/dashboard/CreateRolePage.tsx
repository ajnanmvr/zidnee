import { CreateRolePayloadSchema } from "@repo/schema";
import { type FormEvent, useMemo, useState } from "react";
import { Field, TextAreaField } from "@/components/dashboard-ui";
import { usePermissionsQuery } from "@/features/dashboard/dashboard.queries";
import { useCreateRoleMutation } from "@/features/roles/use-create-role-mutation";
import { ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";

type PermissionGroup = {
	resource: string;
	items: Array<{
		id: string;
		name: string;
		key: string;
		action: string;
	}>;
};

export const CreateRolePage = () => {
	const { token } = useSession();
	const permissionsQuery = usePermissionsQuery(token);
	const createRoleMutation = useCreateRoleMutation();
	const [form, setForm] = useState({
		name: "",
		description: "",
		permissionIds: [] as string[],
	});
	const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
	const [banner, setBanner] = useState("");

	const groupedPermissions = useMemo<PermissionGroup[]>(() => {
		const groups = new Map<string, PermissionGroup["items"]>();

		for (const permission of permissionsQuery.data?.permissions ?? []) {
			const resource = permission.resource.toUpperCase();
			const existing = groups.get(resource) ?? [];
			existing.push({
				id: permission.id,
				name: permission.name,
				key: permission.key,
				action: permission.action,
			});
			groups.set(resource, existing);
		}

		return Array.from(groups.entries())
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([resource, items]) => ({
				resource,
				items: items.sort((left, right) => left.name.localeCompare(right.name)),
			}));
	}, [permissionsQuery.data?.permissions]);

	const togglePermission = (permissionId: string) => {
		setForm((current) => ({
			...current,
			permissionIds: current.permissionIds.includes(permissionId)
				? current.permissionIds.filter((id) => id !== permissionId)
				: [...current.permissionIds, permissionId],
		}));
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setFieldErrors({});
		setBanner("");

		const validation = CreateRolePayloadSchema.safeParse({
			name: form.name,
			description: form.description || undefined,
			permissionIds: form.permissionIds,
		});

		if (!validation.success) {
			setFieldErrors(validation.error.flatten().fieldErrors);
			return;
		}

		try {
			await createRoleMutation.mutateAsync(validation.data);
			setBanner("Role created successfully.");
			setForm({ name: "", description: "", permissionIds: [] });
		} catch (error) {
			if (error instanceof ApiError) {
				setFieldErrors(error.payload.errors ?? {});
				setBanner(error.payload.message ?? "Unable to create role");
				return;
			}

			setBanner(
				error instanceof Error ? error.message : "Unable to create role",
			);
		}
	};

	return (
		<section className="rounded-4xl border border-border bg-surface p-6 shadow-sm">
			<div className="flex items-center justify-between gap-4">
				<div>
					<p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand">
						Builder
					</p>
					<h3 className="mt-1 text-xl font-semibold text-ink">Create role</h3>
				</div>
				<span className="rounded-full bg-accent-soft px-3 py-1.5 text-sm font-medium text-ink">
					{form.permissionIds.length} selected
				</span>
			</div>

			<form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
				<div className="grid gap-4 md:grid-cols-2">
					<Field
						label="Name"
						value={form.name}
						onChange={(value) =>
							setForm((current) => ({ ...current, name: value }))
						}
						placeholder="Support Agent"
						error={fieldErrors.name?.[0]}
					/>
					<TextAreaField
						label="Description"
						value={form.description}
						onChange={(value) =>
							setForm((current) => ({ ...current, description: value }))
						}
						placeholder="Short role summary"
						error={fieldErrors.description?.[0]}
					/>
				</div>

				<div className="grid gap-3">
					<p className="text-sm font-semibold text-ink">Permissions</p>
					{groupedPermissions.map((group) => (
						<div
							key={group.resource}
							className="rounded-3xl border border-border bg-surface-muted p-4"
						>
							<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
								{group.resource}
							</p>
							<div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
								{group.items.map((permission) => {
									const selected = form.permissionIds.includes(permission.id);

									return (
										<button
											type="button"
											key={permission.id}
											className={
												selected
													? "rounded-2xl border border-brand bg-brand-soft px-3 py-2 text-left transition"
													: "rounded-2xl border border-border bg-surface px-3 py-2 text-left transition hover:border-brand/30"
											}
											onClick={() => togglePermission(permission.id)}
										>
											<p className="text-xs font-semibold text-ink">
												{permission.name}
											</p>
											<p className="mt-0.5 text-[11px] text-ink-soft">
												{permission.action} • {permission.key}
											</p>
										</button>
									);
								})}
							</div>
						</div>
					))}
				</div>

				{fieldErrors.permissionIds?.map((error) => (
					<p
						className="rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-ink"
						key={error}
					>
						{error}
					</p>
				))}

				<button
					className="rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-surface transition duration-200 hover:bg-brand disabled:cursor-not-allowed disabled:opacity-70"
					type="submit"
					disabled={createRoleMutation.isPending}
				>
					{createRoleMutation.isPending ? "Saving..." : "Create role"}
				</button>

				{banner ? (
					<p className="rounded-2xl border border-brand/15 bg-brand-soft px-4 py-3 text-sm text-brand">
						{banner}
					</p>
				) : null}
			</form>
		</section>
	);
};
