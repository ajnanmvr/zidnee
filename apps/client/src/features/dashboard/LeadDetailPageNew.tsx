import { format, formatDistance, isPast, isValid } from "date-fns";
import { formatRelativeDateTime } from "@/lib/utils/date";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { FOLLOW_UP_PERIOD_MS, type LeadStatus } from "@repo/schema";
import {
	HiAcademicCap,
	HiAdjustmentsHorizontal,
	HiArrowLeft,
	HiBanknotes,
	HiCalendarDays,
	HiCheck,
	HiCheckCircle,
	HiClock,
	HiLink,
	HiMagnifyingGlass,
	HiPaperAirplane,
	HiPencilSquare,
	HiPhone,
	HiTrash,
	HiUser,
	HiUsers,
} from "react-icons/hi2";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "@/api/request";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Modal } from "@/components/dashboard-ui";
import { useLeadDetailQuery } from "@/features/leads/leads.queries";
import {
	useDeleteLeadMutation,
	useGenerateFormLinkMutation,
	usePostponeLeadFollowUpMutation,
	useRequestLeadDemoMutation,
	useUpdateLeadMutation,
} from "@/features/leads/use-lead-mutations";
import { useCounsellorsQuery, useUsersQuery } from "@/features/users/users.queries";
import type { PostponeLeadFollowUpForm } from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

type LeadDetailTab = "details" | "demos" | "activities";

type EditLeadFormState = {
	name?: string;
	phone?: string;
	level?: string;
	isOrganic?: boolean;
};

const getWhatsappNumber = (phone?: string | null) =>
	phone?.replace(/\D/g, "") ?? "";

type DeleteLeadReasonCategory = "not_interested" | "not_responding" | "other";

type NotInterestedSubReason = "high_fee" | "normal_madrasa" | "demo_not_satisfied" | "other";

const DELETE_LEAD_REASON_CATEGORIES: Array<{ value: DeleteLeadReasonCategory; label: string }> = [
	{ value: "not_interested", label: "Not interested" },
	{ value: "not_responding", label: "Not responding" },
	{ value: "other", label: "Other" },
];

const NOT_INTERESTED_SUB_REASONS: Array<{ value: NotInterestedSubReason; label: string }> = [
	{ value: "high_fee", label: "High fee" },
	{ value: "normal_madrasa", label: "Normal madrasa needed" },
	{ value: "demo_not_satisfied", label: "Demo not satisfied" },
	{ value: "other", label: "Other" },
];

/** Builds the free-text note sent to the server from the structured delete-reason selection. */
const composeDeleteLeadNote = (
	reason: DeleteLeadReasonCategory | null,
	subReason: NotInterestedSubReason | null,
	note: string,
): string => {
	const trimmedNote = note.trim();

	if (reason === "not_interested") {
		if (subReason === "other") {
			return trimmedNote ? `Not interested — Other: ${trimmedNote}` : "";
		}

		const subLabel = NOT_INTERESTED_SUB_REASONS.find((item) => item.value === subReason)?.label;
		return subLabel ? `Not interested — ${subLabel}` : "";
	}

	if (reason === "not_responding") {
		return trimmedNote ? `Not responding — ${trimmedNote}` : "Not responding";
	}

	if (reason === "other") {
		return trimmedNote ? `Other: ${trimmedNote}` : "";
	}

	return "";
};

const getStatusColor = (status?: string): { badge: string; gradient: string } => {
	const colors: Record<string, { badge: string; gradient: string }> = {
		FOLLOW_UP: { badge: "bg-blue-100 text-blue-700", gradient: "from-blue-500 to-indigo-600" },
		FORM_SENT: { badge: "bg-amber-100 text-amber-700", gradient: "from-amber-500 to-orange-500" },
		FORM_FILLED: { badge: "bg-cyan-100 text-cyan-700", gradient: "from-cyan-500 to-blue-600" },
		DEMO_REQUEST: { badge: "bg-orange-100 text-orange-700", gradient: "from-orange-500 to-rose-500" },
		DEMO_ASSIGNED: { badge: "bg-emerald-100 text-emerald-700", gradient: "from-emerald-500 to-teal-600" },
		DEMO_COMPLETED: { badge: "bg-violet-100 text-violet-700", gradient: "from-violet-500 to-purple-600" },
		CONVERTED: { badge: "bg-green-100 text-green-700", gradient: "from-green-500 to-emerald-600" },
		CLOSED: { badge: "bg-gray-100 text-gray-700", gradient: "from-gray-400 to-gray-600" },
	};

	const fallback = { badge: "bg-blue-100 text-blue-700", gradient: "from-blue-500 to-indigo-600" };
	const selected = colors[status ?? "FOLLOW_UP"];
	return selected ?? fallback;
};

const PostponeDateTimeField = ({
	value,
	onChange,
}: {
	value?: Date;
	onChange: (value?: Date) => void;
}) => {
	const [inputValue, setInputValue] = useState(() =>
		value && isValid(value)
			? format(value, "yyyy-MM-dd'T'HH:mm")
			: "",
	);

	useEffect(() => {
		setInputValue(
			value && isValid(value)
				? format(value, "yyyy-MM-dd'T'HH:mm")
				: "",
		);
	}, [value]);

	return (
		<input
			type="datetime-local"
			value={inputValue}
			onChange={(event) => {
				const nextValue = event.target.value;
				setInputValue(nextValue);

				if (!nextValue) {
					onChange(undefined);
					return;
				}

				const parsedValue = new Date(nextValue);

				if (isValid(parsedValue)) {
					onChange(parsedValue);
				}
			}}
			className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
		/>
	);
};



const SectionCard = ({
	title,
	icon: Icon,
	children,
	dense = false,
}: {
	title: string;
	icon: typeof HiUser;
	children: React.ReactNode;
	/** Tighter padding/heading for cards packed with many small fields. */
	dense?: boolean;
}) => (
	<div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
		<div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/60 px-5 py-3.5">
			<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
				<Icon className="h-4 w-4" />
			</span>
			<h3 className="text-sm font-bold uppercase tracking-wide text-gray-700">{title}</h3>
		</div>
		<div className={dense ? "p-4" : "p-5"}>{children}</div>
	</div>
);

/** Compact label-over-value tile, designed to sit in a responsive grid for quick scanning. */
const DetailRow = ({
	label,
	value,
	icon: Icon,
	wide = false,
}: {
	label: string;
	value?: string | React.ReactNode;
	icon?: typeof HiUser;
	/** Span both grid columns — use for longer values (links, badges, multi-line text). */
	wide?: boolean;
}) => (
	<div className={`flex flex-col gap-1 rounded-xl border border-gray-100 bg-gray-50/50 px-3.5 py-2.5 ${wide ? "sm:col-span-2" : ""}`}>
		<span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
			{Icon ? <Icon className="h-3.5 w-3.5" /> : null}
			{label}
		</span>
		<span className="text-sm font-semibold text-gray-900 wrap-break-word">
			{value ?? "-"}
		</span>
	</div>
);

/** Responsive 2-column grid for packing DetailRow tiles densely. */
const DetailGrid = ({ children }: { children: React.ReactNode }) => (
	<div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">{children}</div>
);

const tabs: Array<{ id: LeadDetailTab; label: string; icon: typeof HiUser }> = [
	{ id: "activities", label: "Activities", icon: HiClock },
	{ id: "details", label: "Lead Details", icon: HiUser },
	{ id: "demos", label: "Demo History", icon: HiCalendarDays },
];

const LEAD_STAGE_OPTIONS: LeadStatus[] = [
	"FOLLOW_UP",
	"FORM_SENT",
	"FORM_FILLED",
	"DEMO_REQUEST",
	"DEMO_ASSIGNED",
	"DEMO_COMPLETED",
	"DEMO_CANCELLED",
	"CONVERTED",
	"CLOSED",
];

export const LeadDetailPageNew = () => {
	const navigate = useNavigate();
	const { token } = useSession();
	const { leadId } = useParams<{ leadId: string }>();

	const leadQuery = useLeadDetailQuery(token, leadId ?? "");
	const usersQuery = useUsersQuery(token);
	const updateMutation = useUpdateLeadMutation();
	const deleteMutation = useDeleteLeadMutation();
	const postponeMutation = usePostponeLeadFollowUpMutation();
	const requestDemoMutation = useRequestLeadDemoMutation();
	const generateFormLinkMutation = useGenerateFormLinkMutation();

	const [activeTab, setActiveTab] = useState<LeadDetailTab>("activities");
	const [editOpen, setEditOpen] = useState(false);
	const [postponeOpen, setPostponeOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleteNote, setDeleteNote] = useState("");
	const [deleteReason, setDeleteReason] = useState<DeleteLeadReasonCategory | null>(null);
	const [deleteSubReason, setDeleteSubReason] = useState<NotInterestedSubReason | null>(null);
	const [requestDemoOpen, setRequestDemoOpen] = useState(false);
	const [formLinkOpen, setFormLinkOpen] = useState(false);
	const [formLinkData, setFormLinkData] = useState<{ formLink: string } | null>(
		null,
	);
	const [courseTypePickerOpen, setCourseTypePickerOpen] = useState(false);
	const [courseTypeSelection, setCourseTypeSelection] = useState<
		"GROUP" | "INDIVIDUAL" | ""
	>("");
	const [stageChangeOpen, setStageChangeOpen] = useState(false);
	const [selectedStage, setSelectedStage] = useState<LeadStatus>("FOLLOW_UP");
	const [stageChangeConfirmed, setStageChangeConfirmed] = useState(false);
	const [priceEditOpen, setPriceEditOpen] = useState(false);
	const [priceInput, setPriceInput] = useState<string>("");

	const {
		control: editControl,
		handleSubmit: handleEditSubmit,
		reset: resetEdit,
	} = useForm<EditLeadFormState>({
		defaultValues: { name: "", phone: "", level: "" },
	});

	const {
		control: postponeControl,
		handleSubmit: handlePostponeSubmit,
		reset: resetPostpone,
	} = useForm<PostponeLeadFollowUpForm>({
		defaultValues: {
			customNextFollowUpAt: new Date(Date.now() + FOLLOW_UP_PERIOD_MS.lead),
			note: "",
		},
	});

	const counsellorsQuery = useCounsellorsQuery(token);
	const [selectedCounsellorId, setSelectedCounsellorId] = useState<string>("");
	const [counsellorSearch, setCounsellorSearch] = useState("");

	const lead = leadQuery.data?.lead ?? null;
	const allUsers = usersQuery.data?.users ?? [];
	const counsellors = counsellorsQuery.data?.users ?? [];
	const findUserById = (id?: string | null) =>
		id ? (allUsers.find((user) => user.id === id) ?? null) : null;
	/** Renders a staff member as "ZID · Name", linking to their mentor profile when one exists. */
	const UserIdentity = ({
		user,
		role,
		fallback = "-",
	}: {
		user: (typeof allUsers)[number] | null;
		role?: "mentor" | "counsellor" | "sales" | "admin";
		fallback?: string;
	}) => {
		if (!user) {
			return <span className="text-gray-400">{fallback}</span>;
		}

		const mentorId = user.zids?.mentor ?? user.mentorId;
		const zid =
			(role ? user.zids?.[role] : undefined) ??
			mentorId ??
			user.zids?.counsellor ??
			user.counsellorId ??
			user.zids?.sales ??
			user.zids?.admin;
		const displayName = user.name || user.username || "Unknown";
		const label = zid ? `${zid.toUpperCase()} · ${displayName}` : displayName;

		if (mentorId) {
			return (
				<Link to={`/mentors/${user.id}`} className="font-semibold text-blue-700 hover:underline">
					{label}
				</Link>
			);
		}

		return <span className="font-medium text-gray-700">{label}</span>;
	};
	/** Selectable row for the counsellor-search list in the Request Demo modal. */
	const CounsellorOption = ({
		counsellor,
		selected,
		onSelect,
	}: {
		counsellor: (typeof allUsers)[number];
		selected: boolean;
		onSelect: () => void;
	}) => {
		const displayName = counsellor.name || counsellor.username || "Unknown";
		const zid = counsellor.zids?.counsellor;
		return (
			<button
				type="button"
				onClick={onSelect}
				className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
					selected
						? "border-sky-500 bg-sky-50 ring-1 ring-sky-200"
						: "border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/40"
				}`}
			>
				<span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${selected ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600"}`}>
					{displayName[0]?.toUpperCase()}
				</span>
				<span className="min-w-0 flex-1">
					<span className="block truncate text-sm font-semibold text-gray-900">{displayName}</span>
					<span className="block truncate text-xs text-gray-400">
						{[zid?.toUpperCase(), counsellor.email].filter(Boolean).join(" · ") || "—"}
					</span>
				</span>
				{selected ? <HiCheck className="h-5 w-5 shrink-0 text-sky-600" /> : null}
			</button>
		);
	};
	const formatTimeValue = (value: string) => {
		const [hoursText, minutesText] = value.split(":");
		const hours = Number(hoursText);
		const minutes = Number(minutesText);

		if (Number.isNaN(hours) || Number.isNaN(minutes)) {
			return value;
		}

		const meridiem = hours >= 12 ? "PM" : "AM";
		const hour12 = hours % 12 || 12;
		return `${hour12.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${meridiem}`;
	};
	const formatPreferredPlanValue = (
		plan?: { timesPerWeek: number; durationMinutes: number },
	) => {
		if (!plan) {
			return "-";
		}

		const dayLabel = plan.timesPerWeek === 1 ? "day" : "days";
		return `${plan.durationMinutes} min · ${plan.timesPerWeek} ${dayLabel} a week`;
	};
	const latestDemo = useMemo(
		() => (lead?.demos?.length ? lead.demos[lead.demos.length - 1] : null),
		[lead?.demos],
	);
	const preferredTimeslots = (lead?.preferredTimeslots ?? []) as Array<{
		startTime: string;
		endTime: string;
	}>;
	const demoCount = useMemo(() => lead?.demos?.length ?? 0, [lead?.demos]);
	const latestDemoMentor = useMemo(
		() => findUserById(latestDemo?.mentorId ?? null),
		[allUsers, latestDemo?.mentorId],
	);
	const latestDemoCounsellor = useMemo(
		() => findUserById(latestDemoMentor?.counsellorId ?? null),
		[allUsers, latestDemoMentor?.counsellorId],
	);

	const assignedToUser = useMemo(
		() => allUsers.find((user) => user.id === lead?.assignedTo) ?? null,
		[allUsers, lead?.assignedTo],
	);
	const demoRequestAssignedToUser = useMemo(
		() =>
			allUsers.find((user) => user.id === lead?.demoRequestAssignedTo) ?? null,
		[allUsers, lead?.demoRequestAssignedTo],
	);

	/** Counsellors with prior history on this lead — surfaced first as quick picks. */
	const suggestedCounsellors = useMemo(() => {
		const candidates = [demoRequestAssignedToUser, latestDemoCounsellor];
		const seen = new Set<string>();
		const suggestions: typeof counsellors = [];
		for (const candidate of candidates) {
			if (!candidate || seen.has(candidate.id)) continue;
			const match = counsellors.find((c) => c.id === candidate.id);
			if (!match) continue;
			seen.add(match.id);
			suggestions.push(match);
		}
		return suggestions;
	}, [counsellors, demoRequestAssignedToUser, latestDemoCounsellor]);

	const counsellorSearchResults = useMemo(() => {
		const q = counsellorSearch.trim().toLowerCase();
		if (!q) return counsellors;
		return counsellors.filter((c) => {
			const haystack = [c.name, c.username, c.zids?.counsellor, c.email]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();
			return haystack.includes(q);
		});
	}, [counsellors, counsellorSearch]);

	useEffect(() => {
		if (editOpen && lead) {
			resetEdit({
				name: lead.name ?? "",
				phone: lead.phone ?? "",
				level: lead.level ?? "",
				isOrganic: lead.isOrganic ?? false,
			});
		}
	}, [editOpen, lead, resetEdit]);

	useEffect(() => {
		if (postponeOpen) {
			resetPostpone({
				customNextFollowUpAt: new Date(Date.now() + FOLLOW_UP_PERIOD_MS.lead),
				note: "",
			});
		}
	}, [postponeOpen, resetPostpone]);

	useEffect(() => {
		if (priceEditOpen && lead?.price) {
			setPriceInput(lead.price.toString());
		} else {
			setPriceInput("");
		}
	}, [priceEditOpen, lead?.price]);

	const onEditSubmit = handleEditSubmit(async (payload) => {
		if (!lead) return;
		try {
			await updateMutation.mutateAsync({ leadId: lead.id, payload });
			toast.success("Lead updated");
			setEditOpen(false);
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Failed to update lead");
				return;
			}
			toast.error("Failed to update lead");
		}
	});

	const onPostponeSubmit = handlePostponeSubmit(async (payload) => {
		if (!lead) return;
		try {
			await postponeMutation.mutateAsync({ leadId: lead.id, payload });
			toast.success("Follow-up postponed successfully");
			setPostponeOpen(false);
		} catch {
			toast.error("Failed to postpone follow-up");
		}
	});

	const onDeleteLead = async () => {
		if (!lead) return;
		if (!deleteReason) {
			toast.error("Please select a reason for deleting the lead.");
			return;
		}
		if (deleteReason === "not_interested" && !deleteSubReason) {
			toast.error("Please select a reason for not being interested.");
			return;
		}

		const noteToSend = composeDeleteLeadNote(deleteReason, deleteSubReason, deleteNote);

		if (!noteToSend) {
			toast.error("Please add a brief note for this reason.");
			return;
		}

		try {
			await deleteMutation.mutateAsync({ leadId: lead.id, note: noteToSend });
			toast.success("Lead closed successfully.");
			setDeleteOpen(false);
			setDeleteNote("");
			setDeleteReason(null);
			setDeleteSubReason(null);
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

	const onRequestDemo = async () => {
		if (!lead) return;
		if (!selectedCounsellorId) {
			toast.error("Please select a counsellor before requesting a demo.");
			return;
		}
		try {
			await updateMutation.mutateAsync({
				leadId: lead.id,
				payload: { demoRequestAssignedTo: selectedCounsellorId },
			});
			await requestDemoMutation.mutateAsync(lead.id);
			toast.success("Demo request created");
			setRequestDemoOpen(false);
			setSelectedCounsellorId("");
		} catch {
			toast.error("Failed to request demo");
		}
	};

	const onGenerateFormLink = async () => {
		if (!leadId) return;
		if (!lead?.formSent && !lead?.courseType) {
			setCourseTypePickerOpen(true);
			setCourseTypeSelection("");
			return;
		}
		try {
			const result = await generateFormLinkMutation.mutateAsync(leadId);
			setFormLinkData(result);
			setFormLinkOpen(true);
		} catch {
			toast.error("Failed to generate form link");
		}
	};

	const onConfirmCourseTypeAndSendForm = async () => {
		if (!lead || !leadId) {
			return;
		}

		if (!courseTypeSelection) {
			toast.error("Select course type to continue");
			return;
		}

		try {
			await updateMutation.mutateAsync({
				leadId: lead.id,
				payload: { courseType: courseTypeSelection },
			});
			const result = await generateFormLinkMutation.mutateAsync(leadId);
			setFormLinkData(result);
			setCourseTypePickerOpen(false);
			setCourseTypeSelection("");
			setFormLinkOpen(true);
		} catch {
			toast.error("Failed to generate form link");
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
			await updateMutation.mutateAsync({ leadId: lead.id, payload: { price } });
			toast.success("Price updated successfully.");
			setPriceEditOpen(false);
			setPriceInput("");
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Unable to update price");
				return;
			}

			toast.error(
				error instanceof Error ? error.message : "Unable to update price",
			);
		}
	};

	const onOpenStageChange = () => {
		setSelectedStage((lead?.status as LeadStatus) ?? "FOLLOW_UP");
		setStageChangeConfirmed(false);
		setStageChangeOpen(true);
	};

	const onConfirmStageChange = async () => {
		if (!lead) {
			return;
		}

		const currentStage = (lead.status as LeadStatus) ?? "FOLLOW_UP";
		if (selectedStage === currentStage) {
			toast.error("Please choose a different stage.");
			return;
		}

		if (!stageChangeConfirmed) {
			toast.error("Please confirm the warning before changing stage.");
			return;
		}

		try {
			await updateMutation.mutateAsync({
				leadId: lead.id,
				payload: { status: selectedStage },
			});
			toast.success("Lead stage updated successfully.");
			setStageChangeOpen(false);
			setStageChangeConfirmed(false);
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Unable to change lead stage");
				return;
			}

			toast.error(
				error instanceof Error ? error.message : "Unable to change lead stage",
			);
		}
	};

	if (!leadId || (!leadQuery.isLoading && !lead)) {
		return (
			<div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white py-16 text-center">
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
					<HiUser className="h-6 w-6 text-gray-400" />
				</div>
				<p className="text-sm font-medium text-gray-600">Lead not found</p>
				<button
					onClick={() => navigate(-1)}
					className="text-sm font-semibold text-blue-600 hover:underline"
				>
					Back to leads
				</button>
			</div>
		);
	}

	if (leadQuery.isLoading || !lead) {
		return (
			<div className="flex items-center justify-center py-20">
				<div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
			</div>
		);
	}

	const statusColor = getStatusColor(lead.status);
	const followUpOverdue = lead.nextFollowUpAt ? isPast(new Date(lead.nextFollowUpAt)) : false;
	const leadInitial = (lead.name?.trim().charAt(0) || lead.phone?.charAt(0) || "L").toUpperCase();

	const actionButtons: Array<{
		key: string;
		label: string;
		icon: typeof HiUser;
		onClick: () => void;
		className: string;
	}> = [
		{
			key: "edit",
			label: "Edit",
			icon: HiPencilSquare,
			onClick: () => navigate(`/leads/${lead.id}/edit`),
			className: "bg-blue-600 text-white hover:bg-blue-700",
		},
		{
			key: "postpone",
			label: "Postpone",
			icon: HiClock,
			onClick: () => setPostponeOpen(true),
			className: "bg-amber-500 text-white hover:bg-amber-600",
		},
		{
			key: "stage",
			label: "Change Stage",
			icon: HiCheckCircle,
			onClick: onOpenStageChange,
			className: "bg-violet-600 text-white hover:bg-violet-700",
		},
		...(!lead.formSent
			? [{
				key: "send-form",
				label: "Send Form",
				icon: HiPaperAirplane,
				onClick: () => void onGenerateFormLink(),
				className: "bg-emerald-600 text-white hover:bg-emerald-700",
			}]
			: [{
				key: "form-link",
				label: "Form Link",
				icon: HiLink,
				onClick: () => void onGenerateFormLink(),
				className: "bg-blue-600 text-white hover:bg-blue-700",
			}]),
		...(lead.formCompleted && !latestDemo
			? [{
				key: "request-demo",
				label: "Request Demo",
				icon: HiCalendarDays,
				onClick: () => setRequestDemoOpen(true),
				className: "bg-sky-600 text-white hover:bg-sky-700",
			}]
			: []),
		{
			key: "delete",
			label: "Delete",
			icon: HiTrash,
			onClick: () => setDeleteOpen(true),
			className: "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
		},
	];

	return (
		<div className="space-y-4">
			{/* Hero card */}
			<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
				<div className={`relative h-20 bg-linear-to-br sm:h-24 ${statusColor.gradient}`}>
					<button
						onClick={() => navigate(-1)}
						className="absolute left-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur transition hover:bg-white/30"
					>
						<HiArrowLeft className="h-5 w-5" />
					</button>
					<div
						className={`absolute right-4 top-4 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold backdrop-blur ${followUpOverdue ? "border-rose-200 bg-rose-50 text-rose-700" : "border-white/40 bg-white/20 text-white"
							}`}
					>
						<HiClock className="h-3.5 w-3.5" />
						{lead.nextFollowUpAt
							? followUpOverdue
								? "Follow-up overdue"
								: `Follow-up ${formatDistance(new Date(lead.nextFollowUpAt), new Date(), { addSuffix: true })}`
							: "No follow-up scheduled"}
					</div>
				</div>
				<div className="px-5 pb-5 sm:px-6">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
						<div className="flex items-start gap-4">
							<div className={`relative z-10 -mt-10 flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-linear-to-br shadow-md sm:-mt-12 sm:h-24 sm:w-24 ${statusColor.gradient}`}>
								<span className="text-2xl font-bold text-white sm:text-3xl">{leadInitial}</span>
							</div>
							<div className="pt-1">
								<div className="flex flex-wrap items-center gap-2">
									<h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{lead.name || "Lead Profile"}</h1>
									<span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusColor.badge}`}>
										{lead.status?.replace(/_/g, " ") ?? "FOLLOW UP"}
									</span>
								</div>
								<p className="mt-1 text-sm text-gray-500">
									{lead.phone ?? "-"}
									{lead.courseType ? <> · {lead.courseType === "GROUP" ? "Group" : "Individual"}</> : null}
								</p>
								<p className="mt-1 text-xs text-gray-400">
									Created {lead.createdAt ? format(new Date(lead.createdAt), "MMM dd, yyyy") : "-"}
									{" · "}
									Updated {lead.updatedAt ? format(new Date(lead.updatedAt), "MMM dd, yyyy") : "-"}
								</p>
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-2 pb-1">
							{lead.price ? (
								<span className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-semibold text-gray-700">
									<HiBanknotes className="h-4 w-4 text-emerald-600" />
									₹{lead.price}
								</span>
							) : (
								<button
									type="button"
									onClick={() => setPriceEditOpen(true)}
									className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
								>
									<HiBanknotes className="h-4 w-4" />
									Set amount
								</button>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Action toolbar */}
			<div className="flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
				{actionButtons.map((action) => (
					<button
						key={action.key}
						type="button"
						onClick={action.onClick}
						className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${action.className}`}
					>
						<action.icon className="h-4 w-4" />
						{action.label}
					</button>
				))}
			</div>

			{/* Tabs */}
			<div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-1">
				{tabs.map((tab) => {
					const isActive = activeTab === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${isActive ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
								}`}
						>
							<tab.icon className="h-4 w-4" />
							{tab.label}
						</button>
					);
				})}
			</div>

				{activeTab === "details" && (
					<div className="grid gap-6 lg:grid-cols-3">
						<div className="lg:col-span-2 space-y-6">
							<SectionCard title="Preferences" icon={HiAdjustmentsHorizontal}>
								<DetailGrid>
									<DetailRow
										label="Course Type"
										value={
											lead.courseType
												? lead.courseType === "GROUP"
													? "Group"
													: "Individual"
												: "-"
										}
										icon={HiUsers}
									/>
									<DetailRow
										label="Level"
										value={lead.level ?? "-"}
										icon={HiAcademicCap}
									/>
									<DetailRow
										label="Preferred Plan"
										value={formatPreferredPlanValue(lead.preferredPlan)}
										icon={HiClock}
									/>
									<DetailRow
										label="Preferred Schedule"
										value={lead.preferredSchedule ?? "-"}
										icon={HiCalendarDays}
									/>
									<DetailRow
										label="Preferred Days"
										value={lead.preferredDays?.join(", ") || "-"}
										icon={HiCalendarDays}
									/>
									<DetailRow
										label="Preferred Language"
										value={lead.preferredLanguage ?? "-"}
										icon={HiUser}
									/>
									<DetailRow
										label="Demo Availability"
										value={formatRelativeDateTime(lead.demoAvailability ?? "")}
										icon={HiClock}
									/>
									<DetailRow
										label="Mentor Gender Preference"
										value={lead.preferredMentorGender ?? "-"}
										icon={HiUser}
									/>
									<DetailRow
										label="Hear About Us"
										value={lead.hearAboutUs ?? "-"}
										icon={HiLink}
									/>
									{preferredTimeslots.length ? (
										<DetailRow
											label="Preferred Timeslots"
											wide
											value={
												<div className="flex flex-wrap gap-1.5">
													{preferredTimeslots.map((slot, index) => (
														<span
															key={`${slot.startTime}-${slot.endTime}-${index}`}
															className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700"
														>
															{formatTimeValue(slot.startTime)} – {formatTimeValue(slot.endTime)}
														</span>
													))}
												</div>
											}
										/>
									) : null}
									{lead.studentInfo ? (
										<DetailRow label="Student Info" value={lead.studentInfo} wide />
									) : null}
								</DetailGrid>
							</SectionCard>

							<SectionCard title="Lead Identity" icon={HiUser}>
								<DetailGrid>
									<DetailRow
										label="Name"
										value={lead.name ?? "-"}
										icon={HiUser}
										wide
									/>
									<DetailRow
										label="SL No"
										value={lead.slNo ? String(lead.slNo) : "-"}
										icon={HiAcademicCap}
									/>
									<DetailRow
										label="Phone"
										value={lead.phone ?? "-"}
										icon={HiPhone}
									/>
									<DetailRow
										label="Email"
										value={lead.email ?? "-"}
										icon={HiLink}
									/>
									<DetailRow
										label="Is Organic"
										value={lead.isOrganic ? "Yes" : "No"}
										icon={HiUsers}
									/>
									<DetailRow
										label="Student ID"
										wide
										value={
											lead.studentId ? (
												<Link to={`/students/${lead.studentId}`} className="font-semibold text-teal-700 hover:underline">
													View student profile
												</Link>
											) : (
												"-"
											)
										}
										icon={HiUser}
									/>
									<DetailRow
										label="Created On"
										value={
											lead.createdAt
												? format(new Date(lead.createdAt), "MMM dd, yyyy HH:mm")
												: "-"
										}
										icon={HiCalendarDays}
									/>
									<DetailRow
										label="Updated On"
										value={
											lead.updatedAt
												? format(new Date(lead.updatedAt), "MMM dd, yyyy HH:mm")
												: "-"
										}
										icon={HiCalendarDays}
									/>
									<DetailRow
										label="Current Status"
										value={lead.status?.replace(/_/g, " ") ?? "FOLLOW UP"}
										icon={HiCheckCircle}
									/>
								</DetailGrid>
							</SectionCard>

							<SectionCard title="Contact Information" icon={HiPhone}>
								<DetailGrid>
									<DetailRow
										label="Primary WhatsApp"
										value={lead.primaryWhatsappNumber ?? "-"}
										icon={HiPhone}
									/>
									<DetailRow
										label="Alternate WhatsApp"
										value={lead.alternateWhatsappNumber || "-"}
										icon={HiPhone}
									/>
									<DetailRow
										label="Residing Country"
										value={lead.residingCountry || "-"}
										icon={HiUser}
									/>
									<DetailRow
										label="Gender"
										value={
											lead.gender ? (
												<div className="flex items-center gap-2">
													<HiUser
														className={`h-4 w-4 ${lead.gender.toLowerCase() === "male" ? "text-blue-500" : "text-rose-500"}`}
													/>
													<span
														className={
															lead.gender.toLowerCase() === "male"
																? "text-blue-600 font-semibold"
																: "text-rose-600 font-semibold"
														}
													>
														{lead.gender.charAt(0).toUpperCase() +
															lead.gender.slice(1)}
													</span>
												</div>
											) : (
												"-"
											)
										}
										icon={HiUser}
									/>
									<DetailRow
										label="Date of Birth"
										value={
											lead.dateOfBirth
												? format(new Date(lead.dateOfBirth), "MMM dd, yyyy")
												: "-"
										}
										icon={HiCalendarDays}
									/>
								</DetailGrid>
							</SectionCard>

							<SectionCard title="Form Submission Details" icon={HiCheckCircle}>
								<DetailGrid>
									<DetailRow
										label="Form Status"
										value={
											<span
												className={`rounded-full px-2.5 py-1 text-xs font-semibold ${lead.formCompleted ? "bg-emerald-100 text-emerald-700" : lead.formSent ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}`}
											>
												{lead.formCompleted
													? "Completed"
													: lead.formSent
														? "Sent"
														: "Not Sent"}
											</span>
										}
									/>
									<DetailRow
										label="Form Sent"
										value={lead.formSent ? "Yes" : "No"}
										icon={HiCalendarDays}
									/>
									<DetailRow
										label="Form Completed"
										value={lead.formCompleted ? "Yes" : "No"}
										icon={HiCheckCircle}
									/>
								</DetailGrid>
							</SectionCard>
						</div>

						<div className="space-y-6">
							<SectionCard title="Next Follow-up" icon={HiClock}>
								<div className="space-y-3">
									<div className={`rounded-xl border p-4 ${followUpOverdue ? "border-rose-200 bg-rose-50" : "border-blue-100 bg-blue-50"}`}>
										<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Scheduled for</p>
										<p className="mt-1 text-lg font-bold text-gray-900">
											{lead.nextFollowUpAt
												? format(new Date(lead.nextFollowUpAt), "MMM dd, yyyy · hh:mm a")
												: "Not scheduled"}
										</p>
										{lead.nextFollowUpAt ? (
											<p className={`mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold ${followUpOverdue ? "text-rose-700" : "text-blue-700"}`}>
												<HiClock className="h-3.5 w-3.5" />
												{followUpOverdue ? "Overdue —" : ""}{" "}
												{formatDistance(new Date(lead.nextFollowUpAt), new Date(), { addSuffix: true })}
											</p>
										) : null}
									</div>
								</div>
							</SectionCard>

							<SectionCard title="Ownership & Assignment" icon={HiUsers}>
								<div className="space-y-1">
									{[
										{ label: "Created By", user: findUserById(lead.createdBy), role: undefined as "mentor" | "counsellor" | "sales" | "admin" | undefined, fallback: "-" },
										{ label: "Sales Owner", user: assignedToUser, role: "sales" as const, fallback: "Unassigned" },
										{ label: "Demo Owner", user: demoRequestAssignedToUser, role: "counsellor" as const, fallback: "Not assigned" },
									].map((row) => (
										<div key={row.label} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-gray-50">
											<span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{row.label}</span>
											<UserIdentity user={row.user} role={row.role} fallback={row.fallback} />
										</div>
									))}
								</div>
							</SectionCard>

							{latestDemo && (
								<SectionCard
									title="Current Demo Assignment"
									icon={HiAcademicCap}
								>
									<div className="space-y-1">
										<div className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-gray-50">
											<span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Mentor</span>
											<UserIdentity user={latestDemoMentor} role="mentor" />
										</div>
										<div className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-gray-50">
											<span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Counsellor</span>
											<UserIdentity user={latestDemoCounsellor} role="counsellor" />
										</div>
										{latestDemo.demoScheduledFor ? (
											<div className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-gray-50">
												<span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Scheduled For</span>
												<span className="text-sm font-semibold text-gray-900">
													{format(new Date(latestDemo.demoScheduledFor), "MMM dd, hh:mm a")}
												</span>
											</div>
										) : null}
									</div>
								</SectionCard>
							)}
						</div>
					</div>
				)}

				{activeTab === "demos" && (
					<div className="space-y-6">
						<SectionCard
							title={`Demo History (${demoCount} attempts)`}
							icon={HiCalendarDays}
						>
							{lead.demos.length > 0 ? (
								<div className="space-y-3">
									{lead.demos.map((demo, index) => (
										<div
											key={`${demo.requestedAt ?? "no-requested-at"}-${demo.mentorId ?? "no-mentor"}-${demo.demoScheduledFor ?? "no-scheduled-for"}`}
											className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-3"
										>
											<div className="flex items-center gap-3">
												<div>
													<div className="text-sm font-semibold">
														Attempt #{index + 1}{" "}
														{demo.completedAt ? (
															<span className="ml-2 text-emerald-600 text-xs">
																✓ Completed
															</span>
														) : null}
													</div>
													<div className="text-xs text-gray-600">
														{demo.requestedAt
															? formatDistance(
																	new Date(demo.requestedAt),
																	new Date(),
																	{ addSuffix: true },
																)
															: "Not requested"}
													</div>
												</div>
											</div>
											<div className="flex gap-6 text-sm text-gray-700">
												<div className="flex items-center gap-1.5">
													Mentor: <UserIdentity user={findUserById(demo.mentorId)} role="mentor" />
												</div>
												<div className="flex items-center gap-1.5">
													Counsellor:{" "}
													<UserIdentity
														user={findUserById(findUserById(demo.mentorId)?.counsellorId ?? null)}
														role="counsellor"
													/>
												</div>
											</div>
											<div className="text-sm text-gray-600 text-right">
												<div>
													Scheduled:{" "}
													{demo.demoScheduledFor
														? format(
																new Date(demo.demoScheduledFor),
																"MMM dd, hh:mm a",
															)
														: "-"}
												</div>
												<div>
													Completed:{" "}
													{demo.completedAt
														? format(
																new Date(demo.completedAt),
																"MMM dd, hh:mm a",
															)
														: "-"}
												</div>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="py-4 text-center text-gray-600">
									No demo attempts yet
								</p>
							)}
						</SectionCard>
					</div>
				)}

			{activeTab === "activities" && leadId ? (
				<div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
					<div className="mb-4">
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
							Activity Trail
						</p>
						<h2 className="mt-1 text-xl font-bold text-gray-900">
							Lead Activities
						</h2>
					</div>
					<ActivityFeed leadId={leadId} />
				</div>
			) : null}

			<Modal
				open={stageChangeOpen}
				onClose={() => {
					setStageChangeOpen(false);
					setStageChangeConfirmed(false);
				}}
				title="Change Lead Stage"
				footer={
					<>
						<button
							type="button"
							onClick={() => {
								setStageChangeOpen(false);
								setStageChangeConfirmed(false);
							}}
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => void onConfirmStageChange()}
							disabled={
								updateMutation.isPending ||
								selectedStage === ((lead?.status as LeadStatus) ?? "FOLLOW_UP") ||
								!stageChangeConfirmed
							}
							className="rounded-2xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{updateMutation.isPending ? "Updating..." : "Confirm Change"}
						</button>
					</>
				}
			>
				<div className="space-y-4">
					<div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
						Manual stage changes can affect lead workflow automation. Please confirm
						before continuing.
					</div>
					<div className="grid gap-2">
						<label
							className="text-sm font-semibold text-gray-700"
							htmlFor="lead-stage-picker"
						>
							Select Stage
						</label>
						<select
							id="lead-stage-picker"
							value={selectedStage}
							onChange={(event) =>
								setSelectedStage(event.target.value as LeadStatus)
							}
							className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
						>
							{LEAD_STAGE_OPTIONS.map((stage) => (
								<option key={stage} value={stage}>
									{stage.replace(/_/g, " ")}
								</option>
							))}
						</select>
					</div>
					<div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
						Current: {(lead?.status ?? "FOLLOW_UP").replace(/_/g, " ")}<br />
						New: {selectedStage.replace(/_/g, " ")}
					</div>
					<label className="inline-flex items-start gap-3 rounded-lg border border-gray-200 px-3 py-2">
						<input
							type="checkbox"
							checked={stageChangeConfirmed}
							onChange={(event) => setStageChangeConfirmed(event.target.checked)}
							className="mt-1 h-4 w-4"
						/>
						<span className="text-sm text-gray-700">
							I understand this change is manual and I want to continue.
						</span>
					</label>
				</div>
			</Modal>

			<Modal
				open={editOpen}
				onClose={() => setEditOpen(false)}
				title="Edit Lead Information"
				footer={
					<>
						<button
							type="button"
							onClick={() => setEditOpen(false)}
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => void onEditSubmit()}
							className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
						>
							Save Changes
						</button>
					</>
				}
			>
				<div className="space-y-4">
					<Controller
						name="name"
						control={editControl}
						render={({ field }) => (
							<label className="grid gap-2">
								<span className="text-sm font-semibold text-gray-700">
									Name
								</span>
								<input
									{...field}
									type="text"
									className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
								/>
							</label>
						)}
					/>
					<Controller
						name="phone"
						control={editControl}
						render={({ field }) => (
							<label className="grid gap-2">
								<span className="text-sm font-semibold text-gray-700">
									Phone
								</span>
								<input
									{...field}
									type="text"
									className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
								/>
							</label>
						)}
					/>
					<Controller
						name="level"
						control={editControl}
						render={({ field }) => (
							<label className="grid gap-2">
								<span className="text-sm font-semibold text-gray-700">
									Level
								</span>
								<input
									{...field}
									type="text"
									className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
								/>
							</label>
						)}
					/>
					<Controller
						name="isOrganic"
						control={editControl}
						render={({ field }) => (
							<label className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm font-medium text-amber-900">
								<span>
									Organic lead
									<span className="mt-1 block text-xs font-normal text-amber-700">
										Mark this when the lead was added organically.
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
				</div>
			</Modal>

			<Modal
				open={postponeOpen}
				onClose={() => setPostponeOpen(false)}
				title="Postpone Follow-up"
				footer={
					<>
						<button
							type="button"
							onClick={() => setPostponeOpen(false)}
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => void onPostponeSubmit()}
							className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
						>
							Postpone
						</button>
					</>
				}
			>
				<div className="space-y-4">
					<Controller
						name="customNextFollowUpAt"
						control={postponeControl}
						render={({ field }) => (
							<label className="grid gap-2">
								<span className="text-sm font-semibold text-gray-700">
									Schedule For
								</span>
								<PostponeDateTimeField
									value={field.value}
									onChange={field.onChange}
								/>
							</label>
						)}
					/>
					<Controller
						name="note"
						control={postponeControl}
						render={({ field }) => (
							<label className="grid gap-2">
								<span className="text-sm font-semibold text-gray-700">
									Note (Optional)
								</span>
								<textarea
									{...field}
									rows={3}
									className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
									placeholder="Add a note about this postponement..."
								/>
							</label>
						)}
					/>
				</div>
			</Modal>
			<Modal
				open={priceEditOpen}
				onClose={() => {
					setPriceEditOpen(false);
					setPriceInput("");
				}}
				title={lead?.price ? "Edit Price" : "Add Price"}
				footer={
					<>
						<button
							type="button"
							onClick={() => {
								setPriceEditOpen(false);
								setPriceInput("");
							}}
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={onSavePrice}
							className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
						>
							Save Price
						</button>
					</>
				}
			>
				<div className="space-y-4">
					<label className="grid gap-2">
						<span className="text-sm font-semibold text-gray-700">
							Price (₹)
						</span>
						<input
							type="number"
							value={priceInput}
							onChange={(e) => setPriceInput(e.target.value)}
							className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
							placeholder="Enter price"
							min="0"
						/>
					</label>
				</div>
			</Modal>
			<Modal
				open={deleteOpen}
				onClose={() => {
					setDeleteOpen(false);
					setDeleteNote("");
					setDeleteReason(null);
					setDeleteSubReason(null);
				}}
				title="Delete Lead"
				footer={
					<>
						<button
							type="button"
							onClick={() => {
								setDeleteOpen(false);
								setDeleteNote("");
								setDeleteReason(null);
								setDeleteSubReason(null);
							}}
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={onDeleteLead}
							className={`rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 ${
								!composeDeleteLeadNote(deleteReason, deleteSubReason, deleteNote)
									? "opacity-50 pointer-events-none"
									: ""
							}`}
						>
							Delete
						</button>
					</>
				}
			>
				<div className="space-y-4">
					<p className="text-sm text-gray-700">
						Are you sure you want to delete this lead? This action cannot be
						undone. Select a reason for dropping this lead.
					</p>
					<div className="grid gap-2">
						{DELETE_LEAD_REASON_CATEGORIES.map((r) => (
							<label
								key={r.value}
								className="inline-flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2"
							>
								<input
									type="radio"
									name="deleteReason"
									value={r.value}
									checked={deleteReason === r.value}
									onChange={() => {
										setDeleteReason(r.value);
										setDeleteSubReason(null);
										setDeleteNote("");
									}}
									className="h-4 w-4"
								/>
								<span className="text-sm text-gray-700">{r.label}</span>
							</label>
						))}
					</div>

					{deleteReason === "not_interested" ? (
						<div className="grid gap-2 pl-4">
							{NOT_INTERESTED_SUB_REASONS.map((r) => (
								<label
									key={r.value}
									className="inline-flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2"
								>
									<input
										type="radio"
										name="deleteSubReason"
										value={r.value}
										checked={deleteSubReason === r.value}
										onChange={() => {
											setDeleteSubReason(r.value);
											if (r.value !== "other") {
												setDeleteNote("");
											}
										}}
										className="h-4 w-4"
									/>
									<span className="text-sm text-gray-700">{r.label}</span>
								</label>
							))}
						</div>
					) : null}

					{deleteReason === "other" ||
					(deleteReason === "not_interested" && deleteSubReason === "other") ? (
						<label className="grid gap-2">
							<span className="text-sm font-semibold text-gray-700">
								Brief note
							</span>
							<textarea
								value={deleteNote}
								onChange={(event) => setDeleteNote(event.target.value)}
								rows={3}
								className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
								placeholder="Tell us more..."
							/>
						</label>
					) : null}

					{deleteReason === "not_responding" ? (
						<label className="grid gap-2">
							<span className="text-sm font-semibold text-gray-700">
								Additional note (optional)
							</span>
							<textarea
								value={deleteNote}
								onChange={(event) => setDeleteNote(event.target.value)}
								rows={3}
								className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
								placeholder="Add any additional context (optional)..."
							/>
						</label>
					) : null}
				</div>
			</Modal>

			<Modal
				open={courseTypePickerOpen}
				onClose={() => {
					setCourseTypePickerOpen(false);
					setCourseTypeSelection("");
				}}
				title="Select Course Type"
				footer={
					<>
						<button
							type="button"
							onClick={() => {
								setCourseTypePickerOpen(false);
								setCourseTypeSelection("");
							}}
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => void onConfirmCourseTypeAndSendForm()}
							disabled={
								!courseTypeSelection ||
								updateMutation.isPending ||
								generateFormLinkMutation.isPending
							}
							className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
						>
							{updateMutation.isPending || generateFormLinkMutation.isPending
								? "Saving..."
								: "Save & Send Form"}
						</button>
					</>
				}
			>
				<div className="grid gap-2">
					<label
						className="text-sm font-semibold text-gray-700"
						htmlFor="course-type-picker-new"
					>
						Course Type
					</label>
					<select
						id="course-type-picker-new"
						value={courseTypeSelection}
						onChange={(event) =>
							setCourseTypeSelection(
								event.target.value as "GROUP" | "INDIVIDUAL" | "",
							)
						}
						className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
					>
						<option value="">Select course type</option>
						<option value="GROUP">Group</option>
						<option value="INDIVIDUAL">Individual</option>
					</select>
				</div>
			</Modal>

			<Modal
				open={formLinkOpen}
				onClose={() => {
					setFormLinkOpen(false);
					setFormLinkData(null);
				}}
				title="Form Link"
				footer={
					<>
						<button
							type="button"
							onClick={() => {
								setFormLinkOpen(false);
								setFormLinkData(null);
							}}
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
						>
							Close
						</button>
						{formLinkData ? (
							<button
								type="button"
								onClick={() => {
									void navigator.clipboard.writeText(formLinkData.formLink);
									toast.success("Link copied to clipboard");
								}}
								className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
							>
								Copy Link
							</button>
						) : null}
					</>
				}
			>
				{formLinkData ? (
					<div className="space-y-4">
						<div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
							<p className="mb-2 text-xs font-semibold uppercase text-blue-700">
								Form Link
							</p>
							<p className="break-all font-mono text-sm text-blue-900">
								{formLinkData.formLink}
							</p>
						</div>
						<p className="text-sm text-gray-600">
							Share this link with the lead to fill out their detailed
							information form.
						</p>
						<button
							type="button"
							onClick={() => {
								const message = `Assalamu alaikum

Here is the Zidnee Islamic School application form. Please fill and let us know once you have completed it.

Thank you

${formLinkData.formLink}`;
								const whatsappNumber = getWhatsappNumber(lead.phone);
								window.open(
									`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`,
									"_blank",
								);
							}}
							className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700"
						>
							Share via WhatsApp
						</button>
					</div>
				) : null}
			</Modal>

			<Modal
				open={requestDemoOpen}
				onClose={() => { setRequestDemoOpen(false); setSelectedCounsellorId(""); setCounsellorSearch(""); }}
				title="Request demo and assign counsellor"
				footer={
					<>
						<button
							type="button"
							onClick={() => { setRequestDemoOpen(false); setSelectedCounsellorId(""); setCounsellorSearch(""); }}
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => void onRequestDemo()}
							disabled={updateMutation.isPending || requestDemoMutation.isPending || !selectedCounsellorId}
							className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{updateMutation.isPending || requestDemoMutation.isPending ? "Requesting..." : "Request Demo"}
						</button>
					</>
				}
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
						<>
							<div className="relative">
								<HiMagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
								<input
									type="text"
									value={counsellorSearch}
									onChange={(e) => setCounsellorSearch(e.target.value)}
									placeholder="Search counsellors by name, ZID, or email…"
									className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
								/>
							</div>

							<div className="max-h-72 space-y-3 overflow-y-auto pr-1">
								{!counsellorSearch.trim() && suggestedCounsellors.length > 0 ? (
									<div className="space-y-1.5">
										<p className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
											Suggested — previously involved with this lead
										</p>
										<div className="space-y-1.5">
											{suggestedCounsellors.map((c) => (
												<CounsellorOption
													key={c.id}
													counsellor={c}
													selected={selectedCounsellorId === c.id}
													onSelect={() => setSelectedCounsellorId(c.id)}
												/>
											))}
										</div>
									</div>
								) : null}

								<div className="space-y-1.5">
									{!counsellorSearch.trim() && suggestedCounsellors.length > 0 ? (
										<p className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
											All counsellors
										</p>
									) : null}
									{counsellorSearchResults.length === 0 ? (
										<div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-center text-sm text-slate-500">
											No counsellors match "{counsellorSearch}"
										</div>
									) : (
										counsellorSearchResults.map((c) => (
											<CounsellorOption
												key={c.id}
												counsellor={c}
												selected={selectedCounsellorId === c.id}
												onSelect={() => setSelectedCounsellorId(c.id)}
											/>
										))
									)}
								</div>
							</div>
						</>
					)}
				</div>
			</Modal>
		</div>
	);
};
