import { randomUUID } from "node:crypto";
import type { Permission, Role, User } from "@repo/schema";
import { mergePermissions } from "./rbac.permissions.js";

const users = new Map<string, User>();
const roles = new Map<string, Role>();
const permissions = new Map<string, Permission>();

type PermissionSeed = Omit<Permission, "id" | "createdAt" | "updatedAt">;

const defaultPermissionSeeds: PermissionSeed[] = [
  {
    name: "Create User",
    resource: "users",
    action: "create",
    description: "Create a new user",
  },
  {
    name: "Read User",
    resource: "users",
    action: "read",
    description: "Read user information",
  },
  {
    name: "Update User",
    resource: "users",
    action: "update",
    description: "Update user information",
  },
  {
    name: "Delete User",
    resource: "users",
    action: "delete",
    description: "Delete a user",
  },
  {
    name: "Create Role",
    resource: "roles",
    action: "create",
    description: "Create a new role",
  },
  {
    name: "Read Role",
    resource: "roles",
    action: "read",
    description: "Read role information",
  },
  {
    name: "Update Role",
    resource: "roles",
    action: "update",
    description: "Update role information",
  },
  {
    name: "Delete Role",
    resource: "roles",
    action: "delete",
    description: "Delete a role",
  },
  {
    name: "Create Permission",
    resource: "permissions",
    action: "create",
    description: "Create a new permission",
  },
  {
    name: "Read Permission",
    resource: "permissions",
    action: "read",
    description: "Read permission information",
  },
  {
    name: "Update Permission",
    resource: "permissions",
    action: "update",
    description: "Update permission information",
  },
  {
    name: "Delete Permission",
    resource: "permissions",
    action: "delete",
    description: "Delete a permission",
  },
];

export type PublicUser = Omit<User, "password">;
export type RoleWithPermissions = Role & { permissions: Permission[] };
export type UserWithRelations = PublicUser & {
  roles: Role[];
  permissions: Permission[];
};

const initializeDefaults = (): void => {
  if (permissions.size > 0) {
    return;
  }

  for (const seed of defaultPermissionSeeds) {
    const permission: Permission = {
      ...seed,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    permissions.set(permission.id, permission);
  }

  const adminRole: Role = {
    id: randomUUID(),
    name: "Admin",
    description: "Administrator with full access",
    permissionIds: Array.from(permissions.keys()),
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  roles.set(adminRole.id, adminRole);

  const userRole: Role = {
    id: randomUUID(),
    name: "User",
    description: "Default user role with read permissions",
    permissionIds: Array.from(permissions.values())
      .filter((permission) => permission.action === "read")
      .map((permission) => permission.id),
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  roles.set(userRole.id, userRole);
};

const collectPermissionsByIds = (permissionIds: string[]): Permission[] => {
  return permissionIds
    .map((permissionId) => permissions.get(permissionId) ?? null)
    .filter((permission): permission is Permission => permission !== null);
};

export const PermissionService = {
  create: (
    permission: Omit<Permission, "id" | "createdAt" | "updatedAt">,
  ): Permission => {
    const newPermission: Permission = {
      ...permission,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    permissions.set(newPermission.id, newPermission);
    return newPermission;
  },

  findById: (id: string): Permission | null => {
    return permissions.get(id) ?? null;
  },

  findAll: (): Permission[] => {
    return Array.from(permissions.values());
  },

  update: (id: string, data: Partial<Permission>): Permission | null => {
    const permission = permissions.get(id);
    if (!permission) {
      return null;
    }

    const updatedPermission: Permission = {
      ...permission,
      ...data,
      id: permission.id,
      createdAt: permission.createdAt,
      updatedAt: new Date(),
    };

    permissions.set(id, updatedPermission);
    return updatedPermission;
  },

  delete: (id: string): boolean => {
    return permissions.delete(id);
  },
};

export const RoleService = {
  create: (role: Omit<Role, "id" | "createdAt" | "updatedAt">): Role => {
    const newRole: Role = {
      ...role,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    roles.set(newRole.id, newRole);
    return newRole;
  },

  findById: (id: string): Role | null => {
    return roles.get(id) ?? null;
  },

  findAll: (): Role[] => {
    return Array.from(roles.values());
  },

  findByIds: (ids: string[]): Role[] => {
    return ids
      .map((id) => roles.get(id))
      .filter((role): role is Role => role !== undefined);
  },

  update: (id: string, data: Partial<Role>): Role | null => {
    const role = roles.get(id);
    if (!role || role.isSystem) {
      return null;
    }

    const updatedRole: Role = {
      ...role,
      ...data,
      id: role.id,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
      updatedAt: new Date(),
    };

    roles.set(id, updatedRole);
    return updatedRole;
  },

  delete: (id: string): boolean => {
    const role = roles.get(id);
    if (!role || role.isSystem) {
      return false;
    }
    return roles.delete(id);
  },
};

export const UserService = {
  create: (user: Omit<User, "id" | "createdAt" | "updatedAt">): User => {
    const newUser: User = {
      ...user,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    users.set(newUser.id, newUser);
    return newUser;
  },

  findById: (id: string): User | null => {
    return users.get(id) ?? null;
  },

  findByEmail: (email: string): User | null => {
    for (const user of users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  },

  findAll: (): User[] => {
    return Array.from(users.values());
  },

  update: (id: string, data: Partial<User>): User | null => {
    const user = users.get(id);
    if (!user) {
      return null;
    }

    const updatedUser: User = {
      ...user,
      ...data,
      id: user.id,
      createdAt: user.createdAt,
      updatedAt: new Date(),
    };

    users.set(id, updatedUser);
    return updatedUser;
  },

  delete: (id: string): boolean => {
    return users.delete(id);
  },

  addRole: (userId: string, roleId: string): User | null => {
    const user = users.get(userId);
    if (!user) {
      return null;
    }

    const nextRoleIds = new Set(user.roleIds);
    nextRoleIds.add(roleId);
    return UserService.update(userId, { roleIds: Array.from(nextRoleIds) });
  },

  removeRole: (userId: string, roleId: string): User | null => {
    const user = users.get(userId);
    if (!user) {
      return null;
    }

    return UserService.update(userId, {
      roleIds: user.roleIds.filter((id) => id !== roleId),
    });
  },
};

export const toPublicUser = (user: User): PublicUser => {
  const { password: _password, ...publicUser } = user;
  return publicUser;
};

export const getRoleWithPermissions = (role: Role): RoleWithPermissions => {
  return {
    ...role,
    permissions: collectPermissionsByIds(role.permissionIds),
  };
};

export const getEffectivePermissions = (roleIds: string[]): Permission[] => {
  return mergePermissions(
    RoleService.findByIds(roleIds).map((role) =>
      collectPermissionsByIds(role.permissionIds),
    ),
  );
};

export const getEffectivePermissionIds = (roleIds: string[]): string[] => {
  return getEffectivePermissions(roleIds).map((permission) => permission.id);
};

export const getUserWithRelations = (user: User): UserWithRelations => {
  return {
    ...toPublicUser(user),
    roles: RoleService.findByIds(user.roleIds),
    permissions: getEffectivePermissions(user.roleIds),
  };
};

export const resetRbacStore = (): void => {
  users.clear();
  roles.clear();
  permissions.clear();
  initializeDefaults();
};

initializeDefaults();

export { permissions, roles, users };
