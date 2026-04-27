import {
	CreateLeadPayloadSchema,
	PostponeLeadFollowUpPayloadSchema,
} from "@repo/schema";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { HiCalendarDays, HiClock, HiPlusCircle } from "react-icons/hi2";
import { ApiError } from "@/api/request";
import {
	Field,
	Modal,
	Panel,
} from "@/components/dashboard-ui";
import { useDueLeadFollowUpsQuery } from "@/features/leads/leads.queries";
import {
	useCreateLeadMutation,
	usePostponeLeadFollowUpMutation,
} from "@/features/leads/use-lead-mutations";
import type {
	CreateLeadForm,
	PostponeLeadFollowUpForm,
} from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

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

export const LeadsPage = () => {
	const { token } = useSession();
	const dueLeadsQuery = useDueLeadFollowUpsQuery(token);
	const createLeadMutation = useCreateLeadMutation();
	const postponeLeadMutation = usePostponeLeadFollowUpMutation();
	const [banner, setBanner] = useState("");
	const [createOpen, setCreateOpen] = useState(false);
	const [postponeLeadId, setPostponeLeadId] = useState<string | null>(null);

	const {
		control: createControl,
		handleSubmit: handleCreateSubmit,
		reset: resetCreate,
		setError: setCreateError,
	} = useForm<CreateLeadForm>({
		defaultValues: {
			phone: "",
			name: "",
			customNextFollowUpAt: undefined,
		},
	});

	const {
		control: postponeControl,
		handleSubmit: handlePostponeSubmit,
		reset: resetPostpone,
		setError: setPostponeError,
	} = useForm<PostponeLeadFollowUpForm>({
		defaultValues: {
			customNextFollowUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
		},
	});

	const onCreateLead = async (form: CreateLeadForm) => {
		setBanner("");

		const validation = CreateLeadPayloadSchema.safeParse(form);
		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			if (errors.phone?.[0]) {
				setCreateError("phone", {
					type: "manual",
					message: errors.phone[0],
				});
			}
			if (errors.name?.[0]) {
				setCreateError("name", {
					type: "manual",
					message: errors.name[0],
				});
			}
			if (errors.customNextFollowUpAt?.[0]) {
				setCreateError("customNextFollowUpAt", {
					type: "manual",
					message: errors.customNextFollowUpAt[0],
				});
			}
			return;
		}

		try {
			await createLeadMutation.mutateAsync(validation.data);
			setBanner("Lead created and added to follow-up flow.");
			setCreateOpen(false);
			resetCreate({
				phone: "",
				name: "",
				customNextFollowUpAt: undefined,
			});
		} catch (error) {
			if (error instanceof ApiError) {
				const serverErrors = error.payload.errors ?? {};
				if (serverErrors.phone?.[0]) {
					setCreateError("phone", {
						type: "server",
						message: serverErrors.phone[0],
					});
				}
				if (serverErrors.name?.[0]) {
					setCreateError("name", {
						type: "server",
						message: serverErrors.name[0],
					});
				}
				if (serverErrors.customNextFollowUpAt?.[0]) {
					setCreateError("customNextFollowUpAt", {
						type: "server",
						message: serverErrors.customNextFollowUpAt[0],
					});
				}
				setBanner(error.payload.message ?? "Unable to create lead");
				return;
			}

			setBanner(error instanceof Error ? error.message : "Unable to create lead");
		}
	};

	const onPostponeLead = async (payload: PostponeLeadFollowUpForm) => {
		if (!postponeLeadId) {
			return;
		}

		setBanner("");
		const validation = PostponeLeadFollowUpPayloadSchema.safeParse(payload);
		if (!validation.success) {
			const error = validation.error.flatten().fieldErrors.customNextFollowUpAt?.[0];
			if (error) {
				setPostponeError("customNextFollowUpAt", {
					type: "manual",
					message: error,
				});
			}
			return;
		}

		try {
			await postponeLeadMutation.mutateAsync({
				leadId: postponeLeadId,
				payload: validation.data,
			});
			setBanner("Lead follow-up postponed successfully.");
			setPostponeLeadId(null);
		} catch (error) {
			if (error instanceof ApiError) {
				const dtError = error.payload.errors?.customNextFollowUpAt?.[0];
				if (dtError) {
					setPostponeError("customNextFollowUpAt", {
						type: "server",
						message: dtError,
					});
				}
				setBanner(error.payload.message ?? "Unable to postpone follow-up");
				return;
			}

			setBanner(
				error instanceof Error ? error.message : "Unable to postpone follow-up",
			);
		}
	};

	const selectedLead =
		dueLeadsQuery.data?.leads.find((lead) => lead.id === postponeLeadId) ?? null;

	return (
		<div className="grid gap-6">
			<Panel
				title="Leads Follow-up"
				description="Sales"
				action={
					<button
						type="button"
						className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-surface"
						onClick={() => setCreateOpen(true)}
					>
						<HiPlusCircle className="h-4 w-4" aria-hidden="true" />
						Create lead
					</button>
				}
			>
				<div className="overflow-x-auto rounded-3xl border border-border">
					<table className="min-w-full border-collapse bg-surface text-left text-sm">
						<thead className="bg-surface-muted text-xs uppercase tracking-[0.14em] text-ink-soft">
							<tr>
								<th className="px-4 py-3 font-semibold">Phone</th>
								<th className="px-4 py-3 font-semibold">Name</th>
								<th className="px-4 py-3 font-semibold">Status</th>
								<th className="px-4 py-3 font-semibold">Next Follow-up</th>
								<th className="px-4 py-3 font-semibold">Custom Follow-up</th>
								<th className="px-4 py-3 font-semibold">Actions</th>
							</tr>
						</thead>
						<tbody>
							{dueLeadsQuery.data?.leads.map((lead) => (
								<tr key={lead.id} className="border-t border-border align-top">
									<td className="px-4 py-3 font-semibold text-ink">{lead.phone}</td>
									<td className="px-4 py-3 text-ink-soft">{lead.name ?? "-"}</td>
									<td className="px-4 py-3 text-ink-soft">{lead.status}</td>
									<td className="px-4 py-3 text-ink-soft">
										{new Date(lead.nextFollowUpAt).toLocaleString()}
									</td>
									<td className="px-4 py-3 text-ink-soft">
										{lead.customNextFollowUpAt
											? new Date(lead.customNextFollowUpAt).toLocaleString()
											: "-"}
									</td>
									<td className="px-4 py-3">
										<button
											type="button"
											className="inline-flex items-center gap-1 rounded-full border border-sky/30 bg-sky-soft px-3 py-1 text-xs font-semibold text-ink"
											onClick={() => {
												setPostponeLeadId(lead.id);
												resetPostpone({
													customNextFollowUpAt: new Date(
														Date.now() + 24 * 60 * 60 * 1000,
													),
												});
											}}
										>
											<HiClock className="h-3.5 w-3.5" aria-hidden="true" />
											Postpone
										</button>
									</td>
								</tr>
							))}
							{dueLeadsQuery.data && dueLeadsQuery.data.leads.length === 0 ? (
								<tr>
									<td className="px-4 py-5 text-sm text-ink-soft" colSpan={6}>
										No due follow-ups right now.
									</td>
								</tr>
							) : null}
						</tbody>
					</table>
				</div>
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
							className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-ink"
							onClick={() => setCreateOpen(false)}
						>
							Cancel
						</button>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-surface"
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
						name="customNextFollowUpAt"
						control={createControl}
						render={({ field, fieldState }) => (
							<Field
								label="Postpone follow-up (optional)"
								type="datetime-local"
								value={field.value ? toInputDateTimeLocal(field.value.toISOString()) : ""}
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

			<Modal
				open={Boolean(postponeLeadId)}
				title="Postpone follow-up"
				description={selectedLead ? `Lead ${selectedLead.phone}` : "Lead"}
				onClose={() => setPostponeLeadId(null)}
				footer={
					<>
						<button
							type="button"
							className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-ink"
							onClick={() => setPostponeLeadId(null)}
						>
							Cancel
						</button>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl bg-sky px-4 py-2 text-sm font-semibold text-surface"
							onClick={() => void handlePostponeSubmit(onPostponeLead)()}
							disabled={postponeLeadMutation.isPending}
						>
							<HiCalendarDays className="h-4 w-4" aria-hidden="true" />
							{postponeLeadMutation.isPending ? "Saving..." : "Save postpone"}
						</button>
					</>
				}
			>
				<form
					className="grid gap-4"
					onSubmit={handlePostponeSubmit(onPostponeLead)}
				>
					<Controller
						name="customNextFollowUpAt"
						control={postponeControl}
						render={({ field, fieldState }) => (
							<Field
								label="Next follow-up date"
								type="datetime-local"
								value={toInputDateTimeLocal(
									field.value ? field.value.toISOString() : null,
								)}
								onChange={(value) => field.onChange(new Date(value))}
								error={fieldState.error?.message}
							/>
						)}
					/>
				</form>
			</Modal>

			{banner ? (
				<p className="rounded-2xl border border-brand/15 bg-brand-soft px-4 py-3 text-sm text-brand">
					{banner}
				</p>
			) : null}
		</div>
	);
};
