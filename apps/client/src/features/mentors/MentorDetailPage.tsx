import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FOLLOW_UP_PERIOD_MS, REMINDER_DEFAULT_DAYS } from "@repo/schema";
import toast from "react-hot-toast";
import { HiClock, HiCheckCircle, HiPlusCircle, HiTrash, HiUserGroup, HiXCircle } from "react-icons/hi2";
import { Modal } from "@/components/dashboard-ui";
import { useSession } from "@/lib/session";
import { useMentorsQuery } from "@/features/users/users.queries";
import { useStudentsQuery } from "@/features/students/students.queries";
import { getStudentStatusColor, getStudentStatusLabel } from "@/features/students/student-table";
import { CreateSubstitutionModal } from "./CreateSubstitutionModal";
import { MentorSubstitutionInfo } from "./MentorSubstitutionInfo";
import {
	useMentorFollowUpQuery,
	useRecordMentorFollowUpMutation,
	useSetMentorCustomFollowUpMutation,
} from "@/features/mentors/mentor-followup.queries";
import {
	useMentorRemindersQuery,
	useCreateMentorReminderMutation,
	useUpdateMentorReminderMutation,
	useDeleteMentorReminderMutation,
} from "@/features/mentors/mentor-reminder.queries";
import { useMentorActivitiesQuery } from "@/features/mentors/mentor-activity.queries";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { useForm, Controller } from "react-hook-form";
import { useDeleteUserMutation } from "@/features/users/use-user-management-mutations";
import { useUpdateStudentMutation } from "@/features/students/use-update-student-mutation";
import { useBatchesByMentorQuery } from "@/features/batches/batches.queries";

const formatUserName = (name?: string | null, username?: string | null) =>
	name?.trim() || username?.trim() || "-";

interface FollowUpForm {
	note?: string;
	nextFollowUpAt?: Date;
}

interface ReminderForm {
	date: Date;
	note: string;
}

interface CustomFollowUpForm {
	customDate: Date;
}

type MentorTabKey =
	| "overview"
	| "activity"
	| "reminders"
	| "students"
	| "groups";

type StudentStatusTabKey = "STUDENT" | "BREAK" | "DROPPED";

export const MentorDetailPage = () => {
	const { mentorId } = useParams<{ mentorId: string }>();
	const { token } = useSession();
	const navigate = useNavigate();
	const usersQuery = useMentorsQuery(token);
	const studentsQuery = useStudentsQuery(token);
	const batchesQuery = useBatchesByMentorQuery(token, mentorId ?? "");
	const mentorFollowUpQuery = useMentorFollowUpQuery(
		token,
		mentorId,
	);
	const mentorRemindersQuery = useMentorRemindersQuery(
		token,
		mentorId,
	);
	const mentorActivitiesQuery = useMentorActivitiesQuery(token, mentorId);

	const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
	const [reminderModalOpen, setReminderModalOpen] = useState(false);
	const [customFollowUpModalOpen, setCustomFollowUpModalOpen] = useState(false);
	const [substitutionModalOpen, setSubstitutionModalOpen] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<MentorTabKey>("activity");
	const [studentStatusTab, setStudentStatusTab] = useState<StudentStatusTabKey>("STUDENT");
	const [changeMentorMode, setChangeMentorMode] = useState(false);
	const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
	const [targetMentorId, setTargetMentorId] = useState<string>("");
	const [changeMentorConfirmOpen, setChangeMentorConfirmOpen] = useState(false);

	const recordFollowUpMutation = useRecordMentorFollowUpMutation();
	const setCustomFollowUpMutation = useSetMentorCustomFollowUpMutation();
	const createReminderMutation = useCreateMentorReminderMutation();
	const updateReminderMutation = useUpdateMentorReminderMutation();
	const deleteReminderMutation = useDeleteMentorReminderMutation();
	const deleteUserMutation = useDeleteUserMutation();
	const updateStudentMutation = useUpdateStudentMutation();

	const {
		control: followUpControl,
		handleSubmit: handleFollowUpSubmit,
		reset: resetFollowUp,
	} = useForm<FollowUpForm>({
		defaultValues: { note: "", nextFollowUpAt: undefined },
	});

	const {
		control: reminderControl,
		handleSubmit: handleReminderSubmit,
		reset: resetReminder,
	} = useForm<ReminderForm>({
		defaultValues: {
			date: new Date(Date.now() + REMINDER_DEFAULT_DAYS * 24 * 60 * 60 * 1000),
			note: "",
		},
	});

	const {
		control: customFollowUpControl,
		handleSubmit: handleCustomFollowUpSubmit,
		reset: resetCustomFollowUp,
	} = useForm<CustomFollowUpForm>({
		defaultValues: {
			customDate: new Date(Date.now() + FOLLOW_UP_PERIOD_MS.mentor),
		},
	});

	const allUsers = usersQuery.data?.users ?? [];
	const allStudents = studentsQuery.data?.students ?? [];
	const mentor = useMemo(
		() => allUsers.find((u) => u.id === mentorId),
		[allUsers, mentorId],
	);

	// All students assigned to this mentor (used for delete guard)
	const allMentorStudents = useMemo(
		() => allStudents.filter((s) => s.mentorId === mentorId),
		[allStudents, mentorId],
	);
	// Only individual, non-dropped students shown in the tab
	const mentorStudents = useMemo(
		() =>
			allMentorStudents.filter(
				(s) =>
					s.courseType !== "GROUP" &&
					(s.status === "STUDENT" || s.status === "BREAK"),
			),
		[allMentorStudents],
	);
	const mentorOptions = useMemo(
		() =>
			allUsers.filter(
				(user) =>
					user.id !== mentorId &&
					user.roles.some((role) => role.type === "mentor"),
			),
		[allUsers, mentorId],
	);

	const activeStudents = useMemo(
		() => mentorStudents.filter((s) => s.status === "STUDENT"),
		[mentorStudents],
	);
	const breakStudents = useMemo(
		() => mentorStudents.filter((s) => s.status === "BREAK"),
		[mentorStudents],
	);

	const onDeleteMentor = async () => {
		if (!mentorId) return;
		if (allMentorStudents.length > 0) {
			toast.error("Cannot delete a mentor who still has students assigned.");
			return;
		}
		try {
			await deleteUserMutation.mutateAsync(mentorId);
			toast.success("Mentor deleted.");
			navigate("/mentors");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to delete mentor");
		}
		setDeleteConfirmOpen(false);
	};

	const onBulkChangeMentor = async () => {
		if (!targetMentorId || selectedStudentIds.size === 0) return;
		try {
			await Promise.all(
				Array.from(selectedStudentIds).map((studentId) =>
					updateStudentMutation.mutateAsync({
						studentId,
						payload: { mentorId: targetMentorId },
					}),
				),
			);
			toast.success(`${selectedStudentIds.size} student${selectedStudentIds.size > 1 ? "s" : ""} reassigned.`);
			setSelectedStudentIds(new Set());
			setTargetMentorId("");
			setChangeMentorMode(false);
			setChangeMentorConfirmOpen(false);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to reassign students");
		}
	};

	const onFollowUpSubmit = async (data: FollowUpForm) => {
		if (!mentorId) return;
		try {
			await recordFollowUpMutation.mutateAsync({
				mentorId,
				note: data.note,
				nextFollowUpAt: data.nextFollowUpAt,
			});
			toast.success("Followup recorded for mentor");
			setFollowUpModalOpen(false);
			resetFollowUp();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to record followup",
			);
		}
	};

	const onReminderSubmit = async (data: ReminderForm) => {
		if (!mentorId) return;
		try {
			await createReminderMutation.mutateAsync({
				mentorId,
				payload: {
					date: data.date,
					note: data.note,
				},
			});
			toast.success("Reminder created for mentor");
			setReminderModalOpen(false);
			resetReminder();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to create reminder",
			);
		}
	};

	const onCustomFollowUpSubmit = async (data: CustomFollowUpForm) => {
		if (!mentorId) return;
		try {
			await setCustomFollowUpMutation.mutateAsync({
				mentorId,
				customDate: data.customDate,
			});
			toast.success("Custom followup date set");
			setCustomFollowUpModalOpen(false);
			resetCustomFollowUp();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to set custom date",
			);
		}
	};

	const toggleReminderDone = async (
		reminderId: string,
		currentStatus: boolean,
	) => {
		if (!mentorId) return;
		try {
			await updateReminderMutation.mutateAsync({
				reminderId,
				mentorId,
				payload: { isDone: !currentStatus },
			});
			toast.success("Reminder updated");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to update reminder",
			);
		}
	};

	const deleteReminder = async (reminderId: string) => {
		if (!mentorId) return;
		try {
			await deleteReminderMutation.mutateAsync({
				reminderId,
				mentorId,
			});
			toast.success("Reminder deleted");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to delete reminder",
			);
		}
	};

	if (
		mentorFollowUpQuery.isLoading ||
		mentorRemindersQuery.isLoading ||
		mentorActivitiesQuery.isLoading ||
		usersQuery.isLoading
	) {
		return (
			<div className="py-8 text-center text-gray-600">Loading mentor details...</div>
		);
	}

	if (!mentor) {
		return (
			<div className="py-8 text-center text-gray-600">Mentor not found.</div>
		);
	}

	const reminders = mentorRemindersQuery.data?.reminders ?? [];
	const activities = mentorActivitiesQuery.data?.activities ?? [];
	const followUpState = mentorFollowUpQuery.data?.user ?? mentor;
	const nextFollowUpDate = followUpState.customNextFollowUpAt
		? new Date(followUpState.customNextFollowUpAt)
		: followUpState.nextFollowUpAt
			? new Date(followUpState.nextFollowUpAt)
			: null;

	const isFollowUpDue = nextFollowUpDate && nextFollowUpDate <= new Date();

	const mentorTabs: Array<{
		key: MentorTabKey;
		label: string;
		description: string;
	}> = [
		{ key: "activity", label: "Activities", description: "Recent actions" },
		{ key: "overview", label: "Overview", description: "Mentor summary" },
		{ key: "reminders", label: "Reminders", description: "Tasks" },
		{ key: "students", label: "Students", description: "Assigned list" },
		{ key: "groups", label: "Groups", description: "Batches" },
	];

	const studentStatusTabs: Array<{
		key: StudentStatusTabKey;
		label: string;
		count: number;
	}> = [
		{ key: "STUDENT", label: "Active", count: activeStudents.length },
		{ key: "BREAK", label: "Break", count: breakStudents.length },
	];

	const selectedStudentGroup =
		studentStatusTab === "STUDENT"
			? { label: "Active", students: activeStudents }
			: { label: "Break", students: breakStudents };

	const batches = batchesQuery.data?.batches ?? [];

	const initials = (mentor.name ?? mentor.username ?? "?")
		.split(" ")
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase() ?? "")
		.join("");

	const Stat = ({ label, value, dim }: { label: string; value: string; dim?: boolean }) => (
		<div className="flex flex-col gap-0.5">
			<span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{label}</span>
			<span className={`text-sm font-semibold ${dim ? "text-gray-500" : "text-gray-800"}`}>{value}</span>
		</div>
	);

	const inputCls = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100";
	const btnPrimary = "inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50";
	const btnGhost = "inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50";

	return (
		<div className="space-y-4">
			{/* Header card */}
			<div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="flex items-center gap-4">
						<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-base font-bold text-emerald-700">
							{initials}
						</div>
						<div>
							<h1 className="text-lg font-bold text-gray-900 leading-tight">{formatUserName(mentor.name, mentor.username)}</h1>
							<p className="mt-0.5 text-sm text-gray-500">
								{mentor.mentorId ?? mentor.zids?.mentor ?? "—"}{mentor.email ? ` · ${mentor.email}` : ""}
							</p>
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<button onClick={() => setFollowUpModalOpen(true)} className={btnPrimary}>
							<HiCheckCircle className="h-4 w-4" /> Follow-up
						</button>
						<button onClick={() => setSubstitutionModalOpen(true)} className={btnGhost}>
							<HiUserGroup className="h-4 w-4" /> Substitute
						</button>
						<button onClick={() => setCustomFollowUpModalOpen(true)} className={btnGhost}>
							<HiClock className="h-4 w-4" /> Custom date
						</button>
						<button
							onClick={() => setDeleteConfirmOpen(true)}
							className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
						>
							<HiTrash className="h-4 w-4" /> Delete
						</button>
					</div>
				</div>

				<div className="mt-4 flex flex-wrap gap-6 border-t border-gray-100 pt-4">
					<Stat label="Students" value={`${mentorStudents.length} individual`} />
					<Stat label="Active" value={String(activeStudents.length)} />
					<Stat label="On break" value={String(breakStudents.length)} />
					<Stat label="Groups" value={String(batches.length)} />
					<Stat
						label="Next follow-up"
						value={nextFollowUpDate ? nextFollowUpDate.toLocaleDateString() : "Not set"}
						dim={!nextFollowUpDate}
					/>
					{isFollowUpDue ? (
						<span className="self-end rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-600">Due now</span>
					) : null}
					<Stat
						label="Last contacted"
						value={followUpState.lastContactedAt ? new Date(followUpState.lastContactedAt).toLocaleDateString() : "Never"}
						dim={!followUpState.lastContactedAt}
					/>
				</div>
			</div>

			{/* Tabs */}
			<div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-1">
				{mentorTabs.map((tab) => {
					const isActive = activeTab === tab.key;
					return (
						<button
							key={tab.key}
							type="button"
							onClick={() => setActiveTab(tab.key)}
							className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition ${
								isActive ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
							}`}
						>
							{tab.label}
						</button>
					);
				})}
			</div>

			{/* Tab panels */}
			{activeTab === "overview" ? (
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="rounded-2xl border border-gray-200 bg-white p-5">
						<p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Identity</p>
						<div className="space-y-3">
							{[
								{ label: "Full name", value: mentor.name ?? "-" },
								{ label: "Username", value: mentor.username ?? "-" },
								{ label: "Mentor ID", value: mentor.mentorId ?? mentor.zids?.mentor ?? "-" },
								{ label: "Email", value: mentor.email ?? "-" },
								{ label: "Gender", value: mentor.gender ?? "-" },
							].map(({ label, value }) => (
								<div key={label} className="flex items-center justify-between gap-2 border-b border-gray-50 pb-2 last:border-0 last:pb-0">
									<span className="text-xs text-gray-500">{label}</span>
									<span className="text-sm font-medium text-gray-800">{value}</span>
								</div>
							))}
						</div>
					</div>

					<div className="rounded-2xl border border-gray-200 bg-white p-5">
						<p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Follow-up status</p>
						<div className="space-y-3">
							{[
								{ label: "Last contacted", value: followUpState?.lastContactedAt ? new Date(followUpState.lastContactedAt).toLocaleDateString() : "Never" },
								{ label: "Next follow-up", value: nextFollowUpDate ? nextFollowUpDate.toLocaleDateString() : "Not set" },
								{ label: "Status", value: isFollowUpDue ? "⚠ Due now" : nextFollowUpDate ? "Scheduled" : "Not scheduled" },
								{ label: "Custom date", value: followUpState.customNextFollowUpAt ? new Date(followUpState.customNextFollowUpAt).toLocaleDateString() : "None" },
							].map(({ label, value }) => (
								<div key={label} className="flex items-center justify-between gap-2 border-b border-gray-50 pb-2 last:border-0 last:pb-0">
									<span className="text-xs text-gray-500">{label}</span>
									<span className={`text-sm font-medium ${label === "Status" && isFollowUpDue ? "text-red-600" : "text-gray-800"}`}>{value}</span>
								</div>
							))}
						</div>
						<div className="mt-4 flex gap-2">
							<button onClick={() => setFollowUpModalOpen(true)} className={btnPrimary + " flex-1"}>
								Record follow-up
							</button>
							<button onClick={() => setCustomFollowUpModalOpen(true)} className={btnGhost + " flex-1"}>
								Set date
							</button>
						</div>
					</div>

					<div className="rounded-2xl border border-gray-200 bg-white p-5 sm:col-span-2">
						<div className="flex items-center justify-between gap-3 mb-3">
							<p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Substitutions</p>
							<Link to="/mentors/substitutions" className="text-xs font-semibold text-emerald-600 hover:underline">View all</Link>
						</div>
						<MentorSubstitutionInfo mentorId={mentor.id} />
					</div>
				</div>
			) : null}


			{activeTab === "activity" ? (
				<div className="rounded-2xl border border-gray-200 bg-white p-5">
					<div className="mb-4">
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Activity Trail</p>
						<h2 className="mt-1 text-base font-bold text-gray-900">Recent Activities</h2>
					</div>
					<ActivityTimeline
						activities={activities.map((a) => ({ id: a.id, type: a.type, performedByName: a.performedByName, description: a.description, oldValue: a.oldValue, newValue: a.newValue, note: a.note, createdAt: a.createdAt }))}
						emptyMessage="No activities yet. Follow-ups and reminders will appear here."
					/>
				</div>
			) : null}

			{activeTab === "reminders" ? (
				<div className="rounded-2xl border border-gray-200 bg-white p-5">
					<div className="mb-4 flex items-center justify-between gap-3">
						<p className="text-sm font-semibold text-gray-800">Reminders <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{reminders.length}</span></p>
						<button onClick={() => setReminderModalOpen(true)} disabled={createReminderMutation.isPending} className={btnPrimary}>
							<HiPlusCircle className="h-4 w-4" /> New reminder
						</button>
					</div>

					{reminders.length === 0 ? (
						<p className="py-8 text-center text-sm text-gray-400">No reminders yet.</p>
					) : (
						<div className="space-y-2">
							{reminders.map((reminder) => (
								<div
									key={reminder.id}
									className={`flex items-start gap-3 rounded-xl border p-3 transition ${reminder.isDone ? "border-gray-100 bg-gray-50" : "border-gray-200 bg-white"}`}
								>
									<button
										onClick={() => toggleReminderDone(reminder.id, reminder.isDone)}
										disabled={updateReminderMutation.isPending}
										className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${reminder.isDone ? "border-emerald-400 bg-emerald-400 text-white" : "border-gray-300 hover:border-emerald-400"}`}
										title={reminder.isDone ? "Mark undone" : "Mark done"}
									>
										{reminder.isDone ? <HiCheckCircle className="h-3 w-3" /> : null}
									</button>
									<div className="flex-1 min-w-0">
										<p className={`text-sm ${reminder.isDone ? "text-gray-400 line-through" : "text-gray-800 font-medium"}`}>{reminder.note}</p>
										<p className="mt-0.5 text-xs text-gray-400">
											{new Date(reminder.date).toLocaleDateString()} · {new Date(reminder.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
										</p>
									</div>
									<button
										onClick={() => deleteReminder(reminder.id)}
										disabled={deleteReminderMutation.isPending}
										className="mt-0.5 rounded-lg p-1 text-gray-300 transition hover:bg-red-50 hover:text-red-500"
										title="Delete"
									>
										<HiXCircle className="h-4 w-4" />
									</button>
								</div>
							))}
						</div>
					)}
				</div>
			) : null}

			{activeTab === "students" ? (
				<div className="rounded-2xl border border-gray-200 bg-white p-5">
					<div className="mb-4 flex items-center justify-between gap-3">
						<div>
							<p className="text-sm font-semibold text-gray-800">Individual students</p>
							<p className="text-xs text-gray-400">{activeStudents.length} active · {breakStudents.length} break</p>
						</div>
						<button
							type="button"
							onClick={() => { setChangeMentorMode((m) => !m); setSelectedStudentIds(new Set()); setTargetMentorId(""); }}
							className={changeMentorMode ? "rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100" : btnGhost + " text-xs"}
						>
							{changeMentorMode ? "Cancel" : "Change mentor"}
						</button>
					</div>

					{changeMentorMode ? (
						<div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
							<span className="text-xs font-medium text-amber-700">Move to:</span>
							<select
								value={targetMentorId}
								onChange={(e) => setTargetMentorId(e.target.value)}
								className="rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-xs text-gray-800 outline-none focus:border-amber-400"
							>
								<option value="">Select mentor…</option>
								{mentorOptions.map((m) => (
									<option key={m.id} value={m.id}>
										{m.name ?? m.username} ({m.zids?.mentor ?? m.mentorId ?? m.id})
									</option>
								))}
							</select>
							<button
								type="button"
								disabled={selectedStudentIds.size === 0 || !targetMentorId}
								onClick={() => setChangeMentorConfirmOpen(true)}
								className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
							>
								Reassign{selectedStudentIds.size > 0 ? ` (${selectedStudentIds.size})` : ""}
							</button>
							<button
								type="button"
								onClick={() => setSelectedStudentIds(selectedStudentIds.size === mentorStudents.length ? new Set() : new Set(mentorStudents.map((s) => s.id)))}
								className="text-xs font-medium text-amber-600 underline"
							>
								{selectedStudentIds.size === mentorStudents.length ? "Deselect all" : "Select all"}
							</button>
						</div>
					) : null}

					{mentorStudents.length === 0 ? (
						<p className="py-8 text-center text-sm text-gray-400">No individual active/break students.</p>
					) : (
						<>
							<div className="mb-3 flex gap-1">
								{studentStatusTabs.map((tab) => (
									<button
										key={tab.key}
										type="button"
										onClick={() => setStudentStatusTab(tab.key)}
										className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${studentStatusTab === tab.key ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
									>
										{tab.label} <span className="ml-1 opacity-70">{tab.count}</span>
									</button>
								))}
							</div>

							{selectedStudentGroup.students.length === 0 ? (
								<p className="py-6 text-center text-sm text-gray-400">No {selectedStudentGroup.label.toLowerCase()} students.</p>
							) : (
								<div className="space-y-2">
									{selectedStudentGroup.students.map((student) => (
										<div
											key={student.id}
											className={`flex items-center gap-3 rounded-xl border p-3 transition ${changeMentorMode && selectedStudentIds.has(student.id) ? "border-amber-300 bg-amber-50" : "border-gray-100 hover:bg-gray-50"}`}
										>
											{changeMentorMode ? (
												<input
													type="checkbox"
													checked={selectedStudentIds.has(student.id)}
													onChange={(e) => {
														setSelectedStudentIds((prev) => {
															const next = new Set(prev);
															if (e.target.checked) next.add(student.id);
															else next.delete(student.id);
															return next;
														});
													}}
													className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
												/>
											) : null}
											<div className="flex-1 min-w-0">
												<Link to={`/students/${student.id}`} className="text-sm font-medium text-gray-800 hover:text-emerald-700">
													{student.zid} · {student.name}
												</Link>
												<p className="text-xs text-gray-400">{student.phone}</p>
											</div>
											<span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${getStudentStatusColor(student.status)}`}>
												{getStudentStatusLabel(student.status)}
											</span>
										</div>
									))}
								</div>
							)}
						</>
					)}
				</div>
			) : null}

			{activeTab === "groups" ? (
				<div className="rounded-2xl border border-gray-200 bg-white p-5">
					<p className="mb-4 text-sm font-semibold text-gray-800">
						Groups <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{batches.length}</span>
					</p>
					{batchesQuery.isLoading ? (
						<p className="py-6 text-center text-sm text-gray-400">Loading…</p>
					) : batches.length === 0 ? (
						<p className="py-8 text-center text-sm text-gray-400">No groups assigned to this mentor.</p>
					) : (
						<div className="space-y-2">
							{batches.map((batch) => (
								<Link
									key={batch.id}
									to={`/groups/${batch.id}`}
									className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3 transition hover:border-emerald-200 hover:bg-emerald-50"
								>
									<div className="min-w-0">
										<p className="text-sm font-medium text-gray-800">{batch.name ?? batch.groupId ?? batch.id}</p>
										<p className="text-xs text-gray-400">{batch.type} · Level {batch.level ?? "—"}{batch.groupId ? ` · ${batch.groupId}` : ""}</p>
									</div>
									<span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${batch.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
										{batch.isActive ? "Active" : "Inactive"}
									</span>
								</Link>
							))}
						</div>
					)}
				</div>
			) : null}

			{/* Modals */}
			<Modal open={followUpModalOpen} onClose={() => setFollowUpModalOpen(false)} title="Record follow-up">
				<form onSubmit={handleFollowUpSubmit(onFollowUpSubmit)} className="space-y-3">
					<Controller name="note" control={followUpControl} render={({ field }) => (
						<label className="block">
							<span className="mb-1.5 block text-xs font-medium text-gray-600">Note (optional)</span>
							<textarea {...field} rows={3} placeholder="What was discussed…" className={inputCls} />
						</label>
					)} />
					<Controller name="nextFollowUpAt" control={followUpControl} render={({ field }) => (
						<label className="block">
							<span className="mb-1.5 block text-xs font-medium text-gray-600">Next follow-up date (optional)</span>
							<input type="datetime-local" value={field.value instanceof Date ? field.value.toISOString().slice(0, 16) : ""} onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)} className={inputCls} />
							<p className="mt-1 text-xs text-gray-400">Leave empty for default 14-day follow-up.</p>
						</label>
					)} />
					<div className="flex gap-2 pt-1">
						<button type="button" onClick={() => setFollowUpModalOpen(false)} className={btnGhost + " flex-1"}>Cancel</button>
						<button type="submit" disabled={recordFollowUpMutation.isPending} className={btnPrimary + " flex-1"}>{recordFollowUpMutation.isPending ? "Saving…" : "Record"}</button>
					</div>
				</form>
			</Modal>

			<Modal open={reminderModalOpen} onClose={() => setReminderModalOpen(false)} title="New reminder">
				<form onSubmit={handleReminderSubmit(onReminderSubmit)} className="space-y-3">
					<Controller name="date" control={reminderControl} render={({ field }) => (
						<label className="block">
							<span className="mb-1.5 block text-xs font-medium text-gray-600">Date & time</span>
							<input type="datetime-local" value={field.value instanceof Date ? field.value.toISOString().slice(0, 16) : ""} onChange={(e) => field.onChange(new Date(e.target.value))} className={inputCls} />
						</label>
					)} />
					<Controller name="note" control={reminderControl} render={({ field }) => (
						<label className="block">
							<span className="mb-1.5 block text-xs font-medium text-gray-600">Note</span>
							<textarea {...field} rows={3} placeholder="What to remember…" className={inputCls} />
						</label>
					)} />
					<div className="flex gap-2 pt-1">
						<button type="button" onClick={() => setReminderModalOpen(false)} className={btnGhost + " flex-1"}>Cancel</button>
						<button type="submit" disabled={createReminderMutation.isPending} className={btnPrimary + " flex-1"}>{createReminderMutation.isPending ? "Saving…" : "Create"}</button>
					</div>
				</form>
			</Modal>

			<Modal open={customFollowUpModalOpen} onClose={() => setCustomFollowUpModalOpen(false)} title="Set custom follow-up date">
				<form onSubmit={handleCustomFollowUpSubmit(onCustomFollowUpSubmit)} className="space-y-3">
					<Controller name="customDate" control={customFollowUpControl} render={({ field }) => (
						<label className="block">
							<span className="mb-1.5 block text-xs font-medium text-gray-600">Date</span>
							<input type="date" value={field.value instanceof Date ? field.value.toISOString().split("T")[0] : ""} onChange={(e) => field.onChange(new Date(e.target.value))} className={inputCls} />
						</label>
					)} />
					<div className="flex gap-2 pt-1">
						<button type="button" onClick={() => setCustomFollowUpModalOpen(false)} className={btnGhost + " flex-1"}>Cancel</button>
						<button type="submit" disabled={setCustomFollowUpMutation.isPending} className={btnPrimary + " flex-1"}>{setCustomFollowUpMutation.isPending ? "Saving…" : "Set date"}</button>
					</div>
				</form>
			</Modal>

			<Modal
				open={deleteConfirmOpen}
				onClose={() => setDeleteConfirmOpen(false)}
				title="Delete mentor"
				footer={
					<>
						<button type="button" onClick={() => setDeleteConfirmOpen(false)} className={btnGhost}>Cancel</button>
						<button type="button" disabled={allMentorStudents.length > 0 || deleteUserMutation.isPending} onClick={() => void onDeleteMentor()} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
							{deleteUserMutation.isPending ? "Deleting…" : "Delete"}
						</button>
					</>
				}
			>
				{allMentorStudents.length > 0 ? (
					<div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
						<strong>Cannot delete.</strong> {allMentorStudents.length} student{allMentorStudents.length !== 1 ? "s" : ""} are still assigned. Reassign them first.
					</div>
				) : (
					<p className="text-sm text-gray-600">Delete <strong className="text-gray-900">{mentor.name ?? mentor.username}</strong>? This cannot be undone.</p>
				)}
			</Modal>

			<Modal
				open={changeMentorConfirmOpen}
				onClose={() => setChangeMentorConfirmOpen(false)}
				title="Confirm reassignment"
				footer={
					<>
						<button type="button" onClick={() => setChangeMentorConfirmOpen(false)} className={btnGhost}>Cancel</button>
						<button type="button" disabled={updateStudentMutation.isPending} onClick={() => void onBulkChangeMentor()} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
							{updateStudentMutation.isPending ? "Reassigning…" : "Yes, reassign"}
						</button>
					</>
				}
			>
				<p className="text-sm text-gray-600">
					Move <strong className="text-gray-900">{selectedStudentIds.size}</strong> student{selectedStudentIds.size !== 1 ? "s" : ""} to{" "}
					<strong className="text-gray-900">{mentorOptions.find((m) => m.id === targetMentorId)?.name ?? targetMentorId}</strong>?
				</p>
			</Modal>

			<CreateSubstitutionModal
				isOpen={substitutionModalOpen}
				mentors={mentorOptions}
				defaultOriginalMentorId={mentor.id}
				endDateLabel="Until Date"
				onClose={() => setSubstitutionModalOpen(false)}
				onSuccess={() => toast.success("Substitution created")}
			/>
		</div>
	);
};
