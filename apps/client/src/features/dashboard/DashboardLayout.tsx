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
	useDemoRequestsQuery,
	useDueLeadFollowUpsQuery,
	usePendingDemoRequestsQuery,
} from "@/features/leads/leads.queries";
import { useGetAllReminders } from "@/features/reminders/reminders.mutations";
import { getReminderDueStatus } from "@/features/reminders/reminders.utils";
import { getStudentFollowUpState } from "@/features/students/student-table";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useSession } from "@/lib/session";
import { isPast, isToday } from "date-fns";
import { useEffect, useState } from "react";
import {
	HiAcademicCap,
	HiArchiveBox,
	HiArrowDownTray,
	HiBookmarkSquare,
	HiCalendarDays,
	HiCheckCircle,
	HiClipboardDocumentList,
	HiIdentification,
	HiLockClosed,
	HiOutlineBellAlert,
	HiPhone,
	HiPresentationChartLine,
	HiSquares2X2,
	HiUsers,
} from "react-icons/hi2";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const titles: Record<string, string> = {
	"/": "Overview",
	"/leads": "Leads",
	"/students": "Students",
	"/students/break": "On Break",
	"/students/posters": "Welcome Posters",
	"/students/dropped": "Dropped Students",
	"/processes": "Processes",
	"/process-history": "Process History",
	"/mentors": "Mentors",
	"/counsellor/mentors": "Counsellor Mentors",
	"/time-slots": "Time Slots",
	"/users": "Users",
	"/users/create": "Create User",
	"/roles": "Role Permissions",
	"/roles/create": "Create Role",
	"/me": "Me",
	"/demo-management/unassigned": "Unassigned Demos",
	"/demo-management/scheduled": "Scheduled Demos",
	"/demo-management/completed": "Completed Demos",
	"/reminders": "Reminders",
	"/reminders/closed": "Closed Tasks",
	"/leads/closed": "Deleted Leads",
};

const resolveTitle = (pathname: string, search: string): string => {
	if (pathname === "/students") {
		const params = new URLSearchParams(search);
		const studentType = params.get("type");
		if (studentType === "group") {
			return "Group Students";
		}
		if (studentType === "individual") {
			return "Individual Students";
		}
	}

	if (/^\/users\/[^/]+\/edit$/.test(pathname)) {
		return "Edit User";
	}

	if (/^\/time-slots$/.test(pathname)) {
		return "Time Slots";
	}

	if (/^\/counsellor\/mentors$/.test(pathname)) {
		return "Counsellor Mentors";
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

	if (pathname === "/sales-users") {
		return "Sales Users";
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
	const canReadStudents =
		me?.permissions?.some(
			(permission) =>
				permission.key === "STUDENT_READ_MY" || permission.key === "STUDENT_READ_ALL",
		) ??
		false;
	const canReadStudentProcesses =
		me?.permissions?.some(
			(permission) =>
				permission.key === "STUDENT_PROCESS_READ_MY" || permission.key === "STUDENT_PROCESS_READ_ALL",
		) ??
		false;
	const canReadProcessHistory =
		me?.permissions?.some(
			(permission) =>
				permission.key === "STUDENT_PROCESS_HISTORY_READ_MY" ||
				permission.key === "STUDENT_PROCESS_HISTORY_READ_ALL",
		) ??
		false;
	const canReadBatches =
		me?.permissions?.some(
			(permission) =>
				permission.key === "BATCH_READ_MY" || permission.key === "BATCH_READ_ALL",
		) ??
		false;
	const canReadReminders =
		me?.permissions?.some(
			(permission) =>
				permission.key === "REMINDER_READ_MY" || permission.key === "REMINDER_READ_ALL",
		) ??
		false;
	const canReadUnassignedDemos =
		me?.permissions?.some(
			(permission) =>
				permission.key === "DEMO_UNASSIGNED_READ_MY" ||
				permission.key === "DEMO_UNASSIGNED_READ_ALL",
		) ?? false;
	const canReadScheduledDemos =
		me?.permissions?.some(
			(permission) =>
				permission.key === "DEMO_SCHEDULED_READ_MY" ||
				permission.key === "DEMO_SCHEDULED_READ_ALL",
		) ?? false;
	const leadsQuery = useDueLeadFollowUpsQuery(token, {
		scope: "mine",
		timeFilter: "all",
		enabled: canReadLeads,
	});
	const canReadLearnerData = canReadStudents || canReadStudentProcesses || canReadProcessHistory;
	const studentsQuery = useStudentsQuery(token, { scope: "mine" }, canReadLearnerData);
	const breakCountQuery = useStudentsQuery(token, { scope: "mine", status: "BREAK", limit: 1 }, canReadStudents);
	const droppedCountQuery = useStudentsQuery(token, { scope: "mine", status: "DROPPED", limit: 1 }, canReadStudents);
	const breakCount = (breakCountQuery.data as any)?.pagination?.total ?? 0;
	const droppedCount = (droppedCountQuery.data as any)?.pagination?.total ?? 0;
	const remindersQuery = useGetAllReminders({ scope: "mine", enabled: canReadReminders });
	const pendingDemosQuery = usePendingDemoRequestsQuery(token, canReadUnassignedDemos);
	const scheduledDemosQuery = useDemoRequestsQuery(token, canReadScheduledDemos);
	const meName = me?.name ?? "User";
	const currentUserId = me?.id;

	const allStudents = studentsQuery.data?.students ?? [];
	const isInProcess = (student: (typeof allStudents)[number]) =>
		Boolean(student.processId || student.processLabel);
	const getUrgentStudentCount = (courseType: "GROUP" | "INDIVIDUAL") =>
		allStudents.filter((student) => {
			if (student.courseType !== courseType) {
				return false;
			}

			if (isInProcess(student)) {
				return false;
			}

			const followUpState = getStudentFollowUpState(
				student.customNextFollowUpAt,
				student.nextFollowUpAt,
			);
			return followUpState.label === "Today" || followUpState.label === "Past Due";
		}).length;
	const allReminders = remindersQuery.data ?? [];
	const myLeads = leadsQuery.data?.leads ?? [];
	const leadStageCounts = getLeadStageCounts(myLeads, currentUserId);

	// Count only leads that are due today or past due for the Follow Up sidebar count
	const followUpUrgentCount = myLeads.filter((lead) => {
		if (lead.status !== "FOLLOW_UP") return false;
		if (!lead.nextFollowUpAt) return false;
		const d = new Date(String(lead.nextFollowUpAt));
		if (Number.isNaN(d.getTime())) return false;
		return isToday(d) || isPast(d);
	}).length;
	const currentProcessCount = allStudents.filter((student) => Boolean(student.processId)).length;
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
	const reminderUrgentCount = allReminders.filter((reminder) => {
		const dueStatus = getReminderDueStatus(reminder.date);
		return dueStatus === "pastDue" || dueStatus === "today";
	}).length;
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
		converted: <HiCheckCircle className="h-5 w-5" aria-hidden="true" />,
		closed: <HiLockClosed className="h-5 w-5" aria-hidden="true" />,
	} as const;
	const leadStageAccents: Partial<
		Record<LeadStageId, NonNullable<NavigationItem["accent"]>>
	> = {
		all: "teal",
		followUp: "lime",
		formSent: "amber",
		formFilled: "cyan",
		demoRequest: "orange",
		demoAssigned: "emerald",
		demoCompleted: "violet",
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
					count: id === "followUp" ? followUpUrgentCount : leadStageCounts[id] ?? 0,
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
				{
					to: "/leads/closed",
					label: "Deleted Leads",
					description: "Deleted leads",
					icon: <HiLockClosed className="h-5 w-5" aria-hidden="true" />,
					accent: "teal",
					section: "Lead Pipeline",
				},
			]
			: []),
		// Lead overview and reports
		...(hasPermission("LEADS_OVERVIEW_READ") || hasPermission("LEAD_READ_ALL")
			? [
				{
					to: "/leads/overview",
					label: "Lead Overview",
					description: "Reports and charts",
					icon: <HiPresentationChartLine className="h-5 w-5" aria-hidden="true" />,
					accent: "teal",
					section: "Reports",
				},
			]
			: []),
		...(hasPermission("LEADS_CONVERTED_READ") || hasPermission("LEAD_READ_ALL")
			? [
				{
					to: "/leads/converted",
					label: "Converted Leads",
					description: "Leads converted to students",
					icon: <HiCheckCircle className="h-5 w-5" aria-hidden="true" />,
					accent: "emerald",
					section: "Lead Pipeline",
				},
			]
			: []),
		...(hasPermission("DEMO_UNASSIGNED_READ_MY") || hasPermission("DEMO_UNASSIGNED_READ_ALL")
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
		...(hasPermission("DEMO_SCHEDULED_READ_MY") || hasPermission("DEMO_SCHEDULED_READ_ALL")
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
				{
					to: "/demo-management/completed",
					label: "Completed Demos",
					description: "Demo done",
					icon: <HiCheckCircle className="h-5 w-5" aria-hidden="true" />,
					accent: "cyan" as const,
					section: "Demo Management",
				},
			]
			: []),
		...(hasPermission("STUDENT_READ_MY") || hasPermission("STUDENT_READ_ALL")
			? [
				{
					to: "/students?type=group",
					label: "Group Students",
					description: "Enrolled in groups",
					icon: <HiAcademicCap className="h-5 w-5" aria-hidden="true" />,
					count: getUrgentStudentCount("GROUP"),
					accent: "cyan",
					section: "Learners",
				},
				{
					to: "/students?type=individual",
					label: "Individual Students",
					description: "One-to-one learners",
					icon: <HiAcademicCap className="h-5 w-5" aria-hidden="true" />,
					count: getUrgentStudentCount("INDIVIDUAL"),
					accent: "cyan",
					section: "Learners",
				},
				{
					to: "/students/break",
					label: "On Break",
					description: "Students on break",
					icon: <HiAcademicCap className="h-5 w-5" aria-hidden="true" />,
					count: breakCount,
					accent: "amber",
					section: "Learners",
				},
				{
					to: "/students/dropped",
					label: "Dropped Students",
					description: "Dropped students",
					icon: <HiAcademicCap className="h-5 w-5" aria-hidden="true" />,
					count: droppedCount,
					accent: "rose",
					section: "Learners",
				},
			]
			: []),
		...(hasPermission("STUDENT_READ_MY") || hasPermission("STUDENT_READ_ALL") || hasPermission("STUDENT_POSTER_DOWNLOAD")
			? [
				{
					to: "/students/posters",
					label: "Welcome Posters",
					description: "Download student posters",
					icon: <HiArrowDownTray className="h-5 w-5" aria-hidden="true" />,
					accent: "teal" as const,
					section: "Learners",
				},
			]
			: []),
		...(hasPermission("STUDENT_PROCESS_READ_MY") || hasPermission("STUDENT_PROCESS_READ_ALL")
			? [
				{
					to: "/processes",
					label: "Processes",
					description: "Student workflows",
					icon: <HiClipboardDocumentList className="h-5 w-5" aria-hidden="true" />,
					count: currentProcessCount,
					accent: "violet",
					section: "Learners",
				},
			]
			: []),
		...(canReadBatches
			? [
				{
					to: "/groups",
					label: "Groups",
					description: "Mentor groups",
					icon: <HiUsers className="h-5 w-5" aria-hidden="true" />,
					accent: "emerald",
					section: "Learners",
				},
			]
			: []),
		...(canReadReminders
			? [
				{
					to: "/reminders",
					label: "Reminders",
					description: "Open reminders",
					icon: <HiOutlineBellAlert className="h-5 w-5" aria-hidden="true" />,
					count: reminderUrgentCount,
					accent: "amber",
					section: "Learners",
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
		...(hasPermission("SALES_USERS_READ")
			? [
				{
					to: "/sales-users",
					label: "Sales Users",
					description: "Sales team",
					icon: <HiIdentification className="h-5 w-5" aria-hidden="true" />,
					accent: "amber",
					section: "Management",
				},
			]
			: []),
		...(hasPermission("COUNSELLOR_READ")
			? [
				{
					to: "/users?role=counsellor",
					label: "Counsellors",
					description: "Counsellor accounts",
					icon: <HiUsers className="h-5 w-5" aria-hidden="true" />,
					accent: "emerald",
					section: "Management",
				},
			]
			: []),
		...(hasPermission("ADMIN_READ")
			? [
				{
					to: "/users?role=admin",
					label: "Admins",
					description: "Admin users",
					icon: <HiIdentification className="h-5 w-5" aria-hidden="true" />,
					accent: "violet",
					section: "Management",
				},
			]
			: []),
		...(hasPermission("USER_READ")
			? [
				{
					to: "/mentors",
					label: "Mentors",
					description: "Mentor directory",
					icon: <HiUsers className="h-5 w-5" aria-hidden="true" />,
					accent: "emerald",
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
						userLabel={roleLabel}
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
