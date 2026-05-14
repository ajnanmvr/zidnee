import { useEffect, useState } from "react";
import { isPast, isToday } from "date-fns";
import {
	HiAcademicCap,
	HiArchiveBox,
	HiBookmarkSquare,
	HiCalendarDays,
	HiCheckCircle,
	HiClipboardDocumentList,
	HiIdentification,
	HiPhone,
	HiPresentationChartLine,
	HiSquares2X2,
	HiLockClosed,
	HiUsers,
	HiOutlineBellAlert,
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
	type LeadStageId,
	leadStageDefinitions,
} from "@/features/leads/lead-stage-filters";
import {
	useDemoRequestsQuery,
	useDueLeadFollowUpsQuery,
	usePendingDemoRequestsQuery,
} from "@/features/leads/leads.queries";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useSession } from "@/lib/session";

const titles: Record<string, string> = {
	"/": "Overview",
	"/leads": "Leads",
	"/students": "Students",
	"/counsellor/mentors": "Counsellor Mentors",
	"/counsellor/students": "Counsellor Students",
	"/time-slots": "Time Slots",
	"/users": "Users",
	"/users/create": "Create User",
	"/roles": "Role Permissions",
	"/roles/create": "Create Role",
	"/me": "Me",
	"/demo-management/unassigned": "Unassigned Demos",
	"/demo-management/scheduled": "Scheduled Demos",
	"/reminders": "Reminders",
};

const resolveTitle = (pathname: string, search: string): string => {
	if (/^\/users\/[^/]+\/edit$/.test(pathname)) {
		return "Edit User";
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
	const canReadLeads =
		me?.permissions?.some(
			(permission) =>
				permission.key === "LEAD_READ_MY" || permission.key === "LEAD_READ_ALL",
		) ?? false;
	const canReadAllLeads =
		me?.permissions?.some((permission) => permission.key === "LEAD_READ_ALL") ??
		false;
	const canReadStudents =
		me?.permissions?.some((permission) => permission.key === "STUDENT_READ") ??
		false;
	const canReadDemos =
		me?.permissions?.some(
			(permission) =>
				permission.key === "LEAD_DEMO_ASSIGN" ||
				permission.key === "LEAD_DEMO_COMPLETE",
		) ?? false;
	const leadsQuery = useDueLeadFollowUpsQuery(token, {
		scope: canReadAllLeads ? "all" : "mine",
		timeFilter: "all",
		enabled: canReadLeads,
	});
	const studentsQuery = useStudentsQuery(token, canReadStudents);
	const pendingDemosQuery = usePendingDemoRequestsQuery(token, canReadDemos);
	const scheduledDemosQuery = useDemoRequestsQuery(token, canReadDemos);
	const meName = me?.name ?? "User";
	const currentUserId = me?.id;

	const allStudents = studentsQuery.data?.students ?? [];
	const allLeads = leadsQuery.data?.leads ?? [];
	const leadStageCounts = getLeadStageCounts(allLeads, currentUserId);
	const isCounsellor =
		me?.roles?.some((role) => (role.type ?? "general") === "counsellor") ??
		false;
	const currentCounsellorStudents = allStudents.filter(
		(student) => Boolean(student.mentorId),
	);
	const myPendingDemoCount = (pendingDemosQuery.data?.leads ?? []).filter(
		(lead) => lead.demoRequestAssignedTo === currentUserId,
	).length;
	const myScheduledDemoCount = (scheduledDemosQuery.data?.leads ?? []).filter(
		(lead) => {
			const latestDemo = lead.demos[lead.demos.length - 1];
			if (!latestDemo?.demoScheduledFor) {
				return false;
			}

			if (latestDemo.mentorId !== currentUserId) {
				return false;
			}

			if (latestDemo.completedAt) {
				return false;
			}

			// Only count demos that are today or overdue (scheduled in the past)
			const scheduledDate = new Date(latestDemo.demoScheduledFor);
			return isToday(scheduledDate) || isPast(scheduledDate);
		},
	).length;
	const currentLocation = `${location.pathname}${location.search}`;
	const leadStageIcons = {
		all: <HiPhone className="h-5 w-5" aria-hidden="true" />,
		followUp: (
			<HiPresentationChartLine className="h-5 w-5" aria-hidden="true" />
		),
		formSent: <HiCalendarDays className="h-5 w-5" aria-hidden="true" />,
		formFilled: <HiCheckCircle className="h-5 w-5" aria-hidden="true" />,
		demoRequest: <HiBookmarkSquare className="h-5 w-5" aria-hidden="true" />,
		demoAssigned: <HiUsers className="h-5 w-5" aria-hidden="true" />,
		demoCompleted: <HiAcademicCap className="h-5 w-5" aria-hidden="true" />,
		demoCancelled: <HiArchiveBox className="h-5 w-5" aria-hidden="true" />,
		converted: <HiCheckCircle className="h-5 w-5" aria-hidden="true" />,
		closed: <HiLockClosed className="h-5 w-5" aria-hidden="true" />,
	} as const;
	const leadStageAccents: Record<
		LeadStageId,
		NonNullable<NavigationItem["accent"]>
	> = {
		all: "teal",
		followUp: "lime",
		formSent: "amber",
		formFilled: "cyan",
		demoRequest: "orange",
		demoAssigned: "emerald",
		demoCompleted: "violet",
		demoCancelled: "orange",
		converted: "emerald",
		closed: "teal",
	};

	const hasPermission = (key: string): boolean =>
		me?.permissions?.some((p) => p.key === key) ?? false;

	const getLeadStageItems = (): NavigationItem[] => {
		return leadStageDefinitions
			.filter((stage) => stage.id !== "all")
			.map((stage) => {
				const id = stage.id as Exclude<LeadStageId, "all">;
				return {
					to: `/leads?stage=${id}`,
					label: stage.label,
					description: stage.description,
					icon: leadStageIcons[id] || (
						<HiPhone className="h-5 w-5" aria-hidden="true" />
					),
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
		...(hasPermission("LEAD_READ_MY") || hasPermission("LEAD_READ_ALL")
			? [
				{
					to: "/leads",
					label: "Leads",
					description: "All follow-ups",
					icon: <HiPhone className="h-5 w-5" aria-hidden="true" />,
					accent: "teal",
					section: "Lead Pipeline",
				},
				...getLeadStageItems(),
			]
			: []),
		...(hasPermission("STUDENT_READ")
			? [
				{
					to: "/students",
					label: "Students",
					description: "Enrolled",
					icon: <HiAcademicCap className="h-5 w-5" aria-hidden="true" />,
					count: studentsQuery.data?.students.length ?? 0,
					accent: "cyan",
					section: "Learners",
				},
				{
					to: "/reminders",
					label: "Reminders",
					description: "All reminders",
					icon: <HiOutlineBellAlert className="h-5 w-5" aria-hidden="true" />,
					accent: "cyan",
					section: "Learners",
				},
			]
			: []),
		...(isCounsellor
			? [
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
		...(hasPermission("TIMESLOT_CREATE")
			? [
				{
					to: "/time-slots",
					label: "Time Slots",
					description: "Class timing",
					icon: <HiCalendarDays className="h-5 w-5" aria-hidden="true" />,
					accent: "teal",
					section: "Learners",
				},
			]
			: []),
		...(hasPermission("USER_READ")
			? [
				{
					to: "/users",
					label: "Users",
					description: "All accounts",
					icon: <HiIdentification className="h-5 w-5" aria-hidden="true" />,
					accent: "cyan",
					section: "Management",
				},
			]
			: []),
		...(hasPermission("ROLE_READ")
			? [
				{
					to: "/roles",
					label: "Role Permissions",
					description: "Access",
					icon: <HiClipboardDocumentList className="h-5 w-5" aria-hidden="true" />,
					accent: "violet",
					section: "Management",
				},
			]
			: []),
		...(hasPermission("LEAD_DEMO_ASSIGN")
			? [
				{
					to: "/demo-management/unassigned",
					label: "Unassigned Demos",
					description: "Pending assignment",
					icon: <HiCalendarDays className="h-5 w-5" aria-hidden="true" />,
					count: myPendingDemoCount,
					accent: "amber",
					section: "Demo Management",
				},
			]
			: []),
		...(hasPermission("LEAD_DEMO_COMPLETE")
			? [
				{
					to: "/demo-management/scheduled",
					label: "Scheduled Demos",
					description: "Assigned & due",
					icon: <HiCheckCircle className="h-5 w-5" aria-hidden="true" />,
					count: myScheduledDemoCount,
					accent: "emerald",
					section: "Demo Management",
				},
			]
			: []),
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
		Boolean(item?.icon && item.to && item.label),
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
