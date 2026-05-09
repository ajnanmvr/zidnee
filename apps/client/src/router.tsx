import { LoginPage } from "@/features/auth/LoginPage";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { AdmissionDetailPageEnhanced } from "@/features/dashboard/AdmissionDetailPageEnhanced";
import { AdmissionsPage } from "@/features/dashboard/AdmissionsPage";
import { CounsellorMentorsPage } from "@/features/dashboard/CounsellorMentorsPage";
import { CounsellorsPage } from "@/features/dashboard/CounsellorsPage";
import { CounsellorStudentsPage } from "@/features/dashboard/CounsellorStudentsPage";
import CoursesPage from "@/features/dashboard/CoursesPage";
import { CreateCounsellorPage } from "@/features/dashboard/CreateCounsellorPage";
import { CreateMentorPage } from "@/features/dashboard/CreateMentorPage";
import { CreateRolePage } from "@/features/dashboard/CreateRolePage";
import { CreateTimeSlotsPage } from "@/features/dashboard/CreateTimeSlotsPage";
import { CreateUserPage } from "@/features/dashboard/CreateUserPage";
import { DashboardLayout } from "@/features/dashboard/DashboardLayout";
import { EditRolePage } from "@/features/dashboard/EditRolePage";
import { EditUserPage } from "@/features/dashboard/EditUserPage";
import GroupsPage from "@/features/dashboard/GroupsPage";
import { LeadDetailPageNew } from "@/features/dashboard/LeadDetailPageNew";
import { LeadsPage } from "@/features/dashboard/LeadsPage";
import { MentorsPage } from "@/features/dashboard/MentorsPage";
import { MePage } from "@/features/dashboard/MePage";
import { OverviewPage } from "@/features/dashboard/OverviewPage";
import { RolesPage } from "@/features/dashboard/RolesPage";
import { StudentsPage } from "@/features/dashboard/StudentsPage";
import { UsersPage } from "@/features/dashboard/UsersPage";
import { ScheduledDemosPage } from "@/features/demo-management/ScheduledDemosPage";
import { UnassignedDemosPage } from "@/features/demo-management/UnassignedDemosPage";
import PublicFormPage from "@/features/public/PublicFormPage";
import { createBrowserRouter, Navigate } from "react-router-dom";

export const router = createBrowserRouter([
	{
		path: "/login",
		element: <LoginPage />,
	},
		{
			path: "/form/:leadId",
			element: <PublicFormPage />,
		},
	{
		element: <RequireAuth />,
		children: [
			{
				element: <DashboardLayout />,
				children: [
					{
						index: true,
						element: <OverviewPage />,
					},
					{
						path: "leads",
						element: <LeadsPage />,
					},
					{
						path: "admissions",
						element: <AdmissionsPage />,
					},
					{
						path: "admissions/:leadId",
						element: <AdmissionDetailPageEnhanced />,
					},
					{
						path: "students",
						element: <StudentsPage />,
					},
					{
						path: "counsellor/mentors",
						element: <CounsellorMentorsPage />,
					},
					{
						path: "counsellor/students",
						element: <CounsellorStudentsPage />,
					},
					{
						path: "counsellors",
						element: <CounsellorsPage />,
					},
					{
						path: "counsellors/create",
						element: <CreateCounsellorPage />,
					},
					{
						path: "mentors",
						element: <MentorsPage />,
					},
					{
						path: "mentors/create",
						element: <CreateMentorPage />,
					},
					{
						path: "courses",
						element: <CoursesPage />,
					},
					{
						path: "groups",
						element: <GroupsPage />,
					},
					{
						path: "time-slots",
						element: <CreateTimeSlotsPage />,
					},
					{
						path: "leads/:leadId",
						element: <LeadDetailPageNew />,
					},
					{
						path: "users",
						element: <UsersPage />,
					},
					{
						path: "users/create",
						element: <CreateUserPage />,
					},
					{
						path: "users/:userId/edit",
						element: <EditUserPage />,
					},
					{
						path: "roles",
						element: <RolesPage />,
					},
					{
						path: "roles/create",
						element: <CreateRolePage />,
					},
					{
						path: "roles/:roleId/edit",
						element: <EditRolePage />,
					},
					{
						path: "me",
						element: <MePage />,
					},
					{
						path: "demo-management/unassigned",
						element: <UnassignedDemosPage />,
					},
					{
						path: "demo-management/scheduled",
						element: <ScheduledDemosPage />,
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




