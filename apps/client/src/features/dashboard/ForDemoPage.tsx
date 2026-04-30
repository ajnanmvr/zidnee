import type { LeadResponse } from "@repo/schema";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { HiCheckCircle } from "react-icons/hi2";
import toast from "react-hot-toast";
import { ApiError } from "@/api/request";
import { DataTable } from "@/components/DataTable";
import { Panel } from "@/components/dashboard-ui";
import { getLatestLeadDemo } from "@/features/dashboard/lead-demo-utils";
import { usePendingDemoRequestsQuery } from "@/features/leads/leads.queries";
import { useAssignDemoMentorMutation } from "@/features/leads/use-lead-mutations";
import { useUsersQuery } from "@/features/users/users.queries";
import { useSession } from "@/lib/session";

const isMentorRole = (roleName: string) => roleName.toLowerCase() === "mentor";
const formatUserName = (userName?: string | null) => userName?.trim() || "-";

const isPastDate = (dateString: string | undefined): boolean => {
	if (!dateString) return false;
	const selectedDate = new Date(dateString);
	if (Number.isNaN(selectedDate.getTime())) return false;
	return selectedDate < new Date();
};

export const ForDemoPage = () => {
	const { token } = useSession();
	const requestsQuery = usePendingDemoRequestsQuery(token);
	const usersQuery = useUsersQuery(token);
	const assignDemoMentorMutation = useAssignDemoMentorMutation();
	const [selectedMentorByLeadId, setSelectedMentorByLeadId] = useState<Record<string, string>>({});
	const [scheduledTimeByLeadId, setScheduledTimeByLeadId] = useState<Record<string, string>>({});
	const allUsers = usersQuery.data?.users ?? [];

	const mentors = useMemo(
		() => allUsers.filter((user) => user.roles.some((role) => isMentorRole(role.name))),
		[allUsers],
	);

	const handleAssign = async (leadId: string) => {
		const mentorId = selectedMentorByLeadId[leadId];
		const demoScheduledFor = scheduledTimeByLeadId[leadId];

		if (!mentorId) {
			toast.error("Select a mentor first.");
			return;
		}

		if (!demoScheduledFor) {
			toast.error("Select the demo date and time.");
			return;
		}

		try {
			await assignDemoMentorMutation.mutateAsync({
				leadId,
				payload: {
					mentorId,
					demoScheduledFor: new Date(demoScheduledFor),
				},
			});
			toast.success("Demo assigned successfully.");
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Unable to assign demo");
				return;
			}

			toast.error(error instanceof Error ? error.message : "Unable to assign demo");
		}
	};

	const columns: ColumnDef<LeadResponse>[] = useMemo(
		() => [
			{
				id: "demoCount",
				header: "Demo #",
				cell: (info) => {
					const demoCount = info.row.original.demos?.length ?? 0;
					return (
						<span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
							Demo {Math.max(demoCount, 1)}
						</span>
					);
				},
			},
			{
				accessorKey: "phone",
				header: "Phone",
			},
			{
				accessorKey: "demoRequestedAt",
				header: "Requested",
				cell: (info) => {
					const latestDemo = getLatestLeadDemo(info.row.original);
					return latestDemo?.requestedAt ? new Date(latestDemo.requestedAt).toLocaleString() : "-";
				},
			},
			{
				id: "mentor",
				header: "Mentor",
				cell: (info) => {
					const lead = info.row.original;
					const previousMentorId = getLatestLeadDemo(lead)?.mentorId;
					return (
						<select
							className="w-full rounded-2xl border border-emerald-300 bg-white px-3 py-2 text-sm text-gray-900"
							value={selectedMentorByLeadId[lead.id] ?? previousMentorId ?? ""}
							onChange={(event) =>
								setSelectedMentorByLeadId((current) => ({
									...current,
									[lead.id]: event.target.value,
								}))
							}
						>
							<option value="">Select mentor</option>
							{mentors.map((mentor) => (
								<option key={mentor.id} value={mentor.id}>
									{formatUserName(mentor.name ?? mentor.username)}{mentor.id === previousMentorId ? " (Previous)" : ""}
								</option>
							))}
						</select>
					);
				},
			},
			{
				id: "demoTime",
				header: "Demo Time",
				cell: (info) => {
					const lead = info.row.original;
const selectedMentorId = selectedMentorByLeadId[lead.id];
const latestDemo = getLatestLeadDemo(lead);
const previousMentorId = latestDemo?.mentorId;
const isPreviousMentor = selectedMentorId === previousMentorId && previousMentorId;
const selectedTime = scheduledTimeByLeadId[lead.id];
					const isPast = isPastDate(selectedTime);
					return (
						<div className="grid gap-2">
							<input
								type="datetime-local"
								className={`w-full rounded-2xl border px-3 py-2 text-sm ${
									isPast ? "border-amber-300 bg-amber-50 text-ink" : "border-border bg-surface text-ink"
								}`}
								value={scheduledTimeByLeadId[lead.id] ?? getLatestLeadDemo(lead)?.demoScheduledFor ?? ""}
								onChange={(event) =>
									setScheduledTimeByLeadId((current) => ({
										...current,
										[lead.id]: event.target.value,
									}))
								}
							/>
							{isPast && isPreviousMentor && (
								<p className="text-xs text-amber-700 font-semibold">⚠️ Re-assigning previous mentor to a past date/time</p>
							)}
							{isPast && !isPreviousMentor && (
								<p className="text-xs text-amber-700 font-semibold">⚠️ This is a past date/time</p>
							)}
						</div>
					);
				},
			},
			{
				id: "actions",
				header: "Actions",
				enableSorting: false,
				cell: (info) => (
					<button
						type="button"
						className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-surface disabled:cursor-not-allowed disabled:opacity-70"
						disabled={assignDemoMentorMutation.isPending}
						onClick={() => void handleAssign(info.row.original.id)}
					>
						<HiCheckCircle className="h-4 w-4" aria-hidden="true" />
						Assign demo
					</button>
				),
			},
		],
		[assignDemoMentorMutation.isPending, mentors, scheduledTimeByLeadId, selectedMentorByLeadId],
	);

	return (
		<div className="grid gap-6">
			<Panel
				title="For Demo"
				description="Leads requesting demo and waiting for assignment"
			>
				{requestsQuery.isLoading ? (
					<div className="py-8 text-center text-sm text-ink-soft">Loading...</div>
				) : requestsQuery.isError ? (
					<div className="py-8 text-center text-sm text-ink-soft">Unable to load demo requests.</div>
				) : (
					<DataTable
						columns={columns}
						data={requestsQuery.data?.leads ?? []}
						exportFilename="for-demo"
						searchPlaceholder="Search demo requests..."
					/>
				)}
			</Panel>
		</div>
	);
};




