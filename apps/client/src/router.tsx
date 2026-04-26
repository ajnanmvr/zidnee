import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "@/features/auth/LoginPage.js";
import { RequireAuth } from "@/features/auth/RequireAuth.js";
import { DashboardLayout } from "@/features/dashboard/DashboardLayout.js";
import { OverviewPage } from "@/features/dashboard/OverviewPage.js";
import { PermissionsPage } from "@/features/dashboard/PermissionsPage.js";
import { RolesPage } from "@/features/dashboard/RolesPage.js";
import { UsersPage } from "@/features/dashboard/UsersPage.js";

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
						path: "permissions",
						element: <PermissionsPage />,
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
