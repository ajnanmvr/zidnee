import { useEffect, useState } from "react";
import {
	HiAcademicCap,
	HiCheckCircle,
	HiArchiveBox,
	HiBookmarkSquare,
	HiCalendarDays,
	HiClipboardDocumentList,
	HiIdentification,
	HiPhone,
	HiPresentationChartLine,
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
import {
	getLeadStageCounts,
	leadStageDefinitions,
	type LeadStageId,
} from "@/features/leads/lead-stage-filters";
import {
	useAdmissionLeadsQuery,
	useDueLeadFollowUpsQuery,
	usePendingDemoRequestsQuery,
	useDemoRequestsQuery,
} from "@/features/leads/leads.queries";
import { useTimeSlotsQuery } from "@/features/time-slots/time-slots.queries";
import { useCoursesQuery } from "@/features/courses/courses.queries";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useSession } from "@/lib/session";
import { isPast, isToday } from "date-fns";

const titles: Record<string, string> = {
	"/": "Overview",
	"/leads": "Leads",
	"/admissions": "For Admission",
	"/students": "Students",
	"/counsellor/mentors": "Counsellor Mentors",
	"/counsellor/students": "Counsellor Students",
	"/counsellors": "Counsellors",
	"/counsellors/create": "Create Counsellor",
	"/mentors": "Mentors",
	"/mentors/create": "Create Mentor",
	"/courses": "Courses",
	"/time-slots": "Time Slots",
	"/users": "Users",
	"/users/create": "Create User",
	"/roles": "Role Permissions",
	"/roles/create": "Create Role",
	"/me": "Me",
	"/demo-management/unassigned": "Unassigned Demos",
	"/demo-management/scheduled": "Scheduled Demos",
};

const resolveTitle = (pathname: string, search: string): string => {
	if (/^\/users\/[^/]+\/edit$/.test(pathname)) {
		return "Edit User";
	}

	if (/^\/counsellors\/create$/.test(pathname)) {
		return "Create Counsellor";
	}

	if (/^\/mentors\/create$/.test(pathname)) {
		return "Create Mentor";
	}

	if (/^\/courses$/.test(pathname)) {
		return "Courses";
	}

	if (/^\/time-slots$/.test(pathname)) {
		return "Time Slots";
	}

	if (/^\/counsellor\/mentors$/.test(pathname)) {
		return "Counsellor Mentors";
	}

	if (/^\/counsellor\/students$/.test(pathname)) {
		return "Counsellor Students";
	}

	if (pathname === "/users/create" && search.includes("role=sales")) {
		return "Create Sales";
	}

	if (/^\/roles\/[^/]+\/edit$/.test(pathname)) {
		return "Edit Role";
	}

	if (/^\/admissions\/[^/]+$/.test(pathname)) {
		return "Admission Details";
	}

	if (pathname === "/users" && search.includes("role=sales")) {
		return "Sales";
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
	const admissionsQuery = useAdmissionLeadsQuery(token);
	const studentsQuery = useStudentsQuery(token);
	const usersQuery = useUsersQuery(token);
	const coursesQuery = useCoursesQuery(token);
	const timeSlotsQuery = useTimeSlotsQuery(token);
	const pendingDemosQuery = usePendingDemoRequestsQuery(token);
	const scheduledDemosQuery = useDemoRequestsQuery(token);
	const meName = me?.name ?? "User";
	const currentUserId = me?.id;

	const allUsers = usersQuery.data?.users ?? [];
	const allStudents = studentsQuery.data?.students ?? [];
	const allLeads = leadsQuery.data?.leads ?? [];
	const leadStageCounts = getLeadStageCounts(allLeads, currentUserId);
	const isCounsellor = me?.roles?.some((role) => (role.type ?? "general") === "counsellor") ?? false;
	const currentCounsellorMentors = allUsers.filter((user) =>
		user.roles.some((role) => (role.type ?? "general") === "mentor") && user.counsellorId === currentUserId,
	);
	const currentCounsellorMentorIds = new Set(currentCounsellorMentors.map((mentor) => mentor.id));
	const currentCounsellorStudents = allStudents.filter((student) =>
		student.counsellorId === currentUserId || (student.mentorId ? currentCounsellorMentorIds.has(student.mentorId) : false),
	);
	const urgentScheduledDemoCount = (scheduledDemosQuery.data?.leads ?? []).filter((lead) => {
		const latestDemo = lead.demos[lead.demos.length - 1];
		if (!latestDemo?.demoScheduledFor) {
			return false;
		}

		const scheduledDate = new Date(latestDemo.demoScheduledFor);
		if (Number.isNaN(scheduledDate.getTime())) {
			return false;
		}

		return isToday(scheduledDate) || isPast(scheduledDate);
	}).length;
	const currentLocation = `${location.pathname}${location.search}`;
	const leadStageIcons = {
		all: <HiPhone className="h-5 w-5" aria-hidden="true" />,
		followUp: <HiPresentationChartLine className="h-5 w-5" aria-hidden="true" />,
		formSent: <HiCalendarDays className="h-5 w-5" aria-hidden="true" />,
		formFilled: <HiCheckCircle className="h-5 w-5" aria-hidden="true" />,
		demoRequest: <HiBookmarkSquare className="h-5 w-5" aria-hidden="true" />,
		demoAssigned: <HiUsers className="h-5 w-5" aria-hidden="true" />,
		demoCompleted: <HiAcademicCap className="h-5 w-5" aria-hidden="true" />,
		demoCancelled: <HiArchiveBox className="h-5 w-5" aria-hidden="true" />,
	} as const;
	const leadStageAccents: Record<LeadStageId, NonNullable<NavigationItem["accent"]>> = {
		all: "teal",
		followUp: "lime",
		formSent: "amber",
		formFilled: "cyan",
		demoRequest: "orange",
		demoAssigned: "emerald",
		demoCompleted: "violet",
		demoCancelled: "orange",
	};

	const getLeadStageItems = (): NavigationItem[] => {
		return leadStageDefinitions
			.filter(stage => stage.id !== 'all')
			.map((stage) => {
				const id = stage.id as Exclude<LeadStageId, "all">;
				return {
					to: `/leads?stage=${id}`,
					label: stage.label,
					description: stage.description,
					icon: leadStageIcons[id] || <HiPhone className="h-5 w-5" aria-hidden="true" />,
					count: leadStageCounts[id] ?? 0,
					accent: leadStageAccents[id],
					section: "Lead Pipeline",
				};
			});
	};

	const navItems = [
		{
			to: "/",
			label: "Overview",
			description: "Snapshot",
			icon: <HiSquares2X2 className="h-5 w-5" aria-hidden="true" />,
			accent: "emerald",
			section: "Overview",
		},
		{
			to: "/leads",
			label: "Leads",
			description: "All follow-ups",
			icon: <HiPhone className="h-5 w-5" aria-hidden="true" />,
			accent: "teal",
			section: "Lead Pipeline",
		},
		...getLeadStageItems(),
		{
			to: "/admissions",
			label: "For Admission",
			description: "Queue",
			icon: <HiBookmarkSquare className="h-5 w-5" aria-hidden="true" />,
			count: admissionsQuery.data?.leads.length ?? 0,
			accent: "violet",
			section: "Lead Pipeline",
		},
		{
			to: "/students",
			label: "Students",
			description: "Enrolled",
			icon: <HiAcademicCap className="h-5 w-5" aria-hidden="true" />,
			count: studentsQuery.data?.students.length ?? 0,
			accent: "cyan",
			section: "Learners",
		},
		...(isCounsellor
			? [
				{
					to: "/counsellor/mentors",
					label: "Mentor Follow-up",
					description: "My mentors",
					icon: <HiUserGroup className="h-5 w-5" aria-hidden="true" />,
					count: currentCounsellorMentors.length,
					accent: "teal",
					section: "Counsellor Workspace",
				},
				{
					to: "/counsellor/students",
					label: "My Students",
					description: "Under my mentors",
					icon: <HiAcademicCap className="h-5 w-5" aria-hidden="true" />,
					count: currentCounsellorStudents.length,
					accent: "cyan",
					section: "Counsellor Workspace",
				},
			]
			: []),
		{
			to: "/courses",
			label: "Courses",
			description: "Catalog",
			icon: <HiAcademicCap className="h-5 w-5" aria-hidden="true" />,
			count: coursesQuery.data?.courses.length ?? 0,
			accent: "rose",
			section: "Learners",
		},
		{
			to: "/time-slots",
			label: "Time Slots",
			description: "Class timing",
			icon: <HiCalendarDays className="h-5 w-5" aria-hidden="true" />,
			count: timeSlotsQuery.data?.timeSlots.length ?? 0,
			accent: "teal",
			section: "Learners",
		},
		{
			to: "/counsellors",
			label: "Counsellors",
			description: "Team",
			icon: <HiUsers className="h-5 w-5" aria-hidden="true" />,
			accent: "teal",
			section: "Management",
		},
		{
			to: "/mentors",
			label: "Mentors",
			description: "Team",
			icon: <HiUserGroup className="h-5 w-5" aria-hidden="true" />,
			accent: "amber",
			section: "Management",
		},
		{
			to: "/users?role=sales",
			label: "Sales",
			description: "Team",
			icon: <HiUsers className="h-5 w-5" aria-hidden="true" />,
			accent: "rose",
			section: "Management",
		},
		{
			to: "/users",
			label: "Users",
			description: "All accounts",
			icon: <HiIdentification className="h-5 w-5" aria-hidden="true" />,
			accent: "cyan",
			section: "Management",
		},
		{
			to: "/roles",
			label: "Role Permissions",
			description: "Access",
			icon: <HiClipboardDocumentList className="h-5 w-5" aria-hidden="true" />,
			accent: "violet",
			section: "Management",
		},
		{
			to: "/demo-management/unassigned",
			label: "Unassigned Demos",
			description: "Pending assignment",
			icon: <HiCalendarDays className="h-5 w-5" aria-hidden="true" />,
			count: pendingDemosQuery.data?.leads.length ?? 0,
			accent: "amber",
			section: "Demo Management",
		},
		{
			to: "/demo-management/scheduled",
			label: "Scheduled Demos",
			description: "Assigned & due",
			icon: <HiCheckCircle className="h-5 w-5" aria-hidden="true" />,
			count: urgentScheduledDemoCount,
			accent: "emerald",
			section: "Demo Management",
		},
		{
			to: "/me",
			label: "My Profile",
			description: "Account",
			icon: <HiArchiveBox className="h-5 w-5" aria-hidden="true" />,
			accent: "emerald",
			section: "Account",
		},
	] as NavigationItem[];

	useEffect(() => {
		if (error instanceof ApiError && error.status === 401) {
			clearToken();
			navigate("/login", { replace: true });
		}
	}, [clearToken, error, navigate]);

	const title = resolveTitle(location.pathname, location.search);
	const roleLabel = me?.roles[0]?.name ?? "Workspace member";

	// Filter out any undefined items and ensure all items have icons
	const validNavItems = navItems.filter((item): item is NavigationItem =>
		Boolean(item && item.icon && item.to && item.label)
	);

	return (
		<main className="h-screen overflow-hidden bg-gray-50 text-gray-900">
			<div className="grid h-full lg:grid-cols-[auto_minmax(0,1fr)]">
				<Sidebar
					items={validNavItems}
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




