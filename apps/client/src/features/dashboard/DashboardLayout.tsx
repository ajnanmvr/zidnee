import { useEffect, useState } from "react";
import {
	HiBookmarkSquare,
	HiCalendarDays,
	HiClipboardDocumentList,
	HiPhone,
	HiShieldCheck,
	HiSquares2X2,
	HiUserGroup,
	HiUsers,
} from "react-icons/hi2";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "@/api/request";
import {
	DashboardHeader,
	type NavigationItem,
	Sidebar,
} from "@/components/dashboard-ui";
import { useMeQuery } from "@/features/auth/auth.queries";
import { useSession } from "@/lib/session";

const navItems: NavigationItem[] = [
	{
		to: "/",
		label: "Overview",
		description: "Snapshot",
		icon: <HiSquares2X2 className="h-5 w-5" aria-hidden="true" />,
	},
	{
		to: "/leads",
		label: "Leads",
		description: "All users",
		icon: <HiPhone className="h-5 w-5" aria-hidden="true" />,
	},
	{
		to: "/my-leads",
		label: "My Leads",
		description: "Time focus",
		icon: <HiPhone className="h-5 w-5" aria-hidden="true" />,
	},
	{
		to: "/for-demo",
		label: "For Demo",
		description: "Assign",
		icon: <HiCalendarDays className="h-5 w-5" aria-hidden="true" />,
	},
	{
		to: "/demo-requests",
		label: "Assigned Demos",
		description: "Completion",
		icon: <HiCalendarDays className="h-5 w-5" aria-hidden="true" />,
	},
	{
		to: "/admissions",
		label: "For Admission",
		description: "Queue",
		icon: <HiBookmarkSquare className="h-5 w-5" aria-hidden="true" />,
	},
	{
		to: "/students",
		label: "Students",
		description: "Enrolled",
		icon: <HiUserGroup className="h-5 w-5" aria-hidden="true" />,
	},
	{
		to: "/counsellors",
		label: "Counsellors",
		description: "People",
		icon: <HiUsers className="h-5 w-5" aria-hidden="true" />,
	},
	{
		to: "/mentors",
		label: "Mentors",
		description: "People",
		icon: <HiUsers className="h-5 w-5" aria-hidden="true" />,
	},
	{
		to: "/users",
		label: "Users",
		description: "People",
		icon: <HiUsers className="h-5 w-5" aria-hidden="true" />,
	},
	{
		to: "/roles",
		label: "Role Permissions",
		description: "Access",
		icon: <HiClipboardDocumentList className="h-5 w-5" aria-hidden="true" />,
	},
	{
		to: "/me",
		label: "My Profile",
		description: "Account",
		icon: <HiShieldCheck className="h-5 w-5" aria-hidden="true" />,
	},
];

const titles: Record<string, string> = {
	"/": "Overview",
	"/leads": "Leads",
	"/my-leads": "My Leads",
	"/for-demo": "For Demo",
	"/demo-requests": "Assigned Demos",
	"/admissions": "For Admission",
	"/students": "Students",
	"/counsellors": "Counsellors",
	"/counsellors/create": "Create Counsellor",
	"/mentors": "Mentors",
	"/mentors/create": "Create Mentor",
	"/users": "Users",
	"/users/create": "Create User",
	"/roles": "Role Permissions",
	"/roles/create": "Create Role",
	"/me": "Me",
};

const resolveTitle = (pathname: string): string => {
	if (/^\/users\/[^/]+\/edit$/.test(pathname)) {
		return "Edit User";
	}

	if (/^\/counsellors\/create$/.test(pathname)) {
		return "Create Counsellor";
	}

	if (/^\/mentors\/create$/.test(pathname)) {
		return "Create Mentor";
	}

	if (/^\/roles\/[^/]+\/edit$/.test(pathname)) {
		return "Edit Role";
	}

	if (/^\/admissions\/[^/]+$/.test(pathname)) {
		return "Admission Details";
	}

	return titles[pathname] ?? "Overview";
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

	const title = resolveTitle(location.pathname);
	const roleLabel = me?.roles[0]?.name ?? "Workspace member";

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
						breadcrumbs={["Dashboard", title]}
						userName={meName}
						userLabel={`${me?.username ?? "user"} • ${roleLabel}`}
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
