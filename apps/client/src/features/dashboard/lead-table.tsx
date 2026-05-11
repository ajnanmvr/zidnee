import type { LeadResponse } from "@repo/schema";
import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { DateCell } from "@/components/DateCell";
import { getLatestLeadDemo } from "@/features/dashboard/lead-demo-utils";
import type { LeadStageId } from "@/features/leads/lead-stage-filters";

export const formatUserName = (userName?: string | null) =>
	userName?.trim() || "-";

const getLeadFollowUpDate = (lead: LeadResponse) => lead.nextFollowUpAt;

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
	if (lead.status === "DEMO_COMPLETED") {
		return { className: "bg-blue-100 text-blue-600", label: "Demo Completed" };
	}

	if (lead.status === "DEMO_ASSIGNED") {
		return {
			className: "bg-violet-500/10 text-violet-700",
			label: "Demo Scheduled",
		};
	}

	if (lead.status === "DEMO_REQUEST") {
		return {
			className: "bg-amber-500/10 text-amber-700",
			label: "Demo Request",
		};
	}

	if (lead.status === "FORM_FILLED") {
		return {
			className: "bg-emerald-500/10 text-emerald-700",
			label: "Form Filled",
		};
	}

	if (lead.status === "FORM_SENT") {
		return { className: "bg-sky-600/10 text-sky-700", label: "Form Sent" };
	}

	return { className: "bg-gray-50 text-gray-600", label: "Follow Up" };
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
			<span
				className={`h-2.5 w-2.5 rounded-full ${toneClasses.split(" ")[0]}`}
			/>
			<span className={`text-xs font-semibold ${toneClasses.split(" ")[1]}`}>
				{urgency.label}
			</span>
		</div>
	);
};

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
		id: "urgency",
		header: "Status",
		cell: (info) => <UrgencyIndicator lead={info.row.original} />,
		enableSorting: false,
	},
	{
		accessorKey: "phone",
		header: "Phone",
		cell: (info) => (
			<div className="font-semibold text-gray-900">
				{String(info.getValue())}
			</div>
		),
		enableSorting: true,
	},
	{
		accessorKey: "name",
		header: "Name",
		cell: (info) => (
			<Link
				className="font-semibold text-blue-600 hover:text-blue-600/80"
				to={`/leads/${info.row.original.id}`}
			>
				{(info.getValue() as string) ?? "-"}
			</Link>
		),
		enableSorting: true,
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
				const controllerId = lead.demoRequestAssignedTo ?? null;
				if (!controllerId)
					return <span className="text-sm text-slate-500">-</span>;
				return (
					<span className="text-sm">{nameMap?.get(controllerId) ?? "-"}</span>
				);
			}
			if (stage === "demoAssigned" || stage === "demoCompleted") {
				const mentorId = latestDemo?.mentorId ?? null;
				if (!mentorId) return <span className="text-sm text-slate-500">-</span>;
				return <span className="text-sm">{nameMap?.get(mentorId) ?? "-"}</span>;
			}
			return <span className="text-sm text-slate-500">-</span>;
		},
	},
	{
		id: "demoStatus",
		header: "Status",
		cell: (info) => {
			const lead = info.row.original;
			const status = getLeadStatusTone(lead);
			return (
				<span
					className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
				>
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
			const lead = info.row.original;
			const defaultActions: LeadTableAction[] = [
				{
					key: "view",
					label: "View",
					to: (item) => `/leads/${item.id}`,
					className:
						"inline-flex items-center rounded-2xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100",
				},
				{
					key: "postpone",
					label: "Postpone",
					to: (item) => `/leads/${item.id}?action=postpone`,
					className:
						"inline-flex items-center rounded-2xl border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-50",
				},
			];
			const actions = options?.getActions
				? options.getActions(lead)
				: defaultActions;

			return (
				<div className="flex flex-wrap items-center gap-2">
					{actions.map((action) => {
						if (action.to) {
							return (
								<Link
									key={action.key}
									className={
										action.className ??
										"inline-flex items-center rounded-2xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
									}
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
								className={
									action.className ??
									"inline-flex items-center rounded-2xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
								}
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
