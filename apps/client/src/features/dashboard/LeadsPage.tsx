import { CreateLeadPayloadSchema } from "@repo/schema";
import toast from "react-hot-toast";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { HiPlusCircle } from "react-icons/hi2";
import { ApiError } from "@/api/request";
import { DataTable } from "@/components/DataTable";
import { Field, Modal, Panel } from "@/components/dashboard-ui";
import { useMeQuery } from "@/features/auth/auth.queries";
import { buildLeadColumns, formatUserName } from "@/features/dashboard/lead-table";
import { getLeadStagePredicate, leadStageDefinitions, type LeadStageId } from "@/features/leads/lead-stage-filters";
import { useDueLeadFollowUpsQuery } from "@/features/leads/leads.queries";
import { useCreateLeadMutation } from "@/features/leads/use-lead-mutations";
import { useUsersQuery } from "@/features/users/users.queries";
import type { CreateLeadForm } from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";
import { Link, useSearchParams } from "react-router-dom";

const toInputDateTimeLocal = (value: Date | string | null | undefined): string => {
	if (!value) {
		return "";
	}

	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "";
	}

	const timezoneOffset = date.getTimezoneOffset() * 60000;
	const localDate = new Date(date.getTime() - timezoneOffset);
	return localDate.toISOString().slice(0, 16);
};

export const LeadsPage = () => {
	const { token } = useSession();
	const meQuery = useMeQuery(token);
	const usersQuery = useUsersQuery(token);
	const [searchParams] = useSearchParams();
	const dueLeadsQuery = useDueLeadFollowUpsQuery(token, {
		scope: "all",
		timeFilter: "all",
	});
	const createLeadMutation = useCreateLeadMutation();
	const [createOpen, setCreateOpen] = useState(false);

	const {
		control: createControl,
		handleSubmit: handleCreateSubmit,
		reset: resetCreate,
	} = useForm<CreateLeadForm>({
		defaultValues: {
			phone: "",
			name: "",
			assignedTo: "",
			customNextFollowUpAt: undefined,
		},
	});

	const allUsers = usersQuery.data?.users ?? [];
	const currentUserId = meQuery.data?.id;
	const assigneeOptions = useMemo(() => allUsers, [allUsers]);
	const leads = dueLeadsQuery.data?.leads ?? [];
	const stageParam = searchParams.get("stage");
	const activeStage: LeadStageId = leadStageDefinitions.some((stage) => stage.id === stageParam)
		? (stageParam as LeadStageId)
		: "all";
	const filteredLeads = useMemo(
		() => leads.filter(getLeadStagePredicate(activeStage, currentUserId)),
		[activeStage, currentUserId, leads],
	);

	useEffect(() => {
		if (!createOpen) {
			return;
		}

		resetCreate({
			phone: "",
			name: "",
			assignedTo: currentUserId ?? "",
			customNextFollowUpAt: undefined,
		});
	}, [createOpen, currentUserId, resetCreate]);

	const onCreateLead = async (payload: CreateLeadForm) => {
		const validation = CreateLeadPayloadSchema.safeParse(payload);
		if (!validation.success) {
			toast.error("Validation failed");
			return;
		}

		try {
			await createLeadMutation.mutateAsync(validation.data);
			toast.success("Lead created successfully.");
			resetCreate();
			setCreateOpen(false);
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Unable to create lead");
				return;
			}

			toast.error(error instanceof Error ? error.message : "Unable to create lead");
		}
	};

	const columns = useMemo(() => buildLeadColumns(), []);

	return (
		<div className="grid gap-6">
			<Panel
				title="Leads"
				description={leadStageDefinitions.find((stage) => stage.id === activeStage)?.description ?? "Not moved to admission or dropped"}
				action={
					<div className="flex flex-wrap gap-2">
						<Link
							to="/my-leads"
							className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:border-blue-600 hover:text-blue-600"
						>
							My leads
						</Link>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
							onClick={() => setCreateOpen(true)}
						>
							<HiPlusCircle className="h-4 w-4" aria-hidden="true" />
							Create lead
						</button>
					</div>
				}
			>
				{dueLeadsQuery.isLoading ? (
					<div className="py-8 text-center text-gray-600">Loading...</div>
				) : dueLeadsQuery.isError ? (
					<div className="py-8 text-center text-gray-600">Unable to load leads.</div>
				) : (
					<DataTable
						columns={columns}
						data={filteredLeads}
						exportFilename={`leads-${activeStage}`}
						searchPlaceholder={`Search ${leadStageDefinitions.find((stage) => stage.id === activeStage)?.label.toLowerCase() ?? "leads"}...`}
						initialSorting={[{ id: "nextFollowUpAt", desc: false }]}
					/>
				)}
			</Panel>

			<Modal
				open={createOpen}
				title="Create lead"
				description="Phone number is required"
				onClose={() => setCreateOpen(false)}
				footer={
					<>
						<button
							type="button"
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
							onClick={() => setCreateOpen(false)}
						>
							Cancel
						</button>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
							onClick={() => void handleCreateSubmit(onCreateLead)()}
							disabled={createLeadMutation.isPending}
						>
							<HiPlusCircle className="h-4 w-4" aria-hidden="true" />
							{createLeadMutation.isPending ? "Creating..." : "Create lead"}
						</button>
					</>
				}
			>
				<form className="grid gap-4" onSubmit={handleCreateSubmit(onCreateLead)}>
					<Controller
						name="phone"
						control={createControl}
						render={({ field, fieldState }) => (
							<Field
								label="Phone"
								value={field.value ?? ""}
								onChange={field.onChange}
								placeholder="+919876543210"
								error={fieldState.error?.message}
							/>
						)}
					/>
					<Controller
						name="name"
						control={createControl}
						render={({ field, fieldState }) => (
							<Field
								label="Name (optional)"
								value={field.value ?? ""}
								onChange={field.onChange}
								error={fieldState.error?.message}
							/>
						)}
					/>
					<Controller
						name="assignedTo"
						control={createControl}
						render={({ field, fieldState }) => (
							<label className="grid gap-2 text-sm font-medium text-gray-600">
								<span>Assign to</span>
								<select
									className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
									value={field.value ?? ""}
									onChange={(event) => field.onChange(event.target.value)}
								>
									<option value="">Select user</option>
									{assigneeOptions.map((user) => (
										<option key={user.id} value={user.id}>
											{formatUserName(user.name ?? user.username)}
											{user.id === currentUserId ? " (You)" : ""}
										</option>
									))}
								</select>
								{fieldState.error?.message ? (
									<p className="text-xs text-red-600">{fieldState.error.message}</p>
								) : null}
							</label>
						)}
					/>
					<Controller
						name="customNextFollowUpAt"
						control={createControl}
						render={({ field, fieldState }) => (
							<Field
								label="Postpone follow-up (optional)"
								type="datetime-local"
								value={toInputDateTimeLocal(field.value)}
								onChange={(value) => {
									if (!value) {
										field.onChange(undefined);
										return;
									}
									field.onChange(new Date(value));
								}}
								error={fieldState.error?.message}
							/>
						)}
					/>
				</form>
			</Modal>
		</div>
	);
};



