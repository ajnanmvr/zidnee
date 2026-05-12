export const PERMISSION_CATALOG = {
	USER_CREATE: {
		name: "Create User",
		description: "Create a new user",
		resource: "users",
		action: "create",
	},
	USER_READ: {
		name: "Read User",
		description: "Read user information",
		resource: "users",
		action: "read",
	},
	USER_UPDATE: {
		name: "Update User",
		description: "Update user information",
		resource: "users",
		action: "update",
	},
	USER_DELETE: {
		name: "Delete User",
		description: "Delete user information",
		resource: "users",
		action: "delete",
	},
	USER_CHANGE_PASSWORD: {
		name: "Change Password",
		description: "Change a user's password",
		resource: "users",
		action: "change-password",
	},
	ROLE_CREATE: {
		name: "Create Role",
		description: "Create a new role",
		resource: "roles",
		action: "create",
	},
	ROLE_READ: {
		name: "Read Role",
		description: "Read role information",
		resource: "roles",
		action: "read",
	},
	ROLE_UPDATE: {
		name: "Update Role",
		description: "Update role information",
		resource: "roles",
		action: "update",
	},
	ROLE_DELETE: {
		name: "Delete Role",
		description: "Delete a role",
		resource: "roles",
		action: "delete",
	},
	PERMISSION_READ: {
		name: "Read Permission",
		description: "Read permission information",
		resource: "permissions",
		action: "read",
	},
	LEAD_CREATE: {
		name: "Create Lead",
		description: "Create a new lead",
		resource: "leads",
		action: "create",
	},
	LEAD_READ: {
		name: "Read Lead",
		description: "Read lead information",
		resource: "leads",
		action: "read",
	},
	LEAD_READ_MY: {
		name: "Read My Leads",
		description: "Read leads assigned to the current user",
		resource: "leads",
		action: "read:own",
	},
	LEAD_READ_ALL: {
		name: "Read All Leads",
		description: "Read all leads in the system",
		resource: "leads",
		action: "read:all",
	},
	LEAD_ASSIGN: {
		name: "Assign Lead",
		description: "Assign a lead to another user",
		resource: "leads",
		action: "assign",
	},
	LEAD_UPDATE_MY: {
		name: "Update My Leads",
		description: "Update leads assigned to the current user",
		resource: "leads",
		action: "update:own",
	},
	LEAD_UPDATE_ALL: {
		name: "Update All Leads",
		description: "Update any lead",
		resource: "leads",
		action: "update:all",
	},
	LEAD_FORM_MANAGE: {
		name: "Manage Lead Form",
		description: "Send or revoke public form links",
		resource: "leads",
		action: "form:manage",
	},
	LEAD_DEMO_REQUEST: {
		name: "Request Demo",
		description: "Request a demo for a lead",
		resource: "leads",
		action: "demo:request",
	},
	LEAD_DEMO_ASSIGN: {
		name: "Assign Demo",
		description: "Assign mentor/time for demo",
		resource: "leads",
		action: "demo:assign",
	},
	LEAD_DEMO_COMPLETE: {
		name: "Complete Demo",
		description: "Mark demo as completed",
		resource: "leads",
		action: "demo:complete",
	},
	LEAD_ADMISSION_REQUEST: {
		name: "Request Admission",
		description: "Request lead admission",
		resource: "leads",
		action: "admission:request",
	},
	LEAD_ADMISSION_CONFIRM: {
		name: "Confirm Admission",
		description: "Confirm lead admission",
		resource: "leads",
		action: "admission:confirm",
	},
	TIMESLOT_CREATE: {
		name: "Create Time Slot",
		description: "Create a new time slot",
		resource: "timeslots",
		action: "create",
	},
	LEAD_UPDATE: {
		name: "Update Lead",
		description: "Update lead information",
		resource: "leads",
		action: "update",
	},
	LEAD_DELETE: {
		name: "Delete Lead",
		description: "Delete lead information",
		resource: "leads",
		action: "delete",
	},
	STUDENT_READ: {
		name: "Read Student",
		description: "Read student information",
		resource: "students",
		action: "read",
	},
	ORDER_DELETE: {
		name: "Delete Order",
		description: "Delete order records",
		resource: "orders",
		action: "delete",
	},
	VIEW_REPORTS: {
		name: "View Reports",
		description: "View reporting dashboards and exports",
		resource: "reports",
		action: "view",
	},
} as const;

export type PermissionKey = keyof typeof PERMISSION_CATALOG;

export const PERMISSION_KEYS = Object.keys(
	PERMISSION_CATALOG,
) as PermissionKey[];

const permissionKeyByResourceAction = new Map<string, PermissionKey>(
	PERMISSION_KEYS.map((key) => {
		const value = PERMISSION_CATALOG[key];
		return [`${value.resource}:${value.action}`, key] as const;
	}),
);

export const getPermissionKeyFromResourceAction = (
	resource: string,
	action: string,
): PermissionKey | null => {
	return permissionKeyByResourceAction.get(`${resource}:${action}`) ?? null;
};
