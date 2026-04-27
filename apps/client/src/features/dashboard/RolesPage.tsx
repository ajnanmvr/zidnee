import { useMemo, useState } from "react";
import { HiPencilSquare, HiShieldCheck, HiTrash } from "react-icons/hi2";
import { Link } from "react-router-dom";
import { ConfirmDialog, Panel } from "@/components/dashboard-ui";
import { usePermissionsQuery } from "@/features/permissions/permissions.queries";
import { useRolesQuery } from "@/features/roles/roles.queries";
import { useDeleteRoleMutation } from "@/features/roles/use-role-management-mutations";
import { ApiError } from "@/api/request";
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

  const roleToDelete = rolesQuery.data?.roles.find((role) => role.id === deleteRoleId) ?? null;

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

      setBanner(error instanceof Error ? error.message : "Unable to delete role");
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
            className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-surface transition hover:brightness-105"
          >
            <HiShieldCheck className="h-4 w-4" aria-hidden="true" />
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
                <th className="px-4 py-3 font-semibold">Actions</th>
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
                    <td className="px-4 py-3 text-ink-soft">{role.description ?? "No description"}</td>
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
                    <td className="px-4 py-3 font-semibold text-ink">{readablePermissions.length}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          to={`/roles/${role.id}/edit`}
                          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold text-ink transition hover:border-brand/30"
                        >
                          <HiPencilSquare className="h-3.5 w-3.5" aria-hidden="true" />
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border border-danger/30 bg-danger-soft px-3 py-1 text-xs font-semibold text-ink transition hover:brightness-105 disabled:opacity-50"
                          onClick={() => setDeleteRoleId(role.id)}
                          disabled={role.isSystem}
                        >
                          <HiTrash className="h-3.5 w-3.5" aria-hidden="true" />
                          Delete
                        </button>
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
        <p className="rounded-2xl border border-brand/15 bg-brand-soft px-4 py-3 text-sm text-brand">
          {banner}
        </p>
      ) : null}
    </div>
  );
};
