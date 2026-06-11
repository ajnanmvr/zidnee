import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { ApiError } from "@/api/request";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { EditUserPage } from "@/features/dashboard/EditUserPage";
import { useMeQuery } from "@/features/auth/auth.queries";
import { useSession } from "@/lib/session";

const LoginPage = lazy(() =>
	import("@/features/auth/LoginPage").then((module) => ({
		default: module.LoginPage,
	})),
);
const PublicFormPage = lazy(() => import("@/features/public/PublicFormPage"));
const PublicStudentFormPage = lazy(() => import("@/features/public/PublicStudentFormPage"));
const DashboardLayout = lazy(() =>
	import("@/features/dashboard/DashboardLayout").then((module) => ({
		default: module.DashboardLayout,
	})),
);
const OverviewPage = lazy(() =>
	import("@/features/dashboard/OverviewPage").then((module) => ({
		default: module.OverviewPage,
	})),
);
const LeadOverviewPage = lazy(() => import("@/features/dashboard/LeadOverviewPage").then((m) => ({ default: m.LeadOverviewPage })));
const LeadsPage = lazy(() =>
	import("@/features/dashboard/LeadsPage").then((module) => ({
		default: module.LeadsPage,
	})),
);
const ConvertedLeadsPage = lazy(() => import("@/features/dashboard/ConvertedLeadsPage").then((m) => ({ default: m.ConvertedLeadsPage })));
const StudentsPage = lazy(() =>
	import("@/features/dashboard/StudentsPage").then((module) => ({
		default: module.StudentsPage,
	})),
);
const BreakStudentsPage = lazy(() =>
	import("@/features/dashboard/BreakStudentsPage").then((m) => ({ default: m.BreakStudentsPage })),
);
const DroppedStudentsPage = lazy(() =>
	import("@/features/dashboard/DroppedStudentsPage").then((m) => ({ default: m.DroppedStudentsPage })),
);
const WelcomePosterPage = lazy(() =>
	import("@/features/dashboard/WelcomePosterPage").then((m) => ({ default: m.WelcomePosterPage })),
);
const StudentProcessesPage = lazy(() =>
	import("@/features/dashboard/StudentProcessesPage").then((module) => ({
		default: module.StudentProcessesPage,
	})),
);
const ProcessHistoryPage = lazy(() =>
	import("@/features/dashboard/ProcessHistoryPage").then((module) => ({
		default: module.ProcessHistoryPage,
	})),
);
const StudentProcessDetailPage = lazy(() =>
    import("@/features/dashboard/StudentProcessDetailPage").then((m) => ({ default: m.StudentProcessDetailPage })),
);
const StudentDetailPage = lazy(() =>
	import("@/features/students/StudentDetailPage").then((module) => ({
		default: module.StudentDetailPage,
	})),
);
const EditStudentPage = lazy(() => import("@/features/students/EditStudentPage").then((m) => ({ default: m.EditStudentPage })));
const CreateCounsellorPage = lazy(() =>
	import("@/features/dashboard/CreateCounsellorPage").then((module) => ({
		default: module.CreateCounsellorPage,
	})),
);
const CreateMentorPage = lazy(() =>
	import("@/features/dashboard/CreateMentorPage").then((module) => ({
		default: module.CreateMentorPage,
	})),
);
const MentorsPage = lazy(() =>
	import("@/features/dashboard/MentorsPage").then((module) => ({
		default: module.MentorsPage,
	})),
);
const MentorDetailPage = lazy(() =>
	import("@/features/mentors/MentorDetailPage").then((module) => ({
		default: module.MentorDetailPage,
	})),
);
const GroupsPage = lazy(() =>
	import("@/features/dashboard/GroupsPage").then((module) => ({
		default: module.GroupsPage,
	})),
);
const GroupDetailPage = lazy(() =>
 	import("@/features/dashboard/GroupDetailPage").then((module) => ({
 		default: module.GroupDetailPage,
 	})),
);
const CreateTimeSlotsPage = lazy(() =>
	import("@/features/dashboard/CreateTimeSlotsPage").then((module) => ({
		default: module.CreateTimeSlotsPage,
	})),
);
const LeadDetailPageNew = lazy(() =>
	import("@/features/dashboard/LeadDetailPageNew").then((module) => ({
		default: module.LeadDetailPageNew,
	})),
);
const LeadEditPage = lazy(() =>
	import("@/features/dashboard/LeadEditPage").then((module) => ({
		default: module.LeadEditPage,
	})),
);
const AdminsPage = lazy(() =>
	import("@/features/dashboard/AdminsPage").then((module) => ({
		default: module.AdminsPage,
	})),
);
const CounsellorsPage = lazy(() =>
	import("@/features/dashboard/CounsellorsPage").then((module) => ({
		default: module.CounsellorsPage,
	})),
);
const SalesUsersPage = lazy(() =>
	import("@/features/dashboard/SalesUsersPage").then((module) => ({
		default: module.SalesUsersPage,
	})),
);
const CreateUserPage = lazy(() =>
	import("@/features/dashboard/CreateUserPage").then((module) => ({
		default: module.CreateUserPage,
	})),
);
const RolesPage = lazy(() =>
	import("@/features/dashboard/RolesPage").then((module) => ({
		default: module.RolesPage,
	})),
);
const CreateRolePage = lazy(() =>
	import("@/features/dashboard/CreateRolePage").then((module) => ({
		default: module.CreateRolePage,
	})),
);
const EditRolePage = lazy(() =>
	import("@/features/dashboard/EditRolePage").then((module) => ({
		default: module.EditRolePage,
	})),
);
const MePage = lazy(() =>
	import("@/features/dashboard/MePage").then((module) => ({
		default: module.MePage,
	})),
);
const MePermissionsPage = lazy(() =>
	import("@/features/dashboard/MePermissionsPage").then((module) => ({
		default: module.MePermissionsPage,
	})),
);
const UnassignedDemosPage = lazy(() =>
	import("@/features/demo-management/UnassignedDemosPage").then((module) => ({
		default: module.UnassignedDemosPage,
	})),
);
const ScheduledDemosPage = lazy(() =>
	import("@/features/demo-management/ScheduledDemosPage").then((module) => ({
		default: module.ScheduledDemosPage,
	})),
);
const CompletedDemosPage = lazy(() =>
	import("@/features/demo-management/CompletedDemosPage").then((m) => ({ default: m.CompletedDemosPage })),
);
const RemindersPage = lazy(() =>
	import("@/features/reminders/RemindersPage").then((module) => ({
		default: module.RemindersPage,
	})),
);
const ClosedRemindersPage = lazy(() =>
	import("@/features/reminders/ClosedRemindersPage").then((module) => ({
		default: module.ClosedRemindersPage,
	})),
);
const ClosedLeadsPage = lazy(() => import("@/features/leads/ClosedLeadsPage").then((m) => ({ default: m.ClosedLeadsPage })));
const SubstitutionsPage = lazy(() =>
	import("@/features/mentors/SubstitutionsPage").then((module) => ({
		default: module.SubstitutionsPage,
	})),
);

const routeFallback = (
	<div className="p-6 text-sm text-slate-500">Loading...</div>
);

type PermissionRouteProps = {
	permissions: string[];
	fallbackPath?: string;
	children: ReactNode;
};

const PermissionRoute = ({
	permissions,
	fallbackPath = "/",
	children,
}: PermissionRouteProps) => {
	const { token } = useSession();
	const { data: me, error, isLoading } = useMeQuery(token);

	if (!token || isLoading) {
		return routeFallback;
	}

	if (error instanceof ApiError && error.status === 401) {
		return <Navigate to="/login" replace />;
	}

	if (!me) {
		return routeFallback;
	}

	const hasAccess = permissions.some((permissionKey) =>
		me.permissions?.some((permission) => permission.key === permissionKey),
	);

	if (!hasAccess) {
		return <Navigate to={fallbackPath} replace />;
	}

	return <>{children}</>;
};

const withPermissions = (
	permissions: string[],
	element: ReactNode,
	fallbackPath = "/",
) => {
	return (
		<PermissionRoute permissions={permissions} fallbackPath={fallbackPath}>
			<Suspense fallback={routeFallback}>{element}</Suspense>
		</PermissionRoute>
	);
};

export const router = createBrowserRouter([
	{
		path: "/login",
		element: (
			<Suspense fallback={routeFallback}>
				<LoginPage />
			</Suspense>
		),
	},
	{
		path: "/form/:leadId",
		element: (
			<Suspense fallback={routeFallback}>
				<PublicFormPage />
			</Suspense>
		),
	},
	{
		path: "/form/student/:studentId",
		element: (
			<Suspense fallback={routeFallback}>
				<PublicStudentFormPage />
			</Suspense>
		),
	},
	{
		element: <RequireAuth />,
		children: [
			{
				element: (
					<Suspense fallback={routeFallback}>
						<DashboardLayout />
					</Suspense>
				),
				children: [
					{
						index: true,
						element: (
							<Suspense fallback={routeFallback}>
								<OverviewPage />
							</Suspense>
						),
					},
					{
						path: "leads/overview",
						element: withPermissions(["LEAD_READ_MY", "LEAD_READ_ALL"], <LeadOverviewPage />),
					},
					{
						path: "leads/closed",
						element: withPermissions(["LEAD_READ_MY", "LEAD_READ_ALL"], <ClosedLeadsPage />),
					},
					{
						path: "leads",
						element: withPermissions(["LEAD_READ_MY", "LEAD_READ_ALL"], <LeadsPage />),
					},
					{
						path: "leads/converted",
						element: withPermissions(["LEAD_READ_MY", "LEAD_READ_ALL"], <ConvertedLeadsPage />),
					},
					{
						path: "admissions",
						element: withPermissions(
							["LEAD_READ_MY", "LEAD_READ_ALL"],
							<Navigate to="/leads?stage=converted" replace />,
						),
					},
					{
						path: "admissions/:leadId",
						element: withPermissions(
							["LEAD_READ_MY", "LEAD_READ_ALL"],
							<Navigate to="/leads?stage=converted" replace />,
						),
					},
					{
						path: "students",
						element: withPermissions(["STUDENT_READ_MY", "STUDENT_READ_ALL"], <StudentsPage />),
					},
					{
						path: "students/break",
						element: withPermissions(["STUDENT_READ_MY", "STUDENT_READ_ALL"], <BreakStudentsPage />),
					},
					{
						path: "students/dropped",
						element: withPermissions(["STUDENT_READ_MY", "STUDENT_READ_ALL"], <DroppedStudentsPage />),
					},
					{
						path: "students/posters",
						element: withPermissions(["STUDENT_READ_MY", "STUDENT_READ_ALL", "STUDENT_POSTER_DOWNLOAD"], <WelcomePosterPage />),
					},
					{
						path: "processes",
						element: withPermissions(["STUDENT_PROCESS_READ_MY", "STUDENT_PROCESS_READ_ALL"], <StudentProcessesPage />),
					},
					{
						path: "process-history",
						element: withPermissions(["STUDENT_PROCESS_HISTORY_READ_MY", "STUDENT_PROCESS_HISTORY_READ_ALL"], <ProcessHistoryPage />),
					},
					{
						path: "processes/:processId",
						element: withPermissions(["STUDENT_PROCESS_READ_MY", "STUDENT_PROCESS_READ_ALL"], <StudentProcessDetailPage />),
					},
					{
						path: "students/:studentId",
						element: withPermissions(["STUDENT_READ_MY", "STUDENT_READ_ALL"], <StudentDetailPage />),
					},
					{
						path: "students/:studentId/edit",
						element: withPermissions(["STUDENT_UPDATE"], <EditStudentPage />),
					},
					{
						path: "counsellors/create",
						element: withPermissions(["USER_CREATE", "COUNSELLOR_CREATE"], <CreateCounsellorPage />),
					},
					{
						path: "mentors/create",
						element: withPermissions(["USER_CREATE", "MENTOR_CREATE"], <CreateMentorPage />),
					},
					{
						path: "mentors",
						element: withPermissions(
							["USER_READ", "MENTOR_READ", "MENTOR_READ_MY", "MENTOR_READ_ALL"],
							<MentorsPage />,
						),
					},
					{
						path: "mentors/:mentorId",
						element: withPermissions(
							["USER_READ", "MENTOR_READ", "MENTOR_READ_MY", "MENTOR_READ_ALL"],
							<MentorDetailPage />,
						),
					},
					{
						path: "mentors/substitutions",
						element: withPermissions(
							["USER_READ", "MENTOR_READ", "MENTOR_READ_MY", "MENTOR_READ_ALL"],
							<SubstitutionsPage />,
						),
					},
					{
						path: "groups",
						element: withPermissions(["BATCH_READ_MY", "BATCH_READ_ALL"], <GroupsPage />),
					},
					{
						path: "groups/:groupId",
						element: withPermissions(["BATCH_READ_MY", "BATCH_READ_ALL"], <GroupDetailPage />),
					},
					{
						path: "time-slots",
						element: withPermissions(["TIMESLOT_CREATE"], <CreateTimeSlotsPage />),
					},
					{
						path: "leads/:leadId",
						element: withPermissions(["LEAD_READ_MY", "LEAD_READ_ALL"], <LeadDetailPageNew />),
					},
					{
						path: "leads/:leadId/edit",
						element: withPermissions(["LEAD_UPDATE_MY", "LEAD_UPDATE_ALL"], <LeadEditPage />),
					},
					{
						path: "admins",
						element: withPermissions(["ADMIN_READ", "USER_READ"], <AdminsPage />),
					},
					{
						path: "counsellors",
						element: withPermissions(["COUNSELLOR_READ", "USER_READ"], <CounsellorsPage />),
					},
					{
						path: "sales-users",
						element: withPermissions(["SALES_USERS_READ", "SALES_READ"], <SalesUsersPage />),
					},
					{
						path: "users/create",
						element: withPermissions(["USER_CREATE", "ADMIN_CREATE"], <CreateUserPage />),
					},
					{
						path: "users/:userId/edit",
						element: withPermissions(
							["USER_UPDATE", "MENTOR_UPDATE", "COUNSELLOR_UPDATE", "ADMIN_UPDATE", "SALES_UPDATE"],
							<EditUserPage />,
						),
					},
					{
						path: "roles",
						element: withPermissions(["ROLE_READ"], <RolesPage />),
					},
					{
						path: "roles/create",
						element: withPermissions(["ROLE_CREATE"], <CreateRolePage />),
					},
					{
						path: "roles/:roleId/edit",
						element: withPermissions(["ROLE_UPDATE"], <EditRolePage />),
					},
					{
						path: "me",
						element: (
							<Suspense fallback={routeFallback}>
								<MePage />
							</Suspense>
						),
					},
					{
						path: "me/permissions",
						element: (
							<Suspense fallback={routeFallback}>
								<MePermissionsPage />
							</Suspense>
						),
					},
					{
						path: "demo-management/unassigned",
						element: withPermissions([
							"DEMO_UNASSIGNED_READ_MY",
							"DEMO_UNASSIGNED_READ_ALL",
						], <UnassignedDemosPage />),
					},
					{
						path: "demo-management/scheduled",
						element: withPermissions([
							"DEMO_SCHEDULED_READ_MY",
							"DEMO_SCHEDULED_READ_ALL",
						], <ScheduledDemosPage />),
					},
					{
						path: "demo-management/completed",
						element: withPermissions([
							"DEMO_SCHEDULED_READ_MY",
							"DEMO_SCHEDULED_READ_ALL",
						], <CompletedDemosPage />),
					},
					{
						path: "reminders",
						element: withPermissions(["REMINDER_READ_MY", "REMINDER_READ_ALL"], <RemindersPage />),
					},
					{
						path: "reminders/closed",
						element: withPermissions(["REMINDER_READ_MY", "REMINDER_READ_ALL"], <ClosedRemindersPage />),
					},
				],
			},
		],
	},
	{
		path: "*",
		element: <Navigate to="/" replace />,
	},
]);
