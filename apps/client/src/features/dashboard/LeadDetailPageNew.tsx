import { format, formatDistance, isPast, isValid } from "date-fns";
import { formatRelativeDateTime } from "@/lib/utils/date";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { FOLLOW_UP_PERIOD_MS, type LeadStatus } from "@repo/schema";
import {
	HiAcademicCap,
	HiArrowLeft,
	HiCalendarDays,
	HiCheckCircle,
	HiClock,
	HiLink,
	HiPaperAirplane,
	HiPencilSquare,
	HiPhone,
	HiTrash,
	HiUser,
	HiUsers,
} from "react-icons/hi2";
import { useNavigate, useParams } from "react-router-dom";
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

type LeadDetailTab =
	| "overview"
	| "details"
	| "demos"
	| "ownership"
	| "activities";

type EditLeadFormState = {
	name?: string;
	phone?: string;
	level?: string;
	isOrganic?: boolean;
};

const getWhatsappNumber = (phone?: string | null) =>
	phone?.replace(/\D/g, "") ?? "";

const getStatusColor = (status?: string): { badge: string } => {
	const colors: Record<string, { badge: string }> = {
		FOLLOW_UP: { badge: "bg-blue-100 text-blue-700" },
		FORM_SENT: { badge: "bg-amber-100 text-amber-700" },
		FORM_FILLED: { badge: "bg-cyan-100 text-cyan-700" },
		DEMO_REQUEST: { badge: "bg-orange-100 text-orange-700" },
		DEMO_ASSIGNED: { badge: "bg-emerald-100 text-emerald-700" },
		DEMO_COMPLETED: { badge: "bg-violet-100 text-violet-700" },
		CONVERTED: { badge: "bg-green-100 text-green-700" },
		CLOSED: { badge: "bg-gray-100 text-gray-700" },
	};

	const fallback: { badge: string } = { badge: "bg-blue-100 text-blue-700" };
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
}: {
	title: string;
	icon: typeof HiUser;
	children: React.ReactNode;
}) => (
	<div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
		<div className="mb-4 flex items-center gap-2">
			<Icon className="h-5 w-5 text-blue-600" />
			<h3 className="text-lg font-bold text-gray-900">{title}</h3>
		</div>
		{children}
	</div>
);

const DetailRow = ({
	label,
	value,
	icon: Icon,
}: {
	label: string;
	value?: string | React.ReactNode;
	icon?: typeof HiUser;
}) => (
	<div className="flex items-start justify-between gap-4 border-b border-gray-100 py-3 last:border-b-0">
		<div className="flex items-start gap-2">
			{Icon ? <Icon className="mt-1 h-4 w-4 text-gray-400" /> : null}
			<span className="text-sm font-medium text-gray-600">{label}</span>
		</div>
		<span className="text-right text-sm font-semibold text-gray-900">
			{value ?? "-"}
		</span>
	</div>
);

const tabs: Array<{ id: LeadDetailTab; label: string }> = [
	{ id: "details", label: "Lead Details" },
	{ id: "demos", label: "Demo History" },
	{ id: "activities", label: "Activities" },
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
	const [deleteReason, setDeleteReason] = useState<string | null>(null);
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

	const lead = leadQuery.data?.lead ?? null;
	const allUsers = usersQuery.data?.users ?? [];
	const counsellors = counsellorsQuery.data?.users ?? [];
	const findUserById = (id?: string | null) =>
		id ? (allUsers.find((user) => user.id === id) ?? null) : null;
	const formatUserIdentity = (
		user: (typeof allUsers)[number] | null,
		role: "mentor" | "counsellor",
	) => {
		if (!user) {
			return "-";
		}

		const displayName = user.name || user.username || "Unknown";
		const roleCode =
			role === "mentor"
				? (user.zids?.mentor ?? user.mentorId)
				: (user.zids?.counsellor ?? user.counsellorId);

		return `${displayName} (${roleCode ?? user.id})`;
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
	const preferredPlan = lead?.preferredPlan as
		| { timesPerWeek: number; durationMinutes: number }
		| undefined;
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

		const reasonLabel =
			{
				not_interested: "Not interested",
				not_responding: "Not responding",
				wrong_number: "Wrong number / Disconnected",
				other: "Other",
			}[deleteReason] ?? deleteReason;

		const noteToSend = deleteNote?.trim()
			? `${reasonLabel} — ${deleteNote.trim()}`
			: reasonLabel;

		try {
			await deleteMutation.mutateAsync({ leadId: lead.id, note: noteToSend });
			toast.success("Lead closed successfully.");
			setDeleteOpen(false);
			setDeleteNote("");
			setDeleteReason(null);
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

	if (!leadId) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<p className="text-gray-600">Lead not found</p>
			</div>
		);
	}

	if (leadQuery.isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<p className="text-gray-600">Loading lead details...</p>
			</div>
		);
	}

	if (!lead) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<p className="text-gray-600">Lead not found</p>
			</div>
		);
	}

	const statusColor = getStatusColor(lead.status);

	return (
		<div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
			<div className="sticky top-0 z-20">
				<div className="px-6 max-w-7xl mx-6 py-2 border rounded-3xl bg-orange-50/50 border-orange-100 backdrop-blur-xl sm:mx-8">
					<div className="flex items-center justify-between gap-4">
						<div className="flex items-center gap-4">
							<button
								type="button"
								onClick={() => navigate("/leads")}
								className="rounded-full bg-orange-100 p-2 transition-colors hover:bg-orange-200"
							>
								<HiArrowLeft className="h-6 w-6 text-gray-600" />
							</button>
							<div>
								<h1 className="text-2xl font-bold text-gray-900">
									{lead.name || "Lead Profile"}
								</h1>
								<p className="mt-1 text-sm text-gray-600">{lead.phone}</p>
								<div className="mt-2 flex items-center gap-2">
									{lead.price ? (
										<span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700">
											<span className="text-sm">₹</span>
											<span>{lead.price}</span>
										</span>
									) : (
										<button
											type="button"
											onClick={() => setPriceEditOpen(true)}
											className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
										>
											Set amount
										</button>
									)}
									<span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700">
										<span>{lead.courseType ? (lead.courseType === "GROUP" ? "Group" : "Individual") : "Not specified"}</span>
									</span>
								</div>
								<p className="mt-1 text-xs text-gray-500">
									Created:{" "}
									{lead.createdAt
										? format(new Date(lead.createdAt), "MMM dd, yyyy HH:mm")
										: "-"}{" "}
									· Updated:{" "}
									{lead.updatedAt
										? format(new Date(lead.updatedAt), "MMM dd, yyyy HH:mm")
										: "-"}
								</p>
							</div>
						</div>
						<span
							className={`rounded-full px-3 py-1 text-xs font-bold ${statusColor.badge}`}
						>
							{lead.status?.replace(/_/g, " ") ?? "FOLLOW UP"}
						</span>
					</div>
				</div>
			</div>

			<div className="sticky top-22 z-20 bg-white border-b border-gray-200">
				<div className="mx-auto max-w-7xl px-6 py-4 sm:px-8">
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							onClick={() => navigate(`/leads/${lead.id}/edit`)}
							className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
						>
							<HiPencilSquare className="h-4 w-4" />
							Edit
						</button>
						<button
							type="button"
							onClick={() => setPostponeOpen(true)}
							className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
						>
							<HiClock className="h-4 w-4" />
							Postpone
						</button>
						<button
							type="button"
							onClick={onOpenStageChange}
							className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
						>
							<HiCheckCircle className="h-4 w-4" />
							Change Stage
						</button>
						{!lead.formSent ? (
							<button
								type="button"
								onClick={onGenerateFormLink}
								className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
							>
								<HiPaperAirplane className="h-4 w-4" />
								Send Form
							</button>
						) : (
							<>
								<button
									type="button"
									onClick={onGenerateFormLink}
									className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
								>
									<HiLink className="h-4 w-4" />
									Form Link
								</button>
							</>
						)}
						{lead.formCompleted && !latestDemo ? (
							<button
								type="button"
								onClick={() => setRequestDemoOpen(true)}
								className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
							>
								<HiCalendarDays className="h-4 w-4" />
								Request Demo
							</button>
						) : null}
						<button
							type="button"
							onClick={() => setDeleteOpen(true)}
							className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
						>
							<HiTrash className="h-4 w-4" />
							Delete
						</button>
					</div>
				</div>
			</div>

			<div className="mx-auto max-w-7xl px-6 py-8 sm:px-8">
				<div className="mb-6 flex flex-wrap gap-2 rounded-3xl border border-gray-200 bg-white p-2 shadow-sm">
					{tabs.map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-colors ${activeTab === tab.id ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
						>
							{tab.label}
						</button>
					))}
				</div>

				{/* Overview removed per request */}

				{activeTab === "details" && (
					<div className="grid gap-6 lg:grid-cols-3">
						<div className="lg:col-span-2 space-y-6">
							<SectionCard title="Lead Identity" icon={HiUser}>
								<div className="space-y-3">
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
										label="Assigned To"
										value={formatUserIdentity(assignedToUser, "mentor")}
										icon={HiUsers}
									/>
									<DetailRow
										label="Created By"
										value={lead.createdBy ? (allUsers.find((u) => u.id === lead.createdBy)?.name ?? lead.createdBy) : "-"}
										icon={HiUser}
									/>
									<DetailRow
										label="Student ID"
										value={lead.studentId ?? "-"}
										icon={HiUser}
									/>
									<DetailRow
										label="Preferred Plan"
										value={formatPreferredPlanValue(lead.preferredPlan)}
										icon={HiClock}
									/>
									<DetailRow
										label="Name"
										value={lead.name ?? "-"}
										icon={HiUser}
									/>
									<DetailRow
										label="Level"
										value={lead.level ?? "-"}
										icon={HiAcademicCap}
									/>
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
								</div>
							</SectionCard>

							<SectionCard title="Contact Information" icon={HiPhone}>
								<div className="space-y-3">
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
								</div>
							</SectionCard>

							<SectionCard title="Form Submission Details" icon={HiCheckCircle}>
								<div className="space-y-3">
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
									<DetailRow
										label="Preferred Schedule"
										value={lead.preferredSchedule ?? "-"}
									/>
									<DetailRow
										label="Preferred Days"
										value={lead.preferredDays?.join(", ") ?? "-"}
									/>
									<DetailRow
										label="Preferred Language"
										value={lead.preferredLanguage ?? "-"}
									/>
									<DetailRow
										label="Demo Availability"
										value={formatRelativeDateTime(lead.demoAvailability ?? "")}
									/>
									<DetailRow
										label="Hear About Us"
										value={lead.hearAboutUs ?? "-"}
									/>
									<DetailRow
										label="Mentor Gender Preference"
										value={lead.preferredMentorGender ?? "-"}
									/>
									{preferredPlan || preferredTimeslots.length ? (
										<div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
											<p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
												Preferred Plan
											</p>
											<div className="space-y-3">
												{preferredPlan ? (
													<div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
														<span className="font-medium text-gray-900">
															{formatPreferredPlanValue(preferredPlan)}
														</span>
													</div>
												) : null}
												<div className="space-y-2">
													{preferredTimeslots.length ? (
														preferredTimeslots.map((slot, index) => (
															<div
																key={`${slot.startTime}-${slot.endTime}-${index}`}
																className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
															>
																{formatTimeValue(slot.startTime)} - {formatTimeValue(slot.endTime)}
															</div>
														))
													) : (
														<div className="text-xs text-gray-500">No timings selected</div>
													)}
												</div>
											</div>
										</div>
									) : null}
									{lead.studentInfo ? (
										<DetailRow label="Student Info" value={lead.studentInfo} />
									) : null}
								</div>
							</SectionCard>
						</div>

						<div className="space-y-6">
							<SectionCard title="Next Follow-up" icon={HiClock}>
								<div className="space-y-3">
									<DetailRow
										label="Scheduled For"
										value={
											lead.nextFollowUpAt
												? format(new Date(lead.nextFollowUpAt), "MMM dd, hh:mm a")
												: "-"
										}
										icon={HiCalendarDays}
									/>
									{lead.nextFollowUpAt ? (
										<DetailRow
											label="Time Remaining"
											value={formatDistance(
												new Date(lead.nextFollowUpAt),
												new Date(),
												{ addSuffix: true },
											)}
											icon={HiClock}
										/>
									) : null}
									<div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3">
										<p className="text-xs font-semibold text-blue-700">
											{isPast(new Date(lead.nextFollowUpAt))
												? "Overdue for follow-up"
												: "On schedule"}
										</p>
									</div>
								</div>
							</SectionCard>

							{latestDemo && (
								<SectionCard
									title="Current Demo Assignment"
									icon={HiAcademicCap}
								>
									<div className="space-y-3">
										<DetailRow
											label="Mentor"
											value={formatUserIdentity(latestDemoMentor, "mentor")}
											icon={HiUser}
										/>
										<DetailRow
											label="Counsellor"
											value={formatUserIdentity(latestDemoCounsellor, "counsellor")}
											icon={HiUser}
										/>
										{lead.nextFollowUpAt ? (
											<DetailRow
												label="Next Follow-up"
												value={formatDistance(
													new Date(lead.nextFollowUpAt),
													new Date(),
													{ addSuffix: true },
												)}
												icon={HiClock}
											/>
										) : null}
										{/* custom follow-up removed */}
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
												<div>
													Mentor:{" "}
													{formatUserIdentity(findUserById(demo.mentorId), "mentor")}
												</div>
												<div>
													Counsellor:{" "}
													{formatUserIdentity(
														findUserById(findUserById(demo.mentorId)?.counsellorId ?? null),
														"counsellor",
													)}
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

				{activeTab === "overview" && (
					<div className="grid gap-6 lg:grid-cols-3">
						<div className="lg:col-span-2 space-y-6">
							<SectionCard title="Ownership History" icon={HiUsers}>
								<div className="space-y-3">
									<DetailRow
										label="Created By"
										value={
											lead.createdBy
												? (allUsers.find((user) => user.id === lead.createdBy)
														?.name ?? lead.createdBy)
												: "-"
										}
										icon={HiUser}
									/>
									<DetailRow
										label="Sales Owner"
										value={assignedToUser?.name ?? "Unassigned"}
										icon={HiUsers}
									/>
									<DetailRow
										label="Demo Owner"
										value={demoRequestAssignedToUser?.name ?? "Not assigned"}
										icon={HiAcademicCap}
									/>
								</div>
							</SectionCard>
						</div>
						<div className="space-y-6">
							<SectionCard title="Assignment & Ownership" icon={HiUsers}>
								<div className="space-y-4">
									<div>
										<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
											Sales Owner
										</p>
										<div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
											<p className="font-semibold text-gray-900">
												{assignedToUser?.name ?? "Unassigned"}
											</p>
											<p className="text-xs text-gray-600">
												{assignedToUser?.username}
											</p>
										</div>
									</div>
									<div>
										<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
											Demo Assigned To
										</p>
										<div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
											<p className="font-semibold text-gray-900">
												{demoRequestAssignedToUser?.name ?? "Not assigned"}
											</p>
											{demoRequestAssignedToUser ? (
												<p className="text-xs text-gray-600">
													{demoRequestAssignedToUser.username}
												</p>
											) : null}
										</div>
									</div>
								</div>
							</SectionCard>

							{latestDemo && (
								<SectionCard
									title="Current Demo Assignment"
									icon={HiAcademicCap}
								>
									<div className="space-y-3">
										<DetailRow
											label="Mentor"
											value={formatUserIdentity(latestDemoMentor, "mentor")}
											icon={HiUser}
										/>
										<DetailRow
											label="Counsellor"
											value={formatUserIdentity(latestDemoCounsellor, "counsellor")}
											icon={HiUser}
										/>
										<DetailRow
											label="Next Follow-up"
											value={
												lead.nextFollowUpAt
													? formatDistance(
															new Date(lead.nextFollowUpAt),
															new Date(),
															{ addSuffix: true },
														)
													: "-"
											}
											icon={HiClock}
										/>
									</div>
								</SectionCard>
							)}
						</div>
					</div>
				)}

				{activeTab === "activities" && leadId ? (
					<div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
						<div className="mb-4 flex items-center justify-between gap-4">
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
									Activity Trail
								</p>
								<h2 className="mt-1 text-xl font-bold text-gray-900">
									Lead Activities
								</h2>
							</div>
							<button
								type="button"
								onClick={() => setActiveTab("overview")}
								className="rounded-2xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-900"
							>
								Back to overview
							</button>
						</div>
						<ActivityFeed leadId={leadId} />
					</div>
				) : null}
			</div>

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
							}}
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={onDeleteLead}
							className={`rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 ${!deleteReason ? "opacity-50 pointer-events-none" : ""}`}
						>
							Delete
						</button>
					</>
				}
			>
				<div className="space-y-4">
					<p className="text-sm text-gray-700">
						Are you sure you want to delete this lead? This action cannot be
						undone. Select a reason and optionally add a short note.
					</p>
					<div className="grid gap-2">
						{[
							{ key: "not_interested", label: "Not interested" },
							{ key: "not_responding", label: "Not responding" },
							{ key: "wrong_number", label: "Wrong number / Disconnected" },
							{ key: "other", label: "Other" },
						].map((r) => (
							<label
								key={r.key}
								className="inline-flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2"
							>
								<input
									type="radio"
									name="deleteReason"
									value={r.key}
									checked={deleteReason === r.key}
									onChange={() => setDeleteReason(r.key)}
									className="h-4 w-4"
								/>
								<span className="text-sm text-gray-700">{r.label}</span>
							</label>
						))}
					</div>
					<label className="grid gap-2">
						<span className="text-sm font-semibold text-gray-700">
							Optional note
						</span>
						<textarea
							value={deleteNote}
							onChange={(event) => setDeleteNote(event.target.value)}
							rows={3}
							className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
							placeholder="Add a brief note (optional)..."
						/>
					</label>
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
								const message = `Check this form link: ${formLinkData.formLink}`;
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
				onClose={() => { setRequestDemoOpen(false); setSelectedCounsellorId(""); }}
				title="Request demo and assign counsellor"
				footer={
					<>
						<button
							type="button"
							onClick={() => { setRequestDemoOpen(false); setSelectedCounsellorId(""); }}
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
						<select
							value={selectedCounsellorId}
							onChange={(e) => setSelectedCounsellorId(e.target.value)}
							className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
						>
							<option value="" disabled>Select counsellor</option>
							{counsellors.map((c) => (
								<option key={c.id} value={c.id}>
									{c.zids?.counsellor ? `${c.zids.counsellor} - ${c.name ?? c.username}` : (c.name || c.username)}
								</option>
							))}
						</select>
					)}
				</div>
			</Modal>
		</div>
	);
};
