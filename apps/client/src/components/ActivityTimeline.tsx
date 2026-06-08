import {
	HiArrowLongRight,
	HiCalendarDays,
	HiCheckCircle,
	HiClock,
	HiEye,
	HiGlobeAlt,
	HiPencil,
	HiTrash,
	HiXMark,
} from "react-icons/hi2";
import { useEffect, useMemo, useState } from "react";
import type { ActivityEntityLookup } from "@/lib/activity-display";
import { formatActivityChangeList } from "@/lib/activity-display";
import { formatActivityDateTime, getDateLabel } from "@/lib/utils/date";
import { useSession } from "@/lib/session";
import { useMentorsQuery } from "@/features/users/users.queries";

type ActivityTimelineEntry = {
	id: string;
	type: string;
	performedByName: string;
	description: string;
	oldValue?: Record<string, unknown>;
	newValue?: Record<string, unknown>;
	note?: string;
	createdAt: string;
};

type ActivityTimelineProps = {
	activities: ActivityTimelineEntry[];
	emptyMessage?: string;
};

const getActivityIcon = (type: string) => {
	switch (type) {
		case "CREATED":
			return <HiCheckCircle className="h-4 w-4" />;
		case "UPDATED":
		case "PROCESS_UPDATED":
		case "ASSESSMENT_UPDATED":
			return <HiPencil className="h-4 w-4" />;
		case "FORM_SENT":
			return <HiGlobeAlt className="h-4 w-4" />;
		case "FOLLOW_UP_POSTPONED":
			return <HiCalendarDays className="h-4 w-4" />;
		case "FOLLOW_UP_RECORDED":
			return <HiClock className="h-4 w-4" />;
		case "STATUS_CHANGED":
			return <HiEye className="h-4 w-4" />;
		case "ASSIGNED":
			return <HiPencil className="h-4 w-4" />;
		case "FORM_REVOKED":
			return <HiXMark className="h-4 w-4" />;
		case "DEMO_SCHEDULED":
			return <HiCalendarDays className="h-4 w-4" />;
		case "DELETED":
			return <HiTrash className="h-4 w-4" />;
		default:
			return <HiClock className="h-4 w-4" />;
	}
};

const ACTIVITY_COLORS: Record<string, { badge: string; bar: string; text: string }> = {
	CREATED:             { badge: "bg-emerald-100", bar: "bg-emerald-400", text: "text-emerald-700" },
	FORM_SENT:           { badge: "bg-sky-100",     bar: "bg-sky-400",     text: "text-sky-700" },
	FOLLOW_UP_POSTPONED: { badge: "bg-amber-100",   bar: "bg-amber-400",   text: "text-amber-700" },
	FOLLOW_UP_RECORDED:  { badge: "bg-teal-100",    bar: "bg-teal-400",    text: "text-teal-700" },
	UPDATED:             { badge: "bg-amber-100",   bar: "bg-amber-400",   text: "text-amber-700" },
	PROCESS_UPDATED:     { badge: "bg-amber-100",   bar: "bg-amber-400",   text: "text-amber-700" },
	ASSESSMENT_UPDATED:  { badge: "bg-amber-100",   bar: "bg-amber-400",   text: "text-amber-700" },
	STATUS_CHANGED:      { badge: "bg-blue-100",    bar: "bg-blue-400",    text: "text-blue-700" },
	ASSIGNED:            { badge: "bg-indigo-100",  bar: "bg-indigo-400",  text: "text-indigo-700" },
	FORM_REVOKED:        { badge: "bg-red-100",     bar: "bg-red-400",     text: "text-red-700" },
	DEMO_SCHEDULED:      { badge: "bg-purple-100",  bar: "bg-purple-400",  text: "text-purple-700" },
	DELETED:             { badge: "bg-red-100",     bar: "bg-red-400",     text: "text-red-700" },
};
const DEFAULT_ACTIVITY_COLOR = { badge: "bg-gray-100", bar: "bg-gray-300", text: "text-gray-600" };

const getActivityColor = (type: string) => ACTIVITY_COLORS[type] ?? DEFAULT_ACTIVITY_COLOR;

const getActivityTypeLabel = (type: string): string => {
	const labels: Record<string, string> = {
		CREATED: "Created",
		UPDATED: "Profile Updated",
		FORM_SENT: "Form Sent",
		FOLLOW_UP_POSTPONED: "Follow-up Postponed",
		FOLLOW_UP_RECORDED: "Follow-up Recorded",
		STATUS_CHANGED: "Status Changed",
		PROCESS_UPDATED: "Process Updated",
		ASSESSMENT_UPDATED: "Assessment Updated",
		ASSIGNED: "Assigned",
		FORM_REVOKED: "Form Revoked",
		DEMO_SCHEDULED: "Demo Scheduled",
		DEMO_CANCELLED: "Demo Cancelled",
		DELETED: "Deleted",
	};
	return labels[type] || type.replace(/_/g, " ");
};

const getActivityDescription = (activity: ActivityTimelineEntry): string => {
	if (
		activity.type === "DEMO_SCHEDULED" &&
		activity.newValue?.demoScheduledFor
	) {
		const scheduledDate = new Date(String(activity.newValue.demoScheduledFor));
		if (!Number.isNaN(scheduledDate.getTime())) {
			return `Demo scheduled for ${formatActivityDateTime(scheduledDate)}`;
		}
	}

	return activity.description;
};

export const ActivityTimeline = ({
	activities,
	emptyMessage = "No activities yet. All changes will appear here.",
}: ActivityTimelineProps) => {
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const { token } = useSession();
	const mentorsQuery = useMentorsQuery(token);
	const mentorsById = useMemo(() => {
		const map = new Map<string, ActivityEntityLookup>();
		for (const m of mentorsQuery.data?.users ?? []) {
			const zid = m.zids?.mentor ?? m.mentorId;
			map.set(m.id, {
				id: m.id,
				label: zid ? `${zid.toUpperCase()} · ${m.name}` : m.name,
				href: `/mentors/${m.id}`,
			});
		}
		return map;
	}, [mentorsQuery.data]);
	const valueContext = useMemo(() => ({ mentors: mentorsById }), [mentorsById]);

	useEffect(() => {
		const lastFollowUp = [...activities].reverse().find((a) => a.type === "FOLLOW_UP_RECORDED");
		setExpandedId(lastFollowUp?.id ?? activities[0]?.id ?? null);
	}, [activities]);

	if (activities.length === 0) {
		return (
			<div className="rounded-2xl border border-dashed border-gray-200 py-10 text-center">
				<HiClock className="mx-auto h-8 w-8 text-gray-200" />
				<p className="mt-2 text-sm text-gray-400">{emptyMessage}</p>
			</div>
		);
	}

	return (
		<ul className="space-y-2.5">
			{activities.map((activity) => {
				const colors = getActivityColor(activity.type);
				const isExpanded = expandedId === activity.id;
				const changeList = activity.oldValue && activity.newValue
					? formatActivityChangeList(activity.oldValue, activity.newValue, valueContext)
					: [];
				const hasChanges = changeList.length > 0;

				return (
					<li
						key={activity.id}
						className="flex gap-3 rounded-2xl border border-gray-200 bg-white py-3 pl-1 pr-4 transition-colors hover:border-gray-300"
					>
						<span className={`mt-0.5 ml-2.5 h-[calc(100%-0.25rem)] w-0.5 shrink-0 self-stretch rounded-full ${colors.bar}`} aria-hidden="true" />
						<span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colors.badge} ${colors.text}`}>
							{getActivityIcon(activity.type)}
						</span>

						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
								<span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${colors.badge} ${colors.text}`}>
									{getActivityTypeLabel(activity.type)}
								</span>
								<p className="text-sm font-semibold text-gray-900">
									{getActivityDescription(activity)}
								</p>
							</div>

							<div className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
								<span className="font-medium text-gray-600">{activity.performedByName}</span>
								<span aria-hidden="true">·</span>
								<span title={getDateLabel(activity.createdAt)}>
									{formatActivityDateTime(activity.createdAt)}
								</span>
							</div>

							{isExpanded ? (
								<div className="mt-3 space-y-2.5">
									{hasChanges ? (
										<div className="space-y-1.5">
											<p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Changes</p>
											<div className="space-y-1.5">
												{changeList.map((change) => (
													<div key={change.label} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
														<p className="font-semibold text-gray-700">{change.label}</p>
														<div className="mt-1 flex flex-wrap items-center gap-2">
															<span className="inline-flex items-center text-gray-500">{change.before}</span>
															<HiArrowLongRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
															<span className="inline-flex items-center font-medium text-gray-800">{change.after}</span>
														</div>
													</div>
												))}
											</div>
										</div>
									) : null}

									{activity.note ? (
										<div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
											<p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Note</p>
											<p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
												{activity.note}
											</p>
										</div>
									) : null}
								</div>
							) : null}

							{hasChanges || activity.note ? (
								<button
									type="button"
									aria-expanded={isExpanded}
									onClick={() => setExpandedId(isExpanded ? null : activity.id)}
									className="mt-2 text-xs font-semibold text-gray-400 transition hover:text-gray-700"
								>
									{isExpanded ? "Hide details" : "Show details"}
								</button>
							) : null}
						</div>
					</li>
				);
			})}
		</ul>
	);
};
