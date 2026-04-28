import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { HiCheckCircle } from "react-icons/hi2";
import toast from "react-hot-toast";
import { ApiError } from "@/api/request";
import { Modal, Panel, TextAreaField } from "@/components/dashboard-ui";
import {
	useAssignDemoMentorMutation,
	useMarkDemoCompletedMutation,
} from "@/features/leads/use-lead-mutations";
import { useDemoRequestsQuery } from "@/features/leads/leads.queries";
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

type CompleteDemoForm = {
	note?: string;
};

export const DemoRequestsPage = () => {
	const { token } = useSession();
	const requestsQuery = useDemoRequestsQuery(token);
	const usersQuery = useUsersQuery(token);
	const assignDemoMentorMutation = useAssignDemoMentorMutation();
	const markDemoCompletedMutation = useMarkDemoCompletedMutation();
	const [selectedMentorByLeadId, setSelectedMentorByLeadId] = useState<Record<string, string>>({});
	const [scheduledTimeByLeadId, setScheduledTimeByLeadId] = useState<Record<string, string>>({});
	const [completeLeadId, setCompleteLeadId] = useState<string | null>(null);
	const allUsers = usersQuery.data?.users ?? [];

	const { control, handleSubmit, reset } = useForm<CompleteDemoForm>({
		defaultValues: { note: "" },
	});

	const mentors = useMemo(
		() => allUsers.filter((user) => user.roles.some((role) => isMentorRole(role.name))),
		[allUsers],
	);

	const userNameById = useMemo(
		() =>
			new Map(
				allUsers.map((user) => [user.id, formatUserName(user.name ?? user.username)]),
			),
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
			toast.success("Demo schedule updated successfully.");
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Unable to update demo");
				return;
			}

			toast.error(error instanceof Error ? error.message : "Unable to update demo");
		}
	};

	const handleCompleteDemo = async (form: CompleteDemoForm) => {
		if (!completeLeadId) {
			return;
		}

		try {
			await markDemoCompletedMutation.mutateAsync({
				leadId: completeLeadId,
				note: form.note,
			});
			toast.success("Demo marked as completed. The lead is back in the leads list.");
			setCompleteLeadId(null);
			reset({ note: "" });
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Unable to mark demo completed");
				return;
			}

			toast.error(
				error instanceof Error ? error.message : "Unable to mark demo completed",
			);
		}
	};

	const rows = requestsQuery.data?.leads ?? [];
	const completingLead = rows.find((lead) => lead.id === completeLeadId);

	return (
		<div className="grid gap-6">
			<Panel
				title="Assigned Demos"
				description="Leads already assigned with scheduled demo time"
			>
				{mentors.length === 0 ? (
					<div className="mb-4 rounded-2xl border border-warm/20 bg-warm-soft px-4 py-3 text-sm text-ink-soft">
						No mentors are available yet.
					</div>
				) : null}
				{rows.length === 0 ? (
					<div className="py-8 text-center text-sm text-ink-soft">
						No assigned demos yet.
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
									<th className="px-4 py-3 font-semibold">Actions</th>
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
												value={selectedMentorByLeadId[lead.id] ?? lead.demoMentorId ?? ""}
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
											<p className="mt-2 text-xs text-ink-soft">
												Current: {lead.demoMentorId ? userNameById.get(lead.demoMentorId) ?? "-" : "-"}
											</p>
										</td>
										<td className="px-4 py-3">
											<input
												type="datetime-local"
												className="w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-ink"
												value={
													scheduledTimeByLeadId[lead.id] ??
													toInputDateTimeLocal(lead.demoScheduledFor ?? null)
												}
												onChange={(event) =>
													setScheduledTimeByLeadId((current) => ({
														...current,
														[lead.id]: event.target.value,
													}))
												}
											/>
											<p className="mt-2 text-xs text-ink-soft">
												Assigned at: {lead.demoAssignedAt ? new Date(lead.demoAssignedAt).toLocaleString() : "-"}
											</p>
										</td>
										<td className="px-4 py-3">
											<div className="flex flex-wrap gap-2">
												<button
													type="button"
													className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-surface disabled:cursor-not-allowed disabled:opacity-70"
													disabled={assignDemoMentorMutation.isPending}
													onClick={() => void handleAssign(lead.id)}
												>
													<HiCheckCircle className="h-4 w-4" aria-hidden="true" />
													Update schedule
												</button>
												<button
													type="button"
													className="inline-flex items-center gap-2 rounded-2xl bg-green px-4 py-2 text-sm font-semibold text-surface disabled:cursor-not-allowed disabled:opacity-70"
													disabled={markDemoCompletedMutation.isPending}
													onClick={() => {
														setCompleteLeadId(lead.id);
														reset({ note: "" });
													}}
												>
													<HiCheckCircle className="h-4 w-4" aria-hidden="true" />
													Demo completed
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</Panel>

			<Modal
				open={Boolean(completeLeadId)}
				title="Mark demo completed"
				description={
					completingLead
						? `${completingLead.name ?? "Lead"} • ${completingLead.phone}`
						: "Confirm demo completion"
				}
				onClose={() => {
					setCompleteLeadId(null);
					reset({ note: "" });
				}}
				footer={
					<>
						<button
							type="button"
							className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-ink"
							onClick={() => {
								setCompleteLeadId(null);
								reset({ note: "" });
							}}
						>
							Cancel
						</button>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl bg-green px-4 py-2 text-sm font-semibold text-surface"
							onClick={() => void handleSubmit(handleCompleteDemo)()}
							disabled={markDemoCompletedMutation.isPending}
						>
							<HiCheckCircle className="h-4 w-4" aria-hidden="true" />
							{markDemoCompletedMutation.isPending ? "Saving..." : "Complete demo"}
						</button>
					</>
				}
			>
				<form className="grid gap-4" onSubmit={handleSubmit(handleCompleteDemo)}>
					<Controller
						name="note"
						control={control}
						render={({ field, fieldState }) => (
							<TextAreaField
								label="Completion note"
								value={field.value ?? ""}
								onChange={field.onChange}
								placeholder="Demo completed successfully"
								error={fieldState.error?.message}
							/>
						)}
					/>
				</form>
			</Modal>
		</div>
	);
};
