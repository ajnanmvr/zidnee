import { type LeadResponse, ConfirmAdmissionPayloadSchema, PostponeLeadFollowUpPayloadSchema, RedemoLeadPayloadSchema, UpdateLeadPayloadSchema } from "@repo/schema";
import toast from "react-hot-toast";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { HiAcademicCap, HiArrowLeft, HiArrowPath, HiCalendarDays, HiPencilSquare, HiTrash, HiArrowsRightLeft, HiCheckCircle, HiExclamationTriangle } from "react-icons/hi2";
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
} from "@/features/leads/use-lead-mutations";
import { useUsersQuery } from "@/features/users/users.queries";
import { useMeQuery } from "@/features/auth/auth.queries";
import type {
	ConfirmAdmissionForm,
	PostponeLeadFollowUpForm,
	RedemoLeadForm,
} from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

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

const formatDateTime = (value: string | Date | null | undefined) => {
	if (!value) {
		return "-";
	}

	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "-";
	}

	return date.toLocaleString();
};

type LeadIdentity = {
	name?: string;
	phone?: string;
} | null | undefined;

const leadDisplayName = (lead: LeadIdentity) => lead?.name || lead?.phone || "Lead";

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

const DetailItem = ({ label, value }: { label: string; value: string }) => (
	<div className="rounded-3xl border border-gray-300 bg-gray-50/60 p-4">
		<p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-600">{label}</p>
		<p className="mt-2 text-sm font-semibold text-gray-900">{value}</p>
	</div>
);

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
	const [editOpen, setEditOpen] = useState(false);
	const [reassignOpen, setReassignOpen] = useState(false);
	const [postponeOpen, setPostponeOpen] = useState(false);
	const [redemoOpen, setRedemoOpen] = useState(false);
	const [admissionOpen, setAdmissionOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [completeOpen, setCompleteOpen] = useState(false);
	const [formLinkOpen, setFormLinkOpen] = useState(false);
	const [formLinkData, setFormLinkData] = useState<{ formLink: string; expiresAt: string } | null>(null);

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
		() => allUsers.filter((user) => user.roles.some((role) => role.name.toLowerCase() === "counsellor")),
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
	}, [postponeOpen, resetPostpone]);

	useEffect(() => {
		if (!redemoOpen) {
			return;
		}

		resetRedemo({ mentorId: latestDemo?.mentorId ?? undefined, note: "" });
	}, [latestDemo?.mentorId, redemoOpen, resetRedemo]);

	useEffect(() => {
		if (!admissionOpen) {
			return;
		}

		resetAdmission({ counsellorId: defaultCounsellorId, note: "" });
	}, [admissionOpen, defaultCounsellorId, resetAdmission]);

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

		if (!confirm("Request demo for this lead?")) {
			return;
		}

		try {
			await requestDemoMutation.mutateAsync(lead.id);
			toast.success("Demo requested.");
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

	const onDeleteLead = async () => {
		if (!lead) {
			return;
		}

		if (!confirm("Delete this lead?")) {
			return;
		}

		try {
			await deleteLeadMutation.mutateAsync(lead.id);
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
							<h1 className="text-3xl font-bold tracking-tight text-gray-900">{lead?.name || lead?.phone || "Lead"}</h1>
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
						{!lead?.formCompleted ? (
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
						) : null}
						{!latestDemo ? (
							<button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => void onRequestDemo()} disabled={requestDemoMutation.isPending}>
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

			<div className="grid gap-6 xl:grid-cols-3">
				<Panel title="Lead Overview" description="Core identity and assignment information">
					<div className="grid gap-3">
						<DetailItem label="Phone" value={lead?.phone ?? "-"} />
						<DetailItem label="Name" value={lead?.name ?? "-"} />
						<DetailItem label="Level" value={lead?.level ?? "-"} />
						<DetailItem label="Assigned to" value={currentAssignee ? formatUserName(currentAssignee.name ?? currentAssignee.username) : "Unassigned"} />
						<DetailItem label="Created by" value={lead?.createdBy ? formatUserName(allUsers.find((user) => user.id === lead.createdBy)?.name ?? null) : "-"} />
						<DetailItem label="Next follow-up" value={formatDateTime(lead?.nextFollowUpAt)} />
					</div>
				</Panel>

				<Panel title="Workflow" description="Current lifecycle and demo state">
					<div className="grid gap-3">
						<DetailItem label="Form sent" value={lead?.formSent ? "Yes" : "No"} />
						<DetailItem label="Form completed" value={lead?.formCompleted ? "Yes" : "No"} />
						<DetailItem label="Follow-up state" value={statusSummary} />
						<DetailItem label="Latest demo" value={latestDemo ? "Available" : "Not requested"} />
						<DetailItem label="Latest demo mentor" value={latestDemo?.mentorId ? formatUserName(allUsers.find((user) => user.id === latestDemo.mentorId)?.name ?? null) : "-"} />
						<DetailItem label="Demo scheduled for" value={formatDateTime(latestDemo?.demoScheduledFor)} />
					</div>
				</Panel>

				<Panel title="Timeline Snapshot" description="Lead and demo timestamps">
					<div className="grid gap-3">
						<DetailItem label="Demo requested" value={formatDateTime(latestDemo?.requestedAt)} />
						<DetailItem label="Demo assigned" value={formatDateTime(latestDemo?.assignedAt)} />
						<DetailItem label="Admission requested" value={formatDateTime(latestDemo?.admissionRequestedAt)} />
						<DetailItem label="Admission completed" value={formatDateTime(latestDemo?.admissionCompletedAt)} />
					</div>
				</Panel>
			</div>

			<Panel title="Demo History" description="All demo entries for this lead">
				{lead?.demos?.length ? (
					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{lead.demos.map((demo, index) => (
							<div key={`${index}-${demo.requestedAt ?? index}`} className="rounded-3xl border border-gray-300 bg-gray-50/60 p-4">
								<div className="flex items-center justify-between gap-3 mb-4">
									<p className="text-sm font-semibold text-gray-900">Demo {index + 1}</p>
									<span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600">
										{demo.completedAt ? "Completed" : demo.admissionCompletedAt ? "Admission completed" : demo.admissionRequestedAt ? "Admission requested" : demo.assignedAt ? "Assigned" : demo.requestedAt ? "Requested" : "Pending"}
									</span>
								</div>
								<div className="grid gap-3 text-xs">
									{/* Request Section */}
									{demo.requestedAt && (
										<div className="space-y-1.5">
											<p className="text-[10px] font-semibold uppercase tracking-wide text-gray-600">Request</p>
											<div className="flex justify-between items-start">
												<span className="font-semibold text-gray-600">Requested</span>
												<span className="text-gray-900 text-right">{formatDateTime(demo.requestedAt)}</span>
											</div>
										</div>
									)}

									{/* Assignment Section */}
									{demo.assignedAt && (
										<div className="border-t border-gray-300 pt-3 space-y-1.5">
											<p className="text-[10px] font-semibold uppercase tracking-wide text-gray-600">Assignment</p>
											<div className="flex justify-between items-start">
												<span className="font-semibold text-gray-600">Mentor</span>
												<span className="text-gray-900 text-right">{demo.mentorId ? formatUserName(allUsers.find((user) => user.id === demo.mentorId)?.name ?? null) : "-"}</span>
											</div>
											<div className="flex justify-between items-start">
												<span className="font-semibold text-gray-600">Assigned</span>
												<span className="text-gray-900 text-right">{formatDateTime(demo.assignedAt)}</span>
											</div>
											{demo.demoScheduledFor && (
												<div className="flex justify-between items-start">
													<span className="font-semibold text-gray-600">Scheduled</span>
													<span className="text-gray-900 text-right">{formatDateTime(demo.demoScheduledFor)}</span>
												</div>
											)}
										</div>
									)}

									{/* Completion Section */}
									{demo.completedAt && (
										<div className="border-t border-gray-300 pt-3 space-y-1.5">
											<p className="text-[10px] font-semibold uppercase tracking-wide text-gray-600">Completion</p>
											<div className="flex justify-between items-start">
												<span className="font-semibold text-gray-600">Completed</span>
												<span className="text-gray-900 text-right">{formatDateTime(demo.completedAt)}</span>
											</div>
										</div>
									)}

									{/* Admission Section */}
									{(demo.admissionRequestedAt || demo.admissionCompletedAt) && (
										<div className="border-t border-gray-300 pt-3 space-y-1.5">
											<p className="text-[10px] font-semibold uppercase tracking-wide text-gray-600">Admission</p>
											{demo.admissionRequestedAt && (
												<div className="flex justify-between items-start">
													<span className="font-semibold text-gray-600">Requested</span>
													<span className="text-gray-900 text-right">{formatDateTime(demo.admissionRequestedAt)}</span>
												</div>
											)}
											{demo.admissionCompletedAt && (
												<div className="flex justify-between items-start">
													<span className="font-semibold text-gray-600">Completed</span>
													<span className="text-gray-900 text-right">{formatDateTime(demo.admissionCompletedAt)}</span>
												</div>
											)}
										</div>
									)}

									{/* Note Section */}
									{demo.note && (
										<div className="border-t border-gray-300 pt-3">
											<p className="text-xs font-semibold text-gray-600 mb-2">Note</p>
											<p className="text-gray-900 text-xs bg-gray-50/40 rounded-lg p-2">{demo.note}</p>
										</div>
									)}
								</div>
								{demo.assignedAt && !demo.completedAt && index === lead.demos.length - 1 && (
									<button
										type="button"
										className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
										onClick={() => setCompleteOpen(true)}
									>
										<HiCheckCircle className="h-3 w-3" aria-hidden="true" />
										Mark as completed
									</button>
								)}
							</div>
						))}
					</div>
				) : (
					<div className="py-6 text-sm text-gray-600">No demo history yet.</div>
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
				onClose={() => setPostponeOpen(false)}
				footer={
					<>
						<button type="button" className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900" onClick={() => setPostponeOpen(false)}>
							Cancel
						</button>
						<button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => void handlePostponeSubmit(onPostponeLead)()} disabled={postponeLeadMutation.isPending}>
							<HiCalendarDays className="h-4 w-4" />
							{postponeLeadMutation.isPending ? "Saving..." : "Save postpone"}
						</button>
					</>
				}
			>
				<form className="grid gap-4" onSubmit={handlePostponeSubmit(onPostponeLead)}>
					<Controller name="customNextFollowUpAt" control={postponeControl} render={({ field, fieldState }) => <Field label="Next follow-up date" type="datetime-local" value={toInputDateTimeLocal(field.value)} onChange={(value) => { if (!value) { field.onChange(undefined); return; } field.onChange(new Date(value)); }} error={fieldState.error?.message} />} />
					<Controller name="note" control={postponeControl} render={({ field, fieldState }) => <TextAreaField label="Note (optional)" value={field.value ?? ""} onChange={field.onChange} placeholder="Add notes about the follow-up..." error={fieldState.error?.message} />} />
				</form>
			</Modal>

			<Modal
				open={redemoOpen}
				title="Request redemo"
				description={lead ? `Previous mentor: ${latestDemo?.mentorId ? formatUserName(allUsers.find((user) => user.id === latestDemo.mentorId)?.name ?? null) : "-"}` : "Request a new demo attempt"}
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
				onClose={() => setDeleteOpen(false)}
				footer={
					<>
						<button type="button" className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900" onClick={() => setDeleteOpen(false)}>
							Cancel
						</button>
						<button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => void onDeleteLead()} disabled={deleteLeadMutation.isPending}>
							<HiTrash className="h-4 w-4" />
							{deleteLeadMutation.isPending ? "Deleting..." : "Delete lead"}
						</button>
					</>
				}
			>
				<p className="text-sm text-gray-600">This will permanently remove the lead record from the system.</p>
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
						<HiExclamationTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
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

							<div>
								<p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Expires at</p>
								<p className="text-sm text-gray-900">{new Date(formLinkData.expiresAt).toLocaleString()}</p>
							</div>

							<button
								type="button"
								className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 w-full"
								onClick={() => {
									const message = `Check this form link: ${formLinkData.formLink}`;
									const encodedMessage = encodeURIComponent(message);
									const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
									window.open(whatsappUrl, "_blank");
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
