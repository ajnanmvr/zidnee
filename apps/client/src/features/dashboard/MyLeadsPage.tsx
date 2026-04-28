import {
	ConfirmAdmissionPayloadSchema,
	PostponeLeadFollowUpPayloadSchema,
	RedemoLeadPayloadSchema,
} from "@repo/schema";
import toast from "react-hot-toast";
import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { HiAcademicCap, HiArrowPath, HiCalendarDays, HiTrash } from "react-icons/hi2";
import { ApiError } from "@/api/request";
import { DataTable } from "@/components/DataTable";
import { Field, Modal, Panel, TextAreaField } from "@/components/dashboard-ui";
import { buildLeadColumns, formatUserName, getLeadUrgency } from "@/features/dashboard/lead-table";
import { useDueLeadFollowUpsQuery } from "@/features/leads/leads.queries";
import {
	useDeleteLeadMutation,
	usePostponeLeadFollowUpMutation,
	useRequestAdmissionMutation,
	useRequestLeadDemoMutation,
	useRequestRedemoMutation,
} from "@/features/leads/use-lead-mutations";
import { useUsersQuery } from "@/features/users/users.queries";
import type {
	ConfirmAdmissionForm,
	PostponeLeadFollowUpForm,
	RedemoLeadForm,
} from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";
import { formatSuggestionsForUI } from "@/lib/utils/suggestion-engine";

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

const isMentorRole = (roleName: string) => roleName.toLowerCase() === "mentor";
const isCounsellorRole = (roleName: string) => roleName.toLowerCase() === "counsellor";

export const MyLeadsPage = () => {
	const { token } = useSession();
	const navigate = useNavigate();
	const [timeFilter, setTimeFilter] = useState<"today" | "all">("today");
	const leadsQuery = useDueLeadFollowUpsQuery(token, {
		scope: "mine",
		timeFilter,
	});
	const usersQuery = useUsersQuery(token);
	const requestDemoMutation = useRequestLeadDemoMutation();
	const requestRedemoMutation = useRequestRedemoMutation();
	const requestAdmissionMutation = useRequestAdmissionMutation();
	const postponeLeadMutation = usePostponeLeadFollowUpMutation();
	const deleteLeadMutation = useDeleteLeadMutation();
	const [postponeLeadId, setPostponeLeadId] = useState<string | null>(null);
	const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
	const [redemoLeadId, setRedemoLeadId] = useState<string | null>(null);
	const [admissionLeadId, setAdmissionLeadId] = useState<string | null>(null);
	const [selectedDuration, setSelectedDuration] = useState<number | null>(1);

	const {
		control: postponeControl,
		handleSubmit: handlePostponeSubmit,
		reset: resetPostpone,
		setError: setPostponeError,
	} = useForm<PostponeLeadFollowUpForm>({
		defaultValues: {
			customNextFollowUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
			note: "",
		},
	});

	const {
		control: redemoControl,
		handleSubmit: handleRedemoSubmit,
		reset: resetRedemo,
		setError: setRedemoError,
	} = useForm<RedemoLeadForm>({
		defaultValues: {
			mentorId: "",
			note: "",
		},
	});

	const {
		control: admissionControl,
		handleSubmit: handleAdmissionSubmit,
		reset: resetAdmission,
		setError: setAdmissionError,
	} = useForm<ConfirmAdmissionForm>({
		defaultValues: {
			counsellorId: undefined,
			note: "",
		},
	});

	const allUsers = usersQuery.data?.users ?? [];
	const mentors = useMemo(
		() => allUsers.filter((user) => user.roles.some((role) => isMentorRole(role.name))),
		[allUsers],
	);
	const counsellors = useMemo(
		() =>
			allUsers.filter((user) =>
				user.roles.some((role) => isCounsellorRole(role.name)),
			),
		[allUsers],
	);
	const userNameById = useMemo(
		() =>
			new Map(
				allUsers.map((user) => [user.id, formatUserName(user.name ?? user.username)]),
			),
		[allUsers],
	);

	const postponeNoteValue = useWatch({
		control: postponeControl,
		name: "note",
	});
	const postponeSuggestions = postponeNoteValue
		? formatSuggestionsForUI(postponeNoteValue)
		: [];

	const leads = leadsQuery.data?.leads ?? [];
	const todayCount = useMemo(
		() => leads.filter((lead) => getLeadUrgency(lead).tone === "today").length,
		[leads],
	);

	const onPostponeLead = async (payload: PostponeLeadFollowUpForm) => {
		if (!postponeLeadId) {
			return;
		}

		const validation = PostponeLeadFollowUpPayloadSchema.safeParse(payload);
		if (!validation.success) {
			const error = validation.error.flatten().fieldErrors.customNextFollowUpAt?.[0];
			if (error) {
				setPostponeError("customNextFollowUpAt", { type: "manual", message: error });
				toast.error(error);
			}
			return;
		}

		try {
			await postponeLeadMutation.mutateAsync({
				leadId: postponeLeadId,
				payload: validation.data,
			});
			toast.success("Lead follow-up postponed successfully.");
			setPostponeLeadId(null);
			setSelectedDuration(1);
		} catch (error) {
			if (error instanceof ApiError) {
				const dtError = error.payload.errors?.customNextFollowUpAt?.[0];
				if (dtError) {
					setPostponeError("customNextFollowUpAt", { type: "server", message: dtError });
				}
				toast.error(error.payload.message ?? "Unable to postpone follow-up");
				return;
			}

			toast.error(error instanceof Error ? error.message : "Unable to postpone follow-up");
		}
	};

	const onDeleteLead = async () => {
		if (!deleteLeadId) {
			return;
		}
		try {
			await deleteLeadMutation.mutateAsync(deleteLeadId);
			toast.success("Lead deleted successfully.");
			setDeleteLeadId(null);
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Unable to delete lead");
				return;
			}
			toast.error(error instanceof Error ? error.message : "Unable to delete lead");
		}
	};

	const onRedemoLead = async (payload: RedemoLeadForm) => {
		if (!redemoLeadId) return;
		const validation = RedemoLeadPayloadSchema.safeParse(payload);
		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			if (errors.mentorId?.[0]) setRedemoError("mentorId", { type: "manual", message: errors.mentorId[0] });
			if (errors.note?.[0]) setRedemoError("note", { type: "manual", message: errors.note[0] });
			return;
		}
		try {
			await requestRedemoMutation.mutateAsync({
				leadId: redemoLeadId,
				payload: validation.data,
			});
			toast.success("Lead moved for redemo.");
			setRedemoLeadId(null);
			resetRedemo({ mentorId: "", note: "" });
			navigate("/demo-requests");
		} catch (error) {
			if (error instanceof ApiError) {
				const mentorError = error.payload.errors?.mentorId?.[0];
				if (mentorError) setRedemoError("mentorId", { type: "server", message: mentorError });
				toast.error(error.payload.message ?? "Unable to request redemo");
				return;
			}
			toast.error(error instanceof Error ? error.message : "Unable to request redemo");
		}
	};

	const onRequestAdmission = async (payload: ConfirmAdmissionForm) => {
		if (!admissionLeadId) return;
		const validation = ConfirmAdmissionPayloadSchema.safeParse(payload);
		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			if (errors.counsellorId?.[0]) {
				setAdmissionError("counsellorId", { type: "manual", message: errors.counsellorId[0] });
			}
			if (errors.note?.[0]) {
				setAdmissionError("note", { type: "manual", message: errors.note[0] });
			}
			return;
		}
		try {
			await requestAdmissionMutation.mutateAsync({
				leadId: admissionLeadId,
				payload: validation.data,
			});
			toast.success("Lead moved to for admission.");
			setAdmissionLeadId(null);
			resetAdmission({ counsellorId: undefined, note: "" });
			navigate("/admissions");
		} catch (error) {
			if (error instanceof ApiError) {
				const counsellorError = error.payload.errors?.counsellorId?.[0];
				if (counsellorError) {
					setAdmissionError("counsellorId", { type: "server", message: counsellorError });
				}
				toast.error(error.payload.message ?? "Unable to move lead to admission");
				return;
			}
			toast.error(error instanceof Error ? error.message : "Unable to move lead to admission");
		}
	};

	const selectedLead = leads.find((lead) => lead.id === postponeLeadId) ?? null;
	const redemoLead = leads.find((lead) => lead.id === redemoLeadId) ?? null;
	const admissionLead = leads.find((lead) => lead.id === admissionLeadId) ?? null;
	const defaultCounsellorId = admissionLead?.demoMentorId
		? allUsers.find((user) => user.id === admissionLead.demoMentorId)?.counsellorId
		: undefined;
	const redemoMentors = mentors.filter((mentor) => mentor.id !== redemoLead?.demoMentorId);

	const columns = useMemo(
		() =>
			buildLeadColumns({
				userNameById,
				onView: (leadId) => navigate(`/leads/${leadId}`),
				onRequestDemo: async (leadId) => {
					if (!confirm("Request demo for this lead?")) return;
					await requestDemoMutation.mutateAsync(leadId);
				},
				onPostpone: (leadId) => {
					setPostponeLeadId(leadId);
					resetPostpone({
						customNextFollowUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
						note: "",
					});
				},
				onDelete: (leadId) => setDeleteLeadId(leadId),
				onRedemo: (leadId) => {
					setRedemoLeadId(leadId);
					resetRedemo({ mentorId: "", note: "" });
				},
				onAdmission: (leadId) => {
					const lead = leads.find((entry) => entry.id === leadId);
					setAdmissionLeadId(leadId);
					resetAdmission({
						counsellorId:
							lead?.demoMentorId
								? allUsers.find((user) => user.id === lead.demoMentorId)?.counsellorId ??
									undefined
								: undefined,
						note: "",
					});
				},
				requestDemoPending: requestDemoMutation.isPending,
				deletePending: deleteLeadMutation.isPending,
			}),
		[
			allUsers,
			deleteLeadMutation.isPending,
			leads,
			navigate,
			requestDemoMutation,
			resetAdmission,
			resetPostpone,
			resetRedemo,
			userNameById,
		],
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
						data={leads}
						exportFilename="my-leads"
						searchPlaceholder="Search my leads..."
					/>
				)}
			</Panel>

			<Modal
				open={Boolean(postponeLeadId)}
				title="Postpone follow-up"
				description={selectedLead ? `Lead ${selectedLead.phone}` : "Lead"}
				onClose={() => {
					setPostponeLeadId(null);
					setSelectedDuration(1);
				}}
				footer={
					<>
						<button
							type="button"
							className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-ink"
							onClick={() => {
								setPostponeLeadId(null);
								setSelectedDuration(1);
							}}
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
				<div className="grid gap-4">
					<div className="grid grid-cols-2 gap-2">
						{[
							{ label: "1 Day", days: 1 },
							{ label: "3 Days", days: 3 },
							{ label: "5 Days", days: 5 },
							{ label: "1 Week", days: 7 },
							{ label: "1 Month", days: 30 },
						].map((option) => (
							<button
								key={option.days}
								type="button"
								className={`rounded-2xl border-2 px-3 py-2 text-sm font-semibold transition-all ${
									selectedDuration === option.days
										? "border-brand bg-brand text-surface"
										: "border-border bg-surface-muted text-ink hover:border-brand hover:bg-brand hover:text-surface"
								}`}
								onClick={() => {
									const futureDate = new Date(Date.now() + option.days * 24 * 60 * 60 * 1000);
									resetPostpone({
										customNextFollowUpAt: futureDate,
										note: postponeNoteValue ?? "",
									});
									setSelectedDuration(option.days);
								}}
							>
								{option.label}
							</button>
						))}
					</div>

					<form className="grid gap-4" onSubmit={handlePostponeSubmit(onPostponeLead)}>
						<Controller
							name="customNextFollowUpAt"
							control={postponeControl}
							render={({ field, fieldState }) => (
								<Field
									label="Next follow-up date"
									type="datetime-local"
									value={toInputDateTimeLocal(field.value ? field.value.toISOString() : null)}
									onChange={(value) => {
										field.onChange(new Date(value));
										setSelectedDuration(null);
									}}
									error={fieldState.error?.message}
								/>
							)}
						/>
						<Controller
							name="note"
							control={postponeControl}
							render={({ field, fieldState }) => (
								<div className="grid gap-2">
									<TextAreaField
										label="Note (optional)"
										value={field.value ?? ""}
										onChange={field.onChange}
										placeholder="Add notes about the follow-up..."
										error={fieldState.error?.message}
									/>
									{postponeSuggestions.length > 0 ? (
										<div className="rounded-2xl border border-border bg-surface-muted px-4 py-3">
											<p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
												Suggested follow-up times
											</p>
											<div className="flex flex-wrap gap-2">
												{postponeSuggestions.map((suggestion) => (
													<button
														key={`${suggestion.label}-${suggestion.date.toISOString()}`}
														type="button"
														className="rounded-full border border-brand/20 bg-brand-soft px-3 py-1 text-xs font-semibold text-brand"
														onClick={() => {
															resetPostpone({
																customNextFollowUpAt: suggestion.date,
																note: field.value ?? "",
															});
															setSelectedDuration(null);
														}}
													>
														{suggestion.label}
													</button>
												))}
											</div>
										</div>
									) : null}
								</div>
							)}
						/>
					</form>
				</div>
			</Modal>

			<Modal
				open={Boolean(redemoLeadId)}
				title="Request redemo"
				description={
					redemoLead
						? `Previous mentor: ${redemoLead.demoMentorId ? userNameById.get(redemoLead.demoMentorId) ?? "-" : "-"}`
						: "Select a different mentor"
				}
				onClose={() => {
					setRedemoLeadId(null);
					resetRedemo({ mentorId: "", note: "" });
				}}
				footer={
					<>
						<button
							type="button"
							className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-ink"
							onClick={() => {
								setRedemoLeadId(null);
								resetRedemo({ mentorId: "", note: "" });
							}}
						>
							Cancel
						</button>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl bg-orange px-4 py-2 text-sm font-semibold text-surface"
							onClick={() => void handleRedemoSubmit(onRedemoLead)()}
							disabled={requestRedemoMutation.isPending}
						>
							<HiArrowPath className="h-4 w-4" aria-hidden="true" />
							{requestRedemoMutation.isPending ? "Saving..." : "Request redemo"}
						</button>
					</>
				}
			>
				<form className="grid gap-4" onSubmit={handleRedemoSubmit(onRedemoLead)}>
					<Controller
						name="mentorId"
						control={redemoControl}
						render={({ field, fieldState }) => (
							<label className="grid gap-2 text-sm font-medium text-ink-soft">
								<span>Mentor</span>
								<select
									className="rounded-2xl border border-border bg-surface px-4 py-3 text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft"
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
									<span className="text-xs text-danger">{fieldState.error.message}</span>
								) : null}
							</label>
						)}
					/>
					<Controller
						name="note"
						control={redemoControl}
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

			<Modal
				open={Boolean(admissionLeadId)}
				title="Move to for admission"
				description="Preselecting the counsellor linked to the last demo mentor. You can still change it."
				onClose={() => {
					setAdmissionLeadId(null);
					resetAdmission({ counsellorId: undefined, note: "" });
				}}
				footer={
					<>
						<button
							type="button"
							className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-ink"
							onClick={() => {
								setAdmissionLeadId(null);
								resetAdmission({ counsellorId: undefined, note: "" });
							}}
						>
							Cancel
						</button>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-surface"
							onClick={() => void handleAdmissionSubmit(onRequestAdmission)()}
							disabled={requestAdmissionMutation.isPending}
						>
							<HiAcademicCap className="h-4 w-4" aria-hidden="true" />
							{requestAdmissionMutation.isPending ? "Saving..." : "Move to admission"}
						</button>
					</>
				}
			>
				<form className="grid gap-4" onSubmit={handleAdmissionSubmit(onRequestAdmission)}>
					{admissionLead?.demoMentorId ? (
						<div className="rounded-2xl border border-border bg-surface-muted px-4 py-3 text-sm text-ink-soft">
							Last demo mentor: {userNameById.get(admissionLead.demoMentorId) ?? "-"}
						</div>
					) : null}
					<Controller
						name="counsellorId"
						control={admissionControl}
						render={({ field, fieldState }) => (
							<label className="grid gap-2 text-sm font-medium text-ink-soft">
								<span>Counsellor</span>
								<select
									className="rounded-2xl border border-border bg-surface px-4 py-3 text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft"
									value={field.value ?? defaultCounsellorId ?? ""}
									onChange={(event) => field.onChange(event.target.value || undefined)}
								>
									<option value="">Select counsellor</option>
									{counsellors.map((counsellor) => (
										<option key={counsellor.id} value={counsellor.id}>
											{formatUserName(counsellor.name ?? counsellor.username)}
										</option>
									))}
								</select>
								{fieldState.error?.message ? (
									<span className="text-xs text-danger">{fieldState.error.message}</span>
								) : null}
							</label>
						)}
					/>
					<Controller
						name="note"
						control={admissionControl}
						render={({ field, fieldState }) => (
							<TextAreaField
								label="Admission note"
								value={field.value ?? ""}
								onChange={field.onChange}
								placeholder="Ready for admission follow-up"
								error={fieldState.error?.message}
							/>
						)}
					/>
				</form>
			</Modal>

			<Modal
				open={Boolean(deleteLeadId)}
				title="Delete lead"
				description="This action cannot be undone"
				onClose={() => setDeleteLeadId(null)}
				footer={
					<>
						<button
							type="button"
							className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-ink"
							onClick={() => setDeleteLeadId(null)}
						>
							Cancel
						</button>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
							onClick={() => void onDeleteLead()}
							disabled={deleteLeadMutation.isPending}
						>
							<HiTrash className="h-4 w-4" aria-hidden="true" />
							{deleteLeadMutation.isPending ? "Deleting..." : "Delete"}
						</button>
					</>
				}
			>
				<p className="text-sm text-ink-soft">
					Are you sure you want to delete this lead? This cannot be undone.
				</p>
			</Modal>
		</div>
	);
};
