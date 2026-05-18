import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { FOLLOW_UP_PERIOD_MS, REMINDER_DEFAULT_DAYS } from "@repo/schema";
import toast from "react-hot-toast";
import { HiClock, HiCheckCircle, HiPlusCircle, HiXCircle } from "react-icons/hi2";
import { Panel, Modal } from "@/components/dashboard-ui";
import { useSession } from "@/lib/session";
import { useUsersQuery } from "@/features/users/users.queries";
import { useStudentsQuery } from "@/features/students/students.queries";
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

const formatUserName = (name?: string | null, username?: string | null) =>
	name?.trim() || username?.trim() || "-";

interface FollowUpForm {
	note?: string;
}

interface ReminderForm {
	date: Date;
	note: string;
}

interface CustomFollowUpForm {
	customDate: Date;
}

export const MentorDetailPage = () => {
	const { mentorId } = useParams<{ mentorId: string }>();
	const { token } = useSession();
	const usersQuery = useUsersQuery(token);
	const studentsQuery = useStudentsQuery(token);
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

	const recordFollowUpMutation = useRecordMentorFollowUpMutation();
	const setCustomFollowUpMutation = useSetMentorCustomFollowUpMutation();
	const createReminderMutation = useCreateMentorReminderMutation();
	const updateReminderMutation = useUpdateMentorReminderMutation();
	const deleteReminderMutation = useDeleteMentorReminderMutation();

	const {
		control: followUpControl,
		handleSubmit: handleFollowUpSubmit,
		reset: resetFollowUp,
	} = useForm<FollowUpForm>({
		defaultValues: { note: "" },
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

	const mentorStudents = useMemo(
		() => allStudents.filter((s) => s.mentorId === mentorId),
		[allStudents, mentorId],
	);

	const activeStudents = useMemo(
		() => mentorStudents.filter((s) => s.status === "STUDENT"),
		[mentorStudents],
	);

	const onFollowUpSubmit = async (data: FollowUpForm) => {
		if (!mentorId) return;
		try {
			await recordFollowUpMutation.mutateAsync({
				mentorId,
				note: data.note,
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
	const nextFollowUpDate = mentor.customNextFollowUpAt
		? new Date(mentor.customNextFollowUpAt)
		: mentor.nextFollowUpAt
			? new Date(mentor.nextFollowUpAt)
			: null;

	const isFollowUpDue = nextFollowUpDate && nextFollowUpDate <= new Date();

	return (
		<div className="grid gap-6">
			{/* Mentor Header */}
			<Panel title={formatUserName(mentor.name, mentor.username)}>
				<div className="space-y-4">
					<div className="grid gap-2 md:grid-cols-2">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
								Mentor ID
							</p>
							<p className="mt-1 text-lg font-semibold text-gray-900">
								{mentor.mentorId ?? mentor.zids?.mentor ?? "-"}
							</p>
						</div>
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
								Email
							</p>
							<p className="mt-1 text-gray-900">{mentor.email ?? "-"}</p>
						</div>
					</div>

					<div className="grid gap-2 md:grid-cols-3">
						<div className="rounded-2xl bg-teal-50 px-3 py-2">
							<p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
								Students
							</p>
							<p className="mt-1 text-lg font-bold text-teal-800">
								{mentorStudents.length}
							</p>
							<p className="text-xs text-teal-600">
								{activeStudents.length} active
							</p>
						</div>
						<div className="rounded-2xl bg-amber-50 px-3 py-2">
							<p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
								Last Contacted
							</p>
							<p className="mt-1 text-sm font-medium text-amber-900">
								{mentor.lastContactedAt
									? new Date(mentor.lastContactedAt).toLocaleDateString()
									: "Never"}
							</p>
						</div>
						<div
							className={`rounded-2xl px-3 py-2 ${
								isFollowUpDue
									? "bg-red-50"
									: "bg-emerald-50"
							}`}
						>
							<p
								className={`text-xs font-semibold uppercase tracking-[0.18em] ${
									isFollowUpDue
										? "text-red-700"
										: "text-emerald-700"
								}`}
							>
								Next Follow-up
							</p>
							<p
								className={`mt-1 text-sm font-medium ${
									isFollowUpDue
										? "text-red-900"
										: "text-emerald-900"
								}`}
							>
								{nextFollowUpDate
									? nextFollowUpDate.toLocaleDateString()
									: "Not set"}
							</p>
							{isFollowUpDue && (
								<p className="text-xs text-red-600 font-semibold">
									DUE NOW
								</p>
							)}
						</div>
					</div>
				</div>
			</Panel>

			{/* Follow-ups Section */}
			<Panel
				title="Mentor Follow-up"
				description="Track communication and schedule next contact"
			>
				<div className="space-y-4">
					<div className="flex flex-wrap gap-2">
						<button
							onClick={() => setFollowUpModalOpen(true)}
							disabled={recordFollowUpMutation.isPending}
							className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-400 disabled:opacity-50"
						>
							<HiCheckCircle className="h-4 w-4" />
							Record Follow-up
						</button>
						<button
							onClick={() => setCustomFollowUpModalOpen(true)}
							className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400"
						>
							<HiClock className="h-4 w-4" />
							Set Custom Date
						</button>
					</div>

					{mentor.customNextFollowUpAt && (
						<div className="rounded-2xl border border-blue-200 bg-blue-50 p-3">
							<p className="text-sm text-blue-900">
								<strong>Custom Date:</strong>{" "}
								{new Date(mentor.customNextFollowUpAt).toLocaleDateString()}
							</p>
						</div>
					)}
				</div>
			</Panel>

			{/* Follow-up Snapshot */}
			<Panel
				title="Follow-up Snapshot"
				description="Current mentor follow-up status and schedule"
			>
				<div className="grid gap-3 md:grid-cols-3">
					<div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
							Last Contacted
						</p>
						<p className="mt-2 text-sm font-medium text-gray-900">
							{followUpState?.lastContactedAt
								? new Date(followUpState.lastContactedAt).toLocaleDateString()
								: "Never"}
						</p>
					</div>
					<div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
							Next Follow-up
						</p>
						<p className="mt-2 text-sm font-medium text-gray-900">
							{followUpState?.customNextFollowUpAt
								? new Date(followUpState.customNextFollowUpAt).toLocaleDateString()
								: followUpState?.nextFollowUpAt
									? new Date(followUpState.nextFollowUpAt).toLocaleDateString()
									: "Not set"}
						</p>
					</div>
					<div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
							Status
						</p>
						<p className="mt-2 text-sm font-medium text-gray-900">
							{nextFollowUpDate
								? nextFollowUpDate <= new Date()
									? "Due now"
									: "Scheduled"
								: "Not scheduled"}
						</p>
					</div>
				</div>
			</Panel>

			{/* Activities Section */}
			<Panel
				title="Activity Timeline"
				description="All mentor followup and reminder actions"
			>
				<ActivityTimeline
					activities={activities.map((activity) => ({
						id: activity.id,
						type: activity.type,
						performedByName: activity.performedByName,
						description: activity.description,
						oldValue: activity.oldValue,
						newValue: activity.newValue,
						note: activity.note,
						createdAt: activity.createdAt,
					}))}
					emptyMessage="No mentor activities yet. Followups and reminders will appear here."
				/>
			</Panel>

			{/* Reminders Section */}
			<Panel
				title="Reminders"
				description={`${reminders.length} reminder${reminders.length !== 1 ? "s" : ""}`}
			>
				<div className="space-y-4">
					<button
						onClick={() => setReminderModalOpen(true)}
						disabled={createReminderMutation.isPending}
						className="inline-flex items-center gap-2 rounded-2xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-400 disabled:opacity-50"
					>
						<HiPlusCircle className="h-4 w-4" />
						Create Reminder
					</button>

					{reminders.length === 0 ? (
						<div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-600">
							No reminders yet. Create one to stay organized.
						</div>
					) : (
						<div className="space-y-2">
							{reminders.map((reminder) => (
								<div
									key={reminder.id}
									className={`rounded-2xl border-2 p-3 transition ${
										reminder.isDone
											? "border-gray-200 bg-gray-50"
											: "border-blue-200 bg-blue-50"
									}`}
								>
									<div className="flex items-start justify-between gap-3">
										<div className="flex-1">
											<p
												className={`text-sm font-medium ${
													reminder.isDone
														? "text-gray-500 line-through"
														: "text-gray-900"
												}`}
											>
												{reminder.note}
											</p>
											<p className="text-xs text-gray-600 mt-1">
												{new Date(reminder.date).toLocaleDateString()} at{" "}
												{new Date(reminder.date).toLocaleTimeString([], {
													hour: "2-digit",
													minute: "2-digit",
												})}
											</p>
										</div>
										<div className="flex items-center gap-1">
											<button
												onClick={() =>
													toggleReminderDone(reminder.id, reminder.isDone)
												}
												disabled={updateReminderMutation.isPending}
												className={`rounded-full p-2 transition ${
													reminder.isDone
														? "bg-gray-200 text-gray-600 hover:bg-gray-300"
														: "bg-blue-200 text-blue-600 hover:bg-blue-300"
												}`}
												title={
													reminder.isDone
														? "Mark undone"
														: "Mark done"
												}
											>
												{reminder.isDone ? (
													<HiCheckCircle className="h-4 w-4" />
												) : (
													<HiClock className="h-4 w-4" />
												)}
											</button>
											<button
												onClick={() => deleteReminder(reminder.id)}
												disabled={deleteReminderMutation.isPending}
												className="rounded-full bg-red-100 p-2 text-red-600 transition hover:bg-red-200"
												title="Delete reminder"
											>
												<HiXCircle className="h-4 w-4" />
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</Panel>

			{/* Students Section */}
			<Panel
				title="Students"
				description={`${mentorStudents.length} student${mentorStudents.length !== 1 ? "s" : ""} (${activeStudents.length} active)`}
			>
				{mentorStudents.length === 0 ? (
					<div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-600">
						No students assigned to this mentor yet.
					</div>
				) : (
					<div className="space-y-3">
						{mentorStudents.map((student) => (
							<div
								key={student.id}
								className={`rounded-2xl border p-3 ${
									student.status === "STUDENT"
										? "border-emerald-200 bg-emerald-50"
										: "border-gray-200 bg-gray-50"
								}`}
							>
								<div className="flex items-start justify-between gap-2">
									<div>
										<p className="font-medium text-gray-900">
											{student.zid} · {student.name}
										</p>
										<p className="text-xs text-gray-600">{student.phone}</p>
									</div>
									<span
										className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
											student.status === "STUDENT"
												? "bg-emerald-200 text-emerald-700"
												: "bg-gray-200 text-gray-700"
										}`}
									>
										{student.status}
									</span>
								</div>
							</div>
						))}
					</div>
				)}
			</Panel>

			{/* Modals */}
			<Modal
				open={followUpModalOpen}
				onClose={() => setFollowUpModalOpen(false)}
				title="Record Mentor Follow-up"
			>
				<form
					onSubmit={handleFollowUpSubmit(onFollowUpSubmit)}
					className="space-y-4"
				>
					<Controller
						name="note"
						control={followUpControl}
						render={({ field }) => (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Note (optional)</label>
								<textarea
									{...field}
									className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
									placeholder="What was discussed..."
									rows={3}
								/>
							</div>
						)}
					/>
					<div className="flex gap-3">
						<button
							type="button"
							onClick={() => setFollowUpModalOpen(false)}
							className="flex-1 rounded-2xl border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:border-gray-400"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={recordFollowUpMutation.isPending}
							className="flex-1 rounded-2xl bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
						>
							{recordFollowUpMutation.isPending
								? "Recording..."
								: "Record Follow-up"}
						</button>
					</div>
				</form>
			</Modal>

			<Modal
				open={reminderModalOpen}
				onClose={() => setReminderModalOpen(false)}
				title="Create Reminder"
			>
				<form
					onSubmit={handleReminderSubmit(onReminderSubmit)}
					className="space-y-4"
				>
					<Controller
						name="date"
						control={reminderControl}
						render={({ field }) => (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Reminder Date & Time</label>
								<input
									{...field}
									type="datetime-local"
									value={
										field.value instanceof Date
											? field.value.toISOString().slice(0, 16)
											: ""
									}
									onChange={(e) => {
										field.onChange(new Date(e.target.value));
									}}
									className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
								/>
							</div>
						)}
					/>
					<Controller
						name="note"
						control={reminderControl}
						render={({ field }) => (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Reminder Note</label>
								<textarea
									{...field}
									className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
									placeholder="What to remember..."
									rows={3}
								/>
							</div>
						)}
					/>
					<div className="flex gap-3">
						<button
							type="button"
							onClick={() => setReminderModalOpen(false)}
							className="flex-1 rounded-2xl border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:border-gray-400"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={createReminderMutation.isPending}
							className="flex-1 rounded-2xl bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
						>
							{createReminderMutation.isPending
								? "Creating..."
								: "Create Reminder"}
						</button>
					</div>
				</form>
			</Modal>

			<Modal
				open={customFollowUpModalOpen}
				onClose={() => setCustomFollowUpModalOpen(false)}
				title="Set Custom Follow-up Date"
			>
				<form
					onSubmit={handleCustomFollowUpSubmit(onCustomFollowUpSubmit)}
					className="space-y-4"
				>
					<Controller
						name="customDate"
						control={customFollowUpControl}
						render={({ field }) => (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Custom Follow-up Date</label>
								<input
									{...field}
									type="date"
									value={
										field.value instanceof Date
											? field.value.toISOString().split("T")[0]
											: ""
									}
									onChange={(e) => {
										field.onChange(new Date(e.target.value));
									}}
									className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
								/>
							</div>
						)}
					/>
					<div className="flex gap-3">
						<button
							type="button"
							onClick={() => setCustomFollowUpModalOpen(false)}
							className="flex-1 rounded-2xl border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:border-gray-400"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={setCustomFollowUpMutation.isPending}
							className="flex-1 rounded-2xl bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
						>
							{setCustomFollowUpMutation.isPending
								? "Setting..."
								: "Set Date"}
						</button>
					</div>
				</form>
			</Modal>
		</div>
	);
};
