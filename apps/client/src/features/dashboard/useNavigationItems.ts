import { isPast, isToday, isTomorrow } from "date-fns";
import { createElement, useEffect } from "react";
import {
	HiAcademicCap,
	HiArchiveBox,
	HiArrowDownTray,
	HiBanknotes,
	HiBookmarkSquare,
	HiCalendarDays,
	HiChatBubbleLeftRight,
	HiCheckBadge,
	HiCheckCircle,
	HiClipboardDocumentList,
	HiClock,
	HiDocumentArrowDown,
	HiKey,
	HiLockClosed,
	HiOutlineBellAlert,
	HiPauseCircle,
	HiPhone,
	HiPresentationChartLine,
	HiRectangleGroup,
	HiRocketLaunch,
	HiShieldCheck,
	HiSquares2X2,
	HiTrash,
	HiUser,
	HiUserGroup,
	HiUsers,
	HiXCircle,
} from "react-icons/hi2";
import type { NavigationItem } from "@/components/dashboard-ui";
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
import { useGetAllReminders } from "@/features/reminders/reminders.mutations";
import { getStudentFollowUpState } from "@/features/students/student-table";
import { useStudentProcessesQuery, useStudentsQuery } from "@/features/students/students.queries";
import { useSession } from "@/lib/session";

const leadStageIcons = {
	all: createElement(HiPhone, { className: "h-5 w-5", "aria-hidden": "true" }),
	followUp: createElement(HiPresentationChartLine, {
		className: "h-5 w-5",
		"aria-hidden": "true",
	}),
	formSent: createElement(HiCalendarDays, {
		className: "h-5 w-5",
		"aria-hidden": "true",
	}),
	formFilled: createElement(HiCheckCircle, {
		className: "h-5 w-5",
		"aria-hidden": "true",
	}),
	demoRequest: createElement(HiBookmarkSquare, {
		className: "h-5 w-5",
		"aria-hidden": "true",
	}),
	demoAssigned: createElement(HiUsers, {
		className: "h-5 w-5",
		"aria-hidden": "true",
	}),
	demoCompleted: createElement(HiAcademicCap, {
		className: "h-5 w-5",
		"aria-hidden": "true",
	}),
	converted: createElement(HiCheckCircle, {
		className: "h-5 w-5",
		"aria-hidden": "true",
	}),
	closed: createElement(HiLockClosed, {
		className: "h-5 w-5",
		"aria-hidden": "true",
	}),
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

export const useNavigationItems = () => {
	const { token } = useSession();
	const meQuery = useMeQuery(token);
	const me = meQuery.data;
	const error = meQuery.error;

	const canReadLeads =
		me?.permissions?.some(
			(permission) =>
				permission.key === "LEAD_READ_MY" || permission.key === "LEAD_READ_ALL",
		) ?? false;
	const canReadStudents =
		me?.permissions?.some(
			(permission) =>
				permission.key === "STUDENT_READ_MY" ||
				permission.key === "STUDENT_READ_ALL",
		) ?? false;
	const canReadStudentProcesses =
		me?.permissions?.some(
			(permission) =>
				permission.key === "STUDENT_PROCESS_READ_MY" ||
				permission.key === "STUDENT_PROCESS_READ_ALL",
		) ?? false;
	const canReadProcessHistory =
		me?.permissions?.some(
			(permission) =>
				permission.key === "STUDENT_PROCESS_HISTORY_READ_MY" ||
				permission.key === "STUDENT_PROCESS_HISTORY_READ_ALL",
		) ?? false;
	const canReadBatches =
		me?.permissions?.some(
			(permission) =>
				permission.key === "BATCH_READ_MY" ||
				permission.key === "BATCH_READ_ALL",
		) ?? false;
	const canReadReminders =
		me?.permissions?.some(
			(permission) =>
				permission.key === "REMINDER_READ_MY" ||
				permission.key === "REMINDER_READ_ALL",
		) ?? false;
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
	const canReadConverted =
		me?.permissions?.some(
			(permission) =>
				permission.key === "LEADS_CONVERTED_READ" ||
				permission.key === "LEAD_READ_ALL",
		) ?? false;

	const leadsQuery = useDueLeadFollowUpsQuery(token, {
		scope: "mine",
		timeFilter: "all",
		enabled: canReadLeads,
	});

	const canReadLearnerData =
		canReadStudents || canReadStudentProcesses || canReadProcessHistory;
	const studentsQuery = useStudentsQuery(
		token,
		{ scope: "mine" },
		canReadLearnerData,
	);
	const breakCountQuery = useStudentsQuery(
		token,
		{ scope: "mine", status: "BREAK", limit: 1 },
		canReadStudents,
	);
	const droppedCountQuery = useStudentsQuery(
		token,
		{ scope: "mine", status: "DROPPED", limit: 1 },
		canReadStudents,
	);
	const convertedCountQuery = useStudentsQuery(
		token,
		{ admittedBy: "me", limit: 1 },
		canReadConverted,
	);
	const myActiveProcessesQuery = useStudentProcessesQuery(
		token,
		{ scope: "mine" },
		canReadStudentProcesses,
	);
	const breakCount = (breakCountQuery.data as any)?.pagination?.total ?? 0;
	const droppedCount = (droppedCountQuery.data as any)?.pagination?.total ?? 0;
	const convertedCount = (convertedCountQuery.data as any)?.pagination?.total ?? 0;
	const remindersQuery = useGetAllReminders({
		scope: "mine",
		enabled: canReadReminders,
	});
	const pendingDemosQuery = usePendingDemoRequestsQuery(
		token,
		canReadUnassignedDemos,
	);
	const scheduledDemosQuery = useDemoRequestsQuery(
		token,
		canReadScheduledDemos,
	);

	useEffect(() => {
		const refetchCounts = () => {
			if (document.visibilityState !== "visible") return;
			if (canReadLeads) leadsQuery.refetch();
			if (canReadLearnerData) studentsQuery.refetch();
			if (canReadStudents) {
				breakCountQuery.refetch();
				droppedCountQuery.refetch();
			}
			if (canReadConverted) convertedCountQuery.refetch();
			if (canReadStudentProcesses) myActiveProcessesQuery.refetch();
			if (canReadReminders) remindersQuery.refetch();
			if (canReadUnassignedDemos) pendingDemosQuery.refetch();
			if (canReadScheduledDemos) scheduledDemosQuery.refetch();
		};

		document.addEventListener("visibilitychange", refetchCounts);
		window.addEventListener("focus", refetchCounts);
		return () => {
			document.removeEventListener("visibilitychange", refetchCounts);
			window.removeEventListener("focus", refetchCounts);
		};
	}, [
		canReadLeads,
		canReadLearnerData,
		canReadStudents,
		canReadReminders,
		canReadUnassignedDemos,
		canReadScheduledDemos,
		canReadStudentProcesses,
		canReadConverted,
		leadsQuery,
		studentsQuery,
		breakCountQuery,
		droppedCountQuery,
		convertedCountQuery,
		remindersQuery,
		pendingDemosQuery,
		scheduledDemosQuery,
		myActiveProcessesQuery,
	]);

	const meName = me?.name ?? "User";
	const roleLabel = me?.roles[0]?.name ?? "Workspace member";
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
			return (
				followUpState.label === "Today" || followUpState.label === "Past Due"
			);
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

	const currentProcessCount = myActiveProcessesQuery.data?.processes?.length ?? 0;
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
		if (reminder.isDone) return false;
		const d = new Date(reminder.date as string | Date);
		if (Number.isNaN(d.getTime())) return false;
		return isPast(d) || isToday(d) || isTomorrow(d);
	}).length;

	const hasPermission = (key: string): boolean =>
		me?.permissions?.some((p) => p.key === key) ?? false;

	const startingDateUrgentCount = hasPermission("STUDENT_STARTING_DATE_READ")
		? allStudents.filter((s) => {
				if (s.status !== "STUDENT") return false;
				const raw = (s as { classStartConfirmedAt?: string | null }).classStartConfirmedAt;
				if (!raw) return false;
				const d = new Date(raw);
				if (Number.isNaN(d.getTime())) return false;
				return isPast(d) || isToday(d) || isTomorrow(d);
			}).length
		: 0;

	const getLeadStageItems = (): NavigationItem[] => {
		return leadStageDefinitions
			.filter((stage) => stage.id !== "all")
			.map((stage) => {
				const id = stage.id as Exclude<LeadStageId, "all">;
				return {
					to: `/leads?stage=${id}`,
					label: stage.label,
					description: stage.description,
					icon:
						leadStageIcons[id] ||
						createElement(HiPhone, {
							className: "h-5 w-5",
							"aria-hidden": "true",
						}),
					count:
						id === "followUp"
							? followUpUrgentCount
							: (leadStageCounts[id] ?? 0),
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
			icon: createElement(HiSquares2X2, {
				className: "h-5 w-5",
				"aria-hidden": "true",
			}),
			accent: "emerald",
			section: "Overview",
		},
		...(hasPermission("LEAD_READ_MY") || hasPermission("LEAD_READ_ALL")
			? [
					{
						to: "/leads",
						label: "Leads",
						description: "All follow-ups",
						icon: createElement(HiPhone, {
							className: "h-5 w-5",
							"aria-hidden": "true",
						}),
						accent: "teal",
						section: "Lead Pipeline",
					},

					...getLeadStageItems(),
					{
						to: "/leads/closed",
						label: "Deleted Leads",
						description: "Deleted leads",
						icon: createElement(HiTrash, {
							className: "h-5 w-5",
							"aria-hidden": "true",
						}),
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
						label: "Lead Report",
						description: "Time-framed reports and charts",
						icon: createElement(HiPresentationChartLine, {
							className: "h-5 w-5",
							"aria-hidden": "true",
						}),
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
						icon: createElement(HiCheckBadge, {
							className: "h-5 w-5",
							"aria-hidden": "true",
						}),
						count: convertedCount,
						accent: "emerald",
						section: "Lead Pipeline",
					},
				]
			: []),
		...(hasPermission("DEMO_UNASSIGNED_READ_MY") ||
		hasPermission("DEMO_UNASSIGNED_READ_ALL")
			? [
					{
						to: "/demo-management/unassigned",
						label: "Unassigned Demos",
						description: "Pending assignment",
						icon: createElement(HiCalendarDays, {
							className: "h-5 w-5",
							"aria-hidden": "true",
						}),
						count: myPendingDemoCount,
						accent: "amber",
						section: "Demo Management",
					},
				]
			: []),
		...(hasPermission("DEMO_SCHEDULED_READ_MY") ||
		hasPermission("DEMO_SCHEDULED_READ_ALL")
			? [
					{
						to: "/demo-management/scheduled",
						label: "Scheduled Demos",
						description: "Assigned & due",
						icon: createElement(HiClock, {
							className: "h-5 w-5",
							"aria-hidden": "true",
						}),
						count: myScheduledDemoCount,
						accent: "emerald",
						section: "Demo Management",
					},
				]
			: []),
		...(hasPermission("DEMO_COMPLETED_READ_MY") ||
		hasPermission("DEMO_COMPLETED_READ_ALL")
			? [
					{
						to: "/demo-management/completed",
						label: "Completed Demos",
						description: "Demo done",
						icon: createElement(HiCheckCircle, {
							className: "h-5 w-5",
							"aria-hidden": "true",
						}),
						accent: "cyan" as const,
						section: "Demo Management",
					},
				]
			: []),
		...(hasPermission("STUDENT_PROCESS_READ_MY") ||
		hasPermission("STUDENT_PROCESS_READ_ALL")
			? [
					{
						to: "/processes",
						label: "Processes",
						description: "Student workflows",
						icon: createElement(HiClipboardDocumentList, {
							className: "h-5 w-5",
							"aria-hidden": "true",
						}),
						count: currentProcessCount,
						accent: "violet",
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
						icon: createElement(HiOutlineBellAlert, {
							className: "h-5 w-5",
							"aria-hidden": "true",
						}),
						count: reminderUrgentCount,
						accent: "amber",
						section: "Learners",
					},
				]
			: []),
		...(hasPermission("STUDENT_READ_MY") || hasPermission("STUDENT_READ_ALL")
			? [
					{
						to: "/students?type=individual",
						label: "Individual Students",
						description: "One-to-one learners",
						icon: createElement(HiUser, {
							className: "h-5 w-5",
							"aria-hidden": "true",
						}),
						count: getUrgentStudentCount("INDIVIDUAL"),
						accent: "cyan",
						section: "Learners",
					},
					{
						to: "/students?type=group",
						label: "Group Students",
						description: "Enrolled in groups",
						icon: createElement(HiUserGroup, {
							className: "h-5 w-5",
							"aria-hidden": "true",
						}),
						count: getUrgentStudentCount("GROUP"),
						accent: "cyan",
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
						icon: createElement(HiRectangleGroup, {
							className: "h-5 w-5",
							"aria-hidden": "true",
						}),
						accent: "emerald",
						section: "Learners",
					},
				]
			: []),
		...(hasPermission("STUDENT_READ_MY") || hasPermission("STUDENT_READ_ALL")
			? [
					{
						to: "/students/break",
						label: "On Break",
						description: "Students on break",
						icon: createElement(HiPauseCircle, {
							className: "h-5 w-5",
							"aria-hidden": "true",
						}),
						count: breakCount,
						accent: "amber",
						section: "Learners",
					},
					{
						to: "/students/dropped",
						label: "Dropped Students",
						description: "Dropped students",
						icon: createElement(HiXCircle, {
							className: "h-5 w-5",
							"aria-hidden": "true",
						}),
						count: droppedCount,
						accent: "rose",
						section: "Learners",
					},
				]
			: []),
		...(hasPermission("STUDENT_STARTING_DATE_READ")
			? [
					{
						to: "/students/starting-dates",
						label: "Starting Dates",
						description: "Upcoming class starting",
						icon: createElement(HiRocketLaunch, {
							className: "h-5 w-5",
							"aria-hidden": "true",
						}),
						count: startingDateUrgentCount,
						accent: "blue" as const,
						section: "Learners",
					},
				]
			: []),
		...(hasPermission("STUDENT_READ_MY") ||
		hasPermission("STUDENT_READ_ALL") ||
		hasPermission("STUDENT_POSTER_DOWNLOAD")
			? [
					{
						to: "/students/posters",
						label: "Welcome Posters",
						description: "Download student posters",
						icon: createElement(HiArrowDownTray, {
							className: "h-5 w-5",
							"aria-hidden": "true",
						}),
						accent: "teal" as const,
						section: "Learners",
					},
				]
			: []),
		...(hasPermission("STUDENT_EXPORT")
			? [
					{
						to: "/students/export",
						label: "Export Students",
						description: "Download student data",
						icon: createElement(HiDocumentArrowDown, {
							className: "h-5 w-5",
							"aria-hidden": "true",
						}),
						accent: "teal" as const,
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
						icon: createElement(HiCalendarDays, {
							className: "h-5 w-5",
							"aria-hidden": "true",
						}),
						accent: "teal",
						section: "Learners",
					},
				]
			: []),
		...(hasPermission("SALES_USERS_READ") || hasPermission("SALES_READ")
			? [
					{
						to: "/sales-users",
						label: "Sales Users",
						description: "Sales team",
						icon: createElement(HiBanknotes, {
							className: "h-5 w-5",
							"aria-hidden": "true",
						}),
						accent: "amber",
						section: "Management",
					},
				]
			: []),
		...(hasPermission("COUNSELLOR_READ")
			? [
					{
						to: "/counsellors",
						label: "Counsellors",
						description: "Counsellor accounts",
						icon: createElement(HiChatBubbleLeftRight, {
							className: "h-5 w-5",
							"aria-hidden": "true",
						}),
						accent: "emerald",
						section: "Management",
					},
				]
			: []),
		...(hasPermission("ADMIN_READ")
			? [
					{
						to: "/admins",
						label: "Admins",
						description: "Admin users",
						icon: createElement(HiShieldCheck, {
							className: "h-5 w-5",
							"aria-hidden": "true",
						}),
						accent: "violet",
						section: "Management",
					},
				]
			: []),
		...(hasPermission("USER_READ") ||
		hasPermission("MENTOR_READ") ||
		hasPermission("MENTOR_READ_MY") ||
		hasPermission("MENTOR_READ_ALL")
			? [
					{
						to: "/mentors",
						label: "Mentors",
						description: "Mentor directory",
						icon: createElement(HiAcademicCap, {
							className: "h-5 w-5",
							"aria-hidden": "true",
						}),
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
						icon: createElement(HiKey, {
							className: "h-5 w-5",
							"aria-hidden": "true",
						}),
						accent: "violet",
						section: "Management",
					},
				]
			: []),
		{
			to: "/me",
			label: "My Profile",
			description: "Account",
			icon: createElement(HiArchiveBox, {
				className: "h-5 w-5",
				"aria-hidden": "true",
			}),
			accent: "emerald",
			section: "Account",
		},
	] as NavigationItem[];

	// Filter out any undefined items and ensure all items have icons
	const validNavItems = navItems.filter((item): item is NavigationItem =>
		Boolean(item?.icon && item.to && item.label),
	);

	return {
		me,
		error,
		navItems: validNavItems,
		meName,
		roleLabel,
		hasPermission,
		isLoading: meQuery.isLoading,
	};
};
