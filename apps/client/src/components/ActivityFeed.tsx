import { formatTableDate } from "@/lib/utils/date";
import { useSession } from "@/lib/session";
import { useLeadActivitiesQuery } from "@/features/leads/leads.queries";

interface ActivityFeedProps {
	leadId: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ leadId }) => {
	const { token } = useSession();

	const activitiesQuery = useLeadActivitiesQuery(token, leadId);

	if (activitiesQuery.isLoading) {
		return <div className="text-sm text-ink-soft">Loading activities...</div>;
	}

	if (activitiesQuery.isError) {
		console.error("Lead activities error:", activitiesQuery.error);
		const message = (activitiesQuery.error as any)?.message ?? "Unable to load activities.";
		return <div className="text-sm text-red-600">{message}</div>;
	}

	const activities = activitiesQuery.data?.activities ?? [];

	if (activities.length === 0) {
		return (
			<div className="text-center py-6">
				<div className="text-ink-soft">No activities yet.</div>
			</div>
		);
	}

	const typeColor = (type: string) => {
		switch (type) {
			case "CREATED":
				return "bg-green-500";
			case "FOLLOW_UP_POSTPONED":
				return "bg-yellow-500";
			case "STATUS_CHANGED":
				return "bg-blue-500";
			case "ASSIGNED":
				return "bg-indigo-500";
			case "DELETED":
				return "bg-red-500";
			case "FORM_SENT":
				return "bg-teal-500";
			case "DEMO_SCHEDULED":
				return "bg-purple-500";
			default:
				return "bg-gray-400";
		}
	};

	return (
		<div className="relative pl-6">
			<div className="absolute left-2 top-0 bottom-0 w-px bg-surface-muted" />
			<div className="space-y-6">
				{activities.map((activity) => (
					<div key={activity.id} className="relative">
						<div className="absolute -left-3 top-1">
							<div className={`h-3 w-3 rounded-full ring-4 ring-white ${typeColor(activity.type)}`} />
						</div>

						<div className="bg-white shadow-sm rounded-md p-3 border">
							<div className="flex items-start justify-between gap-4">
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2">
										<span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold text-white ${typeColor(activity.type)}`}>
											{activity.type.replace(/_/g, " ")}
										</span>
										<p className="text-sm font-medium text-ink truncate">{activity.description}</p>
									</div>

									<div className="mt-1 text-xs text-ink-soft">
										By {activity.performedByName} · {formatTableDate(activity.createdAt)}
									</div>

									{activity.oldValue && activity.newValue && (
										<div className="mt-3 bg-surface-muted rounded px-2 py-2 text-xs">
											<div className="text-ink-soft">
												<span className="font-semibold">Old:</span> {JSON.stringify(activity.oldValue)}
											</div>
											<div className="text-ink-soft mt-1">
												<span className="font-semibold">New:</span> {JSON.stringify(activity.newValue)}
											</div>
										</div>
									)}

									{activity.note && (
										<div className="mt-3 bg-yellow-50 rounded px-3 py-2 border-l-2 border-yellow-400">
											<p className="text-xs font-semibold text-ink-soft mb-1">Note</p>
											<p className="text-sm text-ink whitespace-pre-wrap">{activity.note}</p>
										</div>
									)}
								</div>

								<div className="flex flex-col items-end gap-2" />
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
