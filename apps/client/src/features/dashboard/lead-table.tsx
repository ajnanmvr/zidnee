import type { LeadResponse } from "@repo/schema";
import type { ColumnDef } from "@tanstack/react-table";
import {
	HiAcademicCap,
	HiArrowPath,
	HiCalendarDays,
	HiClock,
	HiEye,
	HiTrash,
} from "react-icons/hi2";
import { ActionButton } from "@/components/ActionButton";
import { DateCell } from "@/components/DateCell";

export const formatUserName = (userName?: string | null) => userName?.trim() || "-";

const getLeadFollowUpDate = (lead: LeadResponse) =>
	lead.customNextFollowUpAt ?? lead.nextFollowUpAt;

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

type BuildLeadColumnsArgs = {
	userNameById: Map<string, string>;
	onView: (leadId: string) => void;
	onRequestDemo: (leadId: string) => void | Promise<void>;
	onPostpone: (leadId: string) => void;
	onDelete: (leadId: string) => void;
	onRedemo: (leadId: string) => void;
	onAdmission: (leadId: string) => void;
	requestDemoPending: boolean;
	deletePending: boolean;
};

export const buildLeadColumns = ({
	userNameById,
	onView,
	onRequestDemo,
	onPostpone,
	onDelete,
	onRedemo,
	onAdmission,
	requestDemoPending,
	deletePending,
}: BuildLeadColumnsArgs): ColumnDef<LeadResponse>[] => [
	{
		id: "urgency",
		header: "Lead",
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
		cell: (info) => <span>{(info.getValue() as string) ?? "-"}</span>,
		enableSorting: true,
	},
	{
		id: "demoStatus",
		header: "Demo Status",
		cell: (info) => {
			const lead = info.row.original;
			if (lead.demoCompletedAt) {
				return (
					<span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
						Demo completed
					</span>
				);
			}

			if (lead.demoRequestedAt) {
				return (
					<span className="rounded-full bg-sky/10 px-3 py-1 text-xs font-semibold text-sky">
						Demo requested
					</span>
				);
			}

			return (
				<span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-ink-soft">
					Lead follow-up
				</span>
			);
		},
	},
	{
		accessorKey: "customNextFollowUpAt",
		header: "Follow-up",
		cell: (info) => {
			const customDate = info.getValue() as string | undefined;
			const row = info.row.original;
			const date = customDate ?? row.nextFollowUpAt;
			return <DateCell date={date} />;
		},
		enableSorting: true,
	},
	{
		id: "lastMentor",
		header: "Last Mentor",
		cell: (info) => {
			const lead = info.row.original;
			return <span>{lead.demoMentorId ? userNameById.get(lead.demoMentorId) ?? "-" : "-"}</span>;
		},
	},
	{
		id: "actions",
		header: "Actions",
		cell: (info) => {
			const lead = info.row.original;
			const showPostDemoActions = Boolean(lead.demoCompletedAt);

			return (
				<div className="flex flex-wrap items-center gap-2">
					<ActionButton
						icon={<HiEye className="h-4 w-4" />}
						label="View Activity"
						onClick={() => onView(lead.id)}
						color="green"
					/>
					{showPostDemoActions ? (
						<>
							<ActionButton
								icon={<HiArrowPath className="h-4 w-4" />}
								label="Redemo"
								onClick={() => onRedemo(lead.id)}
								color="orange"
							/>
							<ActionButton
								icon={<HiAcademicCap className="h-4 w-4" />}
								label="Admission"
								onClick={() => onAdmission(lead.id)}
								color="sky"
							/>
						</>
					) : (
						<ActionButton
							icon={<HiCalendarDays className="h-4 w-4" />}
							label="Request Demo"
							onClick={() => void onRequestDemo(lead.id)}
							color="sky"
							isLoading={requestDemoPending}
							loadingLabel="Requesting..."
						/>
					)}
					<ActionButton
						icon={<HiClock className="h-4 w-4" />}
						label="Postpone"
						onClick={() => onPostpone(lead.id)}
						color="orange"
					/>
					<ActionButton
						icon={<HiTrash className="h-4 w-4" />}
						label="Delete"
						onClick={() => onDelete(lead.id)}
						color="red"
						isLoading={deletePending}
						loadingLabel="Deleting..."
					/>
				</div>
			);
		},
		enableSorting: false,
	},
];
