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
import { useEffect, useState } from "react";
import { useLeadActivitiesQuery } from "@/features/leads/leads.queries";
import { useSession } from "@/lib/session";
import { formatActivityChangeList } from "@/lib/activity-display";
import { formatActivityDateTime, getDateLabel } from "@/lib/utils/date";

interface ActivityFeedProps {
	leadId: string;
}

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
	const labels: { [key: string]: string } = {
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

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ leadId }) => {
	const { token } = useSession();
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const activitiesQuery = useLeadActivitiesQuery(token, leadId);
	const activities: LeadActivityResponse[] =
		activitiesQuery.data?.activities ?? [];

	if (activitiesQuery.isLoading) {
		return <div className="text-sm text-gray-600">Loading activities...</div>;
	}

	if (activitiesQuery.isError) {
		console.error("Lead activities error:", activitiesQuery.error);
		const getErrorMessage = (err: unknown) => {
			if (err instanceof Error) return err.message;
			if (typeof err === "object" && err !== null && "message" in err) {
				const m = (err as { message?: unknown }).message;
				if (typeof m === "string") return m;
			}
			return "Unable to load activities.";
		};
		return (
			<div className="text-sm text-red-600">
				{getErrorMessage(activitiesQuery.error)}
			</div>
		);
	}

	if (activities.length === 0) {
		return (
			<div className="text-center py-12">
				<p className="text-gray-600">
					No activities yet. All changes will appear here.
				</p>
			</div>
		);
	}

	const getActivityDescription = (activity: LeadActivityResponse): string => {
		if (
			activity.type === "DEMO_SCHEDULED" &&
			activity.newValue?.demoScheduledFor
		) {
			const scheduledDate = new Date(
				String(activity.newValue.demoScheduledFor),
			);
			if (!Number.isNaN(scheduledDate.getTime())) {
				return `Demo scheduled for ${formatActivityDateTime(scheduledDate)}`;
			}
		}
		return activity.description;
	};

	return (
		<div className="relative">
			{/* Timeline connector line */}
			<div className="absolute left-6 top-10 bottom-0 w-px bg-linear-to-b from-gray-300 to-gray-100" />

			<div className="space-y-4">
				{activities.map((activity) => {
					const colorClasses = getActivityColor(activity.type);
					const isExpanded = expandedId === activity.id;

					return (
						<div key={activity.id} className="relative">
							{/* Timeline dot */}
							<div className="absolute left-1 top-2">
								<div
									className={`h-3 w-3 rounded-full ring-4 ring-white flex items-center justify-center ${colorClasses.badge} ${colorClasses.text}`}
								>
									{getActivityIcon(activity.type)}
								</div>
							</div>

							{/* Card content */}
							<div
								className={`ml-12 rounded-2xl border bg-linear-to-br ${colorClasses.gradient} ${colorClasses.border} p-4 hover:shadow-md transition-shadow`}
							>
								<div className="flex items-start justify-between gap-4">
									<div className="flex-1 min-w-0">
										{/* Header */}
										<div className="flex items-center gap-2 flex-wrap">
											<span
												className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${colorClasses.badge} ${colorClasses.text}`}
											>
												{getActivityIcon(activity.type)}
												{getActivityTypeLabel(activity.type)}
											</span>
											<p className="text-sm font-semibold text-gray-900">
												{getActivityDescription(activity)}
											</p>
										</div>

										{/* Meta */}
										<div className="mt-2 flex items-center gap-1 text-xs text-gray-600">
											<span className="font-medium">{activity.performedByName}</span>
											<span>·</span>
											<span title={getDateLabel(activity.createdAt)}>
												{formatActivityDateTime(activity.createdAt)}
											</span>
										</div>

										{isExpanded ? (
											<>
												{/* Old/New values - more compact */}
												{activity.oldValue && activity.newValue && (
													<div className="mt-3 space-y-2 text-xs">
														<p className="font-semibold text-gray-600">Changes</p>
														<div className="space-y-2">
															{formatActivityChangeList(activity.oldValue, activity.newValue).map(
																(change) => (
																	<div
																		key={change.label}
																		className="rounded-lg border border-white/50 bg-white/50 px-3 py-2"
																	>
																		<div className="font-semibold text-gray-700">{change.label}</div>
																		<div className="mt-1 text-gray-700">
																			<span className="font-medium text-gray-600">Before:</span> {change.before}
																		</div>
																		<div className="text-gray-700">
																			<span className="font-medium text-gray-600">After:</span> {change.after}
																		</div>
																	</div>
																),
															)}
														</div>
													</div>
												)}

												{/* Note */}
												{activity.note && (
													<div className="mt-3 bg-white/60 rounded-lg px-3 py-2 border border-current border-opacity-10">
														<p className="text-xs font-semibold text-gray-700 mb-1">Note</p>
														<p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{activity.note}</p>
													</div>
												)}
											</>
										) : (
											<div className="mt-3 flex items-center justify-between">
												<div className="text-sm text-gray-700">
													{activity.oldValue && activity.newValue ? (
														<span className="text-xs text-gray-500">{Object.keys(activity.newValue).length} changes</span>
													) : (
														<span className="text-xs text-gray-500">Details hidden</span>
													)}
												</div>

												<div>
													<button
														aria-expanded={isExpanded}
														onClick={() => setExpandedId(isExpanded ? null : activity.id)}
														className="text-xs font-medium text-blue-600 hover:underline"
													>
														Show details
													</button>
												</div>
											</div>
										)}
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
