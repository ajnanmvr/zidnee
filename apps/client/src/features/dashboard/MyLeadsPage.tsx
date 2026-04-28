import type { Lead } from "@repo/schema";
import { useMemo, useState } from "react";
import { HiCalendarDays, HiClock, HiEye } from "react-icons/hi2";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { Panel } from "@/components/dashboard-ui";
import { ActionButton } from "@/components/ActionButton";
import { DateCell } from "@/components/DateCell";
import { DataTable } from "@/components/DataTable";
import { useDueLeadFollowUpsQuery } from "@/features/leads/leads.queries";
import { useSession } from "@/lib/session";

const isToday = (dateValue?: string | Date | null) => {
	if (!dateValue) {
		return false;
	}

	const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
	if (Number.isNaN(date.getTime())) {
		return false;
	}

	const now = new Date();
	return (
		date.getFullYear() === now.getFullYear() &&
		date.getMonth() === now.getMonth() &&
		date.getDate() === now.getDate()
	);
};

export const MyLeadsPage = () => {
	const { token } = useSession();
	const navigate = useNavigate();
	const [timeFilter, setTimeFilter] = useState<"today" | "all">("today");
	const leadsQuery = useDueLeadFollowUpsQuery(token, {
		scope: "mine",
		timeFilter,
	});

	const leads = leadsQuery.data?.leads ?? [];

	const todayCount = useMemo(
		() =>
			leads.filter((lead) =>
				isToday(lead.customNextFollowUpAt ?? lead.nextFollowUpAt),
			).length,
		[leads],
	);

	const columns: ColumnDef<Lead>[] = useMemo(
		() => [
			{
				id: "todayFlag",
				header: "Today",
				cell: (info) => {
					const lead = info.row.original;
					const today = isToday(lead.customNextFollowUpAt ?? lead.nextFollowUpAt);

					return today ? (
						<span className="rounded-full border border-warm/30 bg-warm-soft px-2 py-1 text-xs font-semibold text-ink">
							Today
						</span>
					) : (
						<span className="text-xs text-ink-soft">-</span>
					);
				},
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
				accessorKey: "followUpCount",
				header: "Follow-ups",
				cell: (info) => <span>{String(info.getValue())}</span>,
				enableSorting: true,
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
				id: "actions",
				header: "Actions",
				cell: (info) => {
					const lead = info.row.original;

					return (
						<div className="flex items-center gap-2">
							<ActionButton
								icon={<HiEye className="h-4 w-4" />}
								label="View Activity"
								onClick={() => navigate(`/leads/${lead.id}`)}
								color="green"
							/>
							<ActionButton
								icon={<HiClock className="h-4 w-4" />}
								label="Open Lead"
								onClick={() => navigate(`/leads/${lead.id}`)}
								color="orange"
							/>
						</div>
					);
				},
				enableSorting: false,
			},
		],
		[navigate],
	);

	return (
		<div className="grid gap-6">
			<Panel
				title="My Leads"
				description="Your leads"
				action={
					<div className="flex items-center gap-2">
						<button
							type="button"
							className={
								timeFilter === "today"
									? "rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-surface"
									: "rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-ink"
							}
							onClick={() => setTimeFilter("today")}
						>
							Today
						</button>
						<button
							type="button"
							className={
								timeFilter === "all"
									? "rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-surface"
									: "rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-ink"
							}
							onClick={() => setTimeFilter("all")}
						>
							All Time
						</button>
					</div>
				}
			>
				<div className="mb-4 rounded-3xl border border-warm/30 bg-warm-soft px-4 py-3">
					<div className="flex items-center gap-2 text-sm font-semibold text-ink">
						<HiCalendarDays className="h-4 w-4" aria-hidden="true" />
						Today Focus
					</div>
					<p className="mt-1 text-sm text-ink-soft">
						{todayCount} lead{todayCount === 1 ? "" : "s"} are scheduled for today.
					</p>
				</div>

				{leadsQuery.isLoading ? (
					<div className="py-8 text-center text-ink-soft">Loading...</div>
				) : leadsQuery.isError ? (
					<div className="py-8 text-center text-ink-soft">Unable to load leads.</div>
				) : (
					<DataTable
						columns={columns}
						data={leads as any}
						exportFilename="my-leads"
						searchPlaceholder="Search my leads..."
					/>
				)}
			</Panel>
		</div>
	);
};
