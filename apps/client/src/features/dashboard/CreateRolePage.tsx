import { CreateRolePayloadSchema } from "@repo/schema";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { HiPlusCircle, HiXCircle } from "react-icons/hi2";
import { Link } from "react-router-dom";
import { ApiError } from "@/api/request";
import { Field, SelectField, TextAreaField } from "@/components/dashboard-ui";
import { PermissionPicker } from "@/features/permissions/PermissionPicker";
import { usePermissionsQuery } from "@/features/permissions/permissions.queries";
import { useCreateRoleMutation } from "@/features/roles/use-create-role-mutation";
import type { CreateRoleForm } from "@/lib/dashboard-types";
import { useHasPermission } from "@/lib/hooks/use-has-permission";
import { useSession } from "@/lib/session";

export const CreateRolePage = () => {
	const { token } = useSession();
	const canCreateRole = useHasPermission("ROLE_CREATE");
	const permissionsQuery = usePermissionsQuery(token);
	const createRoleMutation = useCreateRoleMutation();
	const { control, formState, handleSubmit, reset, setError, setValue, watch } =
		useForm<CreateRoleForm>({
			defaultValues: {
				name: "",
				type: "",
				description: "",
				permissionIds: [],
			},
		});
	const formValues = watch();
	const selectedPermissionIds = formValues.permissionIds ?? [];

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
			reset({ name: "", type: "", description: "", permissionIds: [] });
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

	if (!canCreateRole) {
		return (
			<section className="rounded-4xl border border-gray-300 bg-white p-6 shadow-sm">
				<h3 className="text-xl font-semibold text-gray-900">Access denied</h3>
				<p className="mt-2 text-sm text-gray-600">
					You do not have permission to create roles. Ask an administrator to
					grant ROLE_CREATE.
				</p>
			</section>
		);
	}

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
								value={field.value ?? ""}
								onChange={(v) => field.onChange(v)}
								options={[
									{ value: "", label: "Select role type" },
									{ value: "admin", label: "Admin" },
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
					<PermissionPicker
						permissions={permissionsQuery.data?.permissions ?? []}
						selectedPermissionIds={selectedPermissionIds}
						onToggle={togglePermission}
					/>
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
