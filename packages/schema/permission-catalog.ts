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
	SALES_USERS_READ: {
		name: "Read Sales Users",
		description: "View list of users in the sales role",
		resource: "users",
		action: "read:sales",
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
	STUDENT_READ_MY: {
		name: "Read My Students",
		description: "Read students assigned to the current user",
		resource: "students",
		action: "read:own",
	},
	STUDENT_READ_ALL: {
		name: "Read All Students",
		description: "Read all students in the system",
		resource: "students",
		action: "read:all",
	},
	STUDENT_PROCESS_READ_MY: {
		name: "Read My Processes",
		description: "Read student processes assigned to the current user",
		resource: "student-processes",
		action: "read:own",
	},
	STUDENT_PROCESS_READ_ALL: {
		name: "Read All Processes",
		description: "Read all student processes",
		resource: "student-processes",
		action: "read:all",
	},
	STUDENT_PROCESS_HISTORY_READ_MY: {
		name: "Read My Process History",
		description: "Read archived student processes assigned to the current user",
		resource: "student-process-history",
		action: "read:own",
	},
	STUDENT_PROCESS_HISTORY_READ_ALL: {
		name: "Read All Process History",
		description: "Read all archived student processes",
		resource: "student-process-history",
		action: "read:all",
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
	DEMO_UNASSIGNED_READ_MY: {
		name: "View My Unassigned Demos",
		description: "View unassigned demo requests assigned to me",
		resource: "demo-management",
		action: "unassigned:read:own",
	},
	DEMO_UNASSIGNED_READ_ALL: {
		name: "View All Unassigned Demos",
		description: "View all unassigned demo requests",
		resource: "demo-management",
		action: "unassigned:read:all",
	},
	DEMO_SCHEDULED_READ_MY: {
		name: "View My Scheduled Demos",
		description: "View scheduled demos assigned to me",
		resource: "demo-management",
		action: "scheduled:read:own",
	},
	DEMO_SCHEDULED_READ_ALL: {
		name: "View All Scheduled Demos",
		description: "View all scheduled demos",
		resource: "demo-management",
		action: "scheduled:read:all",
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
	STUDENT_UPDATE: {
		name: "Update Student",
		description: "Update student information and follow-ups",
		resource: "students",
		action: "update",
	},
	BATCH_READ_MY: {
		name: "Read My Groups",
		description: "Read groups visible to the current user",
		resource: "batches",
		action: "read:own",
	},
	BATCH_READ_ALL: {
		name: "Read All Groups",
		description: "Read all groups in the system",
		resource: "batches",
		action: "read:all",
	},
	REMINDER_READ_MY: {
		name: "Read My Reminders",
		description: "Read reminders assigned to the current user",
		resource: "reminders",
		action: "read:own",
	},
	REMINDER_READ_ALL: {
		name: "Read All Reminders",
		description: "Read all reminders in the system",
		resource: "reminders",
		action: "read:all",
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
	// Sales-specific permissions (narrower than USER_* for sales role operations)
	SALES_CREATE: {
		name: "Create Sales User",
		description: "Create a new sales user",
		resource: "sales",
		action: "create",
	},
	SALES_READ: {
		name: "Read Sales Users",
		description: "View sales user information and lists",
		resource: "sales",
		action: "read",
	},
	SALES_UPDATE: {
		name: "Update Sales User",
		description: "Update sales user details",
		resource: "sales",
		action: "update",
	},
	SALES_DELETE: {
		name: "Delete Sales User",
		description: "Remove a user from sales role or delete sales user records",
		resource: "sales",
		action: "delete",
	},

	// Mentor-specific permissions (operations scoped to mentors)
	MENTOR_CREATE: {
		name: "Create Mentor",
		description: "Create a new mentor account",
		resource: "mentors",
		action: "create",
	},
	MENTOR_READ: {
		name: "Read Mentors",
		description: "View mentor information and lists",
		resource: "mentors",
		action: "read",
	},
	MENTOR_UPDATE: {
		name: "Update Mentor",
		description: "Update mentor profile or assignment details",
		resource: "mentors",
		action: "update",
	},
	MENTOR_DELETE: {
		name: "Delete Mentor",
		description: "Remove a mentor or delete mentor records",
		resource: "mentors",
		action: "delete",
	},
	// Counsellor-specific permissions
	COUNSELLOR_CREATE: {
		name: "Create Counsellor",
		description: "Create a new counsellor account",
		resource: "counsellors",
		action: "create",
	},
	COUNSELLOR_READ: {
		name: "Read Counsellors",
		description: "View counsellor information and lists",
		resource: "counsellors",
		action: "read",
	},
	COUNSELLOR_UPDATE: {
		name: "Update Counsellor",
		description: "Update counsellor profile or assignment details",
		resource: "counsellors",
		action: "update",
	},
	COUNSELLOR_DELETE: {
		name: "Delete Counsellor",
		description: "Remove a counsellor or delete counsellor records",
		resource: "counsellors",
		action: "delete",
	},

	// Admin-specific permissions
	ADMIN_CREATE: {
		name: "Create Admin",
		description: "Create a new admin user",
		resource: "admins",
		action: "create",
	},
	ADMIN_READ: {
		name: "Read Admins",
		description: "View admin user information and lists",
		resource: "admins",
		action: "read",
	},
	ADMIN_UPDATE: {
		name: "Update Admin",
		description: "Update admin user details",
		resource: "admins",
		action: "update",
	},
	ADMIN_DELETE: {
		name: "Delete Admin",
		description: "Delete admin user",
		resource: "admins",
		action: "delete",
	},
	// Students: additional granular permissions
	STUDENT_CREATE: {
		name: "Create Student",
		description: "Create a new student record",
		resource: "students",
		action: "create",
	},
	STUDENT_DELETE: {
		name: "Delete Student",
		description: "Delete a student",
		resource: "students",
		action: "delete",
	},
	STUDENT_EXPORT: {
		name: "Export Students",
		description: "Export student data to CSV/XLSX",
		resource: "students",
		action: "export",
	},
	STUDENT_IMPORT: {
		name: "Import Students",
		description: "Import student data from CSV/XLSX",
		resource: "students",
		action: "import",
	},
	STUDENT_CERTIFICATE_DOWNLOAD: {
		name: "Download Certificate",
		description: "Download a student's certificate",
		resource: "students",
		action: "certificate:download",
	},
	STUDENT_UPLOAD_PROFILE_PIC: {
		name: "Upload Profile Picture",
		description: "Upload or change a student's profile picture",
		resource: "students",
		action: "upload:profile-pic",
	},
	STUDENT_ASSESSMENT_READ: {
		name: "Read Student Assessments",
		description: "View assessment status for students",
		resource: "students",
		action: "assessment:read",
	},
	STUDENT_ASSESSMENT_UPDATE: {
		name: "Update Student Assessments",
		description: "Mark assessments as completed or update assessment values",
		resource: "students",
		action: "assessment:update",
	},
	// Batches
	BATCH_CREATE: {
		name: "Create Batch",
		description: "Create a new batch/group",
		resource: "batches",
		action: "create",
	},
	BATCH_READ: {
		name: "Read Batch",
		description: "Read batch information",
		resource: "batches",
		action: "read",
	},
	BATCH_UPDATE: {
		name: "Update Batch",
		description: "Update batch information",
		resource: "batches",
		action: "update",
	},
	BATCH_DELETE: {
		name: "Delete Batch",
		description: "Delete a batch",
		resource: "batches",
		action: "delete",
	},
	// Reminders
	REMINDER_CREATE: {
		name: "Create Reminder",
		description: "Create a reminder for a student or lead",
		resource: "reminders",
		action: "create",
	},
	REMINDER_READ: {
		name: "Read Reminder",
		description: "Read reminders",
		resource: "reminders",
		action: "read",
	},
	REMINDER_UPDATE: {
		name: "Update Reminder",
		description: "Update reminder details",
		resource: "reminders",
		action: "update",
	},
	REMINDER_DELETE: {
		name: "Delete Reminder",
		description: "Delete reminders",
		resource: "reminders",
		action: "delete",
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
