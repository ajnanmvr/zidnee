import {
	ConfirmAdmissionPayloadSchema,
	CreateLeadPayloadSchema,
	type LeadResponse,
	PostponeLeadFollowUpPayloadSchema,
	RedemoLeadPayloadSchema,
} from "@repo/schema";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";
import {
	HiAcademicCap,
	HiArrowPath,
	HiCalendarDays,
	HiPlusCircle,
	HiTrash,
} from "react-icons/hi2";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "@/api/request";
import { DataTable } from "@/components/DataTable";
import { Field, Modal, Panel, TextAreaField } from "@/components/dashboard-ui";
import { useMeQuery } from "@/features/auth/auth.queries";
import { getLatestLeadDemo } from "@/features/dashboard/lead-demo-utils";
import {
	buildLeadColumns,
	formatUserName,
} from "@/features/dashboard/lead-table";
import {
	type LeadStageId,
	leadStageDefinitions,
} from "@/features/leads/lead-stage-filters";
import { useDueLeadFollowUpsQuery } from "@/features/leads/leads.queries";
import {
	useCancelLeadDemoMutation,
	useCreateLeadMutation,
	useDeleteLeadMutation,
	useGenerateFormLinkMutation,
	useMarkDemoCompletedMutation,
	usePostponeLeadFollowUpMutation,
	useRequestAdmissionMutation,
	useRequestLeadDemoMutation,
	useRequestRedemoMutation,
	useUpdateLeadMutation,
} from "@/features/leads/use-lead-mutations";
import { useUsersQuery } from "@/features/users/users.queries";
import type {
	ConfirmAdmissionForm,
	CreateLeadForm,
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

const isCounsellorRole = (roleType: string) => roleType === "counsellor";
const isSalesRole = (roleType: string) => roleType === "sales";

const getWhatsappNumber = (phone?: string | null) =>
	phone?.replace(/\D/g, "") ?? "";

export const LeadsPage = () => {
	const { token } = useSession();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const meQuery = useMeQuery(token);

	const hasPermission = (key?: string) =>
		Boolean(meQuery.data?.permissions?.some((p) => p.key === key));
	const [currentPage, setCurrentPage] = useState(1);
	const [sortBy, setSortBy] = useState<string>("nextFollowUpAt");
	// Default sort: past → future (ascending)
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

	const stageParam = searchParams.get("stage");
	const activeStage: LeadStageId = leadStageDefinitions.some(
		(stage) => stage.id === stageParam,
	)
		? (stageParam as LeadStageId)
		: "all";
	const canReadAllLeads =
		meQuery.data?.permissions?.some(
			(permission) => permission.key === "LEAD_READ_ALL",
		) ?? false;
	const scopeParam = searchParams.get("scope");
	const activeScope = scopeParam === "all" && canReadAllLeads ? "all" : "mine";

	// Map stage to status for backend filtering
	const stageToStatus = (stage: LeadStageId): string | undefined => {
		switch (stage) {
			case "followUp":
				return "FOLLOW_UP";
			case "formSent":
				return "FORM_SENT";
			case "formFilled":
				return "FORM_FILLED";
			case "demoRequest":
				return "DEMO_REQUEST";
			case "demoAssigned":
				return "DEMO_ASSIGNED";
			case "demoCompleted":
				return "DEMO_COMPLETED";
			case "closed":
				return "CLOSED";
			default:
				return undefined;
		}
	};

	const activeLeadsQuery = useDueLeadFollowUpsQuery(token, {
		scope: activeScope,
		timeFilter: "all",
		status: stageToStatus(activeStage),
		page: currentPage,
		sortBy,
		sortOrder,
	});
	const usersQuery = useUsersQuery(token);
	const createLeadMutation = useCreateLeadMutation();
	const requestRedemoMutation = useRequestRedemoMutation();
	const requestAdmissionMutation = useRequestAdmissionMutation();
	const requestDemoMutation = useRequestLeadDemoMutation();
	const updateLeadMutation = useUpdateLeadMutation();
	const markDemoCompletedMutation = useMarkDemoCompletedMutation();
	const generateFormLinkMutation = useGenerateFormLinkMutation();
	const cancelLeadDemoMutation = useCancelLeadDemoMutation();
	const postponeLeadMutation = usePostponeLeadFollowUpMutation();
	const deleteLeadMutation = useDeleteLeadMutation();
	const [createOpen, setCreateOpen] = useState(false);
	const [formLinkOpen, setFormLinkOpen] = useState(false);
	const [formLinkData, setFormLinkData] = useState<{ formLink: string } | null>(
		null,
	);
	const [formLinkPhone, setFormLinkPhone] = useState<string | null>(null);
	const [courseTypeLead, setCourseTypeLead] = useState<LeadResponse | null>(
		null,
	);
	const [courseTypeSelection, setCourseTypeSelection] = useState<
		"GROUP" | "INDIVIDUAL" | ""
	>("");
	const [postponeLeadId, setPostponeLeadId] = useState<string | null>(null);
	const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
	const [deleteNote, setDeleteNote] = useState("");
	const [admissionLeadId, setAdmissionLeadId] = useState<string | null>(null);
	const [completeLeadId, setCompleteLeadId] = useState<string | null>(null);
	const [redemoLeadId, setRedemoLeadId] = useState<string | null>(null);
	const [requestDemoOpen, setRequestDemoOpen] = useState(false);
	const [requestDemoLeadId, setRequestDemoLeadId] = useState<string | null>(
		null,
	);
	const [selectedRequestCounsellor, setSelectedRequestCounsellor] = useState<
		string | undefined
	>(undefined);
	const [selectedDuration, setSelectedDuration] = useState<number | null>(1);

	const confirmRequestDemo = async () => {
		if (!requestDemoLeadId) return;

		if (!selectedRequestCounsellor) {
			toast.error("Please select a counsellor before requesting a demo.");
			return;
		}

		try {
			await updateLeadMutation.mutateAsync({
				leadId: requestDemoLeadId,
				payload: { demoRequestAssignedTo: selectedRequestCounsellor },
			});
			await requestDemoMutation.mutateAsync(requestDemoLeadId);
			toast.success("Demo requested.");
			setRequestDemoOpen(false);
			setRequestDemoLeadId(null);
			setSelectedRequestCounsellor(undefined);
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Unable to request demo");
				return;
			}
			toast.error(
				error instanceof Error ? error.message : "Unable to request demo",
			);
		}
	};

	const sendFormForLead = async (lead: LeadResponse) => {
		if (!lead.courseType) {
			setCourseTypeLead(lead);
			setCourseTypeSelection("");
			return;
		}

		const result = await generateFormLinkMutation.mutateAsync(lead.id);
		setFormLinkData(result);
		setFormLinkPhone(lead.phone ?? null);
		setFormLinkOpen(true);
	};

	const onConfirmCourseTypeAndSend = async () => {
		if (!courseTypeLead || !courseTypeSelection) {
			toast.error("Select course type to continue");
			return;
		}

		try {
			await updateLeadMutation.mutateAsync({
				leadId: courseTypeLead.id,
				payload: { courseType: courseTypeSelection },
			});
			const result = await generateFormLinkMutation.mutateAsync(
				courseTypeLead.id,
			);
			setFormLinkData(result);
			setFormLinkPhone(courseTypeLead.phone ?? null);
			setFormLinkOpen(true);
			setCourseTypeLead(null);
			setCourseTypeSelection("");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to send form",
			);
		}
	};

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

	const allUsers = usersQuery.data?.users ?? [];
	const counsellors = useMemo(
		() =>
			allUsers.filter((user) =>
				user.roles.some((role) => isCounsellorRole(role.type ?? "general")),
			),
		[allUsers],
	);
	const salesUsers = useMemo(
		() =>
			allUsers.filter((user) =>
				user.roles.some((role) => isSalesRole(role.type ?? "general")),
			),
		[allUsers],
	);
	const userNameById = useMemo(
		() =>
			new Map(
				allUsers.map((user) => [
					user.id,
					formatUserName(user.name ?? user.username),
				]),
			),
		[allUsers],
	);
	const currentUserId = meQuery.data?.id;
	const scopeLeads = activeLeadsQuery.data?.leads ?? [];
	const pagination = activeLeadsQuery.data?.pagination;
	const activeStageDefinition = leadStageDefinitions.find(
		(stage) => stage.id === activeStage,
	);

	const buildSearch = (stage: LeadStageId, scope: "all" | "mine") => {
		const params = new URLSearchParams();
		if (stage !== "all") {
			params.set("stage", stage);
		}
		if (scope === "all") {
			params.set("scope", "all");
		}
		const query = params.toString();
		return query ? `?${query}` : "";
	};

	const postponeNoteValue = useWatch({
		control: postponeControl,
		name: "note",
	});
	const postponeSuggestions = postponeNoteValue
		? formatSuggestionsForUI(postponeNoteValue)
		: [];

	useEffect(() => {
		if (!createOpen) {
			return;
		}

		const defaultAssignedTo = salesUsers.some(
			(user) => user.id === currentUserId,
		)
			? (currentUserId ?? "")
			: "";

		resetCreate({
			phone: "",
			name: "",
			assignedTo: defaultAssignedTo,
			customNextFollowUpAt: undefined,
		});
	}, [createOpen, currentUserId, resetCreate, salesUsers]);

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

			toast.error(
				error instanceof Error ? error.message : "Unable to create lead",
			);
		}
	};

	const leads = scopeLeads;

	const onPostponeLead = async (payload: PostponeLeadFollowUpForm) => {
		if (!postponeLeadId) {
			return;
		}

		const validation = PostponeLeadFollowUpPayloadSchema.safeParse(payload);
		if (!validation.success) {
			const error =
				validation.error.flatten().fieldErrors.customNextFollowUpAt?.[0];
			if (error) {
				setPostponeError("customNextFollowUpAt", {
					type: "manual",
					message: error,
				});
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
					setPostponeError("customNextFollowUpAt", {
						type: "server",
						message: dtError,
					});
				}
				toast.error(error.payload.message ?? "Unable to postpone follow-up");
				return;
			}

			toast.error(
				error instanceof Error ? error.message : "Unable to postpone follow-up",
			);
		}
	};

	const onDeleteLead = async () => {
		if (!deleteLeadId) {
			return;
		}
		if (!deleteNote.trim()) {
			toast.error("Please add a reason for dropping this lead.");
			return;
		}
		try {
			await deleteLeadMutation.mutateAsync({
				leadId: deleteLeadId,
				note: deleteNote.trim(),
			});
			toast.success("Lead closed successfully.");
			setDeleteLeadId(null);
			setDeleteNote("");
			navigate("/leads?stage=closed");
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Unable to delete lead");
				return;
			}
			toast.error(
				error instanceof Error ? error.message : "Unable to delete lead",
			);
		}
	};

	const onCompleteDemo = async (payload: { note?: string }) => {
		if (!completeLeadId) {
			return;
		}

		try {
			await markDemoCompletedMutation.mutateAsync({
				leadId: completeLeadId,
				note: payload.note,
			});
			toast.success("Demo marked as completed.");
			setCompleteLeadId(null);
			resetComplete({ note: "" });
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(
					error.payload.message ?? "Unable to mark demo as completed",
				);
				return;
			}

			toast.error(
				error instanceof Error
					? error.message
					: "Unable to mark demo as completed",
			);
		}
	};

	const onRedemoLead = async (payload: RedemoLeadForm) => {
		if (!redemoLeadId) return;
		const validation = RedemoLeadPayloadSchema.safeParse(payload);
		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			if (errors.note?.[0])
				setRedemoError("note", { type: "manual", message: errors.note[0] });
			return;
		}
		try {
			await requestRedemoMutation.mutateAsync({
				leadId: redemoLeadId,
				payload: validation.data,
			});
			toast.success("Lead moved for redemo.");
			setRedemoLeadId(null);
			resetRedemo({ note: "" });
			navigate("/leads");
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Unable to request redemo");
				return;
			}
			toast.error(
				error instanceof Error ? error.message : "Unable to request redemo",
			);
		}
	};

	const onRequestAdmission = async (payload: ConfirmAdmissionForm) => {
		if (!admissionLeadId) return;
		const validation = ConfirmAdmissionPayloadSchema.safeParse(payload);
		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			if (errors.counsellorId?.[0]) {
				setAdmissionError("counsellorId", {
					type: "manual",
					message: errors.counsellorId[0],
				});
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
			navigate("/leads?stage=converted");
		} catch (error) {
			if (error instanceof ApiError) {
				const counsellorError = error.payload.errors?.counsellorId?.[0];
				if (counsellorError) {
					setAdmissionError("counsellorId", {
						type: "server",
						message: counsellorError,
					});
				}
				toast.error(
					error.payload.message ?? "Unable to move lead to admission",
				);
				return;
			}
			toast.error(
				error instanceof Error
					? error.message
					: "Unable to move lead to admission",
			);
		}
	};

	const selectedLead = leads.find((lead) => lead.id === postponeLeadId) ?? null;
	const admissionLead =
		leads.find((lead) => lead.id === admissionLeadId) ?? null;
	const admissionLeadLatestDemo = admissionLead
		? getLatestLeadDemo(admissionLead)
		: null;
	const defaultCounsellorId = admissionLeadLatestDemo?.mentorId
		? allUsers.find((user) => user.id === admissionLeadLatestDemo.mentorId)
				?.counsellorId
		: undefined;

	const columns = useMemo(
		() =>
			buildLeadColumns({
				activeStage,
				userNameById,
				getActions: () => {
					// permission checks
					const canManageForm = hasPermission("LEAD_FORM_MANAGE");
					const canRequestDemo = hasPermission("LEAD_DEMO_REQUEST");
					const canCompleteDemo = hasPermission("LEAD_DEMO_COMPLETE");

					switch (activeStage) {
						case "followUp":
							return [
								{
									key: "postpone",
									label: "Postpone",
									onClick: (item) => setPostponeLeadId(item.id),
									className:
										"inline-flex items-center rounded-2xl border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-50",
								},
								...(canManageForm
									? [
											{
												key: "sendForm",
												label: "Send Form",
												onClick: async (item: LeadResponse) => {
													try {
														await sendFormForLead(item);
													} catch (error) {
														toast.error(
															error instanceof Error
																? error.message
																: "Unable to generate form link",
														);
													}
												},
												className:
													"inline-flex items-center rounded-2xl border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50",
											},
										]
									: []),
							];
						case "formSent":
							return [
								{
									key: "copyFormLink",
									label: "Copy Form Link",
									onClick: async (item: LeadResponse) => {
										try {
											const result = await generateFormLinkMutation.mutateAsync(
												item.id,
											);
											setFormLinkData(result);
											setFormLinkPhone(item.phone ?? null);
											setFormLinkOpen(true);
										} catch (error) {
											if (error instanceof ApiError) {
												toast.error(
													error.payload.message ?? "Unable to open form link",
												);
												return;
											}
											toast.error(
												error instanceof Error
													? error.message
													: "Unable to open form link",
											);
										}
									},
									className:
										"inline-flex items-center rounded-2xl border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50",
								},
							];
						case "formFilled":
							return [
								...(canRequestDemo
									? [
											{
												key: "requestDemo",
												label: "Request Demo",
												onClick: (item: LeadResponse) => {
													setRequestDemoLeadId(item.id);
													setRequestDemoOpen(true);
												},
												className:
													"inline-flex items-center rounded-2xl border border-sky-300 px-3 py-1.5 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-50",
											},
										]
									: []),
							];
						case "demoRequest":
							return [
								{
									key: "cancelRequest",
									label: "Cancel Request",
									onClick: async (item) => {
										if (!confirm("Cancel this demo request?")) {
											return;
										}
										try {
											await cancelLeadDemoMutation.mutateAsync(item.id);
											toast.success("Demo request cancelled.");
										} catch (error) {
											if (error instanceof ApiError) {
												toast.error(
													error.payload.message ?? "Unable to cancel request",
												);
												return;
											}
											toast.error(
												error instanceof Error
													? error.message
													: "Unable to cancel request",
											);
										}
									},
									className:
										"inline-flex items-center rounded-2xl border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50",
								},
							];
						case "demoAssigned":
							return [
								...(canCompleteDemo
									? [
											{
												key: "markCompleted",
												label: "Mark as Completed",
												onClick: (item: LeadResponse) => {
													setCompleteLeadId(item.id);
													resetComplete({ note: "" });
												},
												className:
													"inline-flex items-center rounded-2xl border border-violet-300 px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-50",
											},
										]
									: []),
								{
									key: "cancel",
									label: "Cancel",
									onClick: async (item) => {
										if (!confirm("Cancel this scheduled demo?")) {
											return;
										}
										try {
											await cancelLeadDemoMutation.mutateAsync(item.id);
											toast.success("Scheduled demo cancelled.");
										} catch (error) {
											if (error instanceof ApiError) {
												toast.error(
													error.payload.message ?? "Unable to cancel demo",
												);
												return;
											}
											toast.error(
												error instanceof Error
													? error.message
													: "Unable to cancel demo",
											);
										}
									},
									className:
										"inline-flex items-center rounded-2xl border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50",
								},
							];
						case "demoCompleted":
							return [
								{
									key: "toAdmission",
									label: "To Admission",
									onClick: (item) => setAdmissionLeadId(item.id),
									className:
										"inline-flex items-center rounded-2xl border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50",
								},
								{
									key: "redemo",
									label: "Redemo",
									onClick: (item) => setRedemoLeadId(item.id),
									className:
										"inline-flex items-center rounded-2xl border border-orange-300 px-3 py-1.5 text-xs font-semibold text-orange-700 transition-colors hover:bg-orange-50",
								},
							];
						default:
							return [];
					}
				},
			}),
		[
			activeStage,
			cancelLeadDemoMutation,
			generateFormLinkMutation,
			resetComplete,
			userNameById,
		],
	);

	return (
		<div className="grid gap-6">
			<div className="sticky top-4 z-30">
				<div className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm border border-gray-200">
					<div>
						<h2 className="text-lg font-semibold">Leads</h2>
						<p className="text-sm text-gray-600">{`${activeScope === "all" ? "All users" : "Your"} leads${activeStageDefinition ? ` · ${activeStageDefinition.description}` : ""}`}</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<Link
							to={buildSearch(activeStage, "mine")}
							className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${activeScope === "mine" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-900 hover:border-blue-600 hover:text-blue-600"}`}
						>
							My leads
						</Link>
						<Link
							to={buildSearch(activeStage, "all")}
							className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${activeScope === "all" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-900 hover:border-blue-600 hover:text-blue-600"}`}
						>
							All users in stage
						</Link>
						{hasPermission("LEAD_CREATE") ? (
							<button
								type="button"
								className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
								onClick={() => setCreateOpen(true)}
							>
								<HiPlusCircle className="h-4 w-4" aria-hidden="true" />
								Create lead
							</button>
						) : null}
					</div>
				</div>
			</div>

			<Panel title="Lead Details">
				<div className="flex flex-wrap gap-2 rounded-3xl border border-gray-300 bg-white p-3">
					{leadStageDefinitions.map((stage) => {
						const isActive = stage.id === activeStage;
						return (
							<Link
								key={stage.id}
								to={buildSearch(stage.id, activeScope)}
								className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${isActive ? "bg-blue-600 text-white" : "border border-gray-300 bg-gray-50 text-gray-700 hover:border-blue-600 hover:text-blue-600"}`}
							>
								{stage.label}
							</Link>
						);
					})}
				</div>

				{activeLeadsQuery.isLoading ? (
					<div className="py-8 text-center text-gray-600">Loading...</div>
				) : activeLeadsQuery.isError ? (
					<div className="py-8 text-center text-gray-600">
						Unable to load leads.
					</div>
				) : (
					<>
						<DataTable
							columns={columns}
							data={scopeLeads}
							exportFilename={`leads-${activeScope}-${activeStage}`}
							searchPlaceholder={`Search ${activeScope === "all" ? "all users" : "my"} leads...`}
							sortBy={sortBy}
							onSortByChange={(value) => {
								setSortBy(value);
								setCurrentPage(1);
							}}
							sortOrder={sortOrder}
							onSortOrderToggle={() =>
								setSortOrder(sortOrder === "asc" ? "desc" : "asc")
							}
							sortOptions={[
								{ value: "nextFollowUpAt", label: "Next Follow-up" },
								{ value: "createdAt", label: "Created Date" },
								{ value: "updatedAt", label: "Updated Date" },
								{ value: "name", label: "Lead Name" },
								{ value: "phone", label: "Phone" },
							]}
						/>
						{pagination && (
							<div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 mt-4">
								<div className="text-sm text-gray-600">
									Showing {(currentPage - 1) * 25 + 1}–
									{Math.min(currentPage * 25, pagination.total)} of{" "}
									{pagination.total} items
								</div>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
										disabled={currentPage === 1}
										className="rounded px-3 py-2 text-sm font-medium disabled:opacity-50 hover:bg-gray-200"
									>
										← Prev
									</button>
									{Array.from(
										{ length: pagination.totalPages },
										(_, i) => i + 1,
									).map((page) => (
										<button
											key={page}
											type="button"
											onClick={() => setCurrentPage(page)}
											className={`rounded px-3 py-2 text-sm font-medium ${
												page === currentPage
													? "bg-blue-500 text-white"
													: "bg-white text-gray-700 hover:bg-gray-100"
											}`}
										>
											{page}
										</button>
									))}
									<button
										type="button"
										onClick={() =>
											setCurrentPage(
												Math.min(pagination.totalPages, currentPage + 1),
											)
										}
										disabled={currentPage === pagination.totalPages}
										className="rounded px-3 py-2 text-sm font-medium disabled:opacity-50 hover:bg-gray-200"
									>
										Next →
									</button>
								</div>
							</div>
						)}
					</>
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
				<form
					className="grid gap-4"
					onSubmit={handleCreateSubmit(onCreateLead)}
				>
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
									{salesUsers.map((user) => (
										<option key={user.id} value={user.id}>
											{formatUserName(user.name ?? user.username)}
											{user.id === currentUserId ? " (You)" : ""}
										</option>
									))}
								</select>
								{fieldState.error?.message ? (
									<p className="text-xs text-red-600">
										{fieldState.error.message}
									</p>
								) : null}
							</label>
						)}
					/>
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
								value={
									field.value
										? toInputDateTimeLocal(field.value.toISOString())
										: ""
								}
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
				open={Boolean(courseTypeLead)}
				title="Select Course Type"
				description="Choose Group or Individual before sending the form"
				onClose={() => {
					setCourseTypeLead(null);
					setCourseTypeSelection("");
				}}
				footer={
					<>
						<button
							type="button"
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
							onClick={() => {
								setCourseTypeLead(null);
								setCourseTypeSelection("");
							}}
						>
							Cancel
						</button>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
							onClick={() => void onConfirmCourseTypeAndSend()}
							disabled={
								!courseTypeSelection ||
								updateLeadMutation.isPending ||
								generateFormLinkMutation.isPending
							}
						>
							{updateLeadMutation.isPending ||
							generateFormLinkMutation.isPending
								? "Saving..."
								: "Save & Send Form"}
						</button>
					</>
				}
			>
				<label className="grid gap-2 text-sm font-medium text-gray-700">
					<span>Course Type</span>
					<select
						className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
						value={courseTypeSelection}
						onChange={(event) =>
							setCourseTypeSelection(
								event.target.value as "GROUP" | "INDIVIDUAL" | "",
							)
						}
					>
						<option value="">Select course type</option>
						<option value="GROUP">Group</option>
						<option value="INDIVIDUAL">Individual</option>
					</select>
				</label>
			</Modal>

			<Modal
				open={requestDemoOpen}
				onClose={() => setRequestDemoOpen(false)}
				title="Request demo and assign counsellor"
			>
				<div className="space-y-4">
					<p className="text-sm text-slate-600">
						Select a counsellor who will coordinate and schedule the demo.
					</p>
					<select
						value={selectedRequestCounsellor ?? ""}
						onChange={(e) => setSelectedRequestCounsellor(e.target.value)}
						className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2"
					>
						<option value="" disabled>
							Select counsellor
						</option>
						{allUsers
							.filter((u) =>
								u.roles.some((r) => (r.type ?? "general") === "counsellor"),
							)
							.map((c) => (
								<option key={c.id} value={c.id}>
									{c.name || c.username}
								</option>
							))}
					</select>
					<div className="flex justify-end gap-2">
						<button
							type="button"
							onClick={() => setRequestDemoOpen(false)}
							className="rounded-2xl border px-4 py-2"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={confirmRequestDemo}
							disabled={!selectedRequestCounsellor}
							className="rounded-2xl bg-brand px-4 py-2 text-white disabled:opacity-50"
						>
							Confirm
						</button>
					</div>
				</div>
			</Modal>

			<Modal
				open={formLinkOpen}
				title="Share form link"
				description="Share the form link with the lead"
				onClose={() => {
					setFormLinkOpen(false);
					setFormLinkData(null);
					setFormLinkPhone(null);
				}}
				footer={
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
				}
			>
				{formLinkData ? (
					<div className="grid gap-4">
						<div>
							<p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
								Form Link
							</p>
							<div className="flex gap-2">
								<input
									type="text"
									readOnly
									value={formLinkData.formLink}
									className="flex-1 rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 font-mono text-sm text-gray-900"
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
							className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700"
							onClick={() => {
								const message = `Check this form link: ${formLinkData.formLink}`;
								const encodedMessage = encodeURIComponent(message);
								const whatsappNumber = getWhatsappNumber(formLinkPhone);
								window.open(
									`https://wa.me/${whatsappNumber}?text=${encodedMessage}`,
									"_blank",
								);
							}}
						>
							Share via WhatsApp
						</button>
					</div>
				) : (
					<div className="py-8 text-center text-gray-600">
						Loading form link...
					</div>
				)}
			</Modal>

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
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
							onClick={() => {
								setPostponeLeadId(null);
								setSelectedDuration(1);
							}}
						>
							Cancel
						</button>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white"
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
										? "border-blue-600 bg-blue-600 text-white"
										: "border-gray-300 bg-gray-50 text-gray-900 hover:border-blue-600 hover:bg-blue-600 hover:text-white"
								}`}
								onClick={() => {
									const futureDate = new Date(
										Date.now() + option.days * 24 * 60 * 60 * 1000,
									);
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
				open={Boolean(completeLeadId)}
				title="Mark demo as completed"
				description="This action cannot be undone"
				onClose={() => {
					setCompleteLeadId(null);
					resetComplete({ note: "" });
				}}
				footer={
					<>
						<button
							type="button"
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
							onClick={() => {
								setCompleteLeadId(null);
								resetComplete({ note: "" });
							}}
						>
							Cancel
						</button>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
							onClick={() => void handleCompleteSubmit(onCompleteDemo)()}
							disabled={markDemoCompletedMutation.isPending}
						>
							<HiAcademicCap className="h-4 w-4" aria-hidden="true" />
							{markDemoCompletedMutation.isPending
								? "Completing..."
								: "Mark completed"}
						</button>
					</>
				}
			>
				<div className="grid gap-4">
					<div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
						<p className="text-sm text-amber-800">
							<strong>Warning:</strong> Marking this demo as completed cannot be
							undone.
						</p>
					</div>
					<form onSubmit={handleCompleteSubmit(onCompleteDemo)}>
						<Controller
							name="note"
							control={completeControl}
							render={({ field, fieldState }) => (
								<TextAreaField
									label="Completion note (optional)"
									value={field.value ?? ""}
									onChange={field.onChange}
									placeholder="Add notes about demo completion..."
									error={fieldState.error?.message}
								/>
							)}
						/>
					</form>
				</div>
			</Modal>

			<Modal
				open={Boolean(redemoLeadId)}
				title="Request redemo"
				description="Request another demo attempt. Add a note if needed."
				onClose={() => {
					setRedemoLeadId(null);
					resetRedemo({ note: "" });
				}}
				footer={
					<>
						<button
							type="button"
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
							onClick={() => {
								setRedemoLeadId(null);
								resetRedemo({ note: "" });
							}}
						>
							Cancel
						</button>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
							onClick={() => void handleRedemoSubmit(onRedemoLead)()}
							disabled={requestRedemoMutation.isPending}
						>
							<HiArrowPath className="h-4 w-4" aria-hidden="true" />
							{requestRedemoMutation.isPending ? "Saving..." : "Request redemo"}
						</button>
					</>
				}
			>
				<form
					className="grid gap-4"
					onSubmit={handleRedemoSubmit(onRedemoLead)}
				>
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
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
							onClick={() => {
								setAdmissionLeadId(null);
								resetAdmission({ counsellorId: undefined, note: "" });
							}}
						>
							Cancel
						</button>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
							onClick={() => void handleAdmissionSubmit(onRequestAdmission)()}
							disabled={requestAdmissionMutation.isPending}
						>
							<HiAcademicCap className="h-4 w-4" aria-hidden="true" />
							{requestAdmissionMutation.isPending
								? "Saving..."
								: "Move to admission"}
						</button>
					</>
				}
			>
				<form
					className="grid gap-4"
					onSubmit={handleAdmissionSubmit(onRequestAdmission)}
				>
					{admissionLeadLatestDemo?.mentorId ? (
						<div className="rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
							Last demo mentor:{" "}
							{userNameById.get(admissionLeadLatestDemo.mentorId) ?? "-"}
						</div>
					) : null}
					<Controller
						name="counsellorId"
						control={admissionControl}
						render={({ field, fieldState }) => (
							<label className="grid gap-2 text-sm font-medium text-gray-600">
								<span>Counsellor</span>
								<select
									className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
									value={field.value ?? defaultCounsellorId ?? ""}
									onChange={(event) =>
										field.onChange(event.target.value || undefined)
									}
								>
									<option value="">Select counsellor</option>
									{counsellors.map((counsellor) => (
										<option key={counsellor.id} value={counsellor.id}>
											{formatUserName(counsellor.name ?? counsellor.username)}
										</option>
									))}
								</select>
								{fieldState.error?.message ? (
									<span className="text-xs text-red-600">
										{fieldState.error.message}
									</span>
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
				description="Confirm deletion"
				onClose={() => {
					setDeleteLeadId(null);
					setDeleteNote("");
				}}
				footer={
					<>
						<button
							type="button"
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
							onClick={() => {
								setDeleteLeadId(null);
								setDeleteNote("");
							}}
						>
							Cancel
						</button>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
							onClick={() => void onDeleteLead()}
							disabled={deleteLeadMutation.isPending}
						>
							<HiTrash className="h-4 w-4" aria-hidden="true" />
							{deleteLeadMutation.isPending ? "Deleting..." : "Delete"}
						</button>
					</>
				}
			>
				<div className="grid gap-4">
					<p className="text-sm text-gray-600">
						Are you sure you want to delete this lead? This action cannot be
						undone.
					</p>
					<TextAreaField
						label="Reason for dropping"
						value={deleteNote}
						onChange={setDeleteNote}
						placeholder="Why are we dropping this lead?"
					/>
				</div>
			</Modal>
		</div>
	);
};
