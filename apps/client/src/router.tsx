import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "@/features/auth/LoginPage";
import { RequireAuth } from "@/features/auth/RequireAuth";
import PublicFormPage from "@/features/public/PublicFormPage";
import { CreateRolePage } from "@/features/dashboard/CreateRolePage";
import { CreateCounsellorPage } from "@/features/dashboard/CreateCounsellorPage";
import { CreateMentorPage } from "@/features/dashboard/CreateMentorPage";
import { CreateUserPage } from "@/features/dashboard/CreateUserPage";
import { DashboardLayout } from "@/features/dashboard/DashboardLayout";
import { EditRolePage } from "@/features/dashboard/EditRolePage";
import { EditUserPage } from "@/features/dashboard/EditUserPage";
import { AdmissionDetailPage } from "@/features/dashboard/AdmissionDetailPage";
import { AdmissionsPage } from "@/features/dashboard/AdmissionsPage";
import { DemoRequestsPage } from "@/features/dashboard/DemoRequestsPage";
import { DemoCompletedPage } from "@/features/dashboard/DemoCompletedPage";
import { ForDemoPage } from "@/features/dashboard/ForDemoPage";
import { LeadDetailPage } from "@/features/dashboard/LeadDetailPage";
import { LeadsPage } from "@/features/dashboard/LeadsPage";
import { MyLeadsPage } from "@/features/dashboard/MyLeadsPage";
import { MentorsPage } from "@/features/dashboard/MentorsPage";
import { MePage } from "@/features/dashboard/MePage";
import { OverviewPage } from "@/features/dashboard/OverviewPage";
import { RolesPage } from "@/features/dashboard/RolesPage";
import { StudentsPage } from "@/features/dashboard/StudentsPage";
import { CounsellorsPage } from "@/features/dashboard/CounsellorsPage";
import { UsersPage } from "@/features/dashboard/UsersPage";

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
						path: "my-leads",
						element: <MyLeadsPage />,
					},
					{
						path: "for-demo",
						element: <ForDemoPage />,
					},
					{
						path: "demo-requests",
						element: <DemoRequestsPage />,
					},
					{
						path: "demo-completed",
						element: <DemoCompletedPage />,
					},
					{
						path: "admissions",
						element: <AdmissionsPage />,
					},
					{
						path: "admissions/:leadId",
						element: <AdmissionDetailPage />,
					},
					{
						path: "students",
						element: <StudentsPage />,
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
						path: "leads/:leadId",
						element: <LeadDetailPage />,
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
				],
			},
		],
	},
	{
		path: "*",
		element: <Navigate to="/" replace />,
	},
]);




