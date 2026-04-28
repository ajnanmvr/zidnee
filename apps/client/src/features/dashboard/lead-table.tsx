import type { LeadResponse } from "@repo/schema";
import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { DateCell } from "@/components/DateCell";
import { getLatestLeadDemo } from "@/features/dashboard/lead-demo-utils";

export const formatUserName = (userName?: string | null) => userName?.trim() || "-";

const getLeadFollowUpDate = (lead: LeadResponse) =>
	lead.nextFollowUpAt;

export const getLeadUrgency = (lead: LeadResponse) => {
	const dateValue = getLeadFollowUpDate(lead);
	if (!dateValue) {
		return { tone: "neutral", label: "No date" };
	}

	const followUpDate = new Date(dateValue);
	if (Number.isNaN(followUpDate.getTime())) {
		return { tone: "neutral", label: "No date" };
	}

	const now = new Date();
	const startOfToday = new Date(now);
	startOfToday.setHours(0, 0, 0, 0);
	const endOfToday = new Date(now);
	endOfToday.setHours(23, 59, 59, 999);

	if (followUpDate < startOfToday) {
		return { tone: "past", label: "Past due" };
	}

	if (followUpDate >= startOfToday && followUpDate <= endOfToday) {
		return { tone: "today", label: "Today" };
	}

	return { tone: "upcoming", label: "Upcoming" };
};

const getLeadStatusTone = (lead: LeadResponse) => {
	const latestDemo = getLatestLeadDemo(lead);

	if (latestDemo?.studentId) {
		return { className: "bg-emerald-500/10 text-emerald-700", label: "Student created" };
	}

	if (latestDemo?.admissionCompletedAt) {
		return { className: "bg-teal-500/10 text-teal-700", label: "Admission completed" };
	}

	if (latestDemo?.admissionRequestedAt) {
		return { className: "bg-amber-500/15 text-amber-800", label: "Admission requested" };
	}

	if (latestDemo?.completedAt) {
		return { className: "bg-brand-soft text-brand", label: "Demo completed" };
	}

	if (latestDemo?.assignedAt && latestDemo?.demoScheduledFor) {
		return { className: "bg-violet-500/10 text-violet-700", label: "Demo scheduled" };
	}

	if (latestDemo?.assignedAt) {
		return { className: "bg-sky/10 text-sky", label: "Demo assigned" };
	}

	if (latestDemo?.requestedAt) {
		return { className: "bg-amber-500/10 text-amber-700", label: "Demo requested" };
	}

	return { className: "bg-surface-muted text-ink-soft", label: "Lead follow-up" };
};

const UrgencyIndicator = ({ lead }: { lead: LeadResponse }) => {
	const urgency = getLeadUrgency(lead);
	const toneClasses =
		urgency.tone === "past"
			? "bg-red-500 text-red-700"
			: urgency.tone === "today"
				? "bg-amber-400 text-amber-700"
				: "bg-emerald-500 text-emerald-700";

	return (
		<div className="flex items-center gap-2">
			<span className={`h-2.5 w-2.5 rounded-full ${toneClasses.split(" ")[0]}`} />
			<span className={`text-xs font-semibold ${toneClasses.split(" ")[1]}`}>
				{urgency.label}
			</span>
		</div>
	);
};

export const buildLeadColumns = (): ColumnDef<LeadResponse>[] => [
	{
		id: "urgency",
		header: "Status",
		cell: (info) => <UrgencyIndicator lead={info.row.original} />,
		enableSorting: false,
	},
	{
		accessorKey: "phone",
		header: "Phone",
		cell: (info) => (
			<div className="font-semibold text-ink">{String(info.getValue())}</div>
		),
		enableSorting: true,
	},
	{
		accessorKey: "name",
		header: "Name",
		cell: (info) => (
			<Link className="font-semibold text-brand hover:text-brand/80" to={`/leads/${info.row.original.id}`}>
				{(info.getValue() as string) ?? "-"}
			</Link>
		),
		enableSorting: true,
	},
	{
		id: "demoStatus",
		header: "Demo Status",
		cell: (info) => {
			const lead = info.row.original;
			const status = getLeadStatusTone(lead);
			return (
				<span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
					{status.label}
				</span>
			);
		},
	},
	{
		accessorKey: "nextFollowUpAt",
		header: "Follow-up",
		cell: (info) => {
			return <DateCell date={String(info.getValue())} />;
		},
		enableSorting: true,
	},
	{
		id: "viewAction",
		header: "",
		cell: (info) => {
			const leadId = info.row.original.id;

			return (
				<div className="flex items-center gap-2">
					<Link
						className="inline-flex items-center rounded-2xl border border-border px-3 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand-soft"
						to={`/leads/${leadId}`}
					>
						View
					</Link>
					<Link
						className="inline-flex items-center rounded-2xl border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-50"
						to={`/leads/${leadId}?action=postpone`}
					>
						Postpone
					</Link>
				</div>
			);
		},
		enableSorting: false,
	},
];
