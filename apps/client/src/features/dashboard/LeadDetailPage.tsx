import { type LeadResponse, ConfirmAdmissionPayloadSchema, PostponeLeadFollowUpPayloadSchema, RedemoLeadPayloadSchema, UpdateLeadPayloadSchema } from "@repo/schema";
import toast from "react-hot-toast";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { HiAcademicCap, HiArrowLeft, HiArrowPath, HiCalendarDays, HiPencilSquare, HiTrash, HiArrowsRightLeft, HiCheckCircle, HiExclamationTriangle, HiXMark, HiPaperAirplane } from "react-icons/hi2";
import { ApiError } from "@/api/request";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Field, Modal, Panel, TextAreaField } from "@/components/dashboard-ui";
import { formatUserName } from "@/features/dashboard/lead-table";
import { getLatestLeadDemo } from "@/features/dashboard/lead-demo-utils";
import { useLeadDetailQuery } from "@/features/leads/leads.queries";
import {
	useDeleteLeadMutation,
	useGenerateFormLinkMutation,
	usePostponeLeadFollowUpMutation,
	useRequestAdmissionMutation,
	useRequestLeadDemoMutation,
	useRequestRedemoMutation,
	useUpdateLeadMutation,
	useMarkDemoCompletedMutation,
	useRevokeFormLinkMutation,
} from "@/features/leads/use-lead-mutations";
import { useUsersQuery } from "@/features/users/users.queries";
import { useMeQuery } from "@/features/auth/auth.queries";
import type {
	ConfirmAdmissionForm,
	PostponeLeadFollowUpForm,
	RedemoLeadForm,
} from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";
import { formatSuggestionsForUI } from "@/lib/utils/suggestion-engine";

const toInputDateTimeLocal = (value: Date | string | null | undefined): string => {
	if (!value) {
		return "";
	}

	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "";
	}

	const offset = date.getTimezoneOffset() * 60000;
	return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

type LeadIdentity = {
	name?: string;
	phone?: string;
} | null | undefined;

const leadDisplayName = (lead: LeadIdentity) => lead?.name || lead?.phone || "Lead";

const getWhatsappNumber = (phone?: string | null) => phone?.replace(/\D/g, "") ?? "";

const getStatusTone = (lead: LeadResponse | null | undefined) => {
	const latestDemo = lead ? getLatestLeadDemo(lead) : null;

	if (latestDemo?.studentId) {
		return { className: "bg-emerald-500/10 text-emerald-700", label: "Converted to student" };
	}

	if (latestDemo?.admissionCompletedAt) {
		return { className: "bg-teal-500/10 text-teal-700", label: "Admission completed" };
	}

	if (latestDemo?.admissionRequestedAt) {
		return { className: "bg-amber-500/15 text-amber-800", label: "Admission requested" };
	}

	if (latestDemo?.completedAt) {
		return { className: "bg-blue-100 text-blue-600", label: "Demo completed" };
	}

	if (latestDemo?.assignedAt) {
		return { className: "bg-sky-600/10 text-sky-600", label: "Demo assigned" };
	}

	if (latestDemo?.requestedAt) {
		return { className: "bg-amber-500/10 text-amber-700", label: "Demo requested" };
	}

	return { className: "bg-gray-50 text-gray-600", label: "Lead follow-up" };
};

type EditLeadFormState = {
	name: string;
	phone: string;
	level: string;
};

type ReassignLeadFormState = {
	assignedTo: string;
};

export const LeadDetailPage = () => {
	const { leadId } = useParams<{ leadId: string }>();
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const { token } = useSession();
	const meQuery = useMeQuery(token);
	const leadQuery = useLeadDetailQuery(token, leadId ?? "");
	const usersQuery = useUsersQuery(token);
	const updateLeadMutation = useUpdateLeadMutation();
	const requestDemoMutation = useRequestLeadDemoMutation();
	const requestRedemoMutation = useRequestRedemoMutation();
	const requestAdmissionMutation = useRequestAdmissionMutation();
	const postponeLeadMutation = usePostponeLeadFollowUpMutation();
	const deleteLeadMutation = useDeleteLeadMutation();
	const markDemoCompletedMutation = useMarkDemoCompletedMutation();
	const generateFormLinkMutation = useGenerateFormLinkMutation();
	const revokeFormLinkMutation = useRevokeFormLinkMutation();
	const [editOpen, setEditOpen] = useState(false);
	const [reassignOpen, setReassignOpen] = useState(false);
	const [postponeOpen, setPostponeOpen] = useState(false);
	const [redemoOpen, setRedemoOpen] = useState(false);
	const [admissionOpen, setAdmissionOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleteNote, setDeleteNote] = useState("");
	const [completeOpen, setCompleteOpen] = useState(false);
	const [formLinkOpen, setFormLinkOpen] = useState(false);
	const [requestDemoOpen, setRequestDemoOpen] = useState(false);
	const [selectedRequestCounsellor, setSelectedRequestCounsellor] = useState<string | undefined>(undefined);
	const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);
	const [formLinkData, setFormLinkData] = useState<{ formLink: string } | null>(null);
	const [selectedDuration, setSelectedDuration] = useState<number | null>(1);
	const [priceEditOpen, setPriceEditOpen] = useState(false);
	const [priceInput, setPriceInput] = useState<string>("");

	const {
		control: editControl,
		handleSubmit: handleEditSubmit,
		reset: resetEdit,
		setError: setEditError,
	} = useForm<EditLeadFormState>({
		defaultValues: {
			name: "",
			phone: "",
			level: "",
		},
	});

	const {
		control: reassignControl,
		handleSubmit: handleReassignSubmit,
		reset: resetReassign,
		setError: setReassignError,
	} = useForm<ReassignLeadFormState>({
		defaultValues: {
			assignedTo: "",
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
			note: "",
		},
	});

	const postponeNoteValue = useWatch({
		control: postponeControl,
		name: "note",
	});
	const postponeSuggestions = postponeNoteValue ? formatSuggestionsForUI(postponeNoteValue) : [];

	const {
		control: redemoControl,
		handleSubmit: handleRedemoSubmit,
		reset: resetRedemo,
		setError: setRedemoError,
	} = useForm<RedemoLeadForm>({
		defaultValues: {
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

	const {
		control: completeControl,
		handleSubmit: handleCompleteSubmit,
		reset: resetComplete,
	} = useForm<{ note?: string }>({
		defaultValues: {
			note: "",
		},
	});

	const lead = leadQuery.data?.lead ?? null;
	const latestDemo = lead ? getLatestLeadDemo(lead) : null;
	const allUsers = usersQuery.data?.users ?? [];
	const currentUserId = meQuery.data?.id ?? "";
	const currentAssigneeId = lead?.assignedTo ?? "";
	const currentAssignee = currentAssigneeId ? allUsers.find((user) => user.id === currentAssigneeId) ?? null : null;
	const counsellors = useMemo(
		() => allUsers.filter((user) => user.roles.some((role) => (role.type ?? "general") === "counsellor")),
		[allUsers],
	);
	const defaultCounsellorId = latestDemo?.mentorId
		? allUsers.find((user) => user.id === latestDemo.mentorId)?.counsellorId
		: undefined;
	const assignmentOptions = allUsers;
	const showDemoWorkflowActions = Boolean(latestDemo?.completedAt);

	useEffect(() => {
		const action = searchParams.get("action");
		if (action !== "postpone") {
			return;
		}

		setPostponeOpen(true);
		setSearchParams((previous) => {
			const next = new URLSearchParams(previous);
			next.delete("action");
			return next;
		}, { replace: true });
	}, [searchParams, setSearchParams]);

	useEffect(() => {
		if (!editOpen || !lead) {
			return;
		}

		resetEdit({
			name: lead.name ?? "",
			phone: lead.phone ?? "",
			level: lead.level ?? "",
		});
	}, [editOpen, lead, resetEdit]);

	useEffect(() => {
		if (!reassignOpen || !lead) {
			return;
		}

		resetReassign({
			assignedTo: currentAssigneeId || currentUserId,
		});
	}, [currentAssigneeId, currentUserId, lead, reassignOpen, resetReassign]);

	useEffect(() => {
		if (!postponeOpen) {
			return;
		}

		resetPostpone({
			customNextFollowUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
			note: "",
		});
		setSelectedDuration(1);
	}, [postponeOpen, resetPostpone]);

	useEffect(() => {
		if (!redemoOpen) {
			return;
		}

		resetRedemo({ note: "" });
	}, [redemoOpen, resetRedemo]);

	useEffect(() => {
		if (!admissionOpen) {
			return;
		}

		resetAdmission({ counsellorId: defaultCounsellorId, note: "" });
	}, [admissionOpen, defaultCounsellorId, resetAdmission]);

	useEffect(() => {
		if (priceEditOpen && lead?.price) {
			setPriceInput(lead.price.toString());
		} else {
			setPriceInput("");
		}
	}, [priceEditOpen, lead?.price]);

	if (!leadId) {
		return <Panel title="Lead"><div className="py-8 text-center text-gray-600">Lead not found</div></Panel>;
	}

	if (leadQuery.isLoading) {
		return <Panel title="Lead"><div className="py-8 text-center text-gray-600">Loading lead...</div></Panel>;
	}

	if (!lead && leadQuery.isError) {
		return <Panel title="Lead"><div className="py-8 text-center text-gray-600">Lead not found</div></Panel>;
	}

	const onEditLead = async (payload: EditLeadFormState) => {
		if (!lead) {
			return;
		}

		const validation = UpdateLeadPayloadSchema.safeParse(payload);
		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			if (errors.phone?.[0]) {
				setEditError("phone", { type: "manual", message: errors.phone[0] });
			}
			if (errors.name?.[0]) {
				setEditError("name", { type: "manual", message: errors.name[0] });
			}
			if (errors.level?.[0]) {
				setEditError("level", { type: "manual", message: errors.level[0] });
			}
			return;
		}

		try {
			await updateLeadMutation.mutateAsync({ leadId: lead.id, payload: validation.data });
			toast.success("Lead updated successfully.");
			setEditOpen(false);
		} catch (error) {
			if (error instanceof ApiError) {
				const errors = error.payload.errors ?? {};
				if (errors.phone?.[0]) {
					setEditError("phone", { type: "server", message: errors.phone[0] });
				}
				if (errors.name?.[0]) {
					setEditError("name", { type: "server", message: errors.name[0] });
				}
				if (errors.level?.[0]) {
					setEditError("level", { type: "server", message: errors.level[0] });
				}
				toast.error(error.payload.message ?? "Unable to update lead");
				return;
			}

			toast.error(error instanceof Error ? error.message : "Unable to update lead");
		}
	};

	const onReassignLead = async (payload: ReassignLeadFormState) => {
		if (!lead) {
			return;
		}

		const validation = UpdateLeadPayloadSchema.safeParse({ assignedTo: payload.assignedTo });
		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			if (errors.assignedTo?.[0]) {
				setReassignError("assignedTo", { type: "manual", message: errors.assignedTo[0] });
			}
			return;
		}

		try {
			await updateLeadMutation.mutateAsync({ leadId: lead.id, payload: validation.data });
			toast.success("Lead reassigned successfully.");
			setReassignOpen(false);
		} catch (error) {
			if (error instanceof ApiError) {
				const errors = error.payload.errors ?? {};
				if (errors.assignedTo?.[0]) {
					setReassignError("assignedTo", { type: "server", message: errors.assignedTo[0] });
				}
				toast.error(error.payload.message ?? "Unable to reassign lead");
				return;
			}

			toast.error(error instanceof Error ? error.message : "Unable to reassign lead");
		}
	};

	const onRequestDemo = async () => {
		if (!lead) {
			return;
		}

		if (!lead.formCompleted) {
			toast.error("Form must be filled before requesting a demo");
			return;
		}

			setRequestDemoOpen(true);
			return;
		};

		const confirmRequestDemo = async () => {
			if (!lead) return;

			if (!selectedRequestCounsellor) {
				toast.error("Please select a counsellor before requesting a demo.");
				return;
			}

			try {
				await updateLeadMutation.mutateAsync({ leadId: lead.id, payload: { demoRequestAssignedTo: selectedRequestCounsellor } });
				await requestDemoMutation.mutateAsync(lead.id);
				toast.success("Demo requested.");
				setRequestDemoOpen(false);
				setSelectedRequestCounsellor(undefined);
			} catch (error) {
				if (error instanceof ApiError) {
					toast.error(error.payload.message ?? "Unable to request demo");
					return;
				}

				toast.error(error instanceof Error ? error.message : "Unable to request demo");
			}
	};

	const onPostponeLead = async (payload: PostponeLeadFollowUpForm) => {
		if (!lead) {
			return;
		}

		const validation = PostponeLeadFollowUpPayloadSchema.safeParse(payload);
		if (!validation.success) {
			const error = validation.error.flatten().fieldErrors.customNextFollowUpAt?.[0];
			if (error) {
				setPostponeError("customNextFollowUpAt", { type: "manual", message: error });
			}
			return;
		}

		try {
			await postponeLeadMutation.mutateAsync({ leadId: lead.id, payload: validation.data });
			toast.success("Lead follow-up postponed.");
			setPostponeOpen(false);
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

	const onRedemoLead = async (payload: RedemoLeadForm) => {
		if (!lead) {
			return;
		}

		const validation = RedemoLeadPayloadSchema.safeParse(payload);
		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			if (errors.note?.[0]) {
				setRedemoError("note", { type: "manual", message: errors.note[0] });
			}
			return;
		}

		try {
			await requestRedemoMutation.mutateAsync({ leadId: lead.id, payload: validation.data });
			toast.success("Lead moved for redemo.");
			setRedemoOpen(false);
		} catch (error) {
			if (error instanceof ApiError) {
				const noteError = error.payload.errors?.note?.[0];
				if (noteError) {
					setRedemoError("note", { type: "server", message: noteError });
				}
				toast.error(error.payload.message ?? "Unable to request redemo");
				return;
			}

			toast.error(error instanceof Error ? error.message : "Unable to request redemo");
		}
	};

	const onRequestAdmission = async (payload: ConfirmAdmissionForm) => {
		if (!lead) {
			return;
		}

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
			await requestAdmissionMutation.mutateAsync({ leadId: lead.id, payload: validation.data });
			toast.success("Lead moved to admission.");
			setAdmissionOpen(false);
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

	const onCompleteDemo = async (payload: { note?: string }) => {
		if (!lead) {
			return;
		}

		try {
			await markDemoCompletedMutation.mutateAsync({ leadId: lead.id, note: payload.note });
			toast.success("Demo marked as completed. This action cannot be undone.");
			setCompleteOpen(false);
			resetComplete({ note: "" });
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Unable to mark demo as completed");
				return;
			}

			toast.error(error instanceof Error ? error.message : "Unable to mark demo as completed");
		}
	};

	const onSavePrice = async () => {
		if (!lead || !priceInput.trim()) {
			toast.error("Please enter a valid price");
			return;
		}

		const price = parseInt(priceInput, 10);
		if (Number.isNaN(price) || price < 0) {
			toast.error("Price must be a valid positive number");
			return;
		}

		try {
			await updateLeadMutation.mutateAsync({ leadId: lead.id, payload: { price } });
			toast.success("Price updated successfully.");
			setPriceEditOpen(false);
			setPriceInput("");
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Unable to update price");
				return;
			}

			toast.error(error instanceof Error ? error.message : "Unable to update price");
		}
	};

	const onDeleteLead = async () => {
		if (!lead) {
			return;
		}

		if (!deleteNote.trim()) {
			toast.error("Please add a reason for dropping this lead.");
			return;
		}

		try {
			await deleteLeadMutation.mutateAsync({ leadId: lead.id, note: deleteNote.trim() });
			toast.success("Lead deleted successfully.");
			navigate("/leads");
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Unable to delete lead");
				return;
			}

			toast.error(error instanceof Error ? error.message : "Unable to delete lead");
		}
	};

	const statusSummary = latestDemo?.studentId
		? "Converted to student"
		: latestDemo?.admissionCompletedAt
			? "Admission completed"
			: latestDemo?.admissionRequestedAt
				? "Admission requested"
				: latestDemo?.completedAt
					? "Demo completed"
					: latestDemo?.assignedAt
						? "Demo assigned"
						: latestDemo?.requestedAt
							? "Demo requested"
							: "Lead follow-up";
	const statusTone = getStatusTone(lead);

	return (
		<div className="grid gap-6">
			{/* Price Edit Modal */}
			<Modal open={priceEditOpen} onClose={() => setPriceEditOpen(false)} title={lead?.price ? "Edit Price" : "Add Price"}>
				<div className="space-y-4">
					<p className="text-sm text-slate-600">Enter the course price (in INR).</p>
					<input
						type="number"
						min="0"
						value={priceInput}
						onChange={(e) => setPriceInput(e.target.value)}
						placeholder="Enter price"
						className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
					/>
					<div className="flex justify-end gap-2">
						<button onClick={() => setPriceEditOpen(false)} className="rounded-2xl border px-4 py-2 text-sm font-semibold">Cancel</button>
						<button onClick={onSavePrice} className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Save</button>
					</div>
				</div>
			</Modal>

			{/* Request demo modal */}
			<Modal open={requestDemoOpen} onClose={() => setRequestDemoOpen(false)} title="Request Demo and assign counsellor">
				<div className="space-y-4">
					<p className="text-sm text-slate-600">Select a counsellor who will coordinate and schedule the demo.</p>
					<select
						value={selectedRequestCounsellor ?? ""}
						onChange={(e) => setSelectedRequestCounsellor(e.target.value)}
						className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2"
					>
						<option value="" disabled>Select counsellor</option>
						{counsellors.map((c) => <option key={c.id} value={c.id}>{c.name || c.username}</option>)}
					</select>
					<div className="flex justify-end gap-2">
						<button onClick={() => setRequestDemoOpen(false)} className="rounded-2xl border px-4 py-2">Cancel</button>
						<button onClick={confirmRequestDemo} disabled={!selectedRequestCounsellor} className="rounded-2xl bg-brand px-4 py-2 text-white disabled:opacity-50">Confirm</button>
					</div>
				</div>
			</Modal>
			<Panel title={leadDisplayName(lead)} description="Lead details and workflow">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div className="space-y-4">
						<button
							type="button"
							onClick={() => navigate("/leads")}
							className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-600/80"
						>
							<HiArrowLeft className="h-4 w-4" />
							Back to leads
						</button>
						<div>
							<h1 className="text-3xl font-bold tracking-tight text-gray-900">{lead?.name || "Lead"}</h1>
							<div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600">
								<span className={`rounded-full px-3 py-1 ${statusTone.className}`}>{statusSummary}</span>
								{lead?.assignedTo ? <span className="rounded-full bg-sky-600/10 px-3 py-1 text-sky-600">Assigned</span> : null}
								{lead?.formCompleted ? <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-700">Form completed</span> : lead?.formSent ? <span className="rounded-full bg-amber-500/10 px-3 py-1 text-amber-700">Form sent</span> : null}
							</div>
						</div>
					</div>

					<div className="flex flex-wrap gap-2">
						<button type="button" className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition-colors hover:border-blue-600 hover:text-blue-600" onClick={() => setEditOpen(true)}>
							<HiPencilSquare className="h-4 w-4" />
							Edit lead
						</button>
						<button type="button" className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition-colors hover:border-blue-600 hover:text-blue-600" onClick={() => setReassignOpen(true)}>
							<HiArrowsRightLeft className="h-4 w-4" />
							Reassign lead
						</button>
						{!lead?.formSent ? (
							<button 
								type="button" 
								className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
								onClick={async () => {
									if (leadId) {
										try {
											const result = await generateFormLinkMutation.mutateAsync(leadId);
											setFormLinkData(result);
											setFormLinkOpen(true);
										} catch (error) {
											toast.error(error instanceof Error ? error.message : "Unable to generate form link");
										}
									}
								}}
								disabled={generateFormLinkMutation.isPending}
							>
								Send form
							</button>
						) : lead?.formSent && !lead?.formCompleted ? (
							<>
								<button
									type="button"
									className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
									onClick={async () => {
										if (leadId) {
											try {
												const result = await generateFormLinkMutation.mutateAsync(leadId);
												setFormLinkData(result);
												setFormLinkOpen(true);
											} catch (error) {
												toast.error(error instanceof Error ? error.message : "Unable to generate form link");
											}
										}
									}}
									disabled={generateFormLinkMutation.isPending}
								>
									<HiPaperAirplane className="h-4 w-4" />
									Copy/Share form
								</button>
								<button
									type="button"
									className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
									onClick={() => setRevokeConfirmOpen(true)}
								>
									<HiXMark className="h-4 w-4" />
									Revoke form
								</button>
							</>
						) : null}
						{lead?.formCompleted && !latestDemo ? (
							<button
								type="button"
								className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white enabled:hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
								onClick={() => void onRequestDemo()}
								disabled={requestDemoMutation.isPending}
							>
								<HiCalendarDays className="h-4 w-4" />
								Request demo
							</button>
						) : null}
						<button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600" onClick={() => setPostponeOpen(true)}>
							<HiCalendarDays className="h-4 w-4" />
							Postpone
						</button>
						{showDemoWorkflowActions ? (
							<>
								<button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => setRedemoOpen(true)}>
									<HiArrowPath className="h-4 w-4" />
									Redemo
								</button>
								<button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => setAdmissionOpen(true)}>
									<HiAcademicCap className="h-4 w-4" />
									Admission
								</button>
							</>
						) : null}
						<button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => setDeleteOpen(true)}>
							<HiTrash className="h-4 w-4" />
							Delete lead
						</button>
					</div>
				</div>
			</Panel>

			<Panel title="Status Overview" description="Compact view of lead information and workflow state">
				<div className="grid gap-6">
					{/* Identity & Assignment Section */}
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div className="rounded-2xl border border-gray-200 bg-linear-to-br from-blue-50 to-blue-100/50 p-4">
							<p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-600 mb-3">Lead Identity</p>
							<div className="space-y-2">
								<div>
									<p className="text-xs text-gray-600 font-semibold">Phone</p>
									<p className="text-sm font-mono text-gray-900">{lead?.phone ?? "-"}</p>
								</div>
								<div>
									<p className="text-xs text-gray-600 font-semibold">Level</p>
									<p className="text-sm text-gray-900">{lead?.level ?? "-"}</p>
								</div>
								<div>
									<p className="text-xs text-gray-600 font-semibold">Created by</p>
									<p className="text-xs text-gray-600">{lead?.createdBy ? formatUserName(allUsers.find((user) => user.id === lead.createdBy)?.name ?? null) : "-"}</p>
								</div>
							</div>
						</div>

						<div className="rounded-2xl border border-gray-200 bg-linear-to-br from-amber-50 to-amber-100/50 p-4">
							<p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-600 mb-3">Assignment & Follow-up</p>
							<div className="space-y-2">
								<div>
									<p className="text-xs text-gray-600 font-semibold">Assigned to</p>
									<p className="text-sm font-semibold text-gray-900">{currentAssignee ? formatUserName(currentAssignee.name ?? currentAssignee.username) : "Unassigned"}</p>
								</div>
								<div>
									<p className="text-xs text-gray-600 font-semibold">Next follow-up</p>
									<p className="text-sm font-semibold text-gray-900">{lead?.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleDateString() : "-"}</p>
								</div>
								<div>
									<p className="text-xs text-gray-600 font-semibold">Time</p>
									<p className="text-xs text-gray-600">{lead?.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}</p>
								</div>
							</div>
						</div>

						<div className="rounded-2xl border border-gray-200 bg-linear-to-br from-emerald-50 to-emerald-100/50 p-4">
							<p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-600 mb-3">Workflow Status</p>
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<span className="text-xs text-gray-600 font-semibold">Form sent</span>
									<span className={`rounded-full px-2 py-1 text-xs font-semibold ${lead?.formSent ? "bg-emerald-200 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>
										{lead?.formSent ? "Yes" : "No"}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-xs text-gray-600 font-semibold">Form completed</span>
									<span className={`rounded-full px-2 py-1 text-xs font-semibold ${lead?.formCompleted ? "bg-emerald-200 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>
										{lead?.formCompleted ? "Yes" : "No"}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-xs text-gray-600 font-semibold">Demo status</span>
									<span className={`rounded-full px-2 py-1 text-xs font-semibold ${latestDemo ? "bg-blue-200 text-blue-700" : "bg-gray-200 text-gray-600"}`}>
										{latestDemo ? "Requested" : "None"}
									</span>
								</div>
							</div>
						</div>

						<div className="rounded-2xl border border-gray-200 bg-linear-to-br from-purple-50 to-purple-100/50 p-4">
							<p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-600 mb-3">Pricing</p>
							<div className="space-y-3 flex flex-col h-full">
								{lead?.price ? (
									<>
										<div>
											<p className="text-xs text-gray-600 font-semibold mb-1">Course Price</p>
											<p className="text-2xl font-bold text-gray-900">₹{lead.price}</p>
										</div>
										<button
											type="button"
											onClick={() => setPriceEditOpen(true)}
											className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-purple-300 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 transition-colors hover:bg-purple-100 hover:border-purple-400"
										>
											<HiPencilSquare className="h-3 w-3" />
											Edit price
										</button>
									</>
								) : (
									<>
										<p className="text-xs text-gray-600 font-semibold">No price set</p>
										<button
											type="button"
											onClick={() => setPriceEditOpen(true)}
											className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-purple-300 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 transition-colors hover:bg-purple-100 hover:border-purple-400"
										>
											<HiPencilSquare className="h-3 w-3" />
											Add price
										</button>
									</>
								)}
							</div>
						</div>
					</div>

					{/* Demo Timeline Section */}
					{latestDemo && (
						<div className="rounded-2xl border border-gray-200 bg-linear-to-br from-sky-50 to-sky-100/50 p-4">
							<p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-600 mb-3">Latest Demo Timeline</p>
							<div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
								<div>
									<p className="text-gray-600 font-semibold mb-1">Requested</p>
									<p className="text-gray-900">{latestDemo.requestedAt ? new Date(latestDemo.requestedAt).toLocaleDateString() : "-"}</p>
								</div>
								<div>
									<p className="text-gray-600 font-semibold mb-1">Assigned</p>
									<p className="text-gray-900">{latestDemo.assignedAt ? new Date(latestDemo.assignedAt).toLocaleDateString() : "-"}</p>
								</div>
								<div>
									<p className="text-gray-600 font-semibold mb-1">Mentor</p>
									<p className="text-gray-900">{latestDemo.mentorId ? formatUserName(allUsers.find((user) => user.id === latestDemo.mentorId)?.name ?? null) : "-"}</p>
								</div>
								<div>
									<p className="text-gray-600 font-semibold mb-1">Scheduled</p>
									<p className="text-gray-900">{latestDemo.demoScheduledFor ? new Date(latestDemo.demoScheduledFor).toLocaleDateString() : "-"}</p>
								</div>
							</div>
						</div>
					)}
				</div>
			</Panel>

			<Panel title="Demo History" description="Timeline of all demo attempts">
				{lead?.demos?.length ? (
					<div className="grid gap-4 md:grid-cols-2">
						{lead.demos.map((demo, index) => {
							const demoStatus = demo.completedAt
								? "Completed"
								: demo.admissionCompletedAt
									? "Admission completed"
									: demo.admissionRequestedAt
										? "Admission requested"
										: demo.assignedAt
											? "Assigned"
											: demo.requestedAt
												? "Requested"
												: "Pending";

							const statusColor = demo.completedAt
								? "from-emerald-50 to-emerald-100/50 border-emerald-200"
								: demo.admissionCompletedAt
									? "from-teal-50 to-teal-100/50 border-teal-200"
									: demo.assignedAt
										? "from-blue-50 to-blue-100/50 border-blue-200"
										: "from-gray-50 to-gray-100/50 border-gray-200";

							const statusBgColor = demo.completedAt
								? "bg-emerald-100"
								: demo.admissionCompletedAt
									? "bg-teal-100"
									: demo.assignedAt
										? "bg-blue-100"
										: "bg-gray-100";

							const statusTextColor = demo.completedAt
								? "text-emerald-700"
								: demo.admissionCompletedAt
									? "text-teal-700"
									: demo.assignedAt
										? "text-blue-700"
										: "text-gray-700";

							return (
								<div key={`${index}-${demo.requestedAt ?? index}`} className={`rounded-2xl border bg-linear-to-br ${statusColor} p-5`}>
									<div className="flex items-start justify-between gap-3 mb-4">
										<div>
											<p className="text-sm font-bold text-gray-900">Demo Attempt {index + 1}</p>
											<p className="text-xs text-gray-600 mt-1">{demo.requestedAt ? new Date(demo.requestedAt).toLocaleDateString() : "-"}</p>
										</div>
										<span className={`rounded-full ${statusBgColor} ${statusTextColor} px-3 py-1 text-xs font-bold`}>
											{demoStatus}
										</span>
									</div>

									{/* Timeline View */}
									<div className="space-y-3">
										{demo.requestedAt && (
											<div className="flex gap-3">
												<div className="flex flex-col items-center">
													<div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
													{(demo.assignedAt || demo.completedAt || demo.admissionRequestedAt) && <div className="h-6 w-0.5 bg-blue-200" />}
												</div>
												<div>
													<p className="text-xs font-semibold text-gray-600">Requested</p>
													<p className="text-sm text-gray-900 font-medium">{new Date(demo.requestedAt).toLocaleString()}</p>
												</div>
											</div>
										)}

										{demo.assignedAt && (
											<div className="flex gap-3">
												<div className="flex flex-col items-center">
													<div className="h-2 w-2 rounded-full bg-blue-600 mt-1.5" />
													{(demo.completedAt || demo.admissionRequestedAt) && <div className="h-6 w-0.5 bg-blue-200" />}
												</div>
												<div>
													<p className="text-xs font-semibold text-gray-600">Assigned to {demo.mentorId ? formatUserName(allUsers.find((user) => user.id === demo.mentorId)?.name ?? null) : "Mentor"}</p>
													<p className="text-sm text-gray-900 font-medium">{new Date(demo.assignedAt).toLocaleString()}</p>
													{demo.demoScheduledFor && <p className="text-xs text-gray-600 mt-1">Scheduled: {new Date(demo.demoScheduledFor).toLocaleString()}</p>}
												</div>
											</div>
										)}

										{demo.completedAt && (
											<div className="flex gap-3">
												<div className="flex flex-col items-center">
													<div className="h-2 w-2 rounded-full bg-emerald-600 mt-1.5" />
													{demo.admissionRequestedAt && <div className="h-6 w-0.5 bg-emerald-200" />}
												</div>
												<div>
													<p className="text-xs font-semibold text-gray-600">Completed</p>
													<p className="text-sm text-gray-900 font-medium">{new Date(demo.completedAt).toLocaleString()}</p>
												</div>
											</div>
										)}

										{demo.admissionRequestedAt && (
											<div className="flex gap-3">
												<div className="flex flex-col items-center">
													<div className="h-2 w-2 rounded-full bg-teal-600 mt-1.5" />
													{demo.admissionCompletedAt && <div className="h-6 w-0.5 bg-teal-200" />}
												</div>
												<div>
													<p className="text-xs font-semibold text-gray-600">Admission Requested</p>
													<p className="text-sm text-gray-900 font-medium">{new Date(demo.admissionRequestedAt).toLocaleString()}</p>
												</div>
											</div>
										)}

										{demo.admissionCompletedAt && (
											<div className="flex gap-3">
												<div className="flex flex-col items-center">
													<div className="h-2 w-2 rounded-full bg-teal-600 mt-1.5" />
												</div>
												<div>
													<p className="text-xs font-semibold text-gray-600">Admission Completed</p>
													<p className="text-sm text-gray-900 font-medium">{new Date(demo.admissionCompletedAt).toLocaleString()}</p>
												</div>
											</div>
										)}
									</div>

									{/* Note */}
									{demo.note && (
										<div className="mt-4 pt-4 border-t border-gray-300">
											<p className="text-xs font-semibold text-gray-600 mb-2">Note</p>
											<p className="text-sm text-gray-700 bg-white/50 rounded-lg p-2">{demo.note}</p>
										</div>
									)}

									{/* Action Button */}
									{demo.assignedAt && !demo.completedAt && index === lead.demos.length - 1 && (
										<button
											type="button"
											className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
											onClick={() => setCompleteOpen(true)}
										>
											<HiCheckCircle className="h-4 w-4" />
											Mark as completed
										</button>
									)}
								</div>
							);
						})}
					</div>
				) : (
					<div className="py-12 text-center">
						<p className="text-sm text-gray-600">No demo attempts yet. Once a demo is requested, it will appear here.</p>
					</div>
				)}
			</Panel>

			<Panel title="Activity Timeline" description="Read-only audit trail">
				{leadId ? <ActivityFeed leadId={leadId} /> : null}
			</Panel>

			<Modal
				open={editOpen}
				title="Edit lead"
				description="Update the lead details"
				onClose={() => setEditOpen(false)}
				footer={
					<>
						<button type="button" className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900" onClick={() => setEditOpen(false)}>
							Cancel
						</button>
						<button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => void handleEditSubmit(onEditLead)()} disabled={updateLeadMutation.isPending}>
							<HiPencilSquare className="h-4 w-4" />
							{updateLeadMutation.isPending ? "Saving..." : "Save changes"}
						</button>
					</>
				}
			>
				<form className="grid gap-4" onSubmit={handleEditSubmit(onEditLead)}>
					<Controller name="name" control={editControl} render={({ field, fieldState }) => <Field label="Name" value={field.value ?? ""} onChange={field.onChange} error={fieldState.error?.message} />} />
					<Controller name="phone" control={editControl} render={({ field, fieldState }) => <Field label="Phone" value={field.value ?? ""} onChange={field.onChange} error={fieldState.error?.message} />} />
					<Controller name="level" control={editControl} render={({ field, fieldState }) => <Field label="Level" value={field.value ?? ""} onChange={field.onChange} error={fieldState.error?.message} />} />
				</form>
			</Modal>

			<Modal
				open={reassignOpen}
				title="Reassign lead"
				description="Choose the new owner"
				onClose={() => setReassignOpen(false)}
				footer={
					<>
						<button type="button" className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900" onClick={() => setReassignOpen(false)}>
							Cancel
						</button>
						<button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => void handleReassignSubmit(onReassignLead)()} disabled={updateLeadMutation.isPending}>
							<HiArrowsRightLeft className="h-4 w-4" />
							{updateLeadMutation.isPending ? "Saving..." : "Reassign"}
						</button>
					</>
				}
			>
				<form className="grid gap-4" onSubmit={handleReassignSubmit(onReassignLead)}>
					<Controller
						name="assignedTo"
						control={reassignControl}
						render={({ field, fieldState }) => (
							<label className="grid gap-2 text-sm font-medium text-gray-600">
								<span>Assigned to</span>
								<select className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={field.value ?? ""} onChange={(event) => field.onChange(event.target.value)}>
									<option value="">Select user</option>
									{assignmentOptions.map((user) => (
										<option key={user.id} value={user.id}>{formatUserName(user.name ?? user.username)}{user.id === currentUserId ? " (You)" : ""}</option>
									))}
								</select>
								{fieldState.error?.message ? <p className="text-xs text-red-600">{fieldState.error.message}</p> : null}
							</label>
						)}
					/>
				</form>
			</Modal>

			<Modal
				open={postponeOpen}
				title="Postpone follow-up"
				description={lead ? `Lead ${lead.phone}` : "Lead"}
				onClose={() => {
					setPostponeOpen(false);
					setSelectedDuration(1);
				}}
				footer={
					<>
						<button type="button" className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900" onClick={() => {
							setPostponeOpen(false);
							setSelectedDuration(1);
						}}>
							Cancel
						</button>
						<button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => void handlePostponeSubmit(onPostponeLead)()} disabled={postponeLeadMutation.isPending}>
							<HiCalendarDays className="h-4 w-4" />
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
											? "border-blue-600 bg-blue-600 text-white"
											: "border-gray-300 bg-gray-50 text-gray-900 hover:border-blue-600 hover:bg-blue-600 hover:text-white"
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
											<div className="rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3">
												<p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-600">
													Suggested follow-up times
												</p>
												<div className="flex flex-wrap gap-2">
													{postponeSuggestions.map((suggestion) => (
														<button
															key={`${suggestion.label}-${suggestion.date.toISOString()}`}
															type="button"
															className="rounded-full border border-blue-600/20 bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600"
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
				open={redemoOpen}
				title="Request redemo"
				description="Request another demo attempt. Add a note if needed."
				onClose={() => setRedemoOpen(false)}
				footer={
					<>
						<button type="button" className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900" onClick={() => setRedemoOpen(false)}>
							Cancel
						</button>
						<button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => void handleRedemoSubmit(onRedemoLead)()} disabled={requestRedemoMutation.isPending}>
							<HiArrowPath className="h-4 w-4" />
							{requestRedemoMutation.isPending ? "Saving..." : "Request redemo"}
						</button>
					</>
				}
			>
				<form className="grid gap-4" onSubmit={handleRedemoSubmit(onRedemoLead)}>
					<div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
						A new demo request will be created. Previous mentor will be preselected during assignment, and you can keep or change it.
					</div>
					<Controller name="note" control={redemoControl} render={({ field, fieldState }) => <TextAreaField label="Note (optional)" value={field.value ?? ""} onChange={field.onChange} placeholder="Add redemo note..." error={fieldState.error?.message} />} />
				</form>
			</Modal>

			<Modal
				open={admissionOpen}
				title="Request admission"
				description={lead ? `Default counsellor: ${defaultCounsellorId ? formatUserName(allUsers.find((user) => user.id === defaultCounsellorId)?.name ?? null) : "-"}` : "Select a counsellor"}
				onClose={() => setAdmissionOpen(false)}
				footer={
					<>
						<button type="button" className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900" onClick={() => setAdmissionOpen(false)}>
							Cancel
						</button>
						<button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => void handleAdmissionSubmit(onRequestAdmission)()} disabled={requestAdmissionMutation.isPending}>
							<HiAcademicCap className="h-4 w-4" />
							{requestAdmissionMutation.isPending ? "Saving..." : "Request admission"}
						</button>
					</>
				}
			>
				<form className="grid gap-4" onSubmit={handleAdmissionSubmit(onRequestAdmission)}>
					<Controller name="counsellorId" control={admissionControl} render={({ field, fieldState }) => (
						<label className="grid gap-2 text-sm font-medium text-gray-600">
							<span>Counsellor</span>
							<select className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={field.value ?? ""} onChange={(event) => field.onChange(event.target.value || undefined)}>
								<option value="">Use default counsellor</option>
								{counsellors.map((counsellor) => <option key={counsellor.id} value={counsellor.id}>{formatUserName(counsellor.name ?? counsellor.username)}</option>)}
							</select>
							{fieldState.error?.message ? <p className="text-xs text-red-600">{fieldState.error.message}</p> : null}
						</label>
					)} />
					<Controller name="note" control={admissionControl} render={({ field, fieldState }) => <TextAreaField label="Note (optional)" value={field.value ?? ""} onChange={field.onChange} placeholder="Add admission note..." error={fieldState.error?.message} />} />
				</form>
			</Modal>

			<Modal
				open={deleteOpen}
				title="Delete lead"
				description="This action cannot be undone."
				onClose={() => {
					setDeleteOpen(false);
					setDeleteNote("");
				}}
				footer={
					<>
						<button type="button" className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900" onClick={() => {
							setDeleteOpen(false);
							setDeleteNote("");
						}}>
							Cancel
						</button>
						<button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => void onDeleteLead()} disabled={deleteLeadMutation.isPending}>
							<HiTrash className="h-4 w-4" />
							{deleteLeadMutation.isPending ? "Deleting..." : "Delete lead"}
						</button>
					</>
				}
			>
				<div className="grid gap-4">
					<p className="text-sm text-gray-600">This will permanently remove the lead record from the system.</p>
					<TextAreaField label="Reason for dropping" value={deleteNote} onChange={setDeleteNote} placeholder="Why are we dropping this lead?" />
				</div>
			</Modal>

			<Modal
				open={completeOpen}
				title="Mark demo as completed"
				description="This action cannot be undone"
				onClose={() => setCompleteOpen(false)}
				footer={
					<>
						<button type="button" className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900" onClick={() => setCompleteOpen(false)}>
							Cancel
						</button>
						<button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => void handleCompleteSubmit(onCompleteDemo)()} disabled={markDemoCompletedMutation.isPending}>
							<HiCheckCircle className="h-4 w-4" />
							{markDemoCompletedMutation.isPending ? "Completing..." : "Mark completed"}
						</button>
					</>
				}
			>
				<div className="grid gap-4">
					<div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
						<HiExclamationTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
						<p className="text-sm text-amber-800">
							<strong>Warning:</strong> Marking this demo as completed cannot be undone. This will finalize the demo status for this lead.
						</p>
					</div>
					<form onSubmit={handleCompleteSubmit(onCompleteDemo)}>
						<Controller name="note" control={completeControl} render={({ field, fieldState }) => <TextAreaField label="Completion note (optional)" value={field.value ?? ""} onChange={field.onChange} placeholder="Add notes about demo completion..." error={fieldState.error?.message} />} />
					</form>
				</div>
			</Modal>

				<Modal
				open={revokeConfirmOpen}
				title="Revoke form"
				description="This action cannot be undone"
				onClose={() => setRevokeConfirmOpen(false)}
				footer={
					<>
						<button type="button" className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900" onClick={() => setRevokeConfirmOpen(false)}>
							Cancel
						</button>
						<button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white" onClick={async () => {
							if (!lead) {
								return;
							}

							try {
								await revokeFormLinkMutation.mutateAsync(lead.id);
								toast.success("Form revoked successfully. Lead cannot access the form now.");
								setRevokeConfirmOpen(false);
							} catch (error) {
								if (error instanceof ApiError) {
									toast.error(error.payload.message ?? "Unable to revoke form");
									return;
								}

								toast.error(error instanceof Error ? error.message : "Unable to revoke form");
							}
						}} disabled={revokeFormLinkMutation.isPending}>
							<HiXMark className="h-4 w-4" />
							{revokeFormLinkMutation.isPending ? "Revoking..." : "Revoke form"}
						</button>
					</>
				}
			>
				<div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-3">
					<HiExclamationTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
					<p className="text-sm text-red-800">
						<strong>Warning:</strong> Revoking this form will prevent the lead from accessing it. They will need a new form link to continue. This action cannot be undone.
					</p>
				</div>
			</Modal>

			<Modal
				open={formLinkOpen}
				title="Send form to lead"
				description="Share the form link with the lead"
				onClose={() => {
					setFormLinkOpen(false);
					setFormLinkData(null);
				}}
				footer={
						<>
							<button
								type="button"
								className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
								onClick={() => {
									setFormLinkOpen(false);
									setFormLinkData(null);
								}}
							>
								Close
							</button>
						</>
					}
				>
					{formLinkData ? (
						<div className="grid gap-4">
							<div>
								<p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Form Link</p>
								<div className="flex gap-2">
									<input
										type="text"
										readOnly
										value={formLinkData.formLink}
										className="flex-1 rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 font-mono"
									/>
									<button
										type="button"
										className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
										onClick={() => {
											navigator.clipboard.writeText(formLinkData.formLink);
											toast.success("Link copied to clipboard");
										}}
									>
										Copy
									</button>
								</div>
							</div>

							<button
								type="button"
								className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 w-full"
								onClick={() => {
									const message = `Check this form link: ${formLinkData.formLink}`;
									const encodedMessage = encodeURIComponent(message);
									const whatsappNumber = getWhatsappNumber(lead?.phone);
									window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, "_blank");
								}}
							>
								Share via WhatsApp
							</button>
						</div>
					) : (
						<div className="py-8 text-center text-gray-600">Loading form link...</div>
					)}
				</Modal>
			</div>
		);
	};
