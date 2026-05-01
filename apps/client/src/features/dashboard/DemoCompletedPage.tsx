import type { LeadResponse } from "@repo/schema";
import { RedemoLeadPayloadSchema } from "@repo/schema";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { HiArrowPath, HiArrowRight, HiCheckCircle } from "react-icons/hi2";
import toast from "react-hot-toast";
import { ApiError } from "@/api/request";
import { DataTable } from "@/components/DataTable";
import { Modal, Panel, TextAreaField } from "@/components/dashboard-ui";
import { getLatestLeadDemo } from "@/features/dashboard/lead-demo-utils";
import { useDueLeadFollowUpsQuery } from "@/features/leads/leads.queries";
import { useRequestRedemoMutation } from "@/features/leads/use-lead-mutations";
import { useUsersQuery } from "@/features/users/users.queries";
import type { RedemoLeadForm } from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

const isMentorRole = (roleName: string) => roleName.toLowerCase() === "mentor";
const formatUserName = (userName?: string | null) => userName?.trim() || "-";

const isDemoCompletedLead = (lead: LeadResponse) => {
	const latestDemo = getLatestLeadDemo(lead);
	return Boolean(latestDemo?.completedAt) && !Boolean(latestDemo?.admissionCompletedAt) && !Boolean(latestDemo?.studentId);
};

export const DemoCompletedPage = () => {
	const { token } = useSession();
	const leadsQuery = useDueLeadFollowUpsQuery(token, {
		scope: "all",
		timeFilter: "all",
	});
	const usersQuery = useUsersQuery(token);
	const requestRedemoMutation = useRequestRedemoMutation();
	const [redemoLeadId, setRedemoLeadId] = useState<string | null>(null);

	const {
		control,
		handleSubmit,
		reset,
		setError,
	} = useForm<RedemoLeadForm>({
		defaultValues: {
			mentorId: "",
			note: "",
		},
	});

	const allUsers = usersQuery.data?.users ?? [];
	const mentors = useMemo(
		() => allUsers.filter((user) => user.roles.some((role) => isMentorRole(role.name))),
		[allUsers],
	);
	const rows = useMemo(
		() => (leadsQuery.data?.leads ?? []).filter(isDemoCompletedLead),
		[leadsQuery.data?.leads],
	);
	const redemoLead = rows.find((lead) => lead.id === redemoLeadId) ?? null;
	const redemoLeadLatestDemo = redemoLead ? getLatestLeadDemo(redemoLead) : null;
	const redemoMentors = mentors.filter((mentor) => mentor.id !== redemoLeadLatestDemo?.mentorId);

	const onRedemoLead = async (payload: RedemoLeadForm) => {
		if (!redemoLeadId) {
			return;
		}

		const validation = RedemoLeadPayloadSchema.safeParse(payload);
		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			if (errors.mentorId?.[0]) {
				setError("mentorId", { type: "manual", message: errors.mentorId[0] });
			}
			if (errors.note?.[0]) {
				setError("note", { type: "manual", message: errors.note[0] });
			}
			return;
		}

		try {
			await requestRedemoMutation.mutateAsync({
				leadId: redemoLeadId,
				payload: validation.data,
			});
			toast.success("Lead moved for redemo.");
			setRedemoLeadId(null);
			reset({ mentorId: "", note: "" });
		} catch (error) {
			if (error instanceof ApiError) {
				const mentorError = error.payload.errors?.mentorId?.[0];
				if (mentorError) {
					setError("mentorId", { type: "server", message: mentorError });
				}
				toast.error(error.payload.message ?? "Unable to request redemo");
				return;
			}

			toast.error(error instanceof Error ? error.message : "Unable to request redemo");
		}
	};

	const columns: ColumnDef<LeadResponse>[] = useMemo(
		() => [
			{
				accessorKey: "name",
				header: "Lead",
				cell: (info) => <div className="font-semibold text-gray-900">{(info.getValue() as string) ?? "Unnamed lead"}</div>,
			},
			{
				accessorKey: "phone",
				header: "Phone",
			},
			{
				id: "mentor",
				header: "Last mentor",
				cell: (info) => {
					const latestDemo = getLatestLeadDemo(info.row.original);
					return latestDemo?.mentorId ? formatUserName(allUsers.find((user) => user.id === latestDemo.mentorId)?.name ?? allUsers.find((user) => user.id === latestDemo.mentorId)?.username) : "-";
				},
			},
			{
				id: "completedAt",
				header: "Completed",
				cell: (info) => {
					const latestDemo = getLatestLeadDemo(info.row.original);
					return latestDemo?.completedAt ? new Date(latestDemo.completedAt).toLocaleString() : "-";
				},
			},
			{
				id: "actions",
				header: "Actions",
				enableSorting: false,
				cell: (info) => (
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
							onClick={() => {
								setRedemoLeadId(info.row.original.id);
								reset({ mentorId: getLatestLeadDemo(info.row.original)?.mentorId ?? "", note: "" });
							}}
						>
							<HiArrowPath className="h-4 w-4" aria-hidden="true" />
							Request redemo
						</button>
						<Link
							to="/admissions"
							className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:border-blue-600 hover:text-blue-600"
						>
							<HiArrowRight className="h-4 w-4" aria-hidden="true" />
							To admission
						</Link>
					</div>
				),
			},
		],
		[allUsers, reset],
	);

	return (
		<div className="grid gap-6">
			<Panel
				title="Demo Completed"
				description="Completed demos that can be redone or moved to admission"
				action={
					<Link
						to="/admissions"
						className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:border-blue-600 hover:text-blue-600"
					>
						<HiCheckCircle className="h-4 w-4" aria-hidden="true" />
						Admission page
					</Link>
				}
			>
				{leadsQuery.isLoading ? (
					<div className="py-8 text-center text-sm text-gray-600">Loading...</div>
				) : leadsQuery.isError ? (
					<div className="py-8 text-center text-sm text-gray-600">Unable to load demo completed leads.</div>
				) : (
					<DataTable
						columns={columns}
						data={rows}
						exportFilename="demo-completed"
						searchPlaceholder="Search demo completed leads..."
					/>
				)}
			</Panel>

			<Modal
				open={Boolean(redemoLeadId)}
				title="Request redemo"
				description={redemoLead ? `Previous mentor: ${redemoLeadLatestDemo?.mentorId ? formatUserName(allUsers.find((user) => user.id === redemoLeadLatestDemo.mentorId)?.name ?? allUsers.find((user) => user.id === redemoLeadLatestDemo.mentorId)?.username) : "-"}` : "Select a different mentor"}
				onClose={() => {
					setRedemoLeadId(null);
					reset({ mentorId: "", note: "" });
				}}
				footer={
					<>
						<button
							type="button"
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
							onClick={() => {
								setRedemoLeadId(null);
								reset({ mentorId: "", note: "" });
							}}
						>
							Cancel
						</button>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
							onClick={() => void handleSubmit(onRedemoLead)()}
							disabled={requestRedemoMutation.isPending}
						>
							<HiArrowPath className="h-4 w-4" aria-hidden="true" />
							{requestRedemoMutation.isPending ? "Saving..." : "Request redemo"}
						</button>
					</>
				}
			>
				<form className="grid gap-4" onSubmit={handleSubmit(onRedemoLead)}>
					<Controller
						name="mentorId"
						control={control}
						render={({ field, fieldState }) => (
							<label className="grid gap-2 text-sm font-medium text-gray-600">
								<span>Mentor</span>
								<select
									className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
									value={field.value ?? ""}
									onChange={(event) => field.onChange(event.target.value)}
								>
									<option value="">Select another mentor</option>
									{redemoMentors.map((mentor) => (
										<option key={mentor.id} value={mentor.id}>
											{formatUserName(mentor.name ?? mentor.username)}
										</option>
									))}
								</select>
								{fieldState.error?.message ? (
									<span className="text-xs text-red-600">{fieldState.error.message}</span>
								) : null}
							</label>
						)}
					/>
					<Controller
						name="note"
						control={control}
						render={({ field, fieldState }) => (
							<TextAreaField
								label="Redemo note"
								value={field.value ?? ""}
								onChange={field.onChange}
								placeholder="Why is another demo needed?"
								error={fieldState.error?.message}
							/>
						)}
					/>
				</form>
			</Modal>
		</div>
	);
};
