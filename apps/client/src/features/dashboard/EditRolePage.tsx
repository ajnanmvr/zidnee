import { UpdateRolePayloadSchema } from "@repo/schema";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ApiError } from "@/api/request";
import { RoleFormPage } from "@/features/dashboard/RoleFormPage";
import { usePermissionsQuery } from "@/features/permissions/permissions.queries";
import { useRolesQuery } from "@/features/roles/roles.queries";
import { useUpdateRoleMutation } from "@/features/roles/use-role-management-mutations";
import { useHasPermission } from "@/lib/hooks/use-has-permission";
import { useSession } from "@/lib/session";

const normalizeRoleType = (value?: string | null): "admin" | "mentor" | "counsellor" | "sales" => {
	if (value === "mentor" || value === "counsellor" || value === "sales") return value;
	return "admin";
};

export const EditRolePage = () => {
	const { roleId = "" } = useParams();
	const navigate = useNavigate();
	const { token } = useSession();
	const canUpdateRole = useHasPermission("ROLE_UPDATE");
	const rolesQuery = useRolesQuery(token);
	const permissionsQuery = usePermissionsQuery(token);
	const updateRoleMutation = useUpdateRoleMutation();
	const [error, setError] = useState("");

	const role = useMemo(
		() => rolesQuery.data?.roles.find((r) => r.id === roleId) ?? null,
		[roleId, rolesQuery.data?.roles],
	);

	if (!canUpdateRole) {
		return (
			<div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
				<p className="font-semibold text-gray-900">Access denied</p>
				<p className="mt-1 text-sm text-gray-500">You need the ROLE_UPDATE permission.</p>
			</div>
		);
	}

	if (rolesQuery.isLoading) {
		return <div className="flex justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" /></div>;
	}

	if (!role) {
		return (
			<div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
				<p className="font-semibold text-gray-900">Role not found</p>
				<Link to="/roles" className="mt-3 inline-block text-sm font-medium text-violet-600 hover:underline">Back to roles</Link>
			</div>
		);
	}

	return (
		<RoleFormPage
			mode="edit"
			initialValues={{
				name: role.name,
				type: normalizeRoleType(role.type),
				description: role.description ?? "",
				permissionIds: role.permissionIds,
			}}
			permissions={permissionsQuery.data?.permissions ?? []}
			isLoading={updateRoleMutation.isPending}
			error={error}
			onCancel={() => navigate("/roles")}
			onSubmit={async (values) => {
				setError("");
				const result = UpdateRolePayloadSchema.safeParse({
					name: values.name,
					type: normalizeRoleType(values.type),
					description: values.description || undefined,
					permissionIds: values.permissionIds,
				});
				if (!result.success) {
					const errors = result.error.flatten().fieldErrors;
					setError(errors.name?.[0] ?? errors.type?.[0] ?? errors.permissionIds?.[0] ?? "Validation failed");
					return;
				}
				try {
					await updateRoleMutation.mutateAsync({ roleId, payload: result.data });
					toast.success("Role updated");
					navigate("/roles");
				} catch (err) {
					const msg = err instanceof ApiError ? (err.payload.message ?? "Failed to update role") : err instanceof Error ? err.message : "Failed to update role";
					setError(msg);
				}
			}}
		/>
	);
};
