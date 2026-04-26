import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
	DashboardHeader,
	type NavigationItem,
	Sidebar,
} from "@/components/dashboard-ui.js";
import { useMeQuery } from "@/features/dashboard/dashboard.queries.js";
import { ApiError } from "@/lib/api.js";
import { useSession } from "@/lib/session.js";

const navItems: NavigationItem[] = [
	{
		to: "/",
		label: "Overview",
		description: "Snapshot",
		icon: (
			<svg
				viewBox="0 0 24 24"
				fill="none"
				aria-hidden="true"
				className="h-5 w-5"
			>
				<path
					d="M4 12h6V4H4v8Z"
					stroke="currentColor"
					strokeWidth="1.8"
					strokeLinejoin="round"
				/>
				<path
					d="M14 20h6v-8h-6v8Z"
					stroke="currentColor"
					strokeWidth="1.8"
					strokeLinejoin="round"
				/>
				<path
					d="M14 10h6V4h-6v6Z"
					stroke="currentColor"
					strokeWidth="1.8"
					strokeLinejoin="round"
				/>
				<path
					d="M4 20h6v-6H4v6Z"
					stroke="currentColor"
					strokeWidth="1.8"
					strokeLinejoin="round"
				/>
			</svg>
		),
	},
	{
		to: "/users",
		label: "Users",
		description: "People",
		icon: (
			<svg
				viewBox="0 0 24 24"
				fill="none"
				aria-hidden="true"
				className="h-5 w-5"
			>
				<path
					d="M16 19c0-2.2-2.2-4-4-4s-4 1.8-4 4"
					stroke="currentColor"
					strokeWidth="1.8"
					strokeLinecap="round"
				/>
				<path
					d="M12 12a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 12 12Z"
					stroke="currentColor"
					strokeWidth="1.8"
				/>
			</svg>
		),
	},
	{
		to: "/roles",
		label: "Roles",
		description: "Access",
		icon: (
			<svg
				viewBox="0 0 24 24"
				fill="none"
				aria-hidden="true"
				className="h-5 w-5"
			>
				<path
					d="M12 3 5 7v5c0 4.4 3 7.8 7 9 4-1.2 7-4.6 7-9V7l-7-4Z"
					stroke="currentColor"
					strokeWidth="1.8"
					strokeLinejoin="round"
				/>
			</svg>
		),
	},
	{
		to: "/permissions",
		label: "Permissions",
		description: "Policy",
		icon: (
			<svg
				viewBox="0 0 24 24"
				fill="none"
				aria-hidden="true"
				className="h-5 w-5"
			>
				<path
					d="M6 7.5A3.5 3.5 0 0 1 9.5 4h5A3.5 3.5 0 0 1 18 7.5v9A3.5 3.5 0 0 1 14.5 20h-5A3.5 3.5 0 0 1 6 16.5v-9Z"
					stroke="currentColor"
					strokeWidth="1.8"
				/>
				<path
					d="M9 11.5h6M9 15h4"
					stroke="currentColor"
					strokeWidth="1.8"
					strokeLinecap="round"
				/>
			</svg>
		),
	},
];

const titles: Record<string, string> = {
	"/": "Overview",
	"/users": "Users",
	"/roles": "Roles",
	"/permissions": "Permissions",
};

export const DashboardLayout = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const { token, clearToken } = useSession();
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const { data: me, error } = useMeQuery(token);
	const meName = me?.name ?? "User";

	useEffect(() => {
		if (error instanceof ApiError && error.status === 401) {
			clearToken();
			navigate("/login", { replace: true });
		}
	}, [clearToken, error, navigate]);

	const title = titles[location.pathname] ?? "Overview";
	const roleLabel = me?.roles[0]?.name ?? "Workspace member";
	const stats = [
		{ label: "Active user", value: meName, tone: "brand" as const },
		{ label: "Role", value: roleLabel, tone: "accent" as const },
		{ label: "Session", value: token ? "Live" : "Idle", tone: "ink" as const },
	];

	return (
		<main className="min-h-screen bg-surface-muted text-ink">
			<div className="grid min-h-screen lg:grid-cols-[auto_minmax(0,1fr)]">
				<Sidebar
					items={navItems}
					open={sidebarOpen}
					onToggle={() => setSidebarOpen((current) => !current)}
					onLogout={clearToken}
				/>

				<section className="min-w-0 bg-surface-muted">
					<DashboardHeader
						title={title}
						breadcrumbs={["Dashboard", title, meName]}
						stats={stats}
						userName={meName}
						userLabel={me?.username ?? roleLabel}
						onToggleSidebar={() => setSidebarOpen((current) => !current)}
					/>

					<div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
						{error ? (
							<div className="mb-5 rounded-3xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-ink">
								{error instanceof Error
									? error.message
									: "Unable to load session"}
							</div>
						) : null}
						<Outlet />
					</div>
				</section>
			</div>
		</main>
	);
};
