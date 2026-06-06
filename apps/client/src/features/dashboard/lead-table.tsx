import type { LeadResponse } from "@repo/schema";
import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { DateCell } from "@/components/DateCell";
import { getLatestLeadDemo } from "@/features/dashboard/lead-demo-utils";
import type { LeadStageId } from "@/features/leads/lead-stage-filters";
import { HiStar } from "react-icons/hi2";

export const formatUserName = (userName?: string | null) =>
	userName?.trim() || "-";

const getLeadFollowUpDate = (lead: LeadResponse) => lead.nextFollowUpAt;

export const getLeadUrgency = (lead: LeadResponse) => {
	const dateValue = getLeadFollowUpDate(lead);
	if (!dateValue) return { tone: "neutral", label: "No date" };

	const followUpDate = new Date(dateValue);
	if (Number.isNaN(followUpDate.getTime())) return { tone: "neutral", label: "No date" };

	const now = new Date();
	const startOfToday = new Date(now);
	startOfToday.setHours(0, 0, 0, 0);
	const endOfToday = new Date(now);
	endOfToday.setHours(23, 59, 59, 999);

	if (followUpDate < startOfToday) return { tone: "past", label: "Past due" };
	if (followUpDate >= startOfToday && followUpDate <= endOfToday) return { tone: "today", label: "Today" };
	return { tone: "upcoming", label: "Upcoming" };
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
	CLOSED:         { bg: "bg-red-50",     text: "text-red-700",     label: "Deleted" },
	CONVERTED:      { bg: "bg-green-50",   text: "text-green-700",   label: "Converted" },
	DEMO_COMPLETED: { bg: "bg-blue-50",    text: "text-blue-700",    label: "Demo Done" },
	DEMO_ASSIGNED:  { bg: "bg-violet-50",  text: "text-violet-700",  label: "Demo Scheduled" },
	DEMO_REQUEST:   { bg: "bg-amber-50",   text: "text-amber-700",   label: "Demo Request" },
	FORM_FILLED:    { bg: "bg-emerald-50", text: "text-emerald-700", label: "Form Filled" },
	FORM_SENT:      { bg: "bg-sky-50",     text: "text-sky-700",     label: "Form Sent" },
};

const getLeadStatusConfig = (lead: LeadResponse) =>
	STATUS_CONFIG[lead.status] ?? { bg: "bg-gray-50", text: "text-gray-600", label: "Follow Up" };

export type LeadTableAction = {
	key: string;
	label: string;
	onClick?: (lead: LeadResponse) => void;
	to?: (lead: LeadResponse) => string;
	className?: string;
};

export const buildLeadColumns = (options?: {
	getActions?: (lead: LeadResponse) => LeadTableAction[];
	activeStage?: LeadStageId;
	userNameById?: Map<string, string>;
}): ColumnDef<LeadResponse>[] => [
	{
		id: "lead",
		header: "Lead",
		cell: (info) => {
			const lead = info.row.original;
			const status = getLeadStatusConfig(lead);
			return (
				<div className="flex items-start gap-2.5 min-w-0">
					<div className={`mt-0.5 h-7 w-7 shrink-0 rounded-full ${status.bg} flex items-center justify-center`}>
						{lead.isOrganic
							? <HiStar className="h-3.5 w-3.5 text-amber-500" />
							: <span className={`text-[11px] font-bold ${status.text}`}>
								{(lead.name ?? lead.phone ?? "?")[0]?.toUpperCase()}
							</span>}
					</div>
					<div className="min-w-0">
						<Link
							className="block font-bold text-blue-600 hover:underline text-sm leading-tight"
							to={`/leads/${lead.id}`}
						>
							{lead.phone}
						</Link>
						{lead.name ? (
							<p className="text-xs text-gray-500 truncate leading-tight">{lead.name}</p>
						) : null}
					</div>
				</div>
			);
		},
	},
	{
		id: "status",
		header: "Status",
		cell: (info) => {
			const lead = info.row.original;
			const cfg = getLeadStatusConfig(lead);
			return (
				<span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
					{cfg.label}
				</span>
			);
		},
	},
	{
		id: "handler",
		header: "Handler",
		cell: (info) => {
			const lead = info.row.original as LeadResponse;
			const latestDemo = getLatestLeadDemo(lead);
			const stage = options?.activeStage;
			const nameMap = options?.userNameById;
			if (stage === "demoRequest") {
				const id = lead.demoRequestAssignedTo ?? null;
				if (id) return <span className="text-xs text-gray-700">{nameMap?.get(id) ?? "—"}</span>;
			}
			if (stage === "demoAssigned" || stage === "demoCompleted") {
				const id = latestDemo?.mentorId ?? null;
				if (id) return <span className="text-xs text-gray-700">{nameMap?.get(id) ?? "—"}</span>;
			}
			return <span className="text-xs text-gray-400">—</span>;
		},
	},
	{
		id: "followUp",
		header: "Follow-up",
		cell: (info) => {
			const lead = info.row.original;
			const urgency = getLeadUrgency(lead);
			const dotCls = urgency.tone === "past"
				? "bg-red-500"
				: urgency.tone === "today"
					? "bg-amber-400"
					: urgency.tone === "upcoming"
						? "bg-emerald-500"
						: "bg-gray-300";
			const labelCls = urgency.tone === "past"
				? "bg-red-50 text-red-700"
				: urgency.tone === "today"
					? "bg-amber-50 text-amber-700"
					: "hidden";
			return (
				<div className="flex flex-col gap-0.5">
					<div className="flex items-center gap-1.5">
						<span className={`h-2 w-2 rounded-full shrink-0 ${dotCls}`} />
						<DateCell date={String(lead.nextFollowUpAt)} />
					</div>
					{urgency.tone !== "upcoming" && urgency.tone !== "neutral" ? (
						<span className={`ml-3.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold w-fit ${labelCls}`}>
							{urgency.label}
						</span>
					) : null}
				</div>
			);
		},
	},
	{
		id: "viewAction",
		header: "",
		cell: (info) => {
			const lead = info.row.original;
			const defaultActions: LeadTableAction[] = [
				{
					key: "postpone",
					label: "Postpone",
					to: (item) => `/leads/${item.id}?action=postpone`,
					className: "inline-flex items-center rounded-2xl border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-50",
				},
			];
			const actions = options?.getActions ? options.getActions(lead) : defaultActions;
			return (
				<div className="flex flex-wrap items-center gap-1.5">
					{actions.map((action) => {
						if (action.to) {
							return (
								<Link
									key={action.key}
									className={action.className ?? "inline-flex items-center rounded-2xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"}
									to={action.to(lead)}
								>
									{action.label}
								</Link>
							);
						}
						return (
							<button
								key={action.key}
								type="button"
								className={action.className ?? "inline-flex items-center rounded-2xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"}
								onClick={() => action.onClick?.(lead)}
							>
								{action.label}
							</button>
						);
					})}
				</div>
			);
		},
		enableSorting: false,
	},
];
