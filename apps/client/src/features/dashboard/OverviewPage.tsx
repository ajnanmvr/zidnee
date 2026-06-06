import { Link } from "react-router-dom";
import { useMeQuery } from "@/features/auth/auth.queries";
import { useSession } from "@/lib/session";
import {
	HiAcademicCap,
	HiArchiveBox,
	HiArrowDownTray,
	HiCalendarDays,
	HiChartBarSquare,
	HiCheckCircle,
	HiClipboardDocumentList,
	HiClock,
	HiIdentification,
	HiLockClosed,
	HiNoSymbol,
	HiPhone,
	HiPhoto,
	HiPresentationChartLine,
	HiShoppingBag,
	HiUsers,
	HiUserCircle,
	HiArrowTrendingUp,
	HiClipboardDocumentCheck,
} from "react-icons/hi2";
import type { ReactNode } from "react";

type FeatureItem = {
	to: string;
	label: string;
	description: string;
	icon: ReactNode;
	iconBg: string;
	iconColor: string;
	permission: string | string[];
};

type Section = {
	title: string;
	accent: string;
	items: FeatureItem[];
};

function greeting(): string {
	const h = new Date().getHours();
	if (h < 12) return "Good morning";
	if (h < 17) return "Good afternoon";
	return "Good evening";
}

const SECTIONS: Section[] = [
	{
		title: "Lead Pipeline",
		accent: "from-blue-500 to-indigo-600",
		items: [
			{
				to: "/leads",
				label: "Leads",
				description: "Follow up pipeline & stages",
				icon: <HiPhone className="h-5 w-5" />,
				iconBg: "bg-blue-100",
				iconColor: "text-blue-600",
				permission: ["LEAD_READ_MY", "LEAD_READ_ALL"],
			},
			{
				to: "/leads/overview",
				label: "Lead Overview",
				description: "Stats and conversion funnel",
				icon: <HiPresentationChartLine className="h-5 w-5" />,
				iconBg: "bg-indigo-100",
				iconColor: "text-indigo-600",
				permission: ["LEADS_OVERVIEW_READ"],
			},
			{
				to: "/leads/converted",
				label: "Converted Leads",
				description: "Successfully admitted students",
				icon: <HiArrowTrendingUp className="h-5 w-5" />,
				iconBg: "bg-emerald-100",
				iconColor: "text-emerald-600",
				permission: ["LEADS_CONVERTED_READ", "LEAD_READ_MY", "LEAD_READ_ALL"],
			},
			{
				to: "/leads/closed",
				label: "Closed Leads",
				description: "Deleted or closed records",
				icon: <HiArchiveBox className="h-5 w-5" />,
				iconBg: "bg-gray-100",
				iconColor: "text-gray-600",
				permission: ["LEADS_CLOSED_READ"],
			},
		],
	},
	{
		title: "Demo Management",
		accent: "from-violet-500 to-purple-600",
		items: [
			{
				to: "/demo-management/unassigned",
				label: "Unassigned Demos",
				description: "Demo requests awaiting a mentor",
				icon: <HiClipboardDocumentList className="h-5 w-5" />,
				iconBg: "bg-amber-100",
				iconColor: "text-amber-600",
				permission: ["DEMO_UNASSIGNED_READ_MY", "DEMO_UNASSIGNED_READ_ALL"],
			},
			{
				to: "/demo-management/scheduled",
				label: "Scheduled Demos",
				description: "Demos assigned and upcoming",
				icon: <HiCalendarDays className="h-5 w-5" />,
				iconBg: "bg-violet-100",
				iconColor: "text-violet-600",
				permission: ["DEMO_SCHEDULED_READ_MY", "DEMO_SCHEDULED_READ_ALL"],
			},
			{
				to: "/demo-management/completed",
				label: "Completed Demos",
				description: "Demos marked as done",
				icon: <HiCheckCircle className="h-5 w-5" />,
				iconBg: "bg-cyan-100",
				iconColor: "text-cyan-600",
				permission: ["DEMO_SCHEDULED_READ_MY", "DEMO_SCHEDULED_READ_ALL"],
			},
		],
	},
	{
		title: "Learners",
		accent: "from-teal-500 to-emerald-600",
		items: [
			{
				to: "/students?type=group",
				label: "Group Students",
				description: "Students enrolled in group classes",
				icon: <HiUsers className="h-5 w-5" />,
				iconBg: "bg-cyan-100",
				iconColor: "text-cyan-600",
				permission: ["STUDENT_READ_MY", "STUDENT_READ_ALL"],
			},
			{
				to: "/students?type=individual",
				label: "Individual Students",
				description: "One-to-one learners",
				icon: <HiAcademicCap className="h-5 w-5" />,
				iconBg: "bg-teal-100",
				iconColor: "text-teal-600",
				permission: ["STUDENT_READ_MY", "STUDENT_READ_ALL"],
			},
			{
				to: "/students/break",
				label: "On Break",
				description: "Students currently on a break",
				icon: <HiClock className="h-5 w-5" />,
				iconBg: "bg-amber-100",
				iconColor: "text-amber-600",
				permission: ["STUDENT_READ_MY", "STUDENT_READ_ALL"],
			},
			{
				to: "/students/dropped",
				label: "Dropped Students",
				description: "Students who stopped attending",
				icon: <HiNoSymbol className="h-5 w-5" />,
				iconBg: "bg-rose-100",
				iconColor: "text-rose-600",
				permission: ["STUDENT_READ_MY", "STUDENT_READ_ALL"],
			},
			{
				to: "/students/posters",
				label: "Welcome Posters",
				description: "Download personalised welcome posters",
				icon: <HiPhoto className="h-5 w-5" />,
				iconBg: "bg-pink-100",
				iconColor: "text-pink-600",
				permission: ["STUDENT_READ_MY", "STUDENT_READ_ALL", "STUDENT_POSTER_DOWNLOAD"],
			},
			{
				to: "/processes",
				label: "Processes",
				description: "Active student workflows",
				icon: <HiClipboardDocumentCheck className="h-5 w-5" />,
				iconBg: "bg-violet-100",
				iconColor: "text-violet-600",
				permission: ["STUDENT_PROCESS_READ_MY", "STUDENT_PROCESS_READ_ALL"],
			},
			{
				to: "/groups",
				label: "Groups",
				description: "Mentor-led class groups",
				icon: <HiUsers className="h-5 w-5" />,
				iconBg: "bg-emerald-100",
				iconColor: "text-emerald-600",
				permission: ["BATCH_READ_MY", "BATCH_READ_ALL"],
			},
			{
				to: "/reminders",
				label: "Reminders",
				description: "Open follow-up reminders",
				icon: <HiChartBarSquare className="h-5 w-5" />,
				iconBg: "bg-orange-100",
				iconColor: "text-orange-600",
				permission: ["REMINDER_READ_MY", "REMINDER_READ_ALL"],
			},
			{
				to: "/time-slots",
				label: "Time Slots",
				description: "Manage class timings",
				icon: <HiCalendarDays className="h-5 w-5" />,
				iconBg: "bg-sky-100",
				iconColor: "text-sky-600",
				permission: ["TIMESLOT_CREATE"],
			},
		],
	},
	{
		title: "People & Administration",
		accent: "from-slate-500 to-gray-700",
		items: [
			{
				to: "/mentors",
				label: "Mentors",
				description: "Mentor profiles and assignments",
				icon: <HiAcademicCap className="h-5 w-5" />,
				iconBg: "bg-indigo-100",
				iconColor: "text-indigo-600",
				permission: ["USER_READ"],
			},
			{
				to: "/users",
				label: "Users",
				description: "All user accounts",
				icon: <HiIdentification className="h-5 w-5" />,
				iconBg: "bg-blue-100",
				iconColor: "text-blue-600",
				permission: ["USER_READ"],
			},
			{
				to: "/sales-users",
				label: "Sales Users",
				description: "Sales team members",
				icon: <HiShoppingBag className="h-5 w-5" />,
				iconBg: "bg-green-100",
				iconColor: "text-green-600",
				permission: ["SALES_USERS_READ"],
			},
			{
				to: "/roles",
				label: "Roles & Permissions",
				description: "Access control configuration",
				icon: <HiLockClosed className="h-5 w-5" />,
				iconBg: "bg-red-100",
				iconColor: "text-red-600",
				permission: ["ROLE_READ"],
			},
			{
				to: "/me",
				label: "My Profile",
				description: "Your account and settings",
				icon: <HiUserCircle className="h-5 w-5" />,
				iconBg: "bg-gray-100",
				iconColor: "text-gray-600",
				permission: [],
			},
			{
				to: "/me/permissions",
				label: "My Permissions",
				description: "View your access rights",
				icon: <HiArrowDownTray className="h-5 w-5" />,
				iconBg: "bg-teal-100",
				iconColor: "text-teal-600",
				permission: [],
			},
		],
	},
];

export const OverviewPage = () => {
	const { token } = useSession();
	const meQuery = useMeQuery(token);
	const activeName = meQuery.data?.name ?? "User";
	const activeRole = meQuery.data?.roles[0]?.name ?? "Workspace member";
	const permissions = meQuery.data?.permissions ?? [];

	const hasPermission = (key: string | string[]): boolean => {
		const keys = Array.isArray(key) ? key : [key];
		if (keys.length === 0) return true;
		return keys.some((k) => permissions.some((p) => p.key === k));
	};

	const visibleSections = SECTIONS.map((section) => ({
		...section,
		items: section.items.filter((item) => hasPermission(item.permission)),
	})).filter((section) => section.items.length > 0);

	const firstName = activeName.split(" ")[0] ?? activeName;

	return (
		<div className="space-y-6">
			{/* Hero greeting */}
			<div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-teal-600 via-teal-700 to-emerald-800 px-7 py-8 shadow-lg">
				{/* Decorative circles */}
				<div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
				<div className="pointer-events-none absolute -bottom-8 right-24 h-32 w-32 rounded-full bg-white/5" />
				<div className="pointer-events-none absolute bottom-4 right-4 h-16 w-16 rounded-full bg-white/5" />

				<div className="relative">
					<p className="text-sm font-medium text-teal-200">{greeting()},</p>
					<h1 className="mt-1 text-3xl font-bold tracking-tight text-white">{firstName} 👋</h1>
					<p className="mt-2 text-sm text-teal-100 opacity-80">{activeRole} · Zidnee Workspace</p>

					<div className="mt-5 flex flex-wrap gap-2">
						{visibleSections.map((s) => (
							<span
								key={s.title}
								className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
							>
								{s.title}
							</span>
						))}
					</div>
				</div>
			</div>

			{/* Feature sections */}
			{visibleSections.map((section) => (
				<div key={section.title}>
					{/* Section header */}
					<div className="mb-3 flex items-center gap-3">
						<div className={`h-1 w-6 rounded-full bg-linear-to-r ${section.accent}`} />
						<h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">{section.title}</h2>
					</div>

					{/* Cards grid */}
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{section.items.map((item) => (
							<Link
								key={item.to}
								to={item.to}
								className="group flex items-start gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
							>
								<div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.iconBg} transition-transform duration-150 group-hover:scale-110`}>
									<span className={item.iconColor}>{item.icon}</span>
								</div>
								<div className="min-w-0">
									<p className="text-sm font-semibold text-gray-900 leading-snug">{item.label}</p>
									<p className="mt-0.5 text-xs text-gray-500 leading-snug">{item.description}</p>
								</div>
							</Link>
						))}
					</div>
				</div>
			))}
		</div>
	);
};
