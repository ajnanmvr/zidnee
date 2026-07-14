import { useMemo, useState, useCallback } from "react";
import { HiArrowsRightLeft, HiTrash, HiUserPlus } from "react-icons/hi2";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Modal } from "@/components/dashboard-ui";
import { useBatchesQuery } from "@/features/batches/batches.queries";
import { useUpdateBatchMutation } from "@/features/batches/use-update-batch-mutation";
import { getStudentStatusColor, getStudentStatusLabel, type StudentTableRow } from "@/features/students/student-table";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useUpdateStudentMutation } from "@/features/students/use-update-student-mutation";
import { useUpdateStudentAssessmentMutation } from "@/features/students/students.mutations";
import { useSession } from "@/lib/session";

export const GroupDetailPage = () => {
	const { groupId } = useParams<{ groupId: string }>();
	const { token } = useSession();
	const batchesQuery = useBatchesQuery(token);
	const studentsQuery = useStudentsQuery(token, { limit: 2000 });
	const usersQuery = useUsersQuery(token);
	const updateStudentMutation = useUpdateStudentMutation();
	const updateBatchMutation = useUpdateBatchMutation();
	const updateStudentAssessmentMutation = useUpdateStudentAssessmentMutation();

	const group = useMemo(() => {
		return (batchesQuery.data?.batches ?? []).find((b) => b.id === groupId) ?? null;
	}, [batchesQuery.data?.batches, groupId]);

	const activeStudents = useMemo(() => {
		return (studentsQuery.data?.students ?? [])
			.filter((s) => s.batchId === groupId && s.status === "STUDENT")
			.map((s) => ({
				...s,
				admittedAt: s.admittedAt ? new Date(s.admittedAt) : new Date(),
				createdAt: s.createdAt ? new Date(s.createdAt) : undefined,
				updatedAt: s.updatedAt ? new Date(s.updatedAt) : undefined,
				nextFollowUpAt: s.nextFollowUpAt ? new Date(s.nextFollowUpAt) : undefined,
				customNextFollowUpAt: s.customNextFollowUpAt
					? new Date(s.customNextFollowUpAt)
					: undefined,
			})) as unknown as StudentTableRow[];
	}, [studentsQuery.data?.students, groupId]);

	const availableStudents = useMemo(() => {
		if (!group) return [];
		return (studentsQuery.data?.students ?? []).filter(
			(s) => s.level === group.level && !s.batchId && s.status === "STUDENT",
		);
	}, [studentsQuery.data?.students, group]);

	const mentors = usersQuery.data?.users ?? [];

	const mentorNameById = useMemo(() => {
		const map: Record<string, string> = {};
		(mentors ?? []).forEach((mentor) => {
			map[mentor.id] = mentor.name ?? mentor.username ?? "Unknown";
		});
		return map;
	}, [mentors]);

	const [moveModalOpen, setMoveModalOpen] = useState(false);
	const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
	const [targetBatchId, setTargetBatchId] = useState<string | null>(null);
	const [confirmAction, setConfirmAction] = useState<"remove" | "move" | null>(null);
	const [confirmStudentId, setConfirmStudentId] = useState<string | null>(null);
	const [addModalOpen, setAddModalOpen] = useState(false);
	const [selectedStudentsToAdd, setSelectedStudentsToAdd] = useState<string[]>([]);
	const [assessmentConfirmOpen, setAssessmentConfirmOpen] = useState(false);
	const [pendingAssessment, setPendingAssessment] = useState<{
		assessmentType: "oral" | "written" | "level";
		nextDone: boolean;
	} | null>(null);
	const [activeTab, setActiveTab] = useState<"students" | "assessment">("students");

	const openMove = useCallback((studentId: string) => {
		setConfirmAction("move");
		setConfirmStudentId(studentId);
	}, []);

	const closeMove = useCallback(() => {
		setSelectedStudentId(null);
		setTargetBatchId(null);
		setMoveModalOpen(false);
	}, []);

	const confirmRemove = useCallback((studentId: string) => {
		setConfirmAction("remove");
		setConfirmStudentId(studentId);
	}, []);

	const confirmMove = useCallback((studentId: string) => {
		setSelectedStudentId(studentId);
		setTargetBatchId(null);
		setMoveModalOpen(true);
		setConfirmAction(null);
		setConfirmStudentId(null);
	}, []);


	if (!group) {
		return (
			<div className="py-12 text-center text-gray-600">Group not found</div>
		);
	}

	const mentorName = mentors.find((m) => m.id === group.mentorId)?.name ?? "-";
	const counsellorName = group.counsellorId ? mentors.find((m) => m.id === group.counsellorId)?.name ?? "-" : null;

	const submitRemove = async (studentId: string) => {
		try {
			await updateStudentMutation.mutateAsync({ studentId, payload: { batchId: null } });
			toast.success("Student removed from group");
			setConfirmAction(null);
			setConfirmStudentId(null);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Unable to remove student");
		}
	};

	const submitMove = async () => {
		if (!selectedStudentId || !targetBatchId) return;
		try {
			await updateStudentMutation.mutateAsync({ studentId: selectedStudentId, payload: { batchId: targetBatchId } });
			toast.success("Student moved");
			closeMove();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Unable to move student");
		}
	};

	const closeAddModal = () => {
		setAddModalOpen(false);
		setSelectedStudentsToAdd([]);
	};

	const toggleStudentSelection = (studentId: string) => {
		setSelectedStudentsToAdd((prev) =>
			prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
		);
	};

	const submitAddStudents = async () => {
		if (selectedStudentsToAdd.length === 0) return;
		try {
			await Promise.all(
				selectedStudentsToAdd.map((studentId) =>
					updateStudentMutation.mutateAsync({ studentId, payload: { batchId: groupId } })
				)
			);
			toast.success(`${selectedStudentsToAdd.length} student(s) added to group`);
			closeAddModal();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Unable to add students");
		}
	};

	const assessmentConfig = [
		{
			assessmentType: "oral" as const,
			label: "Quarterly Oral Assessment",
			value: group.oralAssessmentDone ?? false,
			description: "Speaking and pronunciation check",
		},
		{
			assessmentType: "written" as const,
			label: "MID Term Assessment",
			value: group.writtenAssessmentDone ?? false,
			description: "Reading and writing check",
		},
		{
			assessmentType: "level" as const,
			label: "Term End  Assessment",
			value: group.levelAssessmentDone ?? false,
			description: "Final placement and level check",
		},
	];

	const openAssessmentConfirm = (
		assessmentType: "oral" | "written" | "level",
		nextDone: boolean,
	) => {
		setPendingAssessment({ assessmentType, nextDone });
		setAssessmentConfirmOpen(true);
	};

	const submitAssessmentUpdate = async () => {
		if (!groupId || !pendingAssessment) return;

		try {
			const assessmentField =
				pendingAssessment.assessmentType === "oral"
					? "oralAssessmentDone"
					: pendingAssessment.assessmentType === "written"
						? "writtenAssessmentDone"
						: "levelAssessmentDone";

			// Update the group/batch
			await updateBatchMutation.mutateAsync({
				batchId: groupId,
				payload: {
					[assessmentField]: pendingAssessment.nextDone,
				},
			});

			// Update all active students with the same assessment
			await Promise.all(
				activeStudents.map((student) =>
					updateStudentAssessmentMutation.mutateAsync({
						studentId: student.id,
						assessmentType: pendingAssessment.assessmentType,
						isDone: pendingAssessment.nextDone,
					}),
				),
			);

			toast.success(
				`Assessment marked as ${pendingAssessment.nextDone ? "done" : "undone"} for group and ${activeStudents.length} student(s)`,
			);
			setAssessmentConfirmOpen(false);
			setPendingAssessment(null);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Unable to update assessment");
		}
	};

	const btnPrimary = "inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50";
	const btnGhost = "inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50";
	const inputCls = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:bg-white";

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="rounded-xl border border-gray-200 bg-white p-4">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h1 className="text-base font-bold text-gray-900">
							{group.name ?? group.groupId?.toUpperCase()}
							{group.groupId ? <span className="ml-2 text-xs font-normal text-gray-400">{group.groupId.toUpperCase()}</span> : null}
						</h1>
						<div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
							<span>Mentor: <strong className="text-gray-700">{mentorName}</strong></span>
							{counsellorName ? <span>Counsellor: <strong className="text-gray-700">{counsellorName}</strong></span> : null}
							<span>Level: <strong className="text-gray-700">{group.level ?? "—"}</strong></span>
							<span>{activeStudents.length} active student{activeStudents.length !== 1 ? "s" : ""}</span>
						</div>
					</div>
					<span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${group.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
						{group.isActive ? "Active" : "Inactive"}
					</span>
				</div>
			</div>

			{/* Tabs */}
			<div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
				{(["students", "assessment"] as const).map((tab) => (
					<button
						key={tab}
						type="button"
						onClick={() => setActiveTab(tab)}
						className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === tab ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
					>
						{tab.charAt(0).toUpperCase() + tab.slice(1)}
					</button>
				))}
			</div>

			{/* Students tab */}
			{activeTab === "students" ? (
				<div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
					<div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
						<p className="text-sm font-semibold text-gray-700">
							Students <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{activeStudents.length}</span>
						</p>
						<button type="button" onClick={() => setAddModalOpen(true)} className={btnPrimary}>
							<HiUserPlus className="h-4 w-4" /> Add student
						</button>
					</div>
					{activeStudents.length === 0 ? (
						<p className="py-10 text-center text-sm text-gray-400">No active students in this group.</p>
					) : (
						<table className="w-full text-sm">
							<thead className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
								<tr>
									<th className="px-4 py-2.5">Student</th>
									<th className="px-4 py-2.5 hidden sm:table-cell">Level</th>
									<th className="px-4 py-2.5 hidden md:table-cell">Mentor</th>
									<th className="px-4 py-2.5">Status</th>
									<th className="px-4 py-2.5" />
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100">
								{activeStudents.map((student) => (
									<tr key={student.id} className="hover:bg-gray-50">
										<td className="px-4 py-3">
											<Link to={`/students/${student.id}`} className="font-medium text-gray-800 hover:text-emerald-700">
												{student.zid} · {student.name}
											</Link>
											<p className="text-xs text-gray-400">{student.phone}</p>
										</td>
										<td className="px-4 py-3 hidden sm:table-cell text-gray-600">{student.level ?? "—"}</td>
										<td className="px-4 py-3 hidden md:table-cell text-gray-600">{mentorNameById[student.mentorId ?? ""] ?? "—"}</td>
										<td className="px-4 py-3">
											<span className={`rounded-full px-2 py-0.5 text-xs font-semibold text-white ${getStudentStatusColor(student.status)}`}>
												{getStudentStatusLabel(student.status)}
											</span>
										</td>
										<td className="px-4 py-3 text-right">
											<div className="flex items-center justify-end gap-1">
												<button
													type="button"
													onClick={() => openMove(student.id)}
													className="rounded-lg p-1.5 text-gray-400 transition hover:bg-orange-50 hover:text-orange-600"
													title="Move to another group"
												>
													<HiArrowsRightLeft className="h-4 w-4" />
												</button>
												<button
													type="button"
													onClick={() => confirmRemove(student.id)}
													className="rounded-lg p-1.5 text-gray-300 transition hover:bg-red-50 hover:text-red-500"
													title="Remove from group"
												>
													<HiTrash className="h-4 w-4" />
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
			) : null}

			{/* Assessment tab */}
			{activeTab === "assessment" ? (
				<div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
					<div className="divide-y divide-gray-100">
						{assessmentConfig.map((assessment) => (
							<div key={assessment.assessmentType} className="flex items-center justify-between gap-4 px-4 py-4">
								<div className="min-w-0">
									<p className="text-sm font-medium text-gray-800">{assessment.label}</p>
									<p className="text-xs text-gray-400">{assessment.description}</p>
								</div>
								<div className="flex items-center gap-3 shrink-0">
									<span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${assessment.value ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
										{assessment.value ? "Done" : "Pending"}
									</span>
									<button
										type="button"
										onClick={() => openAssessmentConfirm(assessment.assessmentType, !assessment.value)}
										className={btnGhost}
									>
										{assessment.value ? "Mark undone" : "Mark done"}
									</button>
								</div>
							</div>
						))}
					</div>
				</div>
			) : null}

			{/* Move student modal */}
			<Modal open={moveModalOpen} title="Move student to another group" onClose={closeMove}
				footer={
					<>
						<button type="button" onClick={closeMove} className={btnGhost}>Cancel</button>
						<button type="button" onClick={() => void submitMove()} disabled={!targetBatchId || updateStudentMutation.isPending} className={btnPrimary}>
							{updateStudentMutation.isPending ? "Moving…" : "Move"}
						</button>
					</>
				}
			>
				<select value={targetBatchId ?? ""} onChange={(e) => setTargetBatchId(e.target.value)} className={inputCls}>
					<option value="">Select target group…</option>
					{(batchesQuery.data?.batches ?? []).filter((b) => b.type === "GROUP" && b.id !== groupId).map((b) => (
						<option key={b.id} value={b.id}>{b.name ?? b.groupId}</option>
					))}
				</select>
			</Modal>

			{/* Confirm remove modal */}
			<Modal open={confirmAction === "remove"} title="Remove from group?" onClose={() => setConfirmAction(null)}
				footer={
					<>
						<button type="button" onClick={() => setConfirmAction(null)} className={btnGhost}>Cancel</button>
						<button type="button" onClick={() => { if (confirmStudentId) void submitRemove(confirmStudentId); }} disabled={updateStudentMutation.isPending} className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50">
							{updateStudentMutation.isPending ? "Removing…" : "Remove"}
						</button>
					</>
				}
			>
				<p className="text-sm text-gray-600">The student will be unassigned from this group but remain active.</p>
			</Modal>

			{/* Confirm move (pick group) modal */}
			<Modal open={confirmAction === "move"} title="Move student?" onClose={() => setConfirmAction(null)}
				footer={
					<>
						<button type="button" onClick={() => setConfirmAction(null)} className={btnGhost}>Cancel</button>
						<button type="button" onClick={() => { if (confirmStudentId) confirmMove(confirmStudentId); }} className={btnPrimary}>Continue</button>
					</>
				}
			>
				<p className="text-sm text-gray-600">You'll select the target group on the next step.</p>
			</Modal>

			{/* Add students modal */}
			<Modal open={addModalOpen} title="Add students to group" onClose={closeAddModal}
				footer={
					<>
						<button type="button" onClick={closeAddModal} className={btnGhost}>Cancel</button>
						<button type="button" onClick={() => void submitAddStudents()} disabled={selectedStudentsToAdd.length === 0 || updateStudentMutation.isPending} className={btnPrimary}>
							{updateStudentMutation.isPending ? "Adding…" : `Add${selectedStudentsToAdd.length > 0 ? ` (${selectedStudentsToAdd.length})` : ""}`}
						</button>
					</>
				}
			>
				{availableStudents.length === 0 ? (
					<p className="py-4 text-center text-sm text-gray-400">No available students at level {group.level ?? "—"}.</p>
				) : (
					<div className="max-h-80 overflow-y-auto space-y-1">
						{availableStudents.map((student) => {
							const mentorLabel = mentors.find((m) => m.id === student.mentorId)?.name ?? "—";
							return (
								<label key={student.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 p-3 transition hover:bg-gray-50">
									<input
										type="checkbox"
										checked={selectedStudentsToAdd.includes(student.id)}
										onChange={() => toggleStudentSelection(student.id)}
										className="h-4 w-4 rounded border-gray-300 text-emerald-600"
									/>
									<div className="min-w-0 flex-1">
										<p className="text-sm font-medium text-gray-800">{student.zid.toUpperCase()} · {student.name}</p>
										<p className="text-xs text-gray-400">Mentor: {mentorLabel}</p>
									</div>
								</label>
							);
						})}
					</div>
				)}
			</Modal>

			{/* Assessment confirm modal */}
			<Modal
				open={assessmentConfirmOpen}
				title="Update assessment"
				onClose={() => { setAssessmentConfirmOpen(false); setPendingAssessment(null); }}
				footer={
					<>
						<button type="button" onClick={() => { setAssessmentConfirmOpen(false); setPendingAssessment(null); }} className={btnGhost}>Cancel</button>
						<button type="button" onClick={() => void submitAssessmentUpdate()} disabled={updateBatchMutation.isPending || !pendingAssessment} className={btnPrimary}>
							{updateBatchMutation.isPending ? "Saving…" : "Confirm"}
						</button>
					</>
				}
			>
				<p className="text-sm text-gray-600">
					{pendingAssessment
						? `Mark the ${pendingAssessment.assessmentType} assessment as ${pendingAssessment.nextDone ? "done" : "not done"} for this group and all ${activeStudents.length} active student${activeStudents.length !== 1 ? "s" : ""}?`
						: "Confirm the assessment change."}
				</p>
			</Modal>
		</div>
	);
};

export default GroupDetailPage;
