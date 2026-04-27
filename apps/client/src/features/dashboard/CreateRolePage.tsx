import { CreateRolePayloadSchema } from "@repo/schema";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { HiPlusCircle, HiXCircle } from "react-icons/hi2";
import { Link } from "react-router-dom";
import { ApiError } from "@/api/request";
import { Field, TextAreaField } from "@/components/dashboard-ui";
import { usePermissionsQuery } from "@/features/permissions/permissions.queries";
import { useCreateRoleMutation } from "@/features/roles/use-create-role-mutation";
import type { CreateRoleForm } from "@/lib/dashboard-types";
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
	const { control, formState, handleSubmit, reset, setError, setValue, watch } =
		useForm<CreateRoleForm>({
			defaultValues: {
				name: "",
				description: "",
				permissionIds: [],
			},
		});
	const formValues = watch();
	const selectedPermissionIds = formValues.permissionIds ?? [];
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
		const nextPermissionIds = selectedPermissionIds.includes(permissionId)
			? selectedPermissionIds.filter((id) => id !== permissionId)
			: [...selectedPermissionIds, permissionId];

		setValue("permissionIds", nextPermissionIds, {
			shouldValidate: true,
			shouldDirty: true,
		});
	};

	const onSubmit = async (form: CreateRoleForm) => {
		setBanner("");

		const validation = CreateRolePayloadSchema.safeParse({
			name: form.name,
			description: form.description || undefined,
			permissionIds: form.permissionIds,
		});

		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			const nameError = errors.name?.[0];
			const descriptionError = errors.description?.[0];
			const permissionIdsError = errors.permissionIds?.[0];

			if (nameError) {
				setError("name", { type: "manual", message: nameError });
			}

			if (descriptionError) {
				setError("description", {
					type: "manual",
					message: descriptionError,
				});
			}

			if (permissionIdsError) {
				setError("permissionIds", {
					type: "manual",
					message: permissionIdsError,
				});
			}

			return;
		}

		try {
			await createRoleMutation.mutateAsync(validation.data);
			setBanner("Role created successfully.");
			reset({ name: "", description: "", permissionIds: [] });
		} catch (error) {
			if (error instanceof ApiError) {
				const serverErrors = error.payload.errors ?? {};
				const nameError = serverErrors.name?.[0];
				const descriptionError = serverErrors.description?.[0];
				const permissionIdsError = serverErrors.permissionIds?.[0];

				if (nameError) {
					setError("name", { type: "server", message: nameError });
				}

				if (descriptionError) {
					setError("description", {
						type: "server",
						message: descriptionError,
					});
				}

				if (permissionIdsError) {
					setError("permissionIds", {
						type: "server",
						message: permissionIdsError,
					});
				}

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
					{selectedPermissionIds.length} selected
				</span>
			</div>

			<form className="mt-5 grid gap-4" onSubmit={handleSubmit(onSubmit)}>
				<div className="grid gap-4 md:grid-cols-2">
					<Controller
						name="name"
						control={control}
						render={({ field, fieldState }) => (
							<Field
								label="Name"
								value={field.value}
								onChange={field.onChange}
								placeholder="Support Agent"
								error={fieldState.error?.message}
							/>
						)}
					/>
					<Controller
						name="description"
						control={control}
						render={({ field, fieldState }) => (
							<TextAreaField
								label="Description"
								value={field.value ?? ""}
								onChange={field.onChange}
								placeholder="Short role summary"
								error={fieldState.error?.message}
							/>
						)}
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
									const selected = selectedPermissionIds.includes(
										permission.id,
									);

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

				{formState.errors.permissionIds?.message ? (
					<p className="rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-ink">
						{formState.errors.permissionIds.message}
					</p>
				) : null}

				<div className="flex flex-wrap gap-2">
					<button
						className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-surface disabled:cursor-not-allowed disabled:opacity-70"
						type="submit"
						disabled={createRoleMutation.isPending}
					>
						<HiPlusCircle className="h-4 w-4" aria-hidden="true" />
						{createRoleMutation.isPending ? "Saving..." : "Create role"}
					</button>
					<Link
						to="/roles"
						className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-ink"
					>
						<HiXCircle className="h-4 w-4 text-danger" aria-hidden="true" />
						Cancel
					</Link>
				</div>

				{banner ? (
					<p className="rounded-2xl border border-brand/15 bg-brand-soft px-4 py-3 text-sm text-brand">
						{banner}
					</p>
				) : null}
			</form>
		</section>
	);
};
