import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { RequireAuth } from "@/features/auth/RequireAuth";

const LoginPage = lazy(() =>
	import("@/features/auth/LoginPage").then((module) => ({
		default: module.LoginPage,
	})),
);
const PublicFormPage = lazy(() =>
	import("@/features/public/PublicFormPage"),
);
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
const LeadsPage = lazy(() =>
	import("@/features/dashboard/LeadsPage").then((module) => ({
		default: module.LeadsPage,
	})),
);
const AdmissionsPage = lazy(() =>
	import("@/features/dashboard/AdmissionsPage").then((module) => ({
		default: module.AdmissionsPage,
	})),
);
const AdmissionDetailPageEnhanced = lazy(() =>
	import("@/features/dashboard/AdmissionDetailPageEnhanced").then((module) => ({
		default: module.AdmissionDetailPageEnhanced,
	})),
);
const StudentsPage = lazy(() =>
	import("@/features/dashboard/StudentsPage").then((module) => ({
		default: module.StudentsPage,
	})),
);
const CounsellorMentorsPage = lazy(() =>
	import("@/features/dashboard/CounsellorMentorsPage").then((module) => ({
		default: module.CounsellorMentorsPage,
	})),
);
const CounsellorStudentsPage = lazy(() =>
	import("@/features/dashboard/CounsellorStudentsPage").then((module) => ({
		default: module.CounsellorStudentsPage,
	})),
);
const CounsellorsPage = lazy(() =>
	import("@/features/dashboard/CounsellorsPage").then((module) => ({
		default: module.CounsellorsPage,
	})),
);
const CreateCounsellorPage = lazy(() =>
	import("@/features/dashboard/CreateCounsellorPage").then((module) => ({
		default: module.CreateCounsellorPage,
	})),
);
const MentorsPage = lazy(() =>
	import("@/features/dashboard/MentorsPage").then((module) => ({
		default: module.MentorsPage,
	})),
);
const CreateMentorPage = lazy(() =>
	import("@/features/dashboard/CreateMentorPage").then((module) => ({
		default: module.CreateMentorPage,
	})),
);
const CoursesPage = lazy(() =>
	import("@/features/dashboard/CoursesPage").then((module) => ({
		default: module.CoursesPage,
	})),
);
const GroupsPage = lazy(() =>
	import("@/features/dashboard/GroupsPage").then((module) => ({
		default: module.GroupsPage,
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
const UsersPage = lazy(() =>
	import("@/features/dashboard/UsersPage").then((module) => ({
		default: module.UsersPage,
	})),
);
const CreateUserPage = lazy(() =>
	import("@/features/dashboard/CreateUserPage").then((module) => ({
		default: module.CreateUserPage,
	})),
);
const EditUserPage = lazy(() =>
	import("@/features/dashboard/EditUserPage").then((module) => ({
		default: module.EditUserPage,
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

const routeFallback = <div className="p-6 text-sm text-slate-500">Loading...</div>;

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
						path: "leads",
					element: (
						<Suspense fallback={routeFallback}>
							<LeadsPage />
						</Suspense>
					),
					},
					{
						path: "admissions",
					element: (
						<Suspense fallback={routeFallback}>
							<AdmissionsPage />
						</Suspense>
					),
					},
					{
						path: "admissions/:leadId",
					element: (
						<Suspense fallback={routeFallback}>
							<AdmissionDetailPageEnhanced />
						</Suspense>
					),
					},
					{
						path: "students",
					element: (
						<Suspense fallback={routeFallback}>
							<StudentsPage />
						</Suspense>
					),
					},
					{
						path: "counsellor/mentors",
					element: (
						<Suspense fallback={routeFallback}>
							<CounsellorMentorsPage />
						</Suspense>
					),
					},
					{
						path: "counsellor/students",
					element: (
						<Suspense fallback={routeFallback}>
							<CounsellorStudentsPage />
						</Suspense>
					),
					},
					{
						path: "counsellors",
					element: (
						<Suspense fallback={routeFallback}>
							<CounsellorsPage />
						</Suspense>
					),
					},
					{
						path: "counsellors/create",
					element: (
						<Suspense fallback={routeFallback}>
							<CreateCounsellorPage />
						</Suspense>
					),
					},
					{
						path: "mentors",
					element: (
						<Suspense fallback={routeFallback}>
							<MentorsPage />
						</Suspense>
					),
					},
					{
						path: "mentors/create",
					element: (
						<Suspense fallback={routeFallback}>
							<CreateMentorPage />
						</Suspense>
					),
					},
					{
						path: "courses",
					element: (
						<Suspense fallback={routeFallback}>
							<CoursesPage />
						</Suspense>
					),
					},
					{
						path: "groups",
					element: (
						<Suspense fallback={routeFallback}>
							<GroupsPage />
						</Suspense>
					),
					},
					{
						path: "time-slots",
					element: (
						<Suspense fallback={routeFallback}>
							<CreateTimeSlotsPage />
						</Suspense>
					),
					},
					{
						path: "leads/:leadId",
					element: (
						<Suspense fallback={routeFallback}>
							<LeadDetailPageNew />
						</Suspense>
					),
					},
					{
						path: "leads/:leadId/edit",
					element: (
						<Suspense fallback={routeFallback}>
							<LeadEditPage />
						</Suspense>
					),
					},
					{
						path: "users",
					element: (
						<Suspense fallback={routeFallback}>
							<UsersPage />
						</Suspense>
					),
					},
					{
						path: "users/create",
					element: (
						<Suspense fallback={routeFallback}>
							<CreateUserPage />
						</Suspense>
					),
					},
					{
						path: "users/:userId/edit",
					element: (
						<Suspense fallback={routeFallback}>
							<EditUserPage />
						</Suspense>
					),
					},
					{
						path: "roles",
					element: (
						<Suspense fallback={routeFallback}>
							<RolesPage />
						</Suspense>
					),
					},
					{
						path: "roles/create",
					element: (
						<Suspense fallback={routeFallback}>
							<CreateRolePage />
						</Suspense>
					),
					},
					{
						path: "roles/:roleId/edit",
					element: (
						<Suspense fallback={routeFallback}>
							<EditRolePage />
						</Suspense>
					),
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
						path: "demo-management/unassigned",
					element: (
						<Suspense fallback={routeFallback}>
							<UnassignedDemosPage />
						</Suspense>
					),
					},
					{
						path: "demo-management/scheduled",
					element: (
						<Suspense fallback={routeFallback}>
							<ScheduledDemosPage />
						</Suspense>
					),
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
