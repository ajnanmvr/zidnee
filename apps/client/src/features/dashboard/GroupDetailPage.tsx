import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { HiArrowsRightLeft, HiEye, HiTrash } from "react-icons/hi2";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ActionButton } from "@/components/ActionButton";
import { DataTable } from "@/components/DataTable";
import { Panel, Modal } from "@/components/dashboard-ui";
import { useBatchesQuery } from "@/features/batches/batches.queries";
import { useUpdateBatchMutation } from "@/features/batches/use-update-batch-mutation";
import {
	buildStudentColumns,
	getStudentStatusColor,
	type StudentTableRow,
} from "@/features/students/student-table";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useUpdateStudentMutation } from "@/features/students/use-update-student-mutation";
import { useUpdateStudentAssessmentMutation } from "@/features/students/students.mutations";
import { useSession } from "@/lib/session";

export const GroupDetailPage = () => {
	const { groupId } = useParams<{ groupId: string }>();
	const { token } = useSession();
	const batchesQuery = useBatchesQuery(token);
	const studentsQuery = useStudentsQuery(token);
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

	if (!group) {
		return (
			<div className="py-12 text-center text-gray-600">Group not found</div>
		);
	}

	const mentorName = mentors.find((m) => m.id === group.mentorId)?.name ?? "-";
	const counsellorName = group.counsellorId ? mentors.find((m) => m.id === group.counsellorId)?.name ?? "-" : null;

	const openMove = (studentId: string) => {
		setConfirmAction("move");
		setConfirmStudentId(studentId);
	};

	const closeMove = () => {
		setSelectedStudentId(null);
		setTargetBatchId(null);
		setMoveModalOpen(false);
	};

	const confirmRemove = (studentId: string) => {
		setConfirmAction("remove");
		setConfirmStudentId(studentId);
	};

	const confirmMove = (studentId: string) => {
		setSelectedStudentId(studentId);
		setTargetBatchId(null);
		setMoveModalOpen(true);
		setConfirmAction(null);
		setConfirmStudentId(null);
	};

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
			label: "Oral Assessment",
			value: group.oralAssessmentDone ?? false,
			description: "Speaking and pronunciation check",
		},
		{
			assessmentType: "written" as const,
			label: "Written Assessment",
			value: group.writtenAssessmentDone ?? false,
			description: "Reading and writing check",
		},
		{
			assessmentType: "level" as const,
			label: "Level Assessment",
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

	const activeStudentColumns = useMemo<ColumnDef<StudentTableRow>[]>(() => {
		const sharedColumns = buildStudentColumns(getStudentStatusColor, mentorNameById);

		return [
			...sharedColumns,
			{
				id: "actions",
				header: "Actions",
				cell: ({ row }) => (
					<div className="flex items-center gap-2">
						<Link
							to={`/students/${row.original.id}`}
							aria-label="View student"
							title="View student"
							className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-cyan-300 text-cyan-700 transition-colors hover:bg-cyan-50"
						>
							<HiEye className="h-4 w-4" aria-hidden="true" />
						</Link>
						<ActionButton
							icon={<HiTrash className="h-4 w-4" aria-hidden="true" />}
							tooltip="Remove from group"
							color="red"
							onClick={() => confirmRemove(row.original.id)}
						/>
						<ActionButton
							icon={<HiArrowsRightLeft className="h-4 w-4" aria-hidden="true" />}
							tooltip="Move to another group"
							color="orange"
							onClick={() => openMove(row.original.id)}
						/>
					</div>
				),
			},
		];
	}, [mentorNameById]);

	return (
		<div className="grid gap-6">
			<div className="rounded-3xl border bg-white p-6">
				<h2 className="text-2xl font-semibold">{group.name ?? group.groupId?.toUpperCase()}</h2>
				<p className="text-sm text-gray-600 mt-1">Mentor: {mentorName}</p>
				{counsellorName && <p className="text-sm text-gray-600">Counsellor: {counsellorName}</p>}
			</div>

			<div className="border-b border-gray-200">
				<nav className="flex gap-8">
					{[
						{ key: "students", label: "Students" },
						{ key: "assessment", label: "Assessment" },
					].map((tab) => (
						<button
							key={tab.key}
							onClick={() => setActiveTab(tab.key as "students" | "assessment")}
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

			{activeTab === "students" && (
				<Panel title="Active students in this group">
					<div className="flex justify-end mb-4">
						<button onClick={() => setAddModalOpen(true)} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
							Add Student
						</button>
					</div>
					<DataTable
						data={activeStudents}
						columns={activeStudentColumns}
						enableGlobalFilter={false}
						enableTableSorting={false}
					/>
					{activeStudents.length === 0 ? (
						<div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
							No active students in this group.
						</div>
					) : null}
				</Panel>
			)}

			{activeTab === "assessment" && (
				<Panel title="Group assessments">
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
			)}

			<Modal open={moveModalOpen} title="Move student" onClose={closeMove}>
				<div className="grid gap-4">
					<select value={targetBatchId ?? ""} onChange={(e) => setTargetBatchId(e.target.value)} className="rounded-2xl border px-4 py-3">
						<option value="">Select target group</option>
						{(batchesQuery.data?.batches ?? []).filter((b) => b.type === "GROUP" && b.id !== groupId).map((b) => (
							<option key={b.id} value={b.id}>{b.name ?? b.groupId}</option>
						))}
					</select>
					<div className="flex justify-end">
						<button onClick={submitMove} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Move</button>
					</div>
				</div>
			</Modal>

			<Modal open={confirmAction === "remove"} title="Remove student from group?" onClose={() => setConfirmAction(null)}>
				<div className="grid gap-4">
					<p className="text-sm text-gray-700">This will remove the student from the group but keep their enrollment active.</p>
					<div className="flex justify-end gap-2">
						<button onClick={() => setConfirmAction(null)} className="rounded-2xl border px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button>
						<button onClick={() => confirmStudentId && submitRemove(confirmStudentId)} className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Remove</button>
					</div>
				</div>
			</Modal>

			<Modal open={confirmAction === "move"} title="Move student to another group?" onClose={() => setConfirmAction(null)}>
				<div className="grid gap-4">
					<p className="text-sm text-gray-700">Select target group to continue</p>
					<div className="flex justify-end gap-2">
						<button onClick={() => setConfirmAction(null)} className="rounded-2xl border px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button>
						<button onClick={() => confirmStudentId && confirmMove(confirmStudentId)} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Continue</button>
					</div>
				</div>
			</Modal>

			<Modal open={addModalOpen} title="Add students to group" onClose={closeAddModal}>
				<div className="grid gap-4 max-h-96 overflow-y-auto">
					{availableStudents.length === 0 ? (
						<p className="text-sm text-gray-600">No available students for this course level</p>
					) : (
						<>
							<div className="space-y-2">
								{availableStudents.map((student) => {
									const mentor = mentors.find((m) => m.id === student.mentorId)?.name ?? "-";
									const counsellor = mentors.find((m) => m.id === student.admittedBy)?.name ?? "-";
									return (
										<label key={student.id} className="flex items-center gap-2 p-2 rounded border hover:bg-gray-50 cursor-pointer">
											<input
												type="checkbox"
												checked={selectedStudentsToAdd.includes(student.id)}
												onChange={() => toggleStudentSelection(student.id)}
												className="w-4 h-4"
											/>
											<div className="flex-1">
												<p className="text-sm font-medium text-gray-900">{student.zid.toUpperCase()} - {student.name}</p>
												<p className="text-xs text-gray-500">Mentor: {mentor}, Counsellor: {counsellor}</p>
											</div>
										</label>
									);
								})}
							</div>
							<div className="flex justify-end gap-2 pt-4 border-t">
								<button onClick={closeAddModal} className="rounded-2xl border px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button>
								<button onClick={submitAddStudents} disabled={selectedStudentsToAdd.length === 0} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
									Add {selectedStudentsToAdd.length > 0 ? `(${selectedStudentsToAdd.length})` : ""}
								</button>
							</div>
						</>
					)}
				</div>
			</Modal>

			<Modal
				open={assessmentConfirmOpen}
				title="Confirm assessment update"
				onClose={() => {
					setAssessmentConfirmOpen(false);
					setPendingAssessment(null);
				}}
			>
				<div className="grid gap-4">
					<p className="text-sm text-gray-700">
						{pendingAssessment
							? `Mark ${pendingAssessment.assessmentType} assessment as ${pendingAssessment.nextDone ? "done" : "undone"}?`
							: "Confirm the assessment change."}
					</p>
					<div className="flex justify-end gap-2">
						<button
							type="button"
							onClick={() => {
								setAssessmentConfirmOpen(false);
								setPendingAssessment(null);
							}}
							className="rounded-2xl border px-4 py-2 text-sm font-semibold text-gray-700"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => void submitAssessmentUpdate()}
							disabled={updateBatchMutation.isPending || !pendingAssessment}
							className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
						>
							{updateBatchMutation.isPending ? "Saving..." : "Confirm"}
						</button>
					</div>
				</div>
			</Modal>
		</div>
	);
};

export default GroupDetailPage;
