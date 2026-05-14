import { CreateRolePayloadSchema } from "@repo/schema";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { HiPlusCircle, HiXCircle } from "react-icons/hi2";
import { Link } from "react-router-dom";
import { ApiError } from "@/api/request";
import { Field, SelectField, TextAreaField } from "@/components/dashboard-ui";
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
				type: "admin",
				description: "",
				permissionIds: [],
			},
		});
	const formValues = watch();
	const selectedPermissionIds = formValues.permissionIds ?? [];

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
		const validation = CreateRolePayloadSchema.safeParse({
			name: form.name,
			type: form.type,
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
			toast.success("Role created successfully.");
			reset({ name: "", type: "admin", description: "", permissionIds: [] });
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

				toast.error(error.payload.message ?? "Unable to create role");
				return;
			}

			toast.error(
				error instanceof Error ? error.message : "Unable to create role",
			);
		}
	};

	return (
		<section className="rounded-4xl border border-gray-300 bg-white p-6 shadow-sm">
			<div className="flex items-center justify-between gap-4">
				<div>
					<p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">
						Builder
					</p>
					<h3 className="mt-1 text-xl font-semibold text-gray-900">
						Create role
					</h3>
				</div>
				<span className="rounded-full bg-purple-600-soft px-3 py-1.5 text-sm font-medium text-gray-900">
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
						name="type"
						control={control}
						render={({ field, fieldState }) => (
							<SelectField
								label="Role Type"
								value={field.value}
								onChange={field.onChange}
								options={[
									{ value: "general", label: "General" },
									{ value: "mentor", label: "Mentor" },
									{ value: "counsellor", label: "Counsellor" },
									{ value: "sales", label: "Sales" },
								]}
								error={fieldState.error?.message}
							/>
						)}
					/>
				</div>

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

				<div className="grid gap-3">
					<p className="text-sm font-semibold text-gray-900">Permissions</p>
					{groupedPermissions.map((group) => (
						<div
							key={group.resource}
							className="rounded-3xl border border-gray-300 bg-gray-50 p-4"
						>
							<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-600">
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
													? "rounded-2xl border border-blue-600 bg-blue-100 px-3 py-2 text-left transition"
													: "rounded-2xl border border-gray-300 bg-white px-3 py-2 text-left transition hover:border-blue-600/30"
											}
											onClick={() => togglePermission(permission.id)}
										>
											<p className="text-xs font-semibold text-gray-900">
												{permission.name}
											</p>
											<p className="mt-0.5 text-[11px] text-gray-600">
												{permission.action} â€¢ {permission.key}
											</p>
										</button>
									);
								})}
							</div>
						</div>
					))}
				</div>

				{formState.errors.permissionIds?.message ? (
					<p className="rounded-2xl border border-red-600/20 bg-red-600-soft px-4 py-3 text-sm text-gray-900">
						{formState.errors.permissionIds.message}
					</p>
				) : null}

				<div className="flex flex-wrap gap-2">
					<button
						className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
						type="submit"
						disabled={createRoleMutation.isPending}
					>
						<HiPlusCircle className="h-4 w-4" aria-hidden="true" />
						{createRoleMutation.isPending ? "Saving..." : "Create role"}
					</button>
					<Link
						to="/roles"
						className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
					>
						<HiXCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
						Cancel
					</Link>
				</div>

				{/* toasts are used for feedback */}
			</form>
		</section>
	);
};
