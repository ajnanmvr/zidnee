import { type ChangeEvent, useMemo, useRef, useState } from "react";
import type { Area } from "react-easy-crop";
import { toast } from "react-hot-toast";
import {
	HiArrowLeft,
	HiBell,
	HiCamera,
	HiChatBubbleLeftRight,
	HiClipboardDocumentCheck,
	HiClipboardDocumentList,
	HiClock,
	HiPencilSquare,
	HiTrash,
	HiUserCircle,
	HiUserGroup,
} from "react-icons/hi2";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "@/api/request";
import { API_BASE_URL } from "@/api/client";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { MobileImageCropModal } from "@/components/MobileImageCropModal";
import { Modal, Panel, SelectField, TextAreaField, ConfirmDialog } from "@/components/dashboard-ui";
import { CreateReminderModal } from "@/features/reminders/CreateReminderModal";
import { RemindersList } from "@/features/reminders/RemindersList";
import { useGetStudentReminders } from "@/features/reminders/reminders.mutations";
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

const STAT_ACCENT: Record<string, string> = {
	teal: "bg-teal-100 text-teal-600",
	rose: "bg-rose-100 text-rose-600",
	violet: "bg-violet-100 text-violet-600",
	blue: "bg-blue-100 text-blue-600",
	amber: "bg-amber-100 text-amber-600",
	emerald: "bg-emerald-100 text-emerald-600",
};

const StatTile = ({
	icon,
	accent,
	label,
	value,
}: {
	icon: React.ReactNode;
	accent: keyof typeof STAT_ACCENT;
	label: string;
	value: React.ReactNode;
}) => (
	<div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
		<div className="flex items-center gap-2.5">
			<span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${STAT_ACCENT[accent]}`}>
				{icon}
			</span>
			<p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
		</div>
		<p className="mt-2 truncate text-base font-bold text-gray-900">{value}</p>
	</div>
);

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
	<div className="flex items-start justify-between gap-4 py-2.5">
		<dt className="text-sm text-gray-500">{label}</dt>
		<dd className="text-right text-sm font-semibold text-gray-900">{value}</dd>
	</div>
);

const DETAIL_TABS: { key: "activities" | "follow-up" | "profile" | "reminders" | "assessment"; label: string; icon: React.ReactNode }[] = [
	{ key: "activities", label: "Activities", icon: <HiClock className="h-4 w-4" /> },
	{ key: "follow-up", label: "Follow-up", icon: <HiChatBubbleLeftRight className="h-4 w-4" /> },
	{ key: "profile", label: "Profile", icon: <HiUserCircle className="h-4 w-4" /> },
	{ key: "reminders", label: "Reminders", icon: <HiBell className="h-4 w-4" /> },
	{ key: "assessment", label: "Assessment", icon: <HiClipboardDocumentCheck className="h-4 w-4" /> },
];

export const StudentDetailPage = () => {
	const { studentId } = useParams<{ studentId: string }>();
	const navigate = useNavigate();
	const { token } = useSession();
	const { data: me } = useMeQuery(token);
	const hasPermission = (key: string) => me?.permissions?.some((p) => p.key === key) ?? false;
	const studentByIdQuery = useStudentByIdQuery(token, studentId);
	const studentActivitiesQuery = useStudentActivitiesQuery(token, studentId);
	const usersQuery = useUsersQuery(token);
	const recordFollowUpMutation = useRecordStudentFollowUpMutation();
	const updateAssessmentMutation = useUpdateStudentAssessmentMutation();
	const updateStudentMutation = useUpdateStudentMutation();
	const profilePicInputRef = useRef<HTMLInputElement | null>(null);
	const [activeTab, setActiveTab] = useState<
		"activities" | "follow-up" | "assessment" | "profile" | "reminders"
	>("activities");
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

	const counsellorName = useMemo(() => {
		if (!student?.mentorId) return "-";
		const mentorUser = usersQuery.data?.users.find((u) => u.id === student.mentorId);
		if (!mentorUser?.counsellorId) return "-";
		const counsellorUser = usersQuery.data?.users.find(
			(u) => u.id === mentorUser.counsellorId,
		);
		return counsellorUser?.name ?? counsellorUser?.username ?? "Unknown";
	}, [student?.mentorId, usersQuery.data?.users]);

	const admittedByName = useMemo(() => {
		if (!student?.admittedBy) return "-";
		const user = usersQuery.data?.users.find((u) => u.id === student.admittedBy);
		return user?.name ?? user?.username ?? "Unknown";
	}, [student?.admittedBy, usersQuery.data?.users]);

	const mentorUsers = useMemo(
		() => (usersQuery.data?.users ?? []).filter((u) => (u as any).roles?.some((r: any) => r.type === "mentor")),
		[usersQuery.data?.users],
	);

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

	return (
		<div className="space-y-4">
			<input
				type="file"
				accept="image/*"
				onChange={handleProfilePicChange}
				ref={profilePicInputRef}
				className="hidden"
			/>

			{/* Hero card */}
			<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
				<div className={`relative h-20 bg-linear-to-br sm:h-24 ${heroGradient}`}>
					<button
						onClick={() => navigate(-1)}
						className="absolute left-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur transition hover:bg-white/30"
					>
						<HiArrowLeft className="h-5 w-5" />
					</button>
					<div
						className={`absolute right-4 top-4 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold backdrop-blur ${followUpMeta.bg} ${followUpMeta.border} ${followUpMeta.tone}`}
					>
						<HiClock className="h-3.5 w-3.5" />
						{followUpMeta.label}
					</div>
				</div>
				<div className="px-5 pb-5 sm:px-6">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
						<div className="flex items-start gap-4">
							<button
								onClick={() => student.profilePic && setImageViewerOpen(true)}
								className={`relative z-10 -mt-10 flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-linear-to-br shadow-md sm:-mt-12 sm:h-24 sm:w-24 ${heroGradient} ${student.profilePic ? "cursor-pointer hover:opacity-90 transition" : ""
									}`}
							>
								{student.profilePic ? (
									<img
										src={student.profilePic}
										alt={`${student.name ?? student.zid} profile`}
										className="h-full w-full object-cover"
									/>
								) : (
									<span className="text-2xl font-bold text-white sm:text-3xl">{profileAvatarLabel}</span>
								)}
							</button>
							<div className="pt-1">
								<div className="flex flex-wrap items-center gap-2">
									<h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{student.name}</h1>
									<span
										className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-white ${getStudentStatusColor(
											student.status,
										)}`}
									>
										{getStudentStatusLabel(student.status)}
									</span>
								</div>
								<p className="mt-1 text-sm text-gray-500">
									ZID <span className="font-mono font-semibold text-gray-700">{student.zid.toUpperCase()}</span>
									{student.courseType ? <> · {student.courseType}</> : null}
									{student.level ? <> · {getLevelLabel(student.level)}</> : null}
								</p>
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-2 pb-1">
							{hasPermission("STUDENT_UPLOAD_PROFILE_PIC") && (
								<button
									type="button"
									onClick={openProfilePicPicker}
									className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-semibold text-gray-700 transition hover:border-teal-300 hover:text-teal-700"
								>
									<HiCamera className="h-4 w-4" />
									{student.profilePic ? "Change picture" : "Upload picture"}
								</button>
							)}
							{student.profilePic && hasPermission("STUDENT_UPDATE") ? (
								<button
									type="button"
									onClick={() => setRemovePicConfirmOpen(true)}
									className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3.5 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
								>
									<HiTrash className="h-4 w-4" />
									Remove
								</button>
							) : null}
							{hasPermission("STUDENT_UPDATE") && (
								<button
									className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
									type="button"
									onClick={() => navigate(`/students/${studentId}/edit`)}
								>
									<HiPencilSquare className="h-4 w-4" />
									Edit
								</button>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Stat tiles */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
				<StatTile
					icon={<HiClock className="h-4 w-4" />}
					accent="teal"
					label="Next follow-up"
					value={
						followUpDate
							? new Date(followUpDate).toLocaleDateString("en-IN", {
								year: "numeric",
								month: "short",
								day: "numeric",
							})
							: "Not set"
					}
				/>
				<StatTile
					icon={<HiUserCircle className="h-4 w-4" />}
					accent="violet"
					label="Mentor"
					value={mentorName}
				/>
				<StatTile
					icon={<HiUserGroup className="h-4 w-4" />}
					accent="blue"
					label="Counsellor"
					value={counsellorName}
				/>
				<StatTile
					icon={<HiClipboardDocumentList className="h-4 w-4" />}
					accent="amber"
					label="Status"
					value={getStudentStatusLabel(student.status)}
				/>
				<StatTile
					icon={<HiClipboardDocumentCheck className="h-4 w-4" />}
					accent="rose"
					label="Process"
					value={student.processLabel ?? "-"}
				/>
			</div>

			{/* Linked processes */}
			<div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
				<p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Linked processes</p>
				<div className="mt-2">
					{(studentProcessesQuery.isLoading || studentProcessHistoryQuery.isLoading) ? (
						<div className="text-sm text-gray-500">Loading...</div>
					) : linkedProcesses.length === 0 ? (
						<div className="text-sm text-gray-500">No linked processes</div>
					) : (
						<ul className="divide-y divide-gray-100">
							{linkedProcesses.slice(0, 6).map((p) => (
								<li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
									<div className="min-w-0">
										<p className="truncate text-sm font-semibold text-gray-900">{p.label}</p>
										<p className="truncate text-xs text-gray-500">{p.student.zid} · {p.student.name ?? "-"}</p>
									</div>
									<div className="flex shrink-0 items-center gap-3">
										<span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
											{p.tasks.filter((t) => t.completed).length}/{p.tasks.length}
										</span>
										<Link to={`/processes/${p.id}`} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">Open</Link>
									</div>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>

			{/* Tabs */}
			<div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-1">
				{DETAIL_TABS.map((tab) => {
					const isActive = activeTab === tab.key;
					return (
						<button
							key={tab.key}
							onClick={() => setActiveTab(tab.key)}
							className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${isActive ? "bg-white text-teal-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
								}`}
						>
							{tab.icon}
							{tab.label}
						</button>
					);
				})}
			</div>

			{activeTab === "activities" && (
				<div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
					<div className="mb-4">
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
							Activity Trail
						</p>
						<h2 className="mt-1 text-xl font-bold text-gray-900">
							Student Activities
						</h2>
					</div>
					<ActivityTimeline
						activities={studentActivitiesQuery.data?.activities ?? []}
						emptyMessage="No student history yet. All follow-up changes will appear here."
					/>
				</div>
			)}

			{activeTab === "follow-up" && (
				<div className="space-y-4">
					<Panel
						title="Follow-up focus"
						action={
							hasPermission("STUDENT_UPDATE") ? (
								<button
									type="button"
									onClick={openFollowUpModal}
									className="rounded-2xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
								>
									Record follow-up
								</button>
							) : null
						}
					>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
								<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Contact</p>
								<p className="mt-1 text-lg font-semibold text-gray-900">{student.phone}</p>
								<p className="text-sm text-gray-600">{student.email}</p>
							</div>
							<div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
								<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Coach / Mentor</p>
								<p className="mt-1 text-lg font-semibold text-gray-900">{mentorName}</p>
								<p className="text-sm text-gray-600">{student.courseType ?? "-"} · {student.level ?? "-"}</p>
							</div>
						</div>
					</Panel>

					<Panel title="Current follow-up state">
						<div className="grid gap-4 sm:grid-cols-3">
							<div>
								<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</p>
								<p className={`mt-1 inline-flex rounded-full px-3 py-1 text-sm font-semibold text-white ${getStudentStatusColor(student.status)}`}>
									{getStudentStatusLabel(student.status)}
								</p>
							</div>
							<div>
								<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Next follow-up</p>
								<p className="mt-1 text-base font-semibold text-gray-900">
									{followUpDate
										? new Date(followUpDate).toLocaleString("en-IN", {
											year: "numeric",
											month: "short",
											day: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										})
										: "-"}
								</p>
							</div>
							<div>
								<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Linked process</p>
								<p className="mt-1 text-base font-semibold text-gray-900">{student.processLabel ?? "-"}</p>
							</div>
						</div>
					</Panel>
				</div>
			)}

			{activeTab === "assessment" && (
				<div className="space-y-4">
					<Panel
						title="Assessments"
						action={
							<div>
								{hasPermission("STUDENT_CERTIFICATE_DOWNLOAD") && (
									<button
										type="button"
										onClick={() => {
											const allDone = assessmentConfig.every((a) => a.value);
											if (allDone) {
												void downloadCertificate();
											} else {
												setCertificateConfirmOpen(true);
											}
										}}
										disabled={isGeneratingCertificate}
										className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
									>
										{isGeneratingCertificate ? "Preparing certificate..." : "Download certificate"}
									</button>
								)}
							</div>
						}
					>
						<div className="space-y-4">
							{assessmentConfig.map((assessment) => {
								const nextDone = !assessment.value;
								return (
									<div key={assessment.assessmentType} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
										<div className="flex items-start justify-between gap-4">
											<div>
												<p className="text-sm font-semibold text-gray-900">{assessment.label}</p>
												<p className="mt-1 text-sm text-gray-600">{assessment.description}</p>
											</div>
											<span
												className={`rounded-full px-3 py-1 text-xs font-semibold ${assessment.value ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
											>
												{assessment.value ? "Done" : "Not done"}
											</span>
										</div>
										{hasPermission("STUDENT_ASSESSMENT_UPDATE") ? (
											<button
												type="button"
												onClick={() => openAssessmentConfirm(assessment.assessmentType, nextDone)}
												className="mt-4 rounded-2xl border border-teal-600 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
											>
												{assessment.value ? "Mark undone" : "Mark done"}
											</button>
										) : null}
									</div>
								);
							})}
						</div>
					</Panel>
				</div>
			)}

			{activeTab === "profile" && (
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
					<Panel
						title="Lifecycle controls"
						action={
							<div className="flex flex-wrap gap-2">
								{student.status === "STUDENT" && hasPermission("STUDENT_UPDATE") ? (
									<>
										<button
											type="button"
											onClick={() => openBreakModal("break")}
											className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:border-amber-300 hover:bg-amber-100"
										>
											Put on break
										</button>
										<button
											type="button"
											onClick={() => setDropModalOpen(true)}
											className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
										>
											Drop student
										</button>
									</>
								) : null}
								{student.status === "BREAK" && hasPermission("STUDENT_UPDATE") ? (
									<>
										<button
											type="button"
											onClick={() => openBreakModal("extend")}
											className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
										>
											Extend break
										</button>
										<button
											type="button"
											onClick={() => setActivateConfirmOpen(true)}
											className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
										>
											Mark active
										</button>
										<button
											type="button"
											onClick={() => setDropModalOpen(true)}
											className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
										>
											Drop student
										</button>
									</>
								) : null}
								{student.status === "DROPPED" && hasPermission("STUDENT_UPDATE") ? (
									<button
										type="button"
										onClick={() => setActivateConfirmOpen(true)}
										className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
									>
										Mark active
									</button>
								) : null}
							</div>
						}
					>
						<div className="grid gap-4 md:grid-cols-3">
							<div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
								<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current status</p>
								<p className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold text-white ${getStudentStatusColor(student.status)}`}>
									{getStudentStatusLabel(student.status)}
								</p>
							</div>
							<div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
								<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Break from</p>
								<p className="mt-2 text-sm font-semibold text-gray-900">
									{student.inactiveFrom ? new Date(student.inactiveFrom).toLocaleDateString("en-IN", {
										year: "numeric",
										month: "short",
										day: "numeric",
									}) : "-"}
								</p>
							</div>
							<div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
								<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Break until</p>
								<p className="mt-2 text-sm font-semibold text-gray-900">
									{student.inactiveUntil ? new Date(student.inactiveUntil).toLocaleDateString("en-IN", {
										year: "numeric",
										month: "short",
										day: "numeric",
									}) : "-"}
								</p>
							</div>
							{student.status === "DROPPED" || student.dropReason ? (
								<div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 md:col-span-3">
									<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Drop reason</p>
									<p className="mt-2 text-sm font-medium text-gray-900 whitespace-pre-wrap">
										{student.dropReason ?? "-"}
									</p>
									{student.dropTemporary ? (
										<span className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
											Temporary
										</span>
									) : null}
								</div>
							) : null}
						</div>
					</Panel>

					<Panel title="Quick profile">
						<dl className="divide-y divide-gray-100">
							<InfoRow label="Admitted by" value={admittedByName} />
							<InfoRow
								label="Admitted on"
								value={new Date(student.admittedAt).toLocaleDateString("en-IN", {
									year: "numeric",
									month: "long",
									day: "numeric",
								})}
							/>
							<InfoRow label="Phone" value={student.phone ?? "-"} />
							<InfoRow label="Email" value={student.email ?? "-"} />
							<InfoRow label="Primary WhatsApp" value={student.primaryWhatsappNumber ?? "-"} />
							<InfoRow label="Alternate WhatsApp" value={student.alternateWhatsappNumber ?? "-"} />
						</dl>
					</Panel>

					<Panel title="Academic profile">
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
					</Panel>

					<Panel title="Personal details">
						<dl className="divide-y divide-gray-100">
							<InfoRow
								label="Date of birth"
								value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("en-IN") : "-"}
							/>
							<InfoRow label="Gender" value={student.gender ?? "-"} />
							<InfoRow label="Country" value={student.residingCountry ?? "-"} />
							<InfoRow label="How they heard about us" value={student.hearAboutUs ?? "-"} />
						</dl>
					</Panel>

					<Panel title="Student background">
						<p className="whitespace-pre-wrap text-sm text-gray-700">{student.studentInfo ?? "No background notes recorded."}</p>
					</Panel>

					{hasPermission("STUDENT_UPDATE") && student.status !== "DROPPED" ? (
						<Panel
							title="Transfer Mentor"
							action={
								<button
									type="button"
									onClick={() => { setTransferMentorId(student.mentorId ?? ""); setTransferModalOpen(true); }}
									className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-100"
								>
									Transfer
								</button>
							}
						>
							<div className="space-y-2 text-sm text-gray-700">
								<p><span className="font-medium text-gray-500">Current mentor:</span> {mentorName}</p>
								<p><span className="font-medium text-gray-500">Counsellor:</span> {counsellorName}</p>
							</div>
						</Panel>
					) : null}
				</div>
			)}

			{activeTab === "reminders" && (
				<div className="space-y-4">
					<Panel
						title="Reminders"
						action={
							<div className="flex flex-wrap items-center gap-3">
								<label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
									<input
										type="checkbox"
										checked={showCompletedReminders}
										onChange={(event) => setShowCompletedReminders(event.target.checked)}
										className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
									/>
									Show completed
								</label>
								{hasPermission("REMINDER_CREATE") && (
									<button
										type="button"
										onClick={() => setRemindersModalOpen(true)}
										className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
									>
										Add Reminder
									</button>
								)}
							</div>
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
					</Panel>
				</div>
			)}

			<div className="flex gap-2">
				<Link to="/students" className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:text-teal-700">
					<HiArrowLeft className="h-4 w-4" />
					Back to Students
				</Link>
			</div>

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
							<select
								value={transferMentorId}
								onChange={(e) => setTransferMentorId(e.target.value)}
								className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
							>
								<option value="">— Select mentor —</option>
								{mentorUsers.map((u) => (
									<option key={u.id} value={u.id} disabled={u.id === student?.mentorId}>
										{u.name ?? u.username}
										{u.id === student?.mentorId ? " (current)" : ""}
									</option>
								))}
							</select>
						</div>
						<div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
							<button type="button" onClick={() => setTransferModalOpen(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
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

