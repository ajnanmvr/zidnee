import { type ChangeEvent, useMemo, useRef, useState } from "react";
import type { Area } from "react-easy-crop";
import { toast } from "react-hot-toast";
import {
	HiArrowLeft,
	HiCamera,
	HiCheckCircle,
	HiChatBubbleOvalLeftEllipsis,
	HiExclamationTriangle,
	HiPhone,
	HiClipboardDocumentCheck,
	HiClock,
	HiPencilSquare,
	HiUserCircle,
} from "react-icons/hi2";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "@/api/request";
import { API_BASE_URL } from "@/api/client";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { MobileImageCropModal } from "@/components/MobileImageCropModal";
import { Modal, SelectField, TextAreaField, ConfirmDialog } from "@/components/dashboard-ui";
import { CreateReminderModal } from "@/features/reminders/CreateReminderModal";
import { RemindersList } from "@/features/reminders/RemindersList";
import { useGetStudentReminders } from "@/features/reminders/reminders.mutations";
import { INSPECTION_RESULT_LABELS } from "@repo/schema";
import { ResultBadge } from "@/features/students/followup-session-ui";
import {
	getStudentStatusColor,
	getStudentStatusLabel,
} from "@/features/students/student-table";
import {
	useRecordStudentFollowUpMutation,
	useUpdateStudentAssessmentMutation,
} from "@/features/students/students.mutations";
import { useUpdateStudentMutation } from "@/features/students/use-update-student-mutation";
import {
	useStudentActivitiesQuery,
	useStudentByIdQuery,
	useStudentFollowUpSessionsQuery,
	useStudentProcessesQuery,
	useStudentProcessHistoryQuery,
} from "@/features/students/students.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useSession } from "@/lib/session";
import { useMeQuery } from "@/features/auth/auth.queries";
import { cropImageToBlob } from "@/lib/image-crop";

const levelLabels: Record<string, string> = {
	"1": "Seed Level 1",
	"2": "Sprout Level 2",
	"3": "Root Level 3",
	"4": "Leaf Level 4",
	"5": "Bud Level 5",
	"6": "Bloom Level 6",
	"7": "Fruit Level 7",
};

const getLevelLabel = (level?: string | number | null) => {
	if (level === undefined || level === null || level === "") {
		return "-";
	}

	const key = String(level).trim();
	return levelLabels[key] ?? `Level ${key}`;
};

const formatDateInputValue = (value?: string | Date | null) => {
	if (!value) {
		return "";
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "";
	}

	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

const parseDateInputValue = (value: string) => {
	const [year, month, day] = value.split("-").map((part) => Number(part));
	if (!year || !month || !day) {
		return null;
	}

	const parsed = new Date(year, month - 1, day);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getDateTimeLocalInputValue = (value: Date = new Date()) => {
	const offsetMs = value.getTimezoneOffset() * 60_000;
	return new Date(value.getTime() - offsetMs).toISOString().slice(0, 16);
};

const dropReasonOptions = [
	{ value: "Student requested break permanently", label: "Student requested break permanently" },
	{ value: "Not enough time for classes", label: "Not enough time for classes" },
	{ value: "Payment issue", label: "Payment issue" },
	{ value: "Moved to another institute", label: "Moved to another institute" },
	{ value: "Other", label: "Other" },
];

const AVATAR_GRADIENTS = [
	"from-teal-500 to-emerald-600",
	"from-blue-500 to-indigo-600",
	"from-violet-500 to-purple-600",
	"from-rose-500 to-pink-600",
	"from-amber-500 to-orange-500",
];

function avatarGradient(id: string) {
	let h = 0;
	for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
	return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length] ?? AVATAR_GRADIENTS[0];
}

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
	<div className="flex items-start justify-between gap-4 py-2.5">
		<dt className="text-sm text-gray-500">{label}</dt>
		<dd className="text-right text-sm font-semibold text-gray-900">{value}</dd>
	</div>
);


const HISTORY_PREVIEW = 4;
const ACTIVITY_PREVIEW = 5;
const REMINDER_PREVIEW = 3;

const Card = ({
	title,
	action,
	children,
}: {
	title: string;
	action?: React.ReactNode;
	children: React.ReactNode;
}) => (
	<section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
		<div className="mb-3 flex min-h-6 items-center justify-between gap-3">
			<h2 className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">{title}</h2>
			{action}
		</div>
		{children}
	</section>
);

const SeeAll = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
	<button
		type="button"
		onClick={onClick}
		className="text-xs font-semibold text-teal-600 transition hover:text-teal-700"
	>
		{children}
	</button>
);

const EmptyState = ({ text }: { text: string }) => (
	<p className="rounded-2xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">{text}</p>
);

const MANAGE_TONES = {
	amber: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
	sky: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100",
	emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
	teal: "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100",
	rose: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
	gray: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
} as const;

const ManageButton = ({
	tone,
	onClick,
	children,
}: {
	tone: keyof typeof MANAGE_TONES;
	onClick: () => void;
	children: React.ReactNode;
}) => (
	<button
		type="button"
		onClick={onClick}
		className={`w-full rounded-xl border px-4 py-2 text-left text-sm font-semibold transition ${MANAGE_TONES[tone]}`}
	>
		{children}
	</button>
);

export const StudentDetailPage = () => {
	const { studentId } = useParams<{ studentId: string }>();
	const navigate = useNavigate();
	const { token } = useSession();
	const { data: me } = useMeQuery(token);
	const hasPermission = (key: string) => me?.permissions?.some((p) => p.key === key) ?? false;
	const studentByIdQuery = useStudentByIdQuery(token, studentId);
	const studentActivitiesQuery = useStudentActivitiesQuery(token, studentId);
	const usersQuery = useUsersQuery(token);
	const followUpSessionsQuery = useStudentFollowUpSessionsQuery(token, studentId);
	const recordFollowUpMutation = useRecordStudentFollowUpMutation();
	const updateAssessmentMutation = useUpdateStudentAssessmentMutation();
	const updateStudentMutation = useUpdateStudentMutation();
	const profilePicInputRef = useRef<HTMLInputElement | null>(null);
	const [historyModalOpen, setHistoryModalOpen] = useState(false);
	const [historyFilter, setHistoryFilter] = useState<"all" | "session" | "note">("all");
	const [activityModalOpen, setActivityModalOpen] = useState(false);
	const [remindersListOpen, setRemindersListOpen] = useState(false);
	const [profileModalOpen, setProfileModalOpen] = useState(false);
	const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
	const [followUpNote, setFollowUpNote] = useState("");
	const [followUpNextDate, setFollowUpNextDate] = useState("");
	const [followUpError, setFollowUpError] = useState<string | undefined>();
	const [remindersModalOpen, setRemindersModalOpen] = useState(false);
	const [showCompletedReminders, setShowCompletedReminders] = useState(false);
	const [assessmentConfirmOpen, setAssessmentConfirmOpen] = useState(false);
	const [pendingAssessment, setPendingAssessment] = useState<{
		assessmentType: "oral" | "written" | "level";
		nextDone: boolean;
	} | null>(null);
	const [removePicConfirmOpen, setRemovePicConfirmOpen] = useState(false);
	const [imageViewerOpen, setImageViewerOpen] = useState(false);
	const [cropModalOpen, setCropModalOpen] = useState(false);
	const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
	const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
	const [certificateConfirmOpen, setCertificateConfirmOpen] = useState(false);
	const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);
	const [transferModalOpen, setTransferModalOpen] = useState(false);
	const [transferMentorId, setTransferMentorId] = useState("");
	const [transferSearch, setTransferSearch] = useState("");
	const [breakModalOpen, setBreakModalOpen] = useState(false);
	const [breakModalMode, setBreakModalMode] = useState<"break" | "extend">("break");
	const [breakFromDate, setBreakFromDate] = useState("");
	const [breakUntilDate, setBreakUntilDate] = useState("");
	const [breakModalError, setBreakModalError] = useState<string | undefined>();
	const [dropModalOpen, setDropModalOpen] = useState(false);
	const [dropReasonChoice, setDropReasonChoice] = useState(dropReasonOptions[0]?.value ?? "");
	const [dropReasonCustom, setDropReasonCustom] = useState("");
	const [dropTemporary, setDropTemporary] = useState(false);
	const [dropModalError, setDropModalError] = useState<string | undefined>();
	const [activateConfirmOpen, setActivateConfirmOpen] = useState(false);
	const remindersQuery = useGetStudentReminders(studentId ?? "");

	const studentProcessesQuery = useStudentProcessesQuery(token);
	const studentProcessHistoryQuery = useStudentProcessHistoryQuery(token);

	const student = studentByIdQuery.data ?? null;

	const mentorName = useMemo(() => {
		if (!student?.mentorId) return "-";
		const user = usersQuery.data?.users.find((u) => u.id === student.mentorId);
		return user?.name ?? user?.username ?? "Unknown";
	}, [student?.mentorId, usersQuery.data?.users]);

	// The student's own saved counsellor (independent of the mentor).
	const counsellorName = useMemo(() => {
		if (!student?.counsellorId) return "-";
		const counsellorUser = usersQuery.data?.users.find(
			(u) => u.id === student.counsellorId,
		);
		return counsellorUser?.name ?? counsellorUser?.username ?? "Unknown";
	}, [student?.counsellorId, usersQuery.data?.users]);

	const admittedByName = useMemo(() => {
		if (!student?.admittedBy) return "-";
		const user = usersQuery.data?.users.find((u) => u.id === student.admittedBy);
		return user?.name ?? user?.username ?? "Unknown";
	}, [student?.admittedBy, usersQuery.data?.users]);

	const allMentorUsers = useMemo(
		() => (usersQuery.data?.users ?? []).filter((u) => (u as any).roles?.some((r: any) => r.type === "mentor")),
		[usersQuery.data?.users],
	);
	// Individual students → individual mentors; group students (have batchId) → group mentors
	const mentorUsers = useMemo(() => {
		const isGroup = Boolean(student?.batchId);
		return isGroup
			? allMentorUsers.filter((u) => (u as any).mentorType === "group")
			: allMentorUsers.filter((u) => (u as any).mentorType !== "group");
	}, [allMentorUsers, student?.batchId]);

	const handleTransfer = async () => {
		if (!studentId || !transferMentorId) return;
		try {
			await updateStudentMutation.mutateAsync({
				studentId,
				payload: { mentorId: transferMentorId },
			});
			toast.success("Student transferred to new mentor");
			setTransferModalOpen(false);
			setTransferMentorId("");
			setTransferSearch("");
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Failed to transfer student");
				return;
			}
			toast.error("Failed to transfer student");
		}
	};

	const profileAvatarLabel = useMemo(() => {
		if (!student) {
			return "S";
		}

		return student.name?.trim().charAt(0).toUpperCase() ?? student.zid.charAt(0).toUpperCase();
	}, [student]);

	const followUpDate = useMemo(
		() => student?.customNextFollowUpAt ?? student?.nextFollowUpAt ?? null,
		[student?.customNextFollowUpAt, student?.nextFollowUpAt],
	);

	const followUpMeta = useMemo(() => {
		if (!followUpDate) {
			return {
				label: "No follow-up set",
				tone: "text-gray-600",
				bg: "bg-gray-50",
				border: "border-gray-200",
			};
		}

		const date = new Date(followUpDate);
		const due = date.getTime() <= Date.now();
		return {
			label: due ? "Follow-up due now" : "Follow-up scheduled",
			tone: due ? "text-rose-700" : "text-teal-700",
			bg: due ? "bg-rose-50" : "bg-teal-50",
			border: due ? "border-rose-200" : "border-teal-200",
		};
	}, [followUpDate]);

	const openFollowUpModal = () => {
		setFollowUpNote("");
		setFollowUpNextDate("");
		setFollowUpError(undefined);
		setFollowUpModalOpen(true);
	};

	const closeFollowUpModal = () => {
		setFollowUpModalOpen(false);
		setFollowUpNote("");
		setFollowUpNextDate("");
		setFollowUpError(undefined);
	};

	const submitFollowUp = async () => {
		if (!studentId) {
			return;
		}

		const note = followUpNote.trim();
		if (!note) {
			setFollowUpError("Follow-up note is required.");
			return;
		}

		let nextFollowUpAt: Date | undefined;
		if (followUpNextDate) {
			const parsedDate = new Date(followUpNextDate);
			if (Number.isNaN(parsedDate.getTime())) {
				setFollowUpError("Please provide a valid next follow-up date.");
				return;
			}
			if (parsedDate.getTime() < Date.now()) {
				setFollowUpError("Past dates are not allowed for follow-up.");
				return;
			}
			nextFollowUpAt = parsedDate;
		}

		try {
			await recordFollowUpMutation.mutateAsync({
				studentId,
				note,
				nextFollowUpAt,
			});
			toast.success("Follow-up recorded");
			closeFollowUpModal();
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Failed to record follow-up");
				return;
			}
			toast.error("Failed to record follow-up");
		}
	};

	const openProfilePicCrop = (file: File) => {
		if (selectedImageUrl) {
			URL.revokeObjectURL(selectedImageUrl);
		}

		setSelectedImageFile(file);
		setSelectedImageUrl(URL.createObjectURL(file));
		setCrop({ x: 0, y: 0 });
		setZoom(1);
		setCroppedAreaPixels(null);
		setCropModalOpen(true);
	};

	const assessmentConfig = [
		{
			assessmentType: "oral" as const,
			label: "Quarterly Oral Assessment",
			value: student?.oralAssessmentDone ?? false,
			description: "Speaking and pronunciation check",
		},
		{
			assessmentType: "written" as const,
			label: "MID Term Assessment",
			value: student?.writtenAssessmentDone ?? false,
			description: "Reading and writing check",
		},
		{
			assessmentType: "level" as const,
			label: "Term End  Assessment",
			value: student?.levelAssessmentDone ?? false,
			description: "Final placement and level check",
		},
	];

	const handleProfilePicChange = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = "";

		if (!file || !studentId) return;
		if (!file.type.startsWith("image/")) {
			toast.error("Please select an image file");
			return;
		}

		openProfilePicCrop(file);
	};

	const removeProfilePic = async () => {
		if (!studentId) {
			return;
		}

		try {
			await updateStudentMutation.mutateAsync({
				studentId,
				payload: { profilePic: null },
			});
			setRemovePicConfirmOpen(false);
			toast.success("Profile picture removed");
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Failed to remove profile picture");
				return;
			}
			toast.error("Failed to remove profile picture");
		}
	};

	const openProfilePicPicker = () => {
		profilePicInputRef.current?.click();
	};

	const downloadCertificate = async () => {
		if (!student) {
			return;
		}

		setIsGeneratingCertificate(true);

		const loadImage = (src: string) => {
			return new Promise<HTMLImageElement>((resolve, reject) => {
				const image = new Image();
				image.crossOrigin = "anonymous";
				image.onload = () => resolve(image);
				image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
				image.src = src;
			});
		};

		try {
			const canvas = document.createElement("canvas");
			// High-resolution certificate size (A4-ish at 300dpi)
			canvas.width = 2480;
			canvas.height = 3508;

			const ctx = canvas.getContext("2d");
			if (!ctx) {
				throw new Error("Failed to get canvas context");
			}

			const [certificateImage] = await Promise.all([loadImage("/certificate.png")]);
			ctx.drawImage(certificateImage, 0, 0, canvas.width, canvas.height);

			const issueDate = new Date().toLocaleDateString("en-IN", {
				year: "numeric",
				month: "long",
				day: "numeric",
			});

			const centerX = canvas.width / 2;

			ctx.textAlign = "center";
			ctx.textBaseline = "middle";

			// Scaled font sizes for larger canvas
			ctx.font = "700 130px Inter, sans-serif";
			ctx.fillStyle = "#14532d";
			ctx.fillText(student.name ?? student.zid, centerX, 1650);

			ctx.shadowColor = "transparent";
			ctx.fillStyle = "#0f172a";
			ctx.font = "600 60px Inter, sans-serif";
			ctx.fillText(getLevelLabel(student.level), (centerX + 450), 1980);

			ctx.font = "600 60px Inter, sans-serif";
			ctx.fillStyle = "#0f172a";
			ctx.fillText(student.zid.toUpperCase(), (centerX + 200), 2350);

			ctx.font = "500 50px Inter, sans-serif";
			ctx.fillStyle = "#334155";
			ctx.fillText(issueDate, (centerX-780), 2620);

			const blob = await new Promise<Blob | null>((resolve) => {
				canvas.toBlob((result) => resolve(result), "image/png");
			});

			if (!blob) {
				throw new Error("Failed to create certificate image");
			}

			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `zidnee-certificate-${student.zid}.png`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			toast.success("Certificate downloaded successfully");
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to download certificate";
			toast.error(message);
		} finally {
			setIsGeneratingCertificate(false);
		}
	};

	const confirmCrop = async () => {
		if (!selectedImageUrl || !selectedImageFile || !studentId || !croppedAreaPixels) return;

		try {
			const croppedBlob = await cropImageToBlob(selectedImageUrl, croppedAreaPixels);
			const croppedFile = new File([croppedBlob], "profile.jpg", { type: "image/jpeg" });

			const form = new FormData();
			form.append("file", croppedFile);

			const res = await fetch(`${API_BASE_URL}/students/${studentId}/profile-pic`, {
				method: "POST",
				body: form,
				headers: token ? { Authorization: `Bearer ${token}` } : undefined,
			});

			const json = await res.json();
			if (!res.ok || !json.ok) {
				throw new ApiError(res.status, json);
			}

			await studentByIdQuery.refetch();
			toast.success("Profile picture updated");
			setCropModalOpen(false);
			setSelectedImageFile(null);
			if (selectedImageUrl) {
				URL.revokeObjectURL(selectedImageUrl);
				setSelectedImageUrl(null);
			}
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Failed to update profile picture");
				return;
			}
			toast.error("Failed to update profile picture");
		}
	};

	const closeCropModal = () => {
		setCropModalOpen(false);
		setSelectedImageFile(null);
		if (selectedImageUrl) {
			URL.revokeObjectURL(selectedImageUrl);
			setSelectedImageUrl(null);
		}
		setCrop({ x: 0, y: 0 });
		setZoom(1);
		setCroppedAreaPixels(null);
	};

	const openAssessmentConfirm = (
		assessmentType: "oral" | "written" | "level",
		nextDone: boolean,
	) => {
		setPendingAssessment({ assessmentType, nextDone });
		setAssessmentConfirmOpen(true);
	};

	const submitAssessmentUpdate = async () => {
		if (!studentId || !pendingAssessment) {
			return;
		}

		try {
			await updateAssessmentMutation.mutateAsync({
				studentId,
				assessmentType: pendingAssessment.assessmentType,
				isDone: pendingAssessment.nextDone,
			});
			toast.success("Assessment updated");
			setAssessmentConfirmOpen(false);
			setPendingAssessment(null);
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Failed to update assessment");
				return;
			}
			toast.error("Failed to update assessment");
		}
	};

	const openBreakModal = (mode: "break" | "extend") => {
		setBreakModalMode(mode);
		setBreakFromDate(formatDateInputValue(mode === "extend" ? student?.inactiveFrom : new Date()));
		setBreakUntilDate(formatDateInputValue(student?.inactiveUntil));
		setBreakModalError(undefined);
		setBreakModalOpen(true);
	};

	const submitBreakUpdate = async () => {
		if (!studentId) {
			return;
		}

		const fromDate = parseDateInputValue(breakFromDate);
		const untilDate = parseDateInputValue(breakUntilDate);

		if (!fromDate || !untilDate) {
			setBreakModalError("Please select both break dates.");
			return;
		}

		if (untilDate.getTime() < fromDate.getTime()) {
			setBreakModalError("Break end date must be on or after the start date.");
			return;
		}

		try {
			await updateStudentMutation.mutateAsync({
				studentId,
				payload: {
					status: "BREAK",
					inactiveFrom: fromDate,
					inactiveUntil: untilDate,
				},
			});
			toast.success(breakModalMode === "extend" ? "Break extended" : "Student put on break");
			setBreakModalOpen(false);
			setBreakModalError(undefined);
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Failed to update break period");
				return;
			}
			toast.error("Failed to update break period");
		}
	};

	const submitDropUpdate = async () => {
		if (!studentId) {
			return;
		}

		const selectedReason = dropReasonChoice.trim();
		const reason = selectedReason === "Other" ? dropReasonCustom.trim() : selectedReason;

		if (!reason) {
			setDropModalError("Please choose a reason or enter a custom one.");
			return;
		}

		try {
			await updateStudentMutation.mutateAsync({
				studentId,
				payload: {
					status: "DROPPED",
					dropReason: reason,
					dropTemporary,
				},
			});
			toast.success("Student marked as dropped");
			setDropModalOpen(false);
			setDropModalError(undefined);
			setDropTemporary(false);
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Failed to drop student");
				return;
			}
			toast.error("Failed to drop student");
		}
	};

	const activateStudent = async () => {
		if (!studentId) {
			return;
		}

		try {
			await updateStudentMutation.mutateAsync({
				studentId,
				payload: {
					status: "STUDENT",
				},
			});
			toast.success("Student marked as active");
			setActivateConfirmOpen(false);
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Failed to activate student");
				return;
			}
			toast.error("Failed to activate student");
		}
	};

	if (studentByIdQuery.isLoading) {
		return (
			<div className="flex items-center justify-center py-20">
				<div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
			</div>
		);
	}

	if (!student) {
		return (
			<div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white py-16 text-center">
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
					<HiUserCircle className="h-6 w-6 text-gray-400" />
				</div>
				<p className="text-sm font-medium text-gray-600">Student not found</p>
				<button
					onClick={() => navigate(-1)}
					className="text-sm font-semibold text-teal-600 hover:underline"
				>
					Go back
				</button>
			</div>
		);
	}

	const heroGradient = avatarGradient(student.id);
	const linkedProcesses = (() => {
		const active = studentProcessesQuery.data?.processes ?? [];
		const history = studentProcessHistoryQuery.data?.processes ?? [];
		return [...active, ...history].filter((p) => p.student?.id === studentId);
	})();

	const activities = studentActivitiesQuery.data?.activities ?? [];
	const followUpSessions = followUpSessionsQuery.data?.sessions ?? [];
	const lastSession = followUpSessions[0];
	const followUpHistory = [
		...followUpSessions.map((s) => ({
			kind: "session" as const,
			id: s.id,
			date: s.createdAt,
			by: s.performedByName,
			session: s,
		})),
		...activities
			.filter((a) => a.type === "FOLLOW_UP_RECORDED")
			.map((a) => ({
				kind: "note" as const,
				id: a.id,
				date: a.createdAt,
				by: a.performedByName,
				note: a.note ?? a.description,
			})),
	].sort((a, b) => b.date.localeCompare(a.date));
	const noteCount = followUpHistory.filter((i) => i.kind === "note").length;

	const pendingReminders = [...(remindersQuery.data ?? [])]
		.filter((r) => !r.isDone)
		.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
	const assessmentsDone = assessmentConfig.filter((a) => a.value).length;
	const whatsappNumber = (student.primaryWhatsappNumber ?? student.phone ?? "").replace(/\D/g, "");

	const followUpDue = followUpDate ? new Date(followUpDate).getTime() <= Date.now() : false;
	const followUpTheme = !followUpDate
		? "from-slate-600 to-slate-800"
		: followUpDue
			? "from-rose-500 to-orange-500"
			: "from-teal-600 to-emerald-600";
	const followUpRelative = (() => {
		if (!followUpDate) return "";
		const days = Math.round((new Date(followUpDate).getTime() - Date.now()) / 86_400_000);
		if (days === 0) return "today";
		return days > 0 ? `in ${days} day${days === 1 ? "" : "s"}` : `${-days} day${days === -1 ? "" : "s"} overdue`;
	})();

	const renderHistoryItem = (item: (typeof followUpHistory)[number]) => (
		<li key={`${item.kind}-${item.id}`}>
			{item.kind === "session" ? (
				<Link
					to={`/students/${studentId}/follow-up/${item.id}`}
					className="flex items-center justify-between gap-3 py-3 transition hover:bg-gray-50"
				>
					<div className="min-w-0">
						<p className="text-sm font-semibold text-gray-900">
							Inspection session
							{item.session.findings.needsAdditionalAttention ? (
								<span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
									Needs attention
								</span>
							) : null}
						</p>
						<p className="truncate text-xs text-gray-500">
							{new Date(item.date).toLocaleDateString("en-IN", { dateStyle: "medium" })} · by {item.by}
							{item.session.findings.counsellorRemarks ? ` · ${item.session.findings.counsellorRemarks}` : ""}
						</p>
					</div>
					<ResultBadge value={item.session.findings.result} />
				</Link>
			) : (
				<div className="py-3">
					<p className="text-sm font-semibold text-gray-900">Quick note</p>
					<p className="whitespace-pre-wrap text-sm text-gray-700">{item.note}</p>
					<p className="text-xs text-gray-500">
						{new Date(item.date).toLocaleDateString("en-IN", { dateStyle: "medium" })} · by {item.by}
					</p>
				</div>
			)}
		</li>
	);

	return (
		<div className="mx-auto max-w-7xl space-y-5">
			<input
				type="file"
				accept="image/*"
				onChange={handleProfilePicChange}
				ref={profilePicInputRef}
				className="hidden"
			/>

			{/* ───────── Header ───────── */}
			<div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
				<div className={`relative h-24 bg-linear-to-br sm:h-28 ${heroGradient}`}>
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_55%)]" />
					<button
						type="button"
						onClick={() => navigate(-1)}
						aria-label="Go back"
						className="absolute left-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/25 text-white backdrop-blur transition hover:bg-white/40"
					>
						<HiArrowLeft className="h-5 w-5" />
					</button>
				</div>
				<div className="px-5 pb-5 sm:px-7">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
						<div className="flex items-end gap-4">
							<div className="relative -mt-12 shrink-0">
								<button
									type="button"
									onClick={() => student.profilePic && setImageViewerOpen(true)}
									className={`flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-linear-to-br shadow-lg ${heroGradient} ${student.profilePic ? "cursor-pointer transition hover:opacity-90" : "cursor-default"}`}
								>
									{student.profilePic ? (
										<img
											src={student.profilePic}
											alt={`${student.name ?? student.zid} profile`}
											className="h-full w-full object-cover"
										/>
									) : (
										<span className="text-3xl font-bold text-white">{profileAvatarLabel}</span>
									)}
								</button>
								{hasPermission("STUDENT_UPLOAD_PROFILE_PIC") ? (
									<button
										type="button"
										onClick={openProfilePicPicker}
										aria-label={student.profilePic ? "Change picture" : "Upload picture"}
										className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-900 text-white shadow transition hover:bg-teal-600"
									>
										<HiCamera className="h-4 w-4" />
									</button>
								) : null}
							</div>
							<div className="min-w-0 pb-1">
								<div className="flex flex-wrap items-center gap-2">
									<h1 className="truncate text-2xl font-bold tracking-tight text-gray-900">
										{student.name}
									</h1>
									<span
										className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${getStudentStatusColor(student.status)}`}
									>
										{getStudentStatusLabel(student.status)}
									</span>
								</div>
								<div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold">
									<span className="rounded-full bg-gray-100 px-2.5 py-1 font-mono text-gray-700">
										{student.zid.toUpperCase()}
									</span>
									{student.courseType ? (
										<span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">
											{student.courseType}
										</span>
									) : null}
									{student.level ? (
										<span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">
											{getLevelLabel(student.level)}
										</span>
									) : null}
								</div>
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							{student.phone ? (
								<a
									href={`tel:${student.phone}`}
									className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-semibold text-gray-700 transition hover:border-teal-300 hover:text-teal-700"
								>
									<HiPhone className="h-4 w-4" />
									Call
								</a>
							) : null}
							{whatsappNumber ? (
								<a
									href={`https://wa.me/${whatsappNumber}`}
									target="_blank"
									rel="noreferrer"
									className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-semibold text-gray-700 transition hover:border-emerald-300 hover:text-emerald-700"
								>
									<HiChatBubbleOvalLeftEllipsis className="h-4 w-4" />
									WhatsApp
								</a>
							) : null}
							{hasPermission("STUDENT_UPDATE") ? (
								<button
									type="button"
									onClick={() => navigate(`/students/${studentId}/edit`)}
									className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-gray-700"
								>
									<HiPencilSquare className="h-4 w-4" />
									Edit
								</button>
							) : null}
						</div>
					</div>

					{student.status === "BREAK" || student.status === "DROPPED" ? (
						<div
							className={`mt-4 flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm ${student.status === "BREAK" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}
						>
							<HiExclamationTriangle className="mt-0.5 h-4 w-4 shrink-0" />
							<p>
								{student.status === "BREAK"
									? `On break${student.inactiveUntil ? ` until ${new Date(student.inactiveUntil).toLocaleDateString("en-IN", { dateStyle: "medium" })}` : ""}.`
									: `Dropped${student.dropTemporary ? " (temporary)" : ""}${student.dropReason ? ` — ${student.dropReason}` : "."}`}
							</p>
						</div>
					) : null}
				</div>
			</div>

			<div className="grid gap-5 lg:grid-cols-3">
				{/* ───────── Main column ───────── */}
				<div className="space-y-5 lg:col-span-2">
					{/* Follow-up hero */}
					<div
						className={`relative overflow-hidden rounded-3xl bg-linear-to-br p-6 text-white shadow-lg ${followUpTheme}`}
					>
						<div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
						<div className="absolute -bottom-12 right-20 h-32 w-32 rounded-full bg-white/10" />
						<div className="relative">
							<div className="flex items-center gap-2">
								<span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide backdrop-blur">
									<HiClock className="h-3.5 w-3.5" />
									{followUpMeta.label}
								</span>
							</div>
							<p className="mt-3 text-3xl font-bold tracking-tight">
								{followUpDate
									? new Date(followUpDate).toLocaleDateString("en-IN", {
										weekday: "short",
										day: "numeric",
										month: "short",
										year: "numeric",
									})
									: "Nothing scheduled"}
							</p>
							<p className="mt-1 text-sm text-white/85">
								{followUpDate
									? `${new Date(followUpDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} · ${followUpRelative}`
									: "Start a session to schedule the next one."}
							</p>

							<div className="mt-5 grid grid-cols-3 gap-3">
								<div className="rounded-2xl bg-white/15 px-3 py-2.5 backdrop-blur">
									<p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Sessions</p>
									<p className="mt-0.5 text-lg font-bold">{followUpSessions.length}</p>
								</div>
								<div className="rounded-2xl bg-white/15 px-3 py-2.5 backdrop-blur">
									<p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Quick notes</p>
									<p className="mt-0.5 text-lg font-bold">{noteCount}</p>
								</div>
								<div className="rounded-2xl bg-white/15 px-3 py-2.5 backdrop-blur">
									<p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Last result</p>
									<p className="mt-0.5 truncate text-sm font-bold leading-7">
										{lastSession ? INSPECTION_RESULT_LABELS[lastSession.findings.result] : "—"}
									</p>
								</div>
							</div>

							{hasPermission("STUDENT_UPDATE") ? (
								<div className="mt-5 flex flex-wrap gap-2">
									<Link
										to={`/students/${studentId}/follow-up/new`}
										className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-sm font-bold text-gray-900 shadow-sm transition hover:bg-gray-100"
									>
										<HiClipboardDocumentCheck className="h-4 w-4" />
										Start follow-up session
									</Link>
									<button
										type="button"
										onClick={openFollowUpModal}
										className="inline-flex items-center justify-center rounded-2xl border border-white/40 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
									>
										Quick note
									</button>
								</div>
							) : null}
						</div>
					</div>

					{/* Follow-up history */}
					<Card
						title="Follow-up history"
						action={
							followUpHistory.length > HISTORY_PREVIEW ? (
								<SeeAll onClick={() => setHistoryModalOpen(true)}>
									View all ({followUpHistory.length})
								</SeeAll>
							) : null
						}
					>
						{followUpHistory.length === 0 ? (
							<EmptyState text="No follow-ups yet. Start a session to record the first one." />
						) : (
							<ul className="divide-y divide-gray-100">
								{followUpHistory.slice(0, HISTORY_PREVIEW).map(renderHistoryItem)}
							</ul>
						)}
					</Card>

					{/* Activity */}
					<Card
						title="Recent activity"
						action={
							activities.length > ACTIVITY_PREVIEW ? (
								<SeeAll onClick={() => setActivityModalOpen(true)}>
									View all ({activities.length})
								</SeeAll>
							) : null
						}
					>
						<ActivityTimeline
							activities={activities.slice(0, ACTIVITY_PREVIEW)}
							emptyMessage="No student history yet. All follow-up changes will appear here."
						/>
					</Card>
				</div>

				{/* ───────── Side column ───────── */}
				<div className="space-y-5">
					{/* About */}
					<Card
						title="About"
						action={<SeeAll onClick={() => setProfileModalOpen(true)}>Full profile</SeeAll>}
					>
						<dl className="divide-y divide-gray-100">
							<InfoRow label="Mentor" value={mentorName} />
							<InfoRow label="Counsellor" value={counsellorName} />
							<InfoRow label="Phone" value={student.phone ?? "-"} />
							<InfoRow
								label="Schedule"
								value={
									student.timeslot?.classesPerWeek
										? `${student.timeslot.classesPerWeek}/week${student.timeslot.durationMinutes ? ` · ${student.timeslot.durationMinutes}m` : ""}`
										: "-"
								}
							/>
							<InfoRow
								label="Admitted"
								value={new Date(student.admittedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
							/>
						</dl>
					</Card>

					{/* Assessment */}
					<Card
						title="Assessment"
						action={
							<span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-600">
								{assessmentsDone}/{assessmentConfig.length}
							</span>
						}
					>
						<div className="mb-4 h-2 overflow-hidden rounded-full bg-gray-100">
							<div
								className="h-full rounded-full bg-emerald-500 transition-all"
								style={{ width: `${assessmentConfig.length ? (assessmentsDone / assessmentConfig.length) * 100 : 0}%` }}
							/>
						</div>
						<ul className="space-y-1">
							{assessmentConfig.map((assessment) => (
								<li
									key={assessment.assessmentType}
									className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-gray-50"
								>
									<div className="flex min-w-0 items-center gap-2.5">
										{assessment.value ? (
											<HiCheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
										) : (
											<span className="h-5 w-5 shrink-0 rounded-full border-2 border-gray-300" />
										)}
										<div className="min-w-0">
											<p className="truncate text-sm font-semibold text-gray-900">{assessment.label}</p>
											<p className="truncate text-xs text-gray-500">{assessment.description}</p>
										</div>
									</div>
									{hasPermission("STUDENT_ASSESSMENT_UPDATE") ? (
										<button
											type="button"
											onClick={() => openAssessmentConfirm(assessment.assessmentType, !assessment.value)}
											className="shrink-0 text-xs font-semibold text-teal-600 hover:text-teal-700"
										>
											{assessment.value ? "Undo" : "Mark done"}
										</button>
									) : null}
								</li>
							))}
						</ul>
						{hasPermission("STUDENT_CERTIFICATE_DOWNLOAD") ? (
							<button
								type="button"
								onClick={() => {
									if (assessmentConfig.every((a) => a.value)) {
										void downloadCertificate();
									} else {
										setCertificateConfirmOpen(true);
									}
								}}
								disabled={isGeneratingCertificate}
								className="mt-3 w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
							>
								{isGeneratingCertificate ? "Preparing certificate..." : "Download certificate"}
							</button>
						) : null}
					</Card>

					{/* Reminders */}
					<Card
						title="Reminders"
						action={
							<div className="flex items-center gap-3">
								{pendingReminders.length > REMINDER_PREVIEW || (remindersQuery.data ?? []).length > pendingReminders.length ? (
									<SeeAll onClick={() => setRemindersListOpen(true)}>View all</SeeAll>
								) : null}
								{hasPermission("REMINDER_CREATE") ? (
									<SeeAll onClick={() => setRemindersModalOpen(true)}>+ Add</SeeAll>
								) : null}
							</div>
						}
					>
						<RemindersList
							studentId={studentId ?? ""}
							reminders={pendingReminders.slice(0, REMINDER_PREVIEW)}
							isLoading={remindersQuery.isLoading}
							onAddNew={() => setRemindersModalOpen(true)}
							users={usersQuery.data?.users ?? []}
							showCompleted={false}
						/>
					</Card>

					{/* Linked processes */}
					<Card title="Linked processes">
						{studentProcessesQuery.isLoading || studentProcessHistoryQuery.isLoading ? (
							<p className="text-sm text-gray-500">Loading...</p>
						) : linkedProcesses.length === 0 ? (
							<EmptyState text="No linked processes" />
						) : (
							<ul className="divide-y divide-gray-100">
								{linkedProcesses.slice(0, 4).map((p) => (
									<li key={p.id}>
										<Link
											to={`/processes/${p.id}`}
											className="flex items-center justify-between gap-3 py-2.5 transition hover:text-teal-700"
										>
											<p className="min-w-0 truncate text-sm font-semibold text-gray-900">{p.label}</p>
											<span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
												{p.tasks.filter((t) => t.completed).length}/{p.tasks.length}
											</span>
										</Link>
									</li>
								))}
							</ul>
						)}
					</Card>

					{/* Manage */}
					{hasPermission("STUDENT_UPDATE") ? (
						<Card title="Manage">
							<div className="flex flex-col gap-2">
								{student.status === "STUDENT" ? (
									<ManageButton tone="amber" onClick={() => openBreakModal("break")}>
										Put on break
									</ManageButton>
								) : null}
								{student.status === "BREAK" ? (
									<ManageButton tone="sky" onClick={() => openBreakModal("extend")}>
										Extend break
									</ManageButton>
								) : null}
								{student.status === "BREAK" || student.status === "DROPPED" ? (
									<ManageButton tone="emerald" onClick={() => setActivateConfirmOpen(true)}>
										Mark active
									</ManageButton>
								) : null}
								{student.status !== "DROPPED" ? (
									<ManageButton
										tone="teal"
										onClick={() => {
											setTransferMentorId(student.mentorId ?? "");
											setTransferModalOpen(true);
										}}
									>
										Transfer mentor
									</ManageButton>
								) : null}
								{student.status !== "DROPPED" ? (
									<ManageButton tone="rose" onClick={() => setDropModalOpen(true)}>
										Drop student
									</ManageButton>
								) : null}
								{student.profilePic ? (
									<ManageButton tone="gray" onClick={() => setRemovePicConfirmOpen(true)}>
										Remove profile picture
									</ManageButton>
								) : null}
							</div>
						</Card>
					) : null}
				</div>
			</div>

			{/* ───────── "View all" dialogs ───────── */}
			<Modal
				wide
				open={historyModalOpen}
				onClose={() => setHistoryModalOpen(false)}
				title="Follow-up history"
				description={`${followUpHistory.length} entries`}
			>
				<div className="mb-3 flex gap-1 rounded-xl bg-gray-100 p-1">
					{(
						[
							["all", "All"],
							["session", "Sessions"],
							["note", "Quick notes"],
						] as const
					).map(([key, label]) => (
						<button
							key={key}
							type="button"
							onClick={() => setHistoryFilter(key)}
							className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${historyFilter === key ? "bg-white text-teal-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
						>
							{label}
						</button>
					))}
				</div>
				<ul className="divide-y divide-gray-100">
					{followUpHistory
						.filter((item) => historyFilter === "all" || item.kind === historyFilter)
						.map(renderHistoryItem)}
				</ul>
			</Modal>

			<Modal
				wide
				open={activityModalOpen}
				onClose={() => setActivityModalOpen(false)}
				title="All activity"
				description={`${activities.length} entries`}
			>
				<ActivityTimeline activities={activities} emptyMessage="No activity yet." />
			</Modal>

			<Modal
				wide
				open={remindersListOpen}
				onClose={() => setRemindersListOpen(false)}
				title="Reminders"
				footer={
					<label className="mr-auto inline-flex items-center gap-2 text-sm font-medium text-gray-700">
						<input
							type="checkbox"
							checked={showCompletedReminders}
							onChange={(event) => setShowCompletedReminders(event.target.checked)}
							className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
						/>
						Show completed
					</label>
				}
			>
				<RemindersList
					studentId={studentId ?? ""}
					reminders={remindersQuery.data ?? []}
					isLoading={remindersQuery.isLoading}
					onAddNew={() => setRemindersModalOpen(true)}
					users={usersQuery.data?.users ?? []}
					showCompleted={showCompletedReminders}
				/>
			</Modal>

			<Modal
				wide
				open={profileModalOpen}
				onClose={() => setProfileModalOpen(false)}
				title="Full profile"
				description={`${student.name ?? ""} · ${student.zid.toUpperCase()}`}
			>
				<div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
					<div>
						<p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-400">Contact</p>
						<dl className="divide-y divide-gray-100">
							<InfoRow label="Phone" value={student.phone ?? "-"} />
							<InfoRow label="Email" value={student.email ?? "-"} />
							<InfoRow label="Primary WhatsApp" value={student.primaryWhatsappNumber ?? "-"} />
							<InfoRow label="Alternate WhatsApp" value={student.alternateWhatsappNumber ?? "-"} />
						</dl>
					</div>
					<div>
						<p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-400">Academic</p>
						<dl className="divide-y divide-gray-100">
							<InfoRow label="Course type" value={student.courseType ?? "-"} />
							<InfoRow label="Level" value={getLevelLabel(student.level)} />
							<InfoRow label="Classes per week" value={student.timeslot?.classesPerWeek ?? "-"} />
							<InfoRow
								label="Duration"
								value={student.timeslot?.durationMinutes ? `${student.timeslot.durationMinutes} minutes` : "-"}
							/>
							<InfoRow label="Schedule preference" value={student.preferredSchedule ?? "-"} />
							<InfoRow label="Language" value={student.preferredLanguage ?? "-"} />
							{student.admissionFee != null ? (
								<InfoRow label="Admission fee" value={`₹${student.admissionFee.toLocaleString("en-IN")}`} />
							) : null}
							{student.price != null ? (
								<InfoRow label="Monthly price" value={`₹${student.price.toLocaleString("en-IN")}`} />
							) : null}
						</dl>
					</div>
					<div>
						<p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-400">Personal</p>
						<dl className="divide-y divide-gray-100">
							<InfoRow
								label="Date of birth"
								value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("en-IN") : "-"}
							/>
							<InfoRow label="Gender" value={student.gender ?? "-"} />
							<InfoRow label="Country" value={student.residingCountry ?? "-"} />
							<InfoRow label="Heard about us" value={student.hearAboutUs ?? "-"} />
						</dl>
					</div>
					<div>
						<p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-400">Admission</p>
						<dl className="divide-y divide-gray-100">
							<InfoRow label="Admitted by" value={admittedByName} />
							<InfoRow
								label="Admitted on"
								value={new Date(student.admittedAt).toLocaleDateString("en-IN", { dateStyle: "long" })}
							/>
							<InfoRow
								label="Break from"
								value={student.inactiveFrom ? new Date(student.inactiveFrom).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "-"}
							/>
							<InfoRow
								label="Break until"
								value={student.inactiveUntil ? new Date(student.inactiveUntil).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "-"}
							/>
						</dl>
					</div>
					<div className="sm:col-span-2">
						<p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-400">Background</p>
						<p className="whitespace-pre-wrap rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
							{student.studentInfo ?? "No background notes recorded."}
						</p>
					</div>
				</div>
			</Modal>

			<Modal
				open={followUpModalOpen}
				onClose={closeFollowUpModal}
				title="Record follow-up"
				description="Add a mandatory note to log this contact and schedule the next follow-up."
				footer={
					<>
						<button
							type="button"
							onClick={closeFollowUpModal}
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => void submitFollowUp()}
							disabled={recordFollowUpMutation.isPending}
							className="rounded-2xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{recordFollowUpMutation.isPending ? "Saving..." : "Record follow-up"}
						</button>
					</>
				}
			>
				<div className="space-y-4">
					<TextAreaField
						label="Follow-up note"
						value={followUpNote}
						onChange={(value) => {
							setFollowUpNote(value);
							if (followUpError) {
								setFollowUpError(undefined);
							}
						}}
						placeholder="Summarize the call, message, or visit."
						error={followUpError}
					/>
					<div className="space-y-1">
						<label className="text-sm font-medium text-gray-700">Next follow-up date (optional)</label>
						<input
							type="datetime-local"
							min={getDateTimeLocalInputValue()}
							value={followUpNextDate}
							onChange={(event) => {
								setFollowUpNextDate(event.target.value);
								if (followUpError) {
									setFollowUpError(undefined);
								}
							}}
							className="w-full rounded-2xl border border-gray-300 px-4 py-2 text-sm text-gray-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
						/>
						<p className="text-xs text-gray-500">Leave empty to use the default 14-day follow-up.</p>
					</div>
				</div>
			</Modal>

			<Modal
				open={assessmentConfirmOpen}
				onClose={() => {
					setAssessmentConfirmOpen(false);
					setPendingAssessment(null);
				}}
				title="Confirm assessment update"
				description={
					pendingAssessment
						? `Mark ${pendingAssessment.assessmentType} assessment as ${pendingAssessment.nextDone ? "done" : "undone"}?`
						: "Confirm the assessment change."
				}
				footer={
					<>
						<button
							type="button"
							onClick={() => {
								setAssessmentConfirmOpen(false);
								setPendingAssessment(null);
							}}
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => void submitAssessmentUpdate()}
							disabled={updateAssessmentMutation.isPending || !pendingAssessment}
							className="rounded-2xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{updateAssessmentMutation.isPending ? "Saving..." : "Confirm"}
						</button>
					</>
				}
			>
				<p className="text-sm text-gray-700">This will update the assessment status and add an activity log entry.</p>
			</Modal>

			<Modal
				open={breakModalOpen}
				onClose={() => {
					setBreakModalOpen(false);
					setBreakModalError(undefined);
				}}
				title={breakModalMode === "extend" ? "Extend break" : "Put student on break"}
				description="Set the break dates. A reminder will be linked to the break end date."
				footer={
					<>
						<button
							type="button"
							onClick={() => {
								setBreakModalOpen(false);
								setBreakModalError(undefined);
							}}
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => void submitBreakUpdate()}
							disabled={updateStudentMutation.isPending}
							className="rounded-2xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{updateStudentMutation.isPending ? "Saving..." : breakModalMode === "extend" ? "Extend break" : "Save break"}
						</button>
					</>
				}
			>
				<div className="space-y-4">
					<div className="grid gap-4 md:grid-cols-2">
						<label className="grid gap-2 text-sm font-medium text-gray-600">
							<span>Break from</span>
							<input
								type="date"
								value={breakFromDate}
								onChange={(event) => {
									setBreakFromDate(event.target.value);
									if (breakModalError) {
										setBreakModalError(undefined);
									}
								}}
								className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-100"
							/>
						</label>
						<label className="grid gap-2 text-sm font-medium text-gray-600">
							<span>Break until</span>
							<input
								type="date"
								value={breakUntilDate}
								onChange={(event) => {
									setBreakUntilDate(event.target.value);
									if (breakModalError) {
										setBreakModalError(undefined);
									}
								}}
								className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-100"
							/>
						</label>
					</div>
					{breakModalError ? (
						<p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{breakModalError}</p>
					) : null}
				</div>
			</Modal>

			<Modal
				open={dropModalOpen}
				onClose={() => {
					setDropModalOpen(false);
					setDropModalError(undefined);
					setDropTemporary(false);
				}}
				title="Drop student"
				description="Choose a preset reason or enter a custom one before marking the student as dropped."
				footer={
					<>
						<button
							type="button"
							onClick={() => {
								setDropModalOpen(false);
								setDropModalError(undefined);
								setDropTemporary(false);
							}}
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => void submitDropUpdate()}
							disabled={updateStudentMutation.isPending}
							className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{updateStudentMutation.isPending ? "Saving..." : "Mark dropped"}
						</button>
					</>
				}
			>
				<div className="space-y-4">
					<SelectField
						label="Reason"
						value={dropReasonChoice}
						onChange={(value) => {
							setDropReasonChoice(value);
							if (dropModalError) {
								setDropModalError(undefined);
							}
						}}
						options={dropReasonOptions}
					/>
					{dropReasonChoice === "Other" ? (
						<TextAreaField
							label="Custom reason"
							value={dropReasonCustom}
							onChange={(value) => {
								setDropReasonCustom(value);
								if (dropModalError) {
									setDropModalError(undefined);
								}
							}}
							placeholder="Explain why the student is being dropped"
							error={dropModalError}
						/>
					) : dropModalError ? (
						<p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{dropModalError}</p>
					) : null}
					<label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900">
						<input
							type="checkbox"
							checked={dropTemporary}
							onChange={(event) => setDropTemporary(event.target.checked)}
							className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
						/>
						Temporary
					</label>
				</div>
			</Modal>

			<ConfirmDialog
				open={activateConfirmOpen}
				title="Mark student active"
				description="This will restore the student to active status and clear any break-only dates or drop reason."
				confirmLabel="Mark active"
				onConfirm={() => {
					void activateStudent();
				}}
				onCancel={() => setActivateConfirmOpen(false)}
				busy={updateStudentMutation.isPending}
			/>

			<ConfirmDialog
				open={certificateConfirmOpen}
				title="Certificate not ready"
				description="Some assessments are not complete. Are you sure you want to download the certificate anyway?"
				confirmLabel="Download anyway"
				onConfirm={() => {
					setCertificateConfirmOpen(false);
					void downloadCertificate();
				}}
				onCancel={() => setCertificateConfirmOpen(false)}
				busy={isGeneratingCertificate}
			/>

			{/* Edit moved to dedicated page */}

			<Modal
				open={removePicConfirmOpen}
				onClose={() => setRemovePicConfirmOpen(false)}
				title="Remove profile picture"
				description="Are you sure you want to remove this profile picture?"
				footer={
					<>
						<button
							type="button"
							onClick={() => setRemovePicConfirmOpen(false)}
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => void removeProfilePic()}
							disabled={updateStudentMutation.isPending}
							className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{updateStudentMutation.isPending ? "Removing..." : "Remove"}
						</button>
					</>
				}
			>
				<p className="text-sm text-gray-700">This action removes the current picture from the student profile.</p>
			</Modal>

			<CreateReminderModal
				studentId={studentId ?? ""}
				isOpen={remindersModalOpen}
				onClose={() => setRemindersModalOpen(false)}
			/>

			{/* Crop Modal */}
			{cropModalOpen && selectedImageUrl ? (
				<MobileImageCropModal
					open={cropModalOpen}
					imageSrc={selectedImageUrl}
					title="Adjust profile picture"
					description="Pinch or use the slider to zoom the image into the square."
					crop={crop}
					zoom={zoom}
					confirmLabel="Crop & Upload"
					confirmDisabled={!croppedAreaPixels}
					onClose={closeCropModal}
					onConfirm={() => void confirmCrop()}
					onCropChange={setCrop}
					onZoomChange={setZoom}
					onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
				/>
			) : null}

			{/* Transfer Mentor Modal */}
			{transferModalOpen ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
						<div className="border-b border-gray-100 px-5 py-4">
							<p className="text-sm font-bold text-gray-900">Transfer Mentor</p>
							<p className="text-xs text-gray-500 mt-0.5">{student?.name ?? student?.zid} · Current: {mentorName}</p>
						</div>
						<div className="space-y-3 px-5 py-4">
							<p className="text-xs text-gray-500">Select a new mentor. The transfer will be recorded in the activity log.</p>
							<input
								type="text"
								value={transferSearch}
								onChange={(e) => setTransferSearch(e.target.value)}
								placeholder="Search mentors…"
								className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
								autoFocus
							/>
							<div className="max-h-52 overflow-y-auto space-y-1 rounded-xl border border-gray-100 p-2">
								{mentorUsers
									.filter((u) => {
										const q = transferSearch.trim().toLowerCase();
										return !q || `${u.name ?? ""} ${u.username ?? ""}`.toLowerCase().includes(q);
									})
									.map((u) => {
										const name = u.name ?? u.username ?? "Unknown";
										const isCurrent = u.id === student?.mentorId;
										const isSelected = transferMentorId === u.id;
										return (
											<button
												key={u.id}
												type="button"
												disabled={isCurrent}
												onClick={() => setTransferMentorId(u.id)}
												className={`w-full rounded-lg border px-3 py-2 text-left transition disabled:opacity-40 ${isSelected ? "border-teal-500 bg-teal-50" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"}`}
											>
												<p className="text-sm font-semibold text-gray-900">{name}</p>
												{isCurrent ? <p className="text-[11px] text-gray-400">Current mentor</p> : null}
											</button>
										);
									})}
							</div>
						</div>
						<div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
							<button type="button" onClick={() => { setTransferModalOpen(false); setTransferSearch(""); }} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
								Cancel
							</button>
							<button
								type="button"
								onClick={() => void handleTransfer()}
								disabled={!transferMentorId || transferMentorId === student?.mentorId || updateStudentMutation.isPending}
								className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
							>
								{updateStudentMutation.isPending ? "Transferring…" : "Transfer"}
							</button>
						</div>
					</div>
				</div>
			) : null}

			{/* Image Viewer Modal */}
			{imageViewerOpen && student?.profilePic && (
				<Modal
					open={imageViewerOpen}
					onClose={() => setImageViewerOpen(false)}
					title="Profile picture"
					description={`${student.name} • ${student.zid}`}
					footer={
						<button
							type="button"
							onClick={() => setImageViewerOpen(false)}
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
						>
							Close
						</button>
					}
				>
					<div className="rounded-xl bg-black p-2">
						<img
							src={student.profilePic}
							alt={`${student.name ?? student.zid} profile enlarged`}
							className="mx-auto max-h-[70vh] w-full object-contain"
						/>
					</div>
				</Modal>
			)}
		</div>
	);
};

