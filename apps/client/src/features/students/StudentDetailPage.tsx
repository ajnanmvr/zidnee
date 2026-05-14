import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { HiArrowLeft } from "react-icons/hi2";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "@/api/request";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { Modal, Panel, TextAreaField } from "@/components/dashboard-ui";
import { CreateReminderModal } from "@/features/reminders/CreateReminderModal";
import { RemindersList } from "@/features/reminders/RemindersList";
import { useGetStudentReminders } from "@/features/reminders/reminders.mutations";
import {
	getStudentStatusColor,
	getStudentStatusLabel,
} from "@/features/students/student-table";
import { useRecordStudentFollowUpMutation } from "@/features/students/students.mutations";
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
	const [activeTab, setActiveTab] = useState<"follow-up" | "profile">(
		"follow-up",
	);
	const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
	const [followUpNote, setFollowUpNote] = useState("");
	const [followUpError, setFollowUpError] = useState<string | undefined>();
	const [remindersModalOpen, setRemindersModalOpen] = useState(false);
	const remindersQuery = useGetStudentReminders(studentId ?? "");

	const student = useMemo(
		() => studentsQuery.data?.students.find((s) => s.id === studentId),
		[studentsQuery.data?.students, studentId],
	);

	const mentorName = useMemo(() => {
		if (!student?.mentorId) return "—";
		const user = usersQuery.data?.users.find((u) => u.id === student.mentorId);
		return user?.name ?? user?.username ?? "Unknown";
	}, [student?.mentorId, usersQuery.data?.users]);

	const admittedByName = useMemo(() => {
		if (!student?.admittedBy) return "—";
		const user = usersQuery.data?.users.find(
			(u) => u.id === student.admittedBy,
		);
		return user?.name ?? user?.username ?? "Unknown";
	}, [student?.admittedBy, usersQuery.data?.users]);

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
			{/* Header */}
			<div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div className="flex items-start gap-3">
						<button
							onClick={() => navigate(-1)}
							className="mt-1 text-gray-600 hover:text-gray-900"
						>
							<HiArrowLeft className="h-5 w-5" />
						</button>
						<div>
							<div className="flex items-center gap-2">
								<h1 className="text-2xl font-bold text-gray-900">
									{student.name}
								</h1>
								<span
									className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold text-white ${getStudentStatusColor(
										student.status,
									)}`}
								>
									{getStudentStatusLabel(student.status)}
								</span>
							</div>
							<p className="text-sm text-gray-600 mt-1">
								ZID:{" "}
								<span className="font-mono font-semibold">{student.zid}</span>
							</p>
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

			{/* Follow-up Summary */}
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
				<div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
					<p className="text-xs text-gray-600 uppercase tracking-wide">
						Next follow-up
					</p>
					<p className="text-lg font-semibold text-gray-900 mt-1">
						{followUpDate
							? new Date(followUpDate).toLocaleDateString("en-IN", {
									year: "numeric",
									month: "short",
									day: "numeric",
								})
							: "—"}
					</p>
					<p className="mt-2 text-xs text-gray-500">
						This is the date that determines whether the student appears in the
						follow-up queue.
					</p>
				</div>
				<div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
					<p className="text-xs text-gray-600 uppercase tracking-wide">Owner</p>
					<p className="text-lg font-semibold text-gray-900 mt-1">
						{mentorName}
					</p>
					<p className="mt-2 text-xs text-gray-500">
						Primary mentor / counsellor in charge.
					</p>
				</div>
				<div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
					<p className="text-xs text-gray-600 uppercase tracking-wide">
						Status
					</p>
					<p
						className={`mt-1 inline-flex rounded-full px-3 py-1 text-sm font-semibold text-white ${getStudentStatusColor(
							student.status,
						)}`}
					>
						{getStudentStatusLabel(student.status)}
					</p>
				</div>
				<div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
					<p className="text-xs text-gray-600 uppercase tracking-wide">
						Process
					</p>
					<p className="text-lg font-semibold text-gray-900 mt-1">
						{student.processLabel ?? "—"}
					</p>
					<p className="mt-2 text-xs text-gray-500">
						Linked process for this student.
					</p>
				</div>
			</div>

			{/* Tabs */}
			<div className="border-b border-gray-200">
				<nav className="flex gap-8">
					<button
						onClick={() => setActiveTab("follow-up")}
						className={`px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
							activeTab === "follow-up"
								? "border-teal-600 text-teal-600"
								: "border-transparent text-gray-600 hover:text-gray-900"
						}`}
					>
						Follow-up
					</button>
					<button
						onClick={() => setActiveTab("profile")}
						className={`px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
							activeTab === "profile"
								? "border-teal-600 text-teal-600"
								: "border-transparent text-gray-600 hover:text-gray-900"
						}`}
					>
						Profile
					</button>
				</nav>
			</div>

			{/* Tab Content */}
			{activeTab === "follow-up" && (
				<div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
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
									<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
										Contact
									</p>
									<p className="mt-1 text-lg font-semibold text-gray-900">
										{student.phone}
									</p>
									<p className="text-sm text-gray-600">{student.email}</p>
								</div>
								<div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
									<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
										Coach / Mentor
									</p>
									<p className="mt-1 text-lg font-semibold text-gray-900">
										{mentorName}
									</p>
									<p className="text-sm text-gray-600">
										{student.courseType ?? "—"} · {student.level ?? "—"}
									</p>
								</div>
							</div>
						</Panel>

						<Panel title="Current follow-up state">
							<div className="grid gap-4 sm:grid-cols-3">
								<div>
									<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
										Status
									</p>
									<p
										className="mt-1 inline-flex rounded-full px-3 py-1 text-sm font-semibold text-white"
										style={{ backgroundColor: "#14b8a6" }}
									>
										{getStudentStatusLabel(student.status)}
									</p>
								</div>
								<div>
									<p className="mt-4 text-sm text-gray-600">
										Use this action after a call, WhatsApp chat, or meeting to
										keep the follow-up queue accurate.
									</p>
									<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
										Next follow-up
									</p>
									<p className="mt-1 text-base font-semibold text-gray-900">
										{followUpDate
											? new Date(followUpDate).toLocaleString("en-IN", {
													year: "numeric",
													month: "short",
													day: "numeric",
													hour: "2-digit",
													minute: "2-digit",
												})
											: "—"}
									</p>
								</div>
								<div>
									<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
										Linked process
									</p>
									<p className="mt-1 text-base font-semibold text-gray-900">
										{student.processLabel ?? "—"}
									</p>
								</div>
							</div>
						</Panel>

						<Panel title="Follow-up history">
							<ActivityTimeline
								activities={studentActivitiesQuery.data?.activities ?? []}
								emptyMessage="No student history yet. All follow-up changes will appear here."
							/>
						</Panel>

						<Panel
							title="Reminders"
							action={
								<button
									type="button"
									onClick={() => setRemindersModalOpen(true)}
									className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
								>
									Add Reminder
								</button>
							}
						>
							<RemindersList
								studentId={studentId ?? ""}
								reminders={remindersQuery.data ?? []}
								isLoading={remindersQuery.isLoading}
								onAddNew={() => setRemindersModalOpen(true)}
								users={usersQuery.data?.users ?? []}
							/>
						</Panel>
					</div>

					<div className="space-y-4">
						<Panel title="Quick profile">
							<dl className="space-y-4">
								<div>
									<dt className="text-xs text-gray-600 uppercase tracking-wide">
										Admitted By
									</dt>
									<dd className="text-sm font-medium text-gray-900 mt-1">
										{admittedByName}
									</dd>
								</div>
								<div>
									<dt className="text-xs text-gray-600 uppercase tracking-wide">
										Admitted On
									</dt>
									<dd className="text-sm font-medium text-gray-900 mt-1">
										{new Date(student.admittedAt).toLocaleDateString("en-IN", {
											year: "numeric",
											month: "long",
											day: "numeric",
										})}
									</dd>
								</div>
								<div>
									<dt className="text-xs text-gray-600 uppercase tracking-wide">
										Primary WhatsApp
									</dt>
									<dd className="text-sm font-medium text-gray-900 mt-1">
										{student.primaryWhatsappNumber ?? "—"}
									</dd>
								</div>
								<div>
									<dt className="text-xs text-gray-600 uppercase tracking-wide">
										Alternate WhatsApp
									</dt>
									<dd className="text-sm font-medium text-gray-900 mt-1">
										{student.alternateWhatsappNumber ?? "—"}
									</dd>
								</div>
							</dl>
						</Panel>

						<Panel title="Student info">
							<dl className="space-y-4">
								<div>
									<dt className="text-xs text-gray-600 uppercase tracking-wide">
										Background
									</dt>
									<dd className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
										{student.studentInfo ?? "—"}
									</dd>
								</div>
								<div>
									<dt className="text-xs text-gray-600 uppercase tracking-wide">
										Schedule preference
									</dt>
									<dd className="text-sm font-medium text-gray-900 mt-1">
										{student.preferredSchedule ?? "—"}
									</dd>
								</div>
								<div>
									<dt className="text-xs text-gray-600 uppercase tracking-wide">
										Language
									</dt>
									<dd className="text-sm font-medium text-gray-900 mt-1">
										{student.preferredLanguage ?? "—"}
									</dd>
								</div>
							</dl>
						</Panel>
					</div>
				</div>
			)}

			{activeTab === "profile" && (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					<Panel title="Academic profile">
						<dl className="space-y-4">
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">
									Course Type
								</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">
									{student.courseType ?? "—"}
								</dd>
							</div>
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">
									Level
								</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">
									{student.level ?? "—"}
								</dd>
							</div>
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">
									Classes per week
								</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">
									{student.timeslot?.classesPerWeek ?? "—"}
								</dd>
							</div>
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">
									Duration
								</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">
									{student.timeslot?.durationMinutes
										? `${student.timeslot.durationMinutes} minutes`
										: "—"}
								</dd>
							</div>
						</dl>
					</Panel>

					<Panel title="Personal details">
						<dl className="space-y-4">
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">
									Date of Birth
								</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">
									{student.dateOfBirth
										? new Date(student.dateOfBirth).toLocaleDateString("en-IN")
										: "—"}
								</dd>
							</div>
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">
									Gender
								</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">
									{student.gender ?? "—"}
								</dd>
							</div>
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">
									Country
								</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">
									{student.residingCountry ?? "—"}
								</dd>
							</div>
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">
									How they heard about us
								</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">
									{student.hearAboutUs ?? "—"}
								</dd>
							</div>
						</dl>
					</Panel>
				</div>
			)}

			{/* Back to Students Link */}
			<div className="flex gap-2">
				<Link
					to="/students"
					className="text-teal-600 hover:text-teal-700 text-sm font-medium"
				>
					← Back to Students
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
							{recordFollowUpMutation.isPending
								? "Saving..."
								: "Record follow-up"}
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

			<CreateReminderModal
				studentId={studentId ?? ""}
				isOpen={remindersModalOpen}
				onClose={() => setRemindersModalOpen(false)}
			/>
		</div>
	);
};
