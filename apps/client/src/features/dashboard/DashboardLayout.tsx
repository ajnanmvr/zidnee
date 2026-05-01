import { useEffect, useState } from "react";
import {
	HiAcademicCap,
	HiCheckCircle,
	HiArchiveBox,
	HiBookmarkSquare,
	HiCalendarDays,
	HiClipboardDocumentList,
	HiFlag,
	HiIdentification,
	HiPhone,
	HiPresentationChartLine,
	HiSquares2X2,
	HiUser,
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
import {
	getLeadStageCounts,
	leadStageDefinitions,
} from "@/features/leads/lead-stage-filters";
import {
	useAdmissionLeadsQuery,
	useDueLeadFollowUpsQuery,
} from "@/features/leads/leads.queries";
import { useRolesQuery } from "@/features/roles/roles.queries";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useSession } from "@/lib/session";

const roleCount = (users: Array<{ roles: Array<{ name: string }> }>, role: "mentor" | "counsellor") =>
	users.filter((user) =>
		user.roles.some((item) => item.name.toLowerCase() === role),
	).length;

const titles: Record<string, string> = {
	"/": "Overview",
	"/leads": "Leads",
	"/my-leads": "My Leads",
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
	const leadsQuery = useDueLeadFollowUpsQuery(token, { scope: "all", timeFilter: "all" });
	const myLeadsQuery = useDueLeadFollowUpsQuery(token, { scope: "mine", timeFilter: "all" });
	const admissionsQuery = useAdmissionLeadsQuery(token);
	const studentsQuery = useStudentsQuery(token);
	const usersQuery = useUsersQuery(token);
	const rolesQuery = useRolesQuery(token);
	const meName = me?.name ?? "User";
	const currentUserId = me?.id;

	const allUsers = usersQuery.data?.users ?? [];
	const allLeads = leadsQuery.data?.leads ?? [];
	const leadStageCounts = getLeadStageCounts(allLeads, currentUserId);
	const currentLocation = `${location.pathname}${location.search}`;
	const leadStageIcons = {
		all: <HiPhone className="h-5 w-5" aria-hidden="true" />,
		followUp: <HiPresentationChartLine className="h-5 w-5" aria-hidden="true" />,
		formSent: <HiCalendarDays className="h-5 w-5" aria-hidden="true" />,
		formFilled: <HiCheckCircle className="h-5 w-5" aria-hidden="true" />,
		demoRequest: <HiBookmarkSquare className="h-5 w-5" aria-hidden="true" />,
		demoAssigned: <HiUsers className="h-5 w-5" aria-hidden="true" />,
		demoCompleted: <HiAcademicCap className="h-5 w-5" aria-hidden="true" />,
		finalStage: <HiFlag className="h-5 w-5" aria-hidden="true" />,
	} as const;
	const leadStageAccents = {
		all: "teal",
		followUp: "lime",
		formSent: "amber",
		formFilled: "cyan",
		demoRequest: "orange",
		demoAssigned: "emerald",
		demoCompleted: "violet",
		finalStage: "teal",
	} as const;
	const navItems: NavigationItem[] = [
		{
			to: "/",
			label: "Overview",
			description: "Snapshot",
			icon: <HiSquares2X2 className="h-5 w-5" aria-hidden="true" />,
			count: (leadsQuery.data?.leads.length ?? 0) + (studentsQuery.data?.students.length ?? 0),
			accent: "emerald",
		},
		{
			to: "/leads",
			label: "Leads",
			description: "All follow-ups",
			icon: <HiPhone className="h-5 w-5" aria-hidden="true" />,
			count: leadStageCounts.all,
			accent: "teal",
		},
		...leadStageDefinitions.map((stage) => ({
			to: `/leads?stage=${stage.id}`,
			label: stage.label,
			description: stage.description,
			icon: leadStageIcons[stage.id],
			count: leadStageCounts[stage.id],
			accent: leadStageAccents[stage.id],
		})),
		{
			to: "/my-leads",
			label: "My Leads",
			description: "Assigned to me",
			icon: <HiUser className="h-5 w-5" aria-hidden="true" />,
			count: myLeadsQuery.data?.leads.length ?? 0,
			accent: "lime",
		},
		{
			to: "/admissions",
			label: "For Admission",
			description: "Queue",
			icon: <HiBookmarkSquare className="h-5 w-5" aria-hidden="true" />,
			count: admissionsQuery.data?.leads.length ?? 0,
			accent: "violet",
		},
		{
			to: "/students",
			label: "Students",
			description: "Enrolled",
			icon: <HiAcademicCap className="h-5 w-5" aria-hidden="true" />,
			count: studentsQuery.data?.students.length ?? 0,
			accent: "cyan",
		},
		{
			to: "/counsellors",
			label: "Counsellors",
			description: "Team",
			icon: <HiUsers className="h-5 w-5" aria-hidden="true" />,
			count: roleCount(allUsers, "counsellor"),
			accent: "teal",
		},
		{
			to: "/mentors",
			label: "Mentors",
			description: "Team",
			icon: <HiUserGroup className="h-5 w-5" aria-hidden="true" />,
			count: roleCount(allUsers, "mentor"),
			accent: "amber",
		},
		{
			to: "/users",
			label: "Users",
			description: "All accounts",
			icon: <HiIdentification className="h-5 w-5" aria-hidden="true" />,
			count: usersQuery.data?.users.length ?? 0,
			accent: "cyan",
		},
		{
			to: "/roles",
			label: "Role Permissions",
			description: "Access",
			icon: <HiClipboardDocumentList className="h-5 w-5" aria-hidden="true" />,
			count: rolesQuery.data?.roles.length ?? 0,
			accent: "violet",
		},
		{
			to: "/me",
			label: "My Profile",
			description: "Account",
			icon: <HiArchiveBox className="h-5 w-5" aria-hidden="true" />,
			accent: "emerald",
		},
	];

	useEffect(() => {
		if (error instanceof ApiError && error.status === 401) {
			clearToken();
			navigate("/login", { replace: true });
		}
	}, [clearToken, error, navigate]);

	const title = resolveTitle(location.pathname);
	const roleLabel = me?.roles[0]?.name ?? "Workspace member";

	return (
		<main className="h-screen overflow-hidden bg-gray-50 text-gray-900">
			<div className="grid h-full lg:grid-cols-[auto_minmax(0,1fr)]">
				<Sidebar
					items={navItems}
					open={sidebarOpen}
					onToggle={() => setSidebarOpen((current) => !current)}
					onLogout={clearToken}
					currentLocation={currentLocation}
				/>

				<section className="min-w-0 bg-gray-50 h-screen overflow-hidden flex flex-col">
					<DashboardHeader
						title={title}
						breadcrumbs={["Dashboard", title]}
						userName={meName}
						userLabel={`${me?.username ?? "user"} | ${roleLabel}`}
						onToggleSidebar={() => setSidebarOpen((current) => !current)}
					/>

					<div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
						{error ? (
							<div className="mb-5 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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




