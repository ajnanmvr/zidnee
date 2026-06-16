import { CreateRolePayloadSchema } from "@repo/schema";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ApiError } from "@/api/request";
import { RoleFormPage } from "@/features/dashboard/RoleFormPage";
import { usePermissionsQuery } from "@/features/permissions/permissions.queries";
import { useCreateRoleMutation } from "@/features/roles/use-create-role-mutation";
import { useHasPermission } from "@/lib/hooks/use-has-permission";
import { useSession } from "@/lib/session";

export const CreateRolePage = () => {
	const { token } = useSession();
	const navigate = useNavigate();
	const canCreateRole = useHasPermission("ROLE_CREATE");
	const permissionsQuery = usePermissionsQuery(token);
	const createRoleMutation = useCreateRoleMutation();

	if (!canCreateRole) {
		return (
			<div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
				<p className="font-semibold text-gray-900">Access denied</p>
				<p className="mt-1 text-sm text-gray-500">You need the ROLE_CREATE permission to create roles.</p>
			</div>
		);
	}

	return (
		<RoleFormPage
			mode="create"
			initialValues={{ name: "", type: "", description: "", permissionIds: [] }}
			permissions={permissionsQuery.data?.permissions ?? []}
			isLoading={createRoleMutation.isPending}
			onCancel={() => navigate("/roles")}
			onSubmit={async (values) => {
				const result = CreateRolePayloadSchema.safeParse({
					name: values.name,
					type: values.type,
					description: values.description || undefined,
					permissionIds: values.permissionIds,
				});
				if (!result.success) {
					const errors = result.error.flatten().fieldErrors;
					toast.error(errors.name?.[0] ?? errors.type?.[0] ?? errors.permissionIds?.[0] ?? "Validation failed");
					return;
				}
				try {
					await createRoleMutation.mutateAsync(result.data);
					toast.success("Role created");
					navigate("/roles");
				} catch (err) {
					toast.error(err instanceof ApiError ? (err.payload.message ?? "Failed to create role") : err instanceof Error ? err.message : "Failed to create role");
				}
			}}
		/>
	);
};
