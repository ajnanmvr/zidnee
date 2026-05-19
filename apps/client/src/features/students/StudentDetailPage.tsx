import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { HiArrowLeft } from "react-icons/hi2";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "@/api/request";
import { API_BASE_URL } from "@/api/client";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { Modal, Panel, TextAreaField } from "@/components/dashboard-ui";
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
} from "@/features/students/students.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useSession } from "@/lib/session";

export const StudentDetailPage = () => {
const { studentId } = useParams<{ studentId: string }>();
const navigate = useNavigate();
const { token } = useSession();
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
const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number; displayWidth: number; displayHeight: number } | null>(null);
const [squareSize, setSquareSize] = useState(200);
const [squareX, setSquareX] = useState(0);
const [squareY, setSquareY] = useState(0);
const [isResizing, setIsResizing] = useState(false);
const remindersQuery = useGetStudentReminders(studentId ?? "");

const student = useMemo(
() => studentsQuery.data?.students.find((s) => s.id === studentId),
[studentsQuery.data?.students, studentId],
);

const mentorName = useMemo(() => {
if (!student?.mentorId) return "-";
const user = usersQuery.data?.users.find((u) => u.id === student.mentorId);
return user?.name ?? user?.username ?? "Unknown";
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

const autoCropToSquare = (file: File): Promise<Blob> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			const img = new Image();
			img.onload = () => {
				// Calculate scale from display to actual image
				if (!imageDimensions) {
					reject(new Error("Image dimensions not available"));
					return;
				}

				const scaleX = imageDimensions.width / imageDimensions.displayWidth;
				const scaleY = imageDimensions.height / imageDimensions.displayHeight;

				// Convert display coordinates to actual image coordinates
				const actualX = squareX * scaleX;
				const actualY = squareY * scaleY;
				const actualSize = squareSize * scaleX; // Use scaleX since it's a square

				const canvas = document.createElement("canvas");
				canvas.width = 400;
				canvas.height = 400;

				const ctx = canvas.getContext("2d");
				if (!ctx) {
					reject(new Error("Failed to get canvas context"));
					return;
				}

				// Draw the cropped section onto the canvas
				ctx.drawImage(img, actualX, actualY, actualSize, actualSize, 0, 0, 400, 400);

				canvas.toBlob((blob) => {
					if (blob) resolve(blob);
					else reject(new Error("Failed to create blob"));
				}, "image/jpeg", 0.8);
			};
			img.onerror = () => reject(new Error("Failed to load image"));
			img.src = e.target?.result as string;
		};
		reader.onerror = () => reject(new Error("Failed to read file"));
		reader.readAsDataURL(file);
	});
};

const assessmentConfig = [
{
assessmentType: "oral" as const,
label: "Oral Assessment",
value: student?.oralAssessmentDone ?? false,
description: "Speaking and pronunciation check",
},
{
assessmentType: "written" as const,
label: "Written Assessment",
value: student?.writtenAssessmentDone ?? false,
description: "Reading and writing check",
},
{
assessmentType: "level" as const,
label: "Level Assessment",
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

	// Load image and get dimensions
	const reader = new FileReader();
	reader.onload = (e) => {
		const img = new Image();
		img.onload = () => {
			// Calculate display dimensions (fit to max 500px)
			const maxDim = 500;
			let displayWidth = img.width;
			let displayHeight = img.height;

			if (img.width > maxDim || img.height > maxDim) {
				const ratio = Math.max(img.width, img.height) / maxDim;
				displayWidth = img.width / ratio;
				displayHeight = img.height / ratio;
			}

			setImageDimensions({
				width: img.width,
				height: img.height,
				displayWidth,
				displayHeight,
			});

			// Initialize square in center
			const initialSize = Math.min(displayWidth, displayHeight) * 0.6;
			setSquareSize(initialSize);
			setSquareX((displayWidth - initialSize) / 2);
			setSquareY((displayHeight - initialSize) / 2);
			setIsResizing(false);

			setSelectedImageFile(file);
			setCropModalOpen(true);
		};
		img.src = e.target?.result as string;
	};
	reader.readAsDataURL(file);
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

const confirmCrop = async () => {
	if (!selectedImageFile || !studentId) return;

	try {
		const croppedBlob = await autoCropToSquare(selectedImageFile);
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
	setImageDimensions(null);
	setSquareSize(200);
	setSquareX(0);
	setSquareY(0);
	setIsResizing(false);
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
	className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 ${
		student.profilePic ? "cursor-pointer hover:opacity-80 transition" : ""
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
	<button
		type="button"
		onClick={openProfilePicPicker}
		className="rounded-2xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
	>
		{student.profilePic ? "Change picture" : "Upload profile picture"}
	</button>
	{student.profilePic ? (
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
<div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
<p className="text-xs text-gray-600 uppercase tracking-wide">Owner</p>
<p className="text-lg font-semibold text-gray-900 mt-1">{mentorName}</p>
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
{ key: "assessment", label: "Assessment" },
{ key: "profile", label: "Profile" },
{ key: "reminders", label: "Reminders" },
].map((tab) => (
<button
key={tab.key}
onClick={() =>
setActiveTab(
tab.key as "follow-up" | "assessment" | "profile" | "reminders",
)
}
className={`px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
activeTab === tab.key
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
<button
type="button"
onClick={openFollowUpModal}
className="rounded-2xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
>
Record follow-up
</button>
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
<Panel title="Assessments">
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
<button
type="button"
onClick={() => openAssessmentConfirm(assessment.assessmentType, nextDone)}
className="mt-4 rounded-2xl border border-teal-600 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
>
{assessment.value ? "Mark undone" : "Mark done"}
</button>
</div>
);
})}
</div>
</Panel>
</div>
)}

{activeTab === "profile" && (
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
<Panel title="Profile picture">
<div className="flex flex-col items-center gap-4">
<button
	onClick={() => student?.profilePic && setImageViewerOpen(true)}
	className={`flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50 ${
		student?.profilePic ? "cursor-pointer hover:opacity-80 transition" : ""
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
<label className="inline-flex cursor-pointer items-center rounded-2xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700">
<input type="file" accept="image/*" onChange={handleProfilePicChange} className="hidden" />
Upload profile picture
</label>
{student?.profilePic ? (
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
<dd className="text-sm font-medium text-gray-900 mt-1">{student.level ?? "-"}</dd>
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
<button
type="button"
onClick={() => setRemindersModalOpen(true)}
className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
>
Add Reminder
</button>
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
{cropModalOpen && selectedImageFile && imageDimensions && (
<div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black p-4">
	{/* Close button */}
	<button
		onClick={closeCropModal}
		className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
	>
		<svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
		</svg>
	</button>

	{/* Image container with square overlay */}
	<div className="flex flex-col items-center justify-center flex-1 mb-8">
		<div 
			className="relative bg-black flex items-center justify-center"
			style={{ maxWidth: "600px", maxHeight: "600px" }}
		>
			<img
				src={URL.createObjectURL(selectedImageFile)}
				alt="Crop preview"
				className="max-w-full max-h-full object-contain"
				draggable={false}
				style={{
					width: imageDimensions.displayWidth,
					height: imageDimensions.displayHeight,
				}}
			/>

			{/* Dark overlay with transparent square cutout */}
			<svg
				className="absolute top-0 left-0 pointer-events-none"
				style={{
					width: imageDimensions.displayWidth,
					height: imageDimensions.displayHeight,
				}}
				viewBox={`0 0 ${imageDimensions.displayWidth} ${imageDimensions.displayHeight}`}
			>
				<defs>
					<mask id="cropMask">
						<rect width={imageDimensions.displayWidth} height={imageDimensions.displayHeight} fill="white" />
						<rect x={squareX} y={squareY} width={squareSize} height={squareSize} fill="black" />
					</mask>
				</defs>
				<rect
					width={imageDimensions.displayWidth}
					height={imageDimensions.displayHeight}
					fill="rgba(0, 0, 0, 0.7)"
					mask="url(#cropMask)"
				/>
				{/* Square border */}
				<rect
					x={squareX}
					y={squareY}
					width={squareSize}
					height={squareSize}
					fill="none"
					stroke="#14b8a6"
					strokeWidth="2"
				/>
			</svg>

			{/* Crop square with resize handle - for interaction */}
			<div
				className="absolute cursor-move"
				style={{
					width: squareSize,
					height: squareSize,
					left: squareX,
					top: squareY,
					userSelect: "none",
				}}
				onMouseDown={(e) => {
					if ((e.target as HTMLElement).classList.contains("resize-handle")) return;
					setIsResizing(true);
				}}
				onMouseMove={(e) => {
					if (!isResizing) return;
					const container = (e.currentTarget.parentElement as HTMLElement);
					const rect = container.getBoundingClientRect();
					const newX = Math.max(0, Math.min(e.clientX - rect.left - squareSize / 2, imageDimensions.displayWidth - squareSize));
					const newY = Math.max(0, Math.min(e.clientY - rect.top - squareSize / 2, imageDimensions.displayHeight - squareSize));
					setSquareX(newX);
					setSquareY(newY);
				}}
				onMouseUp={() => setIsResizing(false)}
				onMouseLeave={() => setIsResizing(false)}
			>
				{/* Resize handle - bottom right */}
				<div
					className="resize-handle absolute w-4 h-4 bg-teal-400 bottom-0 right-0 cursor-se-resize transform translate-x-1/2 translate-y-1/2"
					onMouseDown={(e) => {
						e.preventDefault();
						e.stopPropagation();
						const startX = e.clientX;
						const startY = e.clientY;
						const startSize = squareSize;

						const handleMouseMove = (moveEvent: MouseEvent) => {
							const delta = Math.max(moveEvent.clientX - startX, moveEvent.clientY - startY);
							const newSize = Math.max(50, Math.min(startSize + delta, Math.min(imageDimensions.displayWidth - squareX, imageDimensions.displayHeight - squareY)));
							setSquareSize(newSize);
						};

						const handleMouseUp = () => {
							document.removeEventListener("mousemove", handleMouseMove);
							document.removeEventListener("mouseup", handleMouseUp);
						};

						document.addEventListener("mousemove", handleMouseMove);
						document.addEventListener("mouseup", handleMouseUp);
					}}
				/>
			</div>
		</div>

		<p className="text-white text-sm mt-4">Drag the square to reposition, drag corner to resize</p>
	</div>

	{/* Buttons */}
	<div className="flex gap-3 w-full max-w-md">
		<button
			type="button"
			onClick={closeCropModal}
			className="flex-1 px-4 py-2 border border-white rounded-2xl font-semibold text-white hover:bg-white hover:text-black transition"
		>
			Cancel
		</button>
		<button
			type="button"
			onClick={() => void confirmCrop()}
			className="flex-1 px-4 py-2 bg-teal-600 rounded-2xl font-semibold text-white hover:bg-teal-700 transition"
		>
			Crop & Upload
		</button>
	</div>
</div>
)}

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

