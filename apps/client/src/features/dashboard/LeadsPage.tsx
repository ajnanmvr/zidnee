import {
	FOLLOW_UP_PERIOD_MS,
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
	HiPencilSquare,
	HiTrash,
} from "react-icons/hi2";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "@/api/request";
import { Field, Modal, TextAreaField } from "@/components/dashboard-ui";
import { useMeQuery } from "@/features/auth/auth.queries";
import {
	useCounsellorsQuery,
	useMentorsQuery,
	useSalesUsersQuery,
	useUsersQuery,
} from "@/features/users/users.queries";
import { fetchSimilarLeads } from "@/features/leads/leads.service";
import { getLatestLeadDemo } from "@/features/dashboard/lead-demo-utils";
import { formatUserName } from "@/features/dashboard/lead-table";
import { LeadTableView } from "@/features/leads/LeadTableView";
import { AllLeadsListView } from "@/features/leads/AllLeadsListView";
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
import {
	useAssignUserCounsellorMutation,
} from "@/features/users/use-user-management-mutations";
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

const getWhatsappNumber = (phone?: string | null) =>
	phone?.replace(/\D/g, "") ?? "";

export const LeadsPage = () => {
	const { token } = useSession();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const meQuery = useMeQuery(token);

	const hasPermission = (key?: string) =>
		Boolean(meQuery.data?.permissions?.some((p) => p.key === key));
	const canAssignLeadToOthers =
		hasPermission("LEAD_READ_ALL") || hasPermission("LEAD_UPDATE_ALL");
	const canReadUsers = hasPermission("USER_READ");
	// Allow reading sales users either with explicit SALES_USERS_READ
	// or with LEAD_ASSIGN (server accepts either via requireAnyPermissionKey).
	const canReadSalesUsers =
		hasPermission("SALES_USERS_READ") || hasPermission("LEAD_ASSIGN");
	const canRequestOrConfirmAdmission =
		hasPermission("LEAD_ADMISSION_REQUEST") || hasPermission("LEAD_ADMISSION_CONFIRM");
	const [currentPage, setCurrentPage] = useState(1);
	const [sortBy, setSortBy] = useState<string>("nextFollowUpAt");
	// Default sort: past → future (ascending)
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
	const [searchInput, setSearchInput] = useState("");
	const [search, setSearch] = useState("");

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
	// Don't load the full "all" scope automatically on initial page load.
	// The page stays on "mine" until the user explicitly clicks
	// the "All users in stage" control.
	const [loadAllRequested, setLoadAllRequested] = useState(false);
	const activeScope = loadAllRequested && canReadAllLeads ? "all" : "mine";

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
			default:
				return undefined;
		}
	};

	const shouldEnableLeadsQuery =
		activeScope === "mine" || (activeScope === "all" && loadAllRequested);

	useEffect(() => {
		const timer = setTimeout(() => {
			setSearch(searchInput);
			setCurrentPage(1);
		}, 350);
		return () => clearTimeout(timer);
	}, [searchInput]);

	useEffect(() => {
		setSearchInput("");
		setSearch("");
		setCurrentPage(1);
	}, [activeStage, activeScope]);

	const activeLeadsQuery = useDueLeadFollowUpsQuery(token, {
		scope: activeScope,
		timeFilter: "all",
		status: stageToStatus(activeStage),
		page: currentPage,
		sortBy,
		sortOrder,
		search: search || undefined,
		enabled: shouldEnableLeadsQuery,
	});
	const usersQuery = useUsersQuery(token, canReadUsers);
	const createLeadMutation = useCreateLeadMutation();
	const requestRedemoMutation = useRequestRedemoMutation();
	const requestDemoMutation = useRequestLeadDemoMutation();
	const requestAdmissionMutation = useRequestAdmissionMutation();
	const updateLeadMutation = useUpdateLeadMutation();
	const assignUserCounsellorMutation = useAssignUserCounsellorMutation();
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
	const [selectedAdmissionMentorId, setSelectedAdmissionMentorId] = useState<
		string | null
	>(null);
	const [isChangingAdmissionMentor, setIsChangingAdmissionMentor] =
		useState(false);
	const [mentorCounsellorOverrideId, setMentorCounsellorOverrideId] = useState<
		string | null
	>(null);
	const [assigningCounsellorToMentor, setAssigningCounsellorToMentor] =
		useState(false);
	const [selectedCounsellorForMentor, setSelectedCounsellorForMentor] = useState<
		string | null
	>(null);
	const [admissionPriceInput, setAdmissionPriceInput] = useState<string>("");
	const [completeLeadId, setCompleteLeadId] = useState<string | null>(null);
	const [redemoLeadId, setRedemoLeadId] = useState<string | null>(null);
	const [requestDemoOpen, setRequestDemoOpen] = useState(false);
	const [requestDemoLeadId, setRequestDemoLeadId] = useState<string | null>(
		null,
	);
	const [formResponseLead, setFormResponseLead] = useState<LeadResponse | null>(null);
	const [selectedRequestCounsellor, setSelectedRequestCounsellor] = useState<
		string | undefined
	>(undefined);
	const [selectedDuration, setSelectedDuration] = useState<number | null>(1);
	const isRequestingDemo =
		updateLeadMutation.isPending || requestDemoMutation.isPending;

	const confirmRequestDemo = async () => {
		if (!requestDemoLeadId) return;
		if (isRequestingDemo) return;

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
			isOrganic: false,
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
			customNextFollowUpAt: new Date(Date.now() + FOLLOW_UP_PERIOD_MS.lead),
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
	const mentorsQuery = useMentorsQuery(token, Boolean(token));
	const allMentors = mentorsQuery.data?.users ?? [];
	const salesUsersQuery = useSalesUsersQuery(token, canReadSalesUsers);
	const salesUsers = salesUsersQuery.data?.users ?? [];
	const counsellorsQuery = useCounsellorsQuery(token, Boolean(token));

	// prefer full user list when available, otherwise fall back to sales users
	const combinedUsers = allUsers.length > 0 ? allUsers : salesUsers;

	const counsellors = useMemo(
		() =>
			(counsellorsQuery.data?.users ?? combinedUsers).filter((user: any) =>
				user.roles.some((role: any) => isCounsellorRole(role.type ?? "general")),
			),
		[counsellorsQuery.data, combinedUsers],
	);

	const closeAdmissionModal = () => {
		setAdmissionLeadId(null);
		setSelectedAdmissionMentorId(null);
		setIsChangingAdmissionMentor(false);
		setMentorCounsellorOverrideId(null);
		resetAdmission({ counsellorId: undefined, note: "" });
		setAssigningCounsellorToMentor(false);
		setSelectedCounsellorForMentor(null);
	};

	const userNameById = useMemo(
		() =>
			new Map(
				combinedUsers.map((user) => [
					user.id,
					formatUserName(user.name ?? user.username),
				]),
			),
		[combinedUsers],
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
	const createPhoneValue = useWatch({
		control: createControl,
		name: "phone",
	});
    const [similarLeads, setSimilarLeads] = useState<LeadResponse[] | null>(null);
    const [isSearchingSimilar, setIsSearchingSimilar] = useState(false);
	const duplicateLeadCount = useMemo(() => {
		const normalizedPhone = getWhatsappNumber(createPhoneValue);
		if (!normalizedPhone) {
			return 0;
		}

		return scopeLeads.filter(
			(lead) => getWhatsappNumber(lead.phone) === normalizedPhone,
		).length;
	}, [createPhoneValue, scopeLeads]);

	useEffect(() => {
		if (!createOpen) {
			setSimilarLeads(null);
			setIsSearchingSimilar(false);
			return;
		}

		const normalized = (createPhoneValue ?? "").replace(/\D/g, "");
		if (normalized.length < 6) {
			setSimilarLeads(null);
			setIsSearchingSimilar(false);
			return;
		}

		let cancelled = false;
		setIsSearchingSimilar(true);
		const t = setTimeout(async () => {
			try {
				const res = await fetchSimilarLeads(token ?? "", normalized);
				if (cancelled) return;
				setSimilarLeads(res.leads ?? []);
			} catch (err) {
				// ignore errors for duplicate check
				setSimilarLeads(null);
			} finally {
				if (!cancelled) setIsSearchingSimilar(false);
			}
		}, 500);

		return () => {
			cancelled = true;
			clearTimeout(t);
		};
	}, [createPhoneValue, createOpen, token]);

	useEffect(() => {
		if (!createOpen) {
			return;
		}

		const defaultAssignedTo = canAssignLeadToOthers
			? (salesUsers.some((user: any) => user.id === currentUserId)
					? (currentUserId ?? "")
					: "")
			: (currentUserId ?? "");

		resetCreate({
			phone: "",
			name: "",
			assignedTo: defaultAssignedTo,
			isOrganic: false,
			customNextFollowUpAt: undefined,
		});
	}, [canAssignLeadToOthers, createOpen, currentUserId, resetCreate, salesUsers]);

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
			navigate("/leads");
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

	const handleAssignCounsellorToMentor = async () => {
		if (
			!admissionMentorId ||
			!selectedCounsellorForMentor
		) {
			return;
		}
		try {
			await assignUserCounsellorMutation.mutateAsync({
				userId: admissionMentorId,
				counsellorId: selectedCounsellorForMentor,
			});
			toast.success("Counsellor assigned to mentor.");
			setAssigningCounsellorToMentor(false);
			setMentorCounsellorOverrideId(selectedCounsellorForMentor);
			setSelectedCounsellorForMentor(null);
		} catch (error) {
			toast.error("Failed to assign counsellor");
		}
	};

		const onRequestAdmission = async (payload: ConfirmAdmissionForm) => {
			if (!admissionLeadId) return;

			const mentorId = admissionMentorId ?? undefined;
			// Determine counsellor ID: use either mentor's existing or newly assigned
			const counsellorId = defaultCounsellorId || selectedCounsellorForMentor;
			if (!counsellorId) {
				toast.error("Please assign a counsellor to the mentor first");
				return;
			}

			// Ensure price exists: use admissionLead.price or admissionPriceInput
			const currentPrice = admissionLead?.price;
			const enteredPrice = admissionPriceInput.trim() ? parseInt(admissionPriceInput, 10) : undefined;

			if (!currentPrice && (enteredPrice === undefined || Number.isNaN(enteredPrice))) {
				toast.error("Please enter a valid price before moving to admission.");
				return;
			}

			try {
				// If user entered a price (and it's different), update the lead first
				if (enteredPrice !== undefined && enteredPrice !== currentPrice) {
					await updateLeadMutation.mutateAsync({
						leadId: admissionLeadId,
						payload: { price: enteredPrice },
					});
				}

				const finalPayload = {
					...payload,
					mentorId,
					counsellorId,
				};

				const validation = ConfirmAdmissionPayloadSchema.safeParse(finalPayload);
				if (!validation.success) {
					const errors = validation.error.flatten().fieldErrors;
					if (errors.counsellorId?.[0]) {
						toast.error(errors.counsellorId[0]);
					}
					if (errors.note?.[0]) {
						toast.error(errors.note[0]);
					}
					return;
				}

				await requestAdmissionMutation.mutateAsync({
					leadId: admissionLeadId,
					payload: validation.data,
				});
				toast.success("Lead moved to for admission.");
				closeAdmissionModal();
				navigate("/leads?stage=converted");
			} catch (error) {
				if (error instanceof ApiError) {
					const counsellorError = error.payload.errors?.counsellorId?.[0];
					if (counsellorError) {
						toast.error(counsellorError);
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
	const admissionMentorId =
		selectedAdmissionMentorId ?? admissionLeadLatestDemo?.mentorId ?? null;
	const admissionLeadMentor = admissionMentorId
		? allMentors.find((mentor) => mentor.id === admissionMentorId) ??
		  allUsers.find((user) => user.id === admissionMentorId) ??
		  salesUsers.find((user) => user.id === admissionMentorId) ??
		  null
		: null;
	const admissionLeadMentorName = admissionLeadMentor
		? formatUserName(admissionLeadMentor.name ?? admissionLeadMentor.username)
		: null;
	const defaultCounsellorId =
		admissionLeadMentor?.counsellorId ?? mentorCounsellorOverrideId;

	const getActions = (_lead: LeadResponse) => {
					const canManageForm = hasPermission("LEAD_FORM_MANAGE");
					const canRequestDemo = hasPermission("LEAD_DEMO_REQUEST");
					const canCompleteDemo = hasPermission("LEAD_DEMO_COMPLETE");

					switch (activeStage) {
						case "followUp":
							return [
								{
									key: "postpone",
									label: "Postpone",
									onClick: (item: LeadResponse) => setPostponeLeadId(item.id),
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
								{
									key: "viewFormResponses",
									label: "View Response",
									onClick: (item: LeadResponse) => {
										setFormResponseLead(item);
									},
									className:
										"inline-flex items-center rounded-2xl border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50",
								},
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
									onClick: async (item: LeadResponse) => {
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
									onClick: async (item: LeadResponse) => {
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
									onClick: (item: LeadResponse) => {
										const latestDemo = getLatestLeadDemo(item);
										setAdmissionLeadId(item.id);
										setSelectedAdmissionMentorId(latestDemo?.mentorId ?? null);
										setIsChangingAdmissionMentor(!latestDemo?.mentorId);
										setMentorCounsellorOverrideId(null);
										setAssigningCounsellorToMentor(false);
										setSelectedCounsellorForMentor(null);
										resetAdmission({ counsellorId: undefined, note: "" });
									},
									className:
										"inline-flex items-center rounded-2xl border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50",
								},
								{
									key: "redemo",
									label: "Redemo",
									onClick: (item: LeadResponse) => setRedemoLeadId(item.id),
									className:
										"inline-flex items-center rounded-2xl border border-orange-300 px-3 py-1.5 text-xs font-semibold text-orange-700 transition-colors hover:bg-orange-50",
								},
							];
					default:
							return [];
				}
	};

	return (
		<div className="space-y-3">
			{/* Page header */}
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
				<div>
					<h1 className="text-lg font-bold text-gray-900">Leads</h1>
					<p className="mt-0.5 text-sm text-gray-500">
						{activeStageDefinition?.description ?? "All lead stages"}
						{pagination ? ` · ${pagination.total} total` : ""}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
						<Link
							to={buildSearch(activeStage, "mine")}
							onClick={() => setLoadAllRequested(false)}
							className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${activeScope === "mine" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
						>
							Mine
						</Link>
						<Link
							to={buildSearch(activeStage, "all")}
							onClick={() => setLoadAllRequested(true)}
							className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${activeScope === "all" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
						>
							All
						</Link>
					</div>
					{hasPermission("LEAD_CREATE") ? (
						<button
							type="button"
							onClick={() => setCreateOpen(true)}
							className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
						>
							<HiPlusCircle className="h-4 w-4" /> New Lead
						</button>
					) : null}
				</div>
			</div>

			{/* Stage navigation */}
			<div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1">
				{leadStageDefinitions.filter((stage) => stage.id !== "demoCompleted").map((stage) => {
					const isActive = stage.id === activeStage;
					const STAGE_PILL_COLOR: Record<string, string> = {
						all:           "text-teal-700",
						followUp:      "text-lime-700",
						formSent:      "text-amber-700",
						formFilled:    "text-cyan-700",
						demoRequest:   "text-orange-700",
						demoAssigned:  "text-emerald-700",
						demoCompleted: "text-violet-700",
					};
					const activeColor = STAGE_PILL_COLOR[stage.id] ?? "text-teal-700";
					return (
						<Link
							key={stage.id}
							to={buildSearch(stage.id, activeScope)}
							className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition whitespace-nowrap ${isActive ? `bg-white shadow-sm ${activeColor}` : "text-slate-500 hover:text-slate-700"}`}
						>
							{stage.label}
						</Link>
					);
				})}
			</div>

			{/* Search + table */}
			<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
				{/* Search bar */}
				<div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
					<div className="relative flex-1">
						<input
							type="text"
							placeholder={`Search ${activeScope === "all" ? "all users'" : "my"} leads by name, phone, or email…`}
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
						/>
						{activeLeadsQuery.isFetching && !activeLeadsQuery.isLoading ? (
							<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Searching…</span>
						) : null}
					</div>
					{/* Sort controls */}
					<select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }} className="rounded-xl border border-gray-200 px-2.5 py-2 text-xs outline-none">
						<option value="nextFollowUpAt">Follow-up</option>
						<option value="createdAt">Created</option>
						<option value="updatedAt">Updated</option>
						<option value="name">Name</option>
						<option value="phone">Phone</option>
					</select>
					<button type="button" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")} className="rounded-xl border border-gray-200 px-2.5 py-2 text-xs text-gray-600 hover:bg-gray-50">
						{sortOrder === "asc" ? "↑" : "↓"}
					</button>
				</div>

				{activeLeadsQuery.isLoading ? (
					<div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>
				) : activeLeadsQuery.isError ? (
					<p className="py-8 text-center text-sm text-gray-400">Unable to load leads.</p>
				) : (
					<>
						{activeStage === "all" ? (
							<AllLeadsListView leads={scopeLeads} />
						) : (
							<LeadTableView
								leads={scopeLeads}
								activeStage={activeStage}
								userNameById={userNameById}
								getActions={getActions}
							/>
						)}
						{pagination ? (
							<div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
								<p className="text-xs text-gray-400">
									{(currentPage - 1) * 25 + 1}–{Math.min(currentPage * 25, pagination.total)} of {pagination.total}
								</p>
								<div className="flex items-center gap-1">
									<button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs disabled:opacity-40">Prev</button>
									{Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
										const p = currentPage <= 4 ? i + 1 : currentPage + i - 3;
										if (p < 1 || p > pagination.totalPages) return null;
										return (
											<button key={p} type="button" onClick={() => setCurrentPage(p)} className={`rounded-lg px-2.5 py-1 text-xs font-medium ${p === currentPage ? "bg-blue-600 text-white" : "border border-gray-200 text-gray-700 hover:bg-gray-50"}`}>{p}</button>
										);
									})}
									<button type="button" onClick={() => setCurrentPage((p) => Math.min(p + 1, pagination.totalPages))} disabled={currentPage === pagination.totalPages} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs disabled:opacity-40">Next</button>
								</div>
							</div>
						) : null}
					</>
				)}
			</div>

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
					{canAssignLeadToOthers ? (
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
										{salesUsers.map((user: any) => (
											<option key={user.id} value={user.id}>
												{user.zids?.sales
													? `${user.zids.sales} - ${formatUserName(user.name ?? user.username)}`
													: formatUserName(user.name ?? user.username)}
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
					) : null}
					<Controller
						name="phone"
						control={createControl}
						render={({ field, fieldState }) => (
							<div className="grid gap-2">
								<Field
									label="Phone"
									value={field.value ?? ""}
									onChange={field.onChange}
									placeholder="+919876543210"
									error={fieldState.error?.message}
								/>
								{duplicateLeadCount > 0 ? (
									<p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
										A lead with this phone already exists. Creating again will add another lead record.
									</p>
								) : null}

								{isSearchingSimilar ? (
									<p className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-700">Searching for similar leads…</p>
								) : null}

								{similarLeads && similarLeads.length > 0 ? (
									<div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
										<div className="font-medium">Matching leads found</div>
										<ul className="mt-2 space-y-2">
											{similarLeads.map((l) => (
												<li key={l.id} className="flex items-center justify-between">
													<span>{l.phone} — {l.name ?? "(no name)"}</span>
													<button
														type="button"
														className="ml-4 rounded px-3 py-1 text-xs bg-white border"
														onClick={() => {
														navigate(`/leads/${l.id}`);
														setCreateOpen(false);
														}}
													>
														Open
													</button>
												</li>
											))}
										</ul>
									</div>
								) : null}
							</div>
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
						name="isOrganic"
						control={createControl}
						render={({ field }) => (
							<label className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm font-medium text-amber-900">
								<span>
									Organic lead
									<span className="mt-1 block text-xs font-normal text-amber-700">
										Mark this if the lead came in organically.
									</span>
								</span>
								<input
									type="checkbox"
									checked={Boolean(field.value)}
									onChange={(event) => field.onChange(event.target.checked)}
									className="h-5 w-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
								/>
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
					{counsellors.length === 0 ? (
						<div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
							No counsellors available
						</div>
					) : (
						<select
							value={selectedRequestCounsellor ?? ""}
							onChange={(e) => setSelectedRequestCounsellor(e.target.value)}
							className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2"
						>
							<option value="" disabled>
								Select counsellor
							</option>
							{counsellors.map((c) => (
								<option key={c.id} value={c.id}>
									{c.zids?.counsellor ? `${c.zids.counsellor} - ${c.name ?? c.username}` : c.name || c.username}
								</option>
							))}
						</select>
					)}
					<div className="flex justify-end gap-2">
						<button
							type="button"
							onClick={() => setRequestDemoOpen(false)}
							disabled={isRequestingDemo}
							className="rounded-2xl border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={confirmRequestDemo}
							disabled={!selectedRequestCounsellor || isRequestingDemo}
							className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
							aria-busy={isRequestingDemo}
						>
							{isRequestingDemo ? (
								<>
									<HiArrowPath className="h-4 w-4 animate-spin" aria-hidden="true" />
									<span>Requesting...</span>
								</>
							) : (
								"Confirm"
							)}
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
				open={Boolean(formResponseLead)}
				title="Form Responses"
				description={formResponseLead ? `${formResponseLead.name ?? formResponseLead.phone}` : ""}
				onClose={() => setFormResponseLead(null)}
				footer={
					<button
						type="button"
						className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
						onClick={() => setFormResponseLead(null)}
					>
						Close
					</button>
				}
			>
				{formResponseLead ? (
					<div className="grid gap-3 text-sm">
						{[
							{ label: "Preferred Language", value: formResponseLead.preferredLanguage },
							{ label: "Preferred Schedule", value: formResponseLead.preferredSchedule },
							{
								label: "Preferred Days",
								value: formResponseLead.preferredDays?.length
									? formResponseLead.preferredDays.join(", ")
									: undefined,
							},
							{ label: "Demo Availability", value: formResponseLead.demoAvailability },
							{ label: "Hear About Us", value: formResponseLead.hearAboutUs },
							{ label: "Preferred Mentor Gender", value: formResponseLead.preferredMentorGender },
							{ label: "Student Info", value: formResponseLead.studentInfo },
						].map(({ label, value }) => (
							<div key={label} className="flex items-start justify-between gap-4 border-b border-gray-100 pb-2 last:border-0">
								<span className="font-medium text-gray-600 shrink-0">{label}</span>
								<span className="text-right text-gray-900">{value ?? "-"}</span>
							</div>
						))}
						{(formResponseLead.preferredPlan as { timesPerWeek?: number; durationMinutes?: number } | undefined) ? (
							<div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-2">
								<span className="font-medium text-gray-600 shrink-0">Preferred Plan</span>
								<span className="text-right text-gray-900">
									{`${(formResponseLead.preferredPlan as { durationMinutes: number }).durationMinutes} min · ${(formResponseLead.preferredPlan as { timesPerWeek: number }).timesPerWeek} days/week`}
								</span>
							</div>
						) : null}
						{(formResponseLead.preferredTimeslots as Array<{ startTime: string; endTime: string }> | undefined)?.length ? (
							<div className="border-b border-gray-100 pb-2">
								<span className="font-medium text-gray-600">Preferred Timeslots</span>
								<div className="mt-1 space-y-1">
									{(formResponseLead.preferredTimeslots as Array<{ startTime: string; endTime: string }>).map((slot, i) => (
										<div key={i} className="rounded-lg bg-gray-50 px-3 py-1.5 text-gray-900">
											{slot.startTime} – {slot.endTime}
										</div>
									))}
								</div>
							</div>
						) : null}
					</div>
				) : null}
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
				description="Preselecting the counsellor linked to the last demo mentor."
				onClose={closeAdmissionModal}
				footer={
					<>
						<button
							type="button"
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
							onClick={closeAdmissionModal}
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
					{canRequestOrConfirmAdmission ? (
						<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
										Last demo mentor
									</p>
									<p className="mt-2 text-sm font-medium text-slate-900">
										{admissionLeadLatestDemo?.mentorId
											? admissionLeadMentorName ??
											  userNameById.get(admissionMentorId ?? admissionLeadLatestDemo.mentorId) ??
											  "-"
											: "No demo mentor found"}
									</p>
								</div>
								{admissionLeadLatestDemo?.mentorId ? (
									<button
										type="button"
										className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
										onClick={() => {
											if (isChangingAdmissionMentor) {
												setSelectedAdmissionMentorId(admissionLeadLatestDemo.mentorId ?? null);
												setMentorCounsellorOverrideId(null);
												setAssigningCounsellorToMentor(false);
												setSelectedCounsellorForMentor(null);
											}
											setIsChangingAdmissionMentor((current) => !current);
										}}
									>
										<HiPencilSquare className="h-3.5 w-3.5" aria-hidden="true" />
										{isChangingAdmissionMentor
											? "Use last demo mentor"
											: "Change mentor"}
									</button>
								) : null}
							</div>
							{isChangingAdmissionMentor || !admissionLeadLatestDemo?.mentorId ? (
								<div className="mt-4 grid gap-2">
									<label className="text-xs font-medium uppercase tracking-wide text-slate-500">
										Mentor
									</label>
									<select
										value={admissionMentorId ?? ""}
										onChange={(e) => {
											setSelectedAdmissionMentorId(e.target.value || null);
											setMentorCounsellorOverrideId(null);
											setAssigningCounsellorToMentor(false);
											setSelectedCounsellorForMentor(null);
										}}
										className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
									>
										<option value="">Select mentor</option>
										{allMentors.map((mentor) => (
											<option key={mentor.id} value={mentor.id}>
												{mentor.zids?.mentor
													? `${mentor.zids.mentor} - ${formatUserName(mentor.name ?? mentor.username)}`
													: formatUserName(mentor.name ?? mentor.username)}
											</option>
										))}
									</select>
									<p className="text-xs text-slate-500">
										The counsellor updates from the selected mentor automatically.
									</p>
								</div>
							) : null}
						</div>
					) : null}

					{/* Debug info (use ?debugAdmission=1 to enable) */}
					{searchParams.get("debugAdmission") === "1" ? (
						<div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
							<div className="font-semibold">Debug: admission modal data</div>
							<pre className="mt-2 max-h-40 overflow-auto text-[11px]">{JSON.stringify({
								admissionLead: admissionLead ?? null,
								admissionLeadLatestDemo: admissionLeadLatestDemo ?? null,
								defaultCounsellorId: defaultCounsellorId ?? null,
								mentorInUsers: admissionLeadLatestDemo?.mentorId
									? Boolean(combinedUsers.find((u) => u.id === admissionLeadLatestDemo.mentorId))
									: false,
							}, null, 2)}</pre>
						</div>
					) : null}

					{/* Counsellor Assignment Section */}
					{canRequestOrConfirmAdmission ? (
						!assigningCounsellorToMentor ? (
							<div>
								<label className="mb-2 block text-sm font-medium text-slate-600">
									Counsellor
								</label>
								{defaultCounsellorId ? (
									<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
										<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
											Mentor's counsellor
										</p>
										<p className="mt-1 text-sm font-medium text-slate-900">
											{counsellorsQuery.data?.users?.find((u) => u.id === defaultCounsellorId) ?? allUsers.find((u) => u.id === defaultCounsellorId)
												? formatUserName(
													counsellorsQuery.data?.users?.find((u) => u.id === defaultCounsellorId)?.name ??
													counsellorsQuery.data?.users?.find((u) => u.id === defaultCounsellorId)?.username ??
													allUsers.find((u) => u.id === defaultCounsellorId)?.name ??
													allUsers.find((u) => u.id === defaultCounsellorId)?.username ??
													  "-",
												  )
												: "-"}
										</p>
									</div>
								) : (
									<button
										type="button"
										className="w-full rounded-2xl border border-orange-300 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100"
										onClick={() => setAssigningCounsellorToMentor(true)}
									>
										Assign counsellor to mentor
									</button>
								)}
							</div>
						) : (
							<div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
								<p className="text-sm font-medium text-blue-900">Assign counsellor to mentor</p>
								{counsellors.length === 0 ? (
									<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">No counsellors available</div>
								) : (
									<select
										value={selectedCounsellorForMentor ?? ""}
										onChange={(e) => setSelectedCounsellorForMentor(e.target.value || null)}
										className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
									>
										<option value="">Select counsellor</option>
										{counsellors.map((counsellor: any) => (
											<option key={counsellor.id} value={counsellor.id}>
												{counsellor.zids?.counsellor
													? `${counsellor.zids.counsellor} - ${formatUserName(counsellor.name ?? counsellor.username)}`
													: formatUserName(counsellor.name ?? counsellor.username)}
											</option>
										))}
									</select>
								)}
								<div className="flex gap-2">
									<button
										type="button"
										className="flex-1 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
										onClick={() => {
											setAssigningCounsellorToMentor(false);
											setSelectedCounsellorForMentor(null);
										}}
									>
										Cancel
									</button>
									<button
										type="button"
										className="flex-1 rounded-2xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
										onClick={() => void handleAssignCounsellorToMentor()}
										disabled={!selectedCounsellorForMentor || assignUserCounsellorMutation.isPending}
									>
											{assignUserCounsellorMutation.isPending ? "Assigning..." : "Assign"}
									</button>
								</div>
							</div>
						)
					) : null}

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

					{/* Price input for admission - required if lead has no price */}
					<div>
						<label className="block text-sm font-medium text-slate-600 mb-2">Price (₹)</label>
						{admissionLead?.price ? (
							<div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700">
								<span className="text-sm">₹</span>
								<span>{admissionLead.price}</span>
							</div>
						) : (
							<input
								type="number"
								min="0"
								value={admissionPriceInput}
								onChange={(e) => setAdmissionPriceInput(e.target.value)}
								placeholder="Enter price to proceed"
								className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none"
							/>
						)}
					</div>
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
