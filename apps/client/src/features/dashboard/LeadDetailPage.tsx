import { useParams, useNavigate } from "react-router-dom";
import { HiArrowLeft } from "react-icons/hi2";
import { useLeadDetailQuery } from "@/features/leads/leads.queries";
import { useSession } from "@/lib/session";
import { Panel } from "@/components/dashboard-ui";
import { ActivityFeed } from "@/components/ActivityFeed";

export const LeadDetailPage = () => {
	const { leadId } = useParams<{ leadId: string }>();
	const navigate = useNavigate();
	const { token } = useSession();

	const leadQuery = useLeadDetailQuery(token, leadId ?? "");

	if (!leadId) {
		return (
			<div className="grid gap-4">
				<Panel title="Lead">
					<div className="text-center py-8">
						<p className="text-ink-soft">Lead not found</p>
					</div>
				</Panel>
			</div>
		);
	}

	if (leadQuery.isLoading) {
		return (
			<div className="grid gap-4">
				<Panel title="Lead">
					<div className="text-center py-8">
						<p className="text-ink-soft">Loading lead...</p>
					</div>
				</Panel>
			</div>
		);
	}

	const lead = leadQuery.data?.lead;

	if (!lead && leadQuery.isError) {
		return (
			<div className="grid gap-4">
				<Panel title="Lead">
					<div className="text-center py-8">
						<p className="text-ink-soft">Lead not found</p>
					</div>
				</Panel>
			</div>
		);
	}

	return (
		<div className="grid gap-4">
			{/* Header */}
			<Panel title={lead ? lead.name || lead.phone : "Lead"} description="Lead details">
				<div className="flex items-center gap-4 mb-6">
					<button
						onClick={() => navigate("/leads")}
						className="flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand/80 transition-colors"
					>
						<HiArrowLeft className="h-4 w-4" />
						Back to leads
					</button>
				</div>

				{lead && (
					<div className="grid gap-4">
						<div className="border-b border-border pb-4">
							<h1 className="text-2xl font-bold text-ink mb-1">
								{lead.name || lead.phone}
							</h1>
							<p className="text-sm text-ink-soft">Phone: {lead.phone}</p>
							{lead.demoRequired ? (
								<p className="text-sm text-ink-soft">Demo request: Pending</p>
							) : null}
							{lead.demoRequestedAt ? (
								<p className="text-sm text-ink-soft">
									Demo requested at: {new Date(lead.demoRequestedAt).toLocaleString()}
								</p>
							) : null}
							{lead.demoMentorId ? (
								<p className="text-sm text-ink-soft">Demo mentor assigned</p>
							) : null}
							{lead.demoScheduledFor ? (
								<p className="text-sm text-ink-soft">
									Demo scheduled for: {new Date(lead.demoScheduledFor).toLocaleString()}
								</p>
							) : null}
							{lead.customNextFollowUpAt && (
								<p className="text-sm text-ink-soft">
									Next Follow-up: {new Date(lead.customNextFollowUpAt).toLocaleString()}
								</p>
							)}
						</div>
					</div>
				)}
			</Panel>

			{/* Activity Feed */}
			<Panel title="Activity Timeline" description="All actions performed on this lead">
				<div className="mb-4">
					<h2 className="text-lg font-bold text-ink">Activity Timeline</h2>
					<p className="text-sm text-ink-soft">All actions performed on this lead</p>
				</div>
				{leadId && <ActivityFeed leadId={leadId} />}
			</Panel>
		</div>
	);
};
