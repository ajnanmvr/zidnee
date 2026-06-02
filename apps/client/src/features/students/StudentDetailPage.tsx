import { type ChangeEvent, useMemo, useRef, useState } from "react";
import type { Area } from "react-easy-crop";
import { toast } from "react-hot-toast";
import { HiArrowLeft } from "react-icons/hi2";
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
	useStudentsQuery,
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

export const StudentDetailPage = () => {
	const { studentId } = useParams<{ studentId: string }>();
	const navigate = useNavigate();
	const { token } = useSession();
	const { data: me } = useMeQuery(token);
	const hasPermission = (key: string) => me?.permissions?.some((p) => p.key === key) ?? false;
	const studentsQuery = useStudentsQuery(token);
	const studentActivitiesQuery = useStudentActivitiesQuery(token, studentId);
	const usersQuery = useUsersQuery(token);
	const recordFollowUpMutation = useRecordStudentFollowUpMutation();
	const updateAssessmentMutation = useUpdateStudentAssessmentMutation();
	const updateStudentMutation = useUpdateStudentMutation();
	const profilePicInputRef = useRef<HTMLInputElement | null>(null);
	const [activeTab, setActiveTab] = useState<
		"follow-up" | "assessment" | "profile" | "reminders"
	>("follow-up");
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

	const student = useMemo(
		() => studentsQuery.data?.students.find((s) => s.id === studentId),
		[studentsQuery.data?.students, studentId],
	);

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

			await studentsQuery.refetch();
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

	if (studentsQuery.isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<p className="text-gray-600">Loading student details...</p>
			</div>
		);
	}

	if (!student) {
		return (
			<div className="text-center py-12">
				<p className="text-gray-600 mb-4">Student not found</p>
				<button
					onClick={() => navigate(-1)}
					className="text-teal-600 hover:underline text-sm font-medium"
				>
					Go back
				</button>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<input
				type="file"
				accept="image/*"
				onChange={handleProfilePicChange}
				ref={profilePicInputRef}
				className="hidden"
			/>
			<div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div className="flex items-start gap-3">
						<button
							onClick={() => navigate(-1)}
							className="mt-1 text-gray-600 hover:text-gray-900"
						>
							<HiArrowLeft className="h-5 w-5" />
						</button>
						<button
							onClick={() => student.profilePic && setImageViewerOpen(true)}
							className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 ${student.profilePic ? "cursor-pointer hover:opacity-80 transition" : ""
								}`}
						>
							{student.profilePic ? (
								<img
									src={student.profilePic}
									alt={`${student.name ?? student.zid} profile`}
									className="h-full w-full object-cover"
								/>
							) : (
								<span className="text-xl font-bold text-gray-400">{profileAvatarLabel}</span>
							)}
						</button>
						<div>
							<div className="flex items-center gap-2">
								<h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
								<span
									className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold text-white ${getStudentStatusColor(
										student.status,
									)}`}
								>
									{getStudentStatusLabel(student.status)}
								</span>
							</div>
							<p className="text-sm text-gray-600 mt-1">
								ZID: <span className="font-mono font-semibold">{student.zid.toUpperCase()}</span>
							</p>
							<div className="mt-3 flex flex-wrap items-center gap-2">
								{hasPermission("STUDENT_UPLOAD_PROFILE_PIC") && (
									<button
										type="button"
										onClick={openProfilePicPicker}
										className="rounded-2xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
									>
										{student.profilePic ? "Change picture" : "Upload profile picture"}
									</button>
								)}
								{/* Certificate download moved to Assessments tab */}
								{student.profilePic && hasPermission("STUDENT_UPDATE") ? (
									<button
										type="button"
										onClick={() => setRemovePicConfirmOpen(true)}
										className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
									>
										Remove picture
									</button>
								) : null}
							</div>
						</div>
					</div>
					<div
						className={`rounded-2xl border px-4 py-3 ${followUpMeta.bg} ${followUpMeta.border}`}
					>
						<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
							Follow-up state
						</p>
						<p className={`mt-1 text-sm font-semibold ${followUpMeta.tone}`}>
							{followUpMeta.label}
						</p>
						<p className="mt-1 text-sm text-gray-700">
							{followUpDate
								? new Date(followUpDate).toLocaleString("en-IN", {
									year: "numeric",
									month: "short",
									day: "numeric",
									hour: "2-digit",
									minute: "2-digit",
								})
								: "Set a follow-up date to surface this student in the worklist"}
						</p>
					</div>
				</div>
			</div>
			{hasPermission("STUDENT_UPDATE") && (
				<button
					className="ml-3 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-800 hover:bg-sky-100"
					type="button"
					onClick={() => navigate(`/students/${studentId}/edit`)}
				>
					Edit
				</button>
			)}

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
				<div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
					<p className="text-xs text-gray-600 uppercase tracking-wide">Next follow-up</p>
					<p className="text-lg font-semibold text-gray-900 mt-1">
						{followUpDate
							? new Date(followUpDate).toLocaleDateString("en-IN", {
								year: "numeric",
								month: "short",
								day: "numeric",
							})
							: "-"}
					</p>
				</div>

				{/* Linked processes (compact) */}
				<div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
					<p className="text-xs text-gray-600 uppercase tracking-wide">Linked processes</p>
					<div className="mt-2">
						{(studentProcessesQuery.isLoading || studentProcessHistoryQuery.isLoading) ? (
							<div className="text-sm text-gray-500">Loading...</div>
						) : (
							(() => {
								const active = studentProcessesQuery.data?.processes ?? [];
								const history = studentProcessHistoryQuery.data?.processes ?? [];
								const linked = [...active, ...history].filter((p) => p.student?.id === studentId);
								if (linked.length === 0) {
									return <div className="text-sm text-gray-500">No linked processes</div>;
								}
								return (
									<ul className="divide-y">
										{linked.slice(0, 6).map((p) => (
											<li key={p.id} className="flex items-center justify-between py-2">
												<div>
													<div className="text-sm font-medium text-slate-900">{p.label}</div>
													<div className="text-xs text-slate-500">{p.student.zid} · {p.student.name ?? "-"}</div>
												</div>
												<div className="flex items-center gap-3">
													<span className="text-xs text-slate-600">{p.tasks.filter((t) => t.completed).length}/{p.tasks.length}</span>
													<Link to={`/processes/${p.id}`} className="text-xs text-emerald-600">Open</Link>
												</div>
											</li>
										))}
									</ul>
								);
							})()
						)}
					</div>
				</div>
				<div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
					<p className="text-xs text-gray-600 uppercase tracking-wide">Mentor</p>
					<p className="text-lg font-semibold text-gray-900 mt-1">{mentorName}</p>
				</div>
				<div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
					<p className="text-xs text-gray-600 uppercase tracking-wide">Counsellor</p>
					<p className="text-lg font-semibold text-gray-900 mt-1">{counsellorName}</p>
				</div>
				<div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
					<p className="text-xs text-gray-600 uppercase tracking-wide">Status</p>
					<p
						className={`mt-1 inline-flex rounded-full px-3 py-1 text-sm font-semibold text-white ${getStudentStatusColor(
							student.status,
						)}`}
					>
						{getStudentStatusLabel(student.status)}
					</p>
				</div>
				<div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
					<p className="text-xs text-gray-600 uppercase tracking-wide">Process</p>
					<p className="text-lg font-semibold text-gray-900 mt-1">
						{student.processLabel ?? "-"}
					</p>
				</div>
			</div>

			<div className="border-b border-gray-200">
				<nav className="flex gap-8">
					{[
						{ key: "follow-up", label: "Follow-up" },
						{ key: "profile", label: "Profile" },
						{ key: "reminders", label: "Reminder" },
						{ key: "assessment", label: "Assessment" },
					].map((tab) => (
						<button
							key={tab.key}
							onClick={() =>
								setActiveTab(
									tab.key as "follow-up" | "assessment" | "profile" | "reminders",
								)
							}
							className={`px-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key
								? "border-teal-600 text-teal-600"
								: "border-transparent text-gray-600 hover:text-gray-900"
								}`}
						>
							{tab.label}
						</button>
					))}
				</nav>
			</div>

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
								<p className="mt-1 inline-flex rounded-full px-3 py-1 text-sm font-semibold text-white" style={{ backgroundColor: "#14b8a6" }}>
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

					<Panel title="Follow-up history">
						<ActivityTimeline
							activities={studentActivitiesQuery.data?.activities ?? []}
							emptyMessage="No student history yet. All follow-up changes will appear here."
						/>
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

					<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
					<Panel title="Profile picture">
						<div className="flex flex-col items-center gap-4">
							<button
								onClick={() => student?.profilePic && setImageViewerOpen(true)}
								className={`flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50 ${student?.profilePic ? "cursor-pointer hover:opacity-80 transition" : ""
									}`}
							>
								{student?.profilePic ? (
									<img
										src={student.profilePic}
										alt={`${student.name ?? student.zid} profile`}
										className="h-full w-full object-cover"
									/>
								) : (
									<span className="text-4xl font-bold text-gray-400">{profileAvatarLabel}</span>
								)}
							</button>
							{hasPermission("STUDENT_UPLOAD_PROFILE_PIC") && (
								<label className="inline-flex cursor-pointer items-center rounded-2xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700">
									<input type="file" accept="image/*" onChange={handleProfilePicChange} className="hidden" />
									Upload profile picture
								</label>
							)}
							{student?.profilePic && hasPermission("STUDENT_UPDATE") ? (
								<button
									type="button"
									onClick={removeProfilePic}
									className="text-sm font-medium text-rose-600 hover:text-rose-700"
								>
									Remove picture
								</button>
							) : null}
						</div>
					</Panel>

					<Panel title="Quick profile">
						<dl className="space-y-4">
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">Admitted By</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">{admittedByName}</dd>
							</div>
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">Admitted On</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">
									{new Date(student.admittedAt).toLocaleDateString("en-IN", {
										year: "numeric",
										month: "long",
										day: "numeric",
									})}
								</dd>
							</div>
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">Primary WhatsApp</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">{student.primaryWhatsappNumber ?? "-"}</dd>
							</div>
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">Alternate WhatsApp</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">{student.alternateWhatsappNumber ?? "-"}</dd>
							</div>
						</dl>
					</Panel>

					<Panel title="Student info">
						<dl className="space-y-4">
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">Background</dt>
								<dd className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{student.studentInfo ?? "-"}</dd>
							</div>
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">Schedule preference</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">{student.preferredSchedule ?? "-"}</dd>
							</div>
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">Language</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">{student.preferredLanguage ?? "-"}</dd>
							</div>
						</dl>
					</Panel>

					<Panel title="Academic profile">
						<dl className="space-y-4">
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">Course Type</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">{student.courseType ?? "-"}</dd>
							</div>
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">Level</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">{getLevelLabel(student.level)}</dd>
							</div>
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">Classes per week</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">{student.timeslot?.classesPerWeek ?? "-"}</dd>
							</div>
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">Duration</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">
									{student.timeslot?.durationMinutes ? `${student.timeslot.durationMinutes} minutes` : "-"}
								</dd>
							</div>
						</dl>
					</Panel>

					<Panel title="Personal details">
						<dl className="space-y-4">
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">Date of Birth</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">
									{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("en-IN") : "-"}
								</dd>
							</div>
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">Gender</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">{student.gender ?? "-"}</dd>
							</div>
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">Country</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">{student.residingCountry ?? "-"}</dd>
							</div>
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">How they heard about us</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">{student.hearAboutUs ?? "-"}</dd>
							</div>
						</dl>
					</Panel>
				</div>
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
				<Link to="/students" className="text-teal-600 hover:text-teal-700 text-sm font-medium">
					? Back to Students
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

