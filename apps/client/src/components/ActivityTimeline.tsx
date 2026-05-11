import type { LeadActivityResponse } from "@repo/schema";
import {
	HiCalendarDays,
	HiCheckCircle,
	HiClock,
	HiEye,
	HiGlobeAlt,
	HiPencil,
	HiTrash,
	HiXMark,
} from "react-icons/hi2";
import { formatActivityDateTime, getDateLabel } from "@/lib/utils/date";

type ActivityTimelineProps = {
	activities: LeadActivityResponse[];
	emptyMessage?: string;
};

const getActivityIcon = (type: string) => {
	switch (type) {
		case "CREATED":
			return <HiCheckCircle className="h-4 w-4" />;
		case "FORM_SENT":
			return <HiGlobeAlt className="h-4 w-4" />;
		case "FOLLOW_UP_POSTPONED":
			return <HiCalendarDays className="h-4 w-4" />;
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

const getActivityColor = (type: string) => {
	switch (type) {
		case "CREATED":
			return {
				gradient: "from-emerald-50 to-emerald-100/50",
				border: "border-emerald-200",
				badge: "bg-emerald-100",
				text: "text-emerald-700",
			};
		case "FORM_SENT":
			return {
				gradient: "from-sky-50 to-sky-100/50",
				border: "border-sky-200",
				badge: "bg-sky-100",
				text: "text-sky-700",
			};
		case "FOLLOW_UP_POSTPONED":
			return {
				gradient: "from-amber-50 to-amber-100/50",
				border: "border-amber-200",
				badge: "bg-amber-100",
				text: "text-amber-700",
			};
		case "STATUS_CHANGED":
			return {
				gradient: "from-blue-50 to-blue-100/50",
				border: "border-blue-200",
				badge: "bg-blue-100",
				text: "text-blue-700",
			};
		case "ASSIGNED":
			return {
				gradient: "from-indigo-50 to-indigo-100/50",
				border: "border-indigo-200",
				badge: "bg-indigo-100",
				text: "text-indigo-700",
			};
		case "FORM_REVOKED":
			return {
				gradient: "from-red-50 to-red-100/50",
				border: "border-red-200",
				badge: "bg-red-100",
				text: "text-red-700",
			};
		case "DEMO_SCHEDULED":
			return {
				gradient: "from-purple-50 to-purple-100/50",
				border: "border-purple-200",
				badge: "bg-purple-100",
				text: "text-purple-700",
			};
		case "DELETED":
			return {
				gradient: "from-red-50 to-red-100/50",
				border: "border-red-200",
				badge: "bg-red-100",
				text: "text-red-700",
			};
		default:
			return {
				gradient: "from-gray-50 to-gray-100/50",
				border: "border-gray-200",
				badge: "bg-gray-100",
				text: "text-gray-700",
			};
	}
};

const getActivityTypeLabel = (type: string): string => {
	const labels: Record<string, string> = {
		CREATED: "Created",
		FORM_SENT: "Form Sent",
		FOLLOW_UP_POSTPONED: "Follow-up Postponed",
		STATUS_CHANGED: "Status Changed",
		ASSIGNED: "Assigned",
		FORM_REVOKED: "Form Revoked",
		DEMO_SCHEDULED: "Demo Scheduled",
		DEMO_CANCELLED: "Demo Cancelled",
		DELETED: "Deleted",
	};
	return labels[type] || type.replace(/_/g, " ");
};

const getActivityDescription = (activity: LeadActivityResponse): string => {
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
	if (activities.length === 0) {
		return (
			<div className="py-8 text-center text-sm text-gray-600">
				{emptyMessage}
			</div>
		);
	}

	return (
		<div className="relative">
			<div className="absolute left-6 top-10 bottom-0 w-px bg-linear-to-b from-gray-300 to-gray-100" />
			<div className="space-y-4">
				{activities.map((activity) => {
					const colorClasses = getActivityColor(activity.type);

					return (
						<div key={activity.id} className="relative">
							<div className="absolute left-1 top-2">
								<div
									className={`flex h-3 w-3 items-center justify-center rounded-full ring-4 ring-white ${colorClasses.badge} ${colorClasses.text}`}
								>
									{getActivityIcon(activity.type)}
								</div>
							</div>

							<div
								className={`ml-12 rounded-2xl border bg-linear-to-br ${colorClasses.gradient} ${colorClasses.border} p-4 transition-shadow hover:shadow-md`}
							>
								<div className="flex items-start justify-between gap-4">
									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap items-center gap-2">
											<span
												className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${colorClasses.badge} ${colorClasses.text}`}
											>
												{getActivityIcon(activity.type)}
												{getActivityTypeLabel(activity.type)}
											</span>
											<p className="text-sm font-semibold text-gray-900">
												{getActivityDescription(activity)}
											</p>
										</div>

										<div className="mt-2 flex items-center gap-1 text-xs text-gray-600">
											<span className="font-medium">
												{activity.performedByName}
											</span>
											<span>·</span>
											<span title={getDateLabel(activity.createdAt)}>
												{formatActivityDateTime(activity.createdAt)}
											</span>
										</div>

										{activity.oldValue && activity.newValue ? (
											<div className="mt-3 space-y-1 text-xs">
												<div className="flex gap-2">
													<span className="min-w-fit font-semibold text-gray-600">
														Before:
													</span>
													<span className="rounded bg-white/40 px-2 py-1 font-mono text-gray-700">
														{JSON.stringify(activity.oldValue)}
													</span>
												</div>
												<div className="flex gap-2">
													<span className="min-w-fit font-semibold text-gray-600">
														After:
													</span>
													<span className="rounded bg-white/40 px-2 py-1 font-mono text-gray-700">
														{JSON.stringify(activity.newValue)}
													</span>
												</div>
											</div>
										) : null}

										{activity.note ? (
											<div className="mt-3 rounded-lg border border-current border-opacity-10 bg-white/60 px-3 py-2">
												<p className="mb-1 text-xs font-semibold text-gray-700">
													Note
												</p>
												<p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
													{activity.note}
												</p>
											</div>
										) : null}
									</div>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
