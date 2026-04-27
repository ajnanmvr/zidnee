import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "@/features/auth/LoginPage";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { CreateRolePage } from "@/features/dashboard/CreateRolePage";
import { DashboardLayout } from "@/features/dashboard/DashboardLayout";
import { MePage } from "@/features/dashboard/MePage";
import { OverviewPage } from "@/features/dashboard/OverviewPage";
import { RolesPage } from "@/features/dashboard/RolesPage";
import { UsersPage } from "@/features/dashboard/UsersPage";

export const router = createBrowserRouter([
	{
		path: "/login",
		element: <LoginPage />,
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
						path: "users",
						element: <UsersPage />,
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
