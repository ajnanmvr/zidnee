import { UpdateRolePayloadSchema } from "@repo/schema";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { HiCheckCircle, HiShieldCheck } from "react-icons/hi2";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "@/api/request";
import { Field, Panel, TextAreaField } from "@/components/dashboard-ui";
import { usePermissionsQuery } from "@/features/permissions/permissions.queries";
import { useRolesQuery } from "@/features/roles/roles.queries";
import { useUpdateRoleMutation } from "@/features/roles/use-role-management-mutations";
import type { UpdateRoleForm } from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

export const EditRolePage = () => {
	const { roleId = "" } = useParams();
	const navigate = useNavigate();
	const { token } = useSession();
	const rolesQuery = useRolesQuery(token);
	const permissionsQuery = usePermissionsQuery(token);
	const updateRoleMutation = useUpdateRoleMutation();
	const { control, formState, handleSubmit, reset, setError, setValue, watch } =
		useForm<UpdateRoleForm>({
			defaultValues: {
				name: "",
				description: "",
				permissionIds: [],
			},
		});
	const selectedPermissionIds = watch("permissionIds") ?? [];

	const role = useMemo(
		() => rolesQuery.data?.roles.find((row) => row.id === roleId) ?? null,
		[roleId, rolesQuery.data?.roles],
	);

	const [banner, setBanner] = useState("");

	useEffect(() => {
		if (!role) {
			return;
		}

		reset({
			name: role.name,
			description: role.description ?? "",
			permissionIds: role.permissionIds,
		});
	}, [reset, role]);

	const onSubmit = async (form: UpdateRoleForm) => {
		if (!roleId) {
			return;
		}

		setBanner("");

		const validation = UpdateRolePayloadSchema.safeParse({
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
			await updateRoleMutation.mutateAsync({
				roleId,
				payload: validation.data,
			});
			navigate("/roles");
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

				setBanner(error.payload.message ?? "Unable to update role");
				return;
			}

			setBanner(
				error instanceof Error ? error.message : "Unable to update role",
			);
		}
	};

	if (!role) {
		return (
			<Panel
				title="Edit role"
				description="Update"
				action={
					<Link
						to="/roles"
						className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-ink"
					>
						Back
					</Link>
				}
			>
				<p className="text-sm text-ink-soft">Role not found.</p>
			</Panel>
		);
	}

	return (
		<Panel
			title="Edit role"
			description="Update"
			action={
				<Link
					to="/roles"
					className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-ink"
				>
					<HiShieldCheck className="h-4 w-4" aria-hidden="true" />
					Back to roles
				</Link>
			}
		>
			<form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
				<div className="grid gap-4 md:grid-cols-2">
					<Controller
						name="name"
						control={control}
						render={({ field, fieldState }) => (
							<Field
								label="Role name"
								value={field.value ?? ""}
								onChange={field.onChange}
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
								error={fieldState.error?.message}
							/>
						)}
					/>
				</div>

				<div className="mt-4 grid gap-2 text-sm font-medium text-ink-soft">
					<span>Permissions</span>
					<div className="flex flex-wrap gap-2">
						{permissionsQuery.data?.permissions.map((permission) => {
							const selected = selectedPermissionIds.includes(permission.id);
							return (
								<button
									type="button"
									key={permission.id}
									className={
										selected
											? "rounded-full border border-brand bg-brand-soft px-3 py-2 text-xs font-semibold text-brand"
											: "rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink-soft"
									}
									onClick={() => {
										const nextPermissionIds = selected
											? selectedPermissionIds.filter(
													(id) => id !== permission.id,
												)
											: [...selectedPermissionIds, permission.id];

										setValue("permissionIds", nextPermissionIds, {
											shouldValidate: true,
											shouldDirty: true,
										});
									}}
								>
									{permission.name}
								</button>
							);
						})}
					</div>
					{formState.errors.permissionIds?.message ? (
						<p className="rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-ink">
							{formState.errors.permissionIds.message}
						</p>
					) : null}
				</div>

				<div className="mt-5 flex gap-2">
					<button
						type="submit"
						className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-surface"
						disabled={updateRoleMutation.isPending}
					>
						<HiCheckCircle className="h-4 w-4" aria-hidden="true" />
						{updateRoleMutation.isPending ? "Saving..." : "Save changes"}
					</button>
					<Link
						to="/roles"
						className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-ink"
					>
						Cancel
					</Link>
				</div>
			</form>

			{banner ? (
				<p className="mt-4 rounded-2xl border border-brand/15 bg-brand-soft px-4 py-3 text-sm text-brand">
					{banner}
				</p>
			) : null}
		</Panel>
	);
};
