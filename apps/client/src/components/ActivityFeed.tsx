import type { LeadActivityResponse } from "@repo/schema";
import { useLeadActivitiesQuery } from "@/features/leads/leads.queries";
import { useSession } from "@/lib/session";
import { ActivityTimeline } from "@/components/ActivityTimeline";

interface ActivityFeedProps {
	leadId: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ leadId }) => {
	const { token } = useSession();

	const activitiesQuery = useLeadActivitiesQuery(token, leadId);
	const activities: LeadActivityResponse[] =
		activitiesQuery.data?.activities ?? [];

	if (activitiesQuery.isLoading) {
		return (
			<div className="flex justify-center py-10">
				<div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
			</div>
		);
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
			<div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
				{getErrorMessage(activitiesQuery.error)}
			</div>
		);
	}

	return (
		<ActivityTimeline
			activities={activities}
			emptyMessage="No activities yet. All changes will appear here."
		/>
	);
};
