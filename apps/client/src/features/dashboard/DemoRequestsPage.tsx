import type { LeadResponse } from "@repo/schema";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { HiCheckCircle, HiPencilSquare, HiXMark, HiExclamationTriangle } from "react-icons/hi2";
import toast from "react-hot-toast";
import { ApiError } from "@/api/request";
import { DataTable } from "@/components/DataTable";
import { Modal, Panel, TextAreaField } from "@/components/dashboard-ui";
import { getLatestLeadDemo } from "@/features/dashboard/lead-demo-utils";
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
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	const timezoneOffset = date.getTimezoneOffset() * 60000;
	const localDate = new Date(date.getTime() - timezoneOffset);
	return localDate.toISOString().slice(0, 16);
};

const isPastDate = (dateString: string | undefined): boolean => {
	if (!dateString) return false;
	const selectedDate = new Date(dateString);
	if (Number.isNaN(selectedDate.getTime())) return false;
	return selectedDate < new Date();
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
	const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
	const [completeLeadId, setCompleteLeadId] = useState<string | null>(null);
	const allUsers = usersQuery.data?.users ?? [];

	const { control, handleSubmit, reset } = useForm<CompleteDemoForm>({
		defaultValues: { note: "" },
	});

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
			toast.success("Demo schedule updated successfully.");
			setEditingLeadId(null);
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Unable to update demo");
				return;
			}
			toast.error(error instanceof Error ? error.message : "Unable to update demo");
		}
	};

	const handleCompleteDemo = async (form: CompleteDemoForm) => {
		if (!completeLeadId) return;

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
			toast.error(error instanceof Error ? error.message : "Unable to mark demo completed");
		}
	};

	const rows = requestsQuery.data?.leads ?? [];
	const completingLead = rows.find((lead) => lead.id === completeLeadId);

	const columns: ColumnDef<LeadResponse>[] = useMemo(
		() => [
			{
				accessorKey: "name",
				header: "Lead",
				cell: (info) => (
					<div className="font-semibold text-gray-900">
						{(info.getValue() as string) ?? "Unnamed lead"}
					</div>
				),
			},
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
				id: "assignedMentor",
				header: "Assigned Mentor",
				cell: (info) => {
					const lead = info.row.original;
					const latestDemo = getLatestLeadDemo(lead);
					if (!latestDemo?.mentorId || !latestDemo?.assignedAt) {
						return <span className="text-gray-400">-</span>;
					}
					const assignedMentor = allUsers.find((user) => user.id === latestDemo.mentorId);
					return <span className="font-semibold text-gray-900">{formatUserName(assignedMentor?.name ?? assignedMentor?.username)}</span>;
				},
			},
			{
				accessorKey: "followUpCount",
				header: "Follow-ups",
				cell: (info) => {
					const lead = info.row.original;
					const latestDemo = getLatestLeadDemo(lead);
					const previousMentorId = latestDemo?.mentorId;
					if (editingLeadId === lead.id) {
						return (
							<select
								className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
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
					}
					return <span className="font-semibold text-gray-900">{lead.followUpCount}</span>;
				},
			},
			{
				accessorKey: "demoScheduledFor",
				header: "Demo Time",
				cell: (info) => {
					const lead = info.row.original;
					const latestDemo = getLatestLeadDemo(lead);
					if (editingLeadId === lead.id) {
						const selectedTime = scheduledTimeByLeadId[lead.id];
						const isPast = isPastDate(selectedTime);
						return (
							<div className="grid gap-2">
								<input
									type="datetime-local"
									className={`w-full rounded-2xl border px-3 py-2 text-sm ${
										isPast ? "border-amber-300 bg-amber-50 text-gray-900" : "border-gray-300 bg-white text-gray-900"
									}`}
									value={scheduledTimeByLeadId[lead.id] ?? toInputDateTimeLocal(latestDemo?.demoScheduledFor ?? null)}
									onChange={(event) =>
										setScheduledTimeByLeadId((current) => ({
											...current,
											[lead.id]: event.target.value,
										}))
									}
								/>
								{isPast && (
									<p className="text-xs text-amber-700 font-semibold">âš ï¸ This is a past date/time</p>
								)}
							</div>
						);
					}
					return (
						<div className="grid gap-1">
							<span>{latestDemo?.demoScheduledFor ? new Date(latestDemo.demoScheduledFor).toLocaleString() : "-"}</span>
							<span className="text-xs text-gray-600">
								Assigned: {latestDemo?.assignedAt ? new Date(latestDemo.assignedAt).toLocaleString() : "-"}
							</span>
						</div>
					);
				},
			},
			{
				id: "actions",
				header: "Actions",
				enableSorting: false,
				cell: (info) => {
					const lead = info.row.original;
					const editing = editingLeadId === lead.id;

					return (
						<div className="flex flex-wrap gap-2">
							{editing ? (
								<>
									<button
										type="button"
										className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
										disabled={assignDemoMentorMutation.isPending}
										onClick={() => void handleAssign(lead.id)}
									>
										<HiCheckCircle className="h-4 w-4" aria-hidden="true" />
										Save
									</button>
									<button
										type="button"
										className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
										onClick={() => setEditingLeadId(null)}
									>
										<HiXMark className="h-4 w-4" aria-hidden="true" />
										Cancel
									</button>
								</>
							) : (
								<>
									<button
										type="button"
										className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
										onClick={() => {
											setEditingLeadId(lead.id);
											const latestDemo = getLatestLeadDemo(lead);
											setSelectedMentorByLeadId((current) => ({
												...current,
												[lead.id]: current[lead.id] ?? latestDemo?.mentorId ?? "",
											}));
											setScheduledTimeByLeadId((current) => ({
												...current,
											[lead.id]: current[lead.id] ?? toInputDateTimeLocal(latestDemo?.demoScheduledFor ?? null),
											}));
										}}
									>
										<HiPencilSquare className="h-4 w-4" aria-hidden="true" />
										Edit
									</button>
									<button
										type="button"
										className="inline-flex items-center gap-2 rounded-2xl bg-green-600 px-4 py-2 text-sm font-semibold text-white"
										disabled={markDemoCompletedMutation.isPending}
										onClick={() => {
											setCompleteLeadId(lead.id);
											reset({ note: "" });
										}}
									>
										<HiCheckCircle className="h-4 w-4" aria-hidden="true" />
										Mark completed
									</button>
								</>
							)}
						</div>
					);
				},
			},
		],
		[
			assignDemoMentorMutation.isPending,
			editingLeadId,
			mentors,
			markDemoCompletedMutation.isPending,
			reset,
			scheduledTimeByLeadId,
			selectedMentorByLeadId,
		],
	);

	return (
		<div className="grid gap-6">
			<Panel
				title="Assigned Demos"
				description="Leads already assigned with scheduled demo time"
			>
				{requestsQuery.isLoading ? (
					<div className="py-8 text-center text-sm text-gray-600">Loading...</div>
				) : requestsQuery.isError ? (
					<div className="py-8 text-center text-sm text-gray-600">Unable to load assigned demos.</div>
				) : (
					<DataTable
						columns={columns}
						data={rows}
						exportFilename="assigned-demos"
						searchPlaceholder="Search assigned demos..."
					/>
				)}
			</Panel>

			<Modal
				open={Boolean(completeLeadId)}
				title="Mark demo completed"
				description={
					completingLead
						? `${completingLead.name ?? "Lead"} â€¢ ${completingLead.phone}`
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
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
							onClick={() => {
								setCompleteLeadId(null);
								reset({ note: "" });
							}}
						>
							Cancel
						</button>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl bg-green-600 px-4 py-2 text-sm font-semibold text-white"
							onClick={() => void handleSubmit(handleCompleteDemo)()}
							disabled={markDemoCompletedMutation.isPending}
						>
							<HiCheckCircle className="h-4 w-4" aria-hidden="true" />
							{markDemoCompletedMutation.isPending ? "Saving..." : "Complete demo"}
						</button>
					</>
				}
			>
				<div className="grid gap-4">
					<div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
						<HiExclamationTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
						<p className="text-sm text-amber-800">
							<strong>Warning:</strong> Marking this demo as completed cannot be undone. This will finalize the demo status.
						</p>
					</div>
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
				</div>
			</Modal>
		</div>
	);
};




