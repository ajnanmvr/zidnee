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
const [followUpError, setFollowUpError] = useState<string | undefined>();
const [remindersModalOpen, setRemindersModalOpen] = useState(false);
const [showCompletedReminders, setShowCompletedReminders] = useState(false);
const [assessmentConfirmOpen, setAssessmentConfirmOpen] = useState(false);
const [pendingAssessment, setPendingAssessment] = useState<{
assessmentType: "oral" | "written" | "level";
nextDone: boolean;
} | null>(null);
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
setFollowUpError(undefined);
setFollowUpModalOpen(true);
};

const closeFollowUpModal = () => {
setFollowUpModalOpen(false);
setFollowUpNote("");
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

try {
await recordFollowUpMutation.mutateAsync({ studentId, note });
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

	try {
		const form = new FormData();
		form.append("file", file);

		const res = await fetch(`${API_BASE_URL}/students/${studentId}/profile-pic`, {
			method: "POST",
			body: form,
			headers: token ? { Authorization: `Bearer ${token}` } : undefined,
		});

		const json = await res.json();
		if (!res.ok || !json.ok) {
			throw new ApiError(res.status, json);
		}

		// Refresh students list to pick up updated profile pic
		await studentsQuery.refetch();
		toast.success("Profile picture updated");
	} catch (error) {
		if (error instanceof ApiError) {
			toast.error(error.payload.message ?? "Failed to update profile picture");
			return;
		}
		toast.error("Failed to update profile picture");
	}
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
<div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
	{student.profilePic ? (
		<img
			src={student.profilePic}
			alt={`${student.name ?? student.zid} profile`}
			className="h-full w-full object-cover"
		/>
	) : (
		<span className="text-xl font-bold text-gray-400">{profileAvatarLabel}</span>
	)}
</div>
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
			onClick={removeProfilePic}
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
<div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50">
{student?.profilePic ? (
<img
src={student.profilePic}
alt={`${student.name ?? student.zid} profile`}
className="h-full w-full object-cover"
/>
) : (
<span className="text-4xl font-bold text-gray-400">{profileAvatarLabel}</span>
)}
</div>
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

<CreateReminderModal
studentId={studentId ?? ""}
isOpen={remindersModalOpen}
onClose={() => setRemindersModalOpen(false)}
/>
</div>
);
};

