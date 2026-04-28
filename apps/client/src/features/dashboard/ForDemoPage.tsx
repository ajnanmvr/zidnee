import { useMemo, useState } from "react";
import { HiCheckCircle } from "react-icons/hi2";
import toast from "react-hot-toast";
import { ApiError } from "@/api/request";
import { Panel } from "@/components/dashboard-ui";
import { usePendingDemoRequestsQuery } from "@/features/leads/leads.queries";
import { useAssignDemoMentorMutation } from "@/features/leads/use-lead-mutations";
import { useUsersQuery } from "@/features/users/users.queries";
import { useSession } from "@/lib/session";

const isMentorRole = (roleName: string) => roleName.toLowerCase() === "mentor";
const formatUserName = (userName?: string | null) => userName?.trim() || "-";

const toInputDateTimeLocal = (value: string | null): string => {
	if (!value) {
		return "";
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "";
	}

	const timezoneOffset = date.getTimezoneOffset() * 60000;
	const localDate = new Date(date.getTime() - timezoneOffset);
	return localDate.toISOString().slice(0, 16);
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

	const rows = requestsQuery.data?.leads ?? [];

	return (
		<div className="grid gap-6">
			<Panel
				title="For Demo"
				description="Leads requesting demo and waiting for assignment"
			>
				{mentors.length === 0 ? (
					<div className="mb-4 rounded-2xl border border-warm/20 bg-warm-soft px-4 py-3 text-sm text-ink-soft">
						No mentors are available yet.
					</div>
				) : null}
				{rows.length === 0 ? (
					<div className="py-8 text-center text-sm text-ink-soft">
						No demo requests waiting for assignment.
					</div>
				) : (
					<div className="overflow-x-auto rounded-3xl border border-border">
						<table className="min-w-full border-collapse bg-surface text-left text-sm">
							<thead className="bg-surface-muted text-xs uppercase tracking-[0.14em] text-ink-soft">
								<tr>
									<th className="px-4 py-3 font-semibold">Lead</th>
									<th className="px-4 py-3 font-semibold">Phone</th>
									<th className="px-4 py-3 font-semibold">Requested</th>
									<th className="px-4 py-3 font-semibold">Mentor</th>
									<th className="px-4 py-3 font-semibold">Demo Time</th>
									<th className="px-4 py-3 font-semibold">Action</th>
								</tr>
							</thead>
							<tbody>
								{rows.map((lead) => (
									<tr key={lead.id} className="border-t border-border align-top">
										<td className="px-4 py-3 font-semibold text-ink">
											{lead.name ?? "Unnamed lead"}
										</td>
										<td className="px-4 py-3 text-ink-soft">{lead.phone}</td>
										<td className="px-4 py-3 text-ink-soft">
											{lead.demoRequestedAt
												? new Date(lead.demoRequestedAt).toLocaleString()
												: "-"}
										</td>
										<td className="px-4 py-3">
											<select
												className="w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-ink"
												value={selectedMentorByLeadId[lead.id] ?? ""}
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
														{formatUserName(mentor.name ?? mentor.username)}
													</option>
												))}
											</select>
										</td>
										<td className="px-4 py-3">
											<input
												type="datetime-local"
												className="w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-ink"
												value={scheduledTimeByLeadId[lead.id] ?? toInputDateTimeLocal(null)}
												onChange={(event) =>
													setScheduledTimeByLeadId((current) => ({
														...current,
														[lead.id]: event.target.value,
													}))
												}
											/>
										</td>
										<td className="px-4 py-3">
											<button
												type="button"
												className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-surface disabled:cursor-not-allowed disabled:opacity-70"
												disabled={assignDemoMentorMutation.isPending}
												onClick={() => void handleAssign(lead.id)}
											>
												<HiCheckCircle className="h-4 w-4" aria-hidden="true" />
												Assign demo
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</Panel>

		</div>
	);
};
