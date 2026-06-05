import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { DataTable } from "@/components/DataTable";
import { Modal } from "@/components/dashboard-ui";
import { useBatchesQuery } from "@/features/batches/batches.queries";
import {
	getStudentStageCounts,
	type StudentStageId,
	studentStageDefinitions,
} from "@/features/students/student-stage-filters";
import {
	buildStudentColumns,
getStudentStatusColor,
	type StudentTableRow,
} from "@/features/students/student-table";
import { useUpdateStudentMutation } from "@/features/students/use-update-student-mutation";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useHasPermission } from "@/lib/hooks/use-has-permission";
import { useSession } from "@/lib/session";

export const StudentsPage = () => {
	const { token } = useSession();
	const [searchParams, setSearchParams] = useSearchParams();
	const currentStage = (searchParams.get("stage") ?? "active") as StudentStageId;
	const studentType = searchParams.get("type");
	const searchTerm = searchParams.get("search") ?? "";
	const sortBy = searchParams.get("sortBy") ?? "nextFollowUpAt";
	const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";
	const page = Number(searchParams.get("page") ?? "1");
	const limit = Number(searchParams.get("limit") ?? "25");
	const [loadAllRequested, setLoadAllRequested] = useState(false);
	const [showProcessStudents, setShowProcessStudents] = useState(false);
	const canReadAllStudents = useHasPermission("STUDENT_READ_ALL");
	const activeScope: "mine" | "all" = loadAllRequested && canReadAllStudents ? "all" : "mine";
	const allStudentsQuery = useStudentsQuery(token, {
		scope: activeScope,
		search: undefined,
	});
	const selectedStatus =
		currentStage === "all"
			? undefined
			: studentStageDefinitions.find((stage) => stage.id === currentStage)
					?.statusFilter?.[0];

	const studentsQuery = useStudentsQuery(token, {
		scope: activeScope,
		status: selectedStatus,
		search: searchTerm || undefined,
		sortBy,
		sortOrder,
		page,
		limit,
	});
	const batchesQuery = useBatchesQuery(token);
	const usersQuery = useUsersQuery(token);
	const canUpdateStudent = useHasPermission("STUDENT_UPDATE");
	const updateStudentMutation = useUpdateStudentMutation();

	const [addToGroupModalOpen, setAddToGroupModalOpen] = useState(false);
	const [selectedStudent, setSelectedStudent] = useState<StudentTableRow | null>(
		null,
	);
	const [groupSearch, setGroupSearch] = useState("");
	const [selectedGroupId, setSelectedGroupId] = useState<string>("");

	const setQueryParam = (key: string, value?: string) => {
		const next = new URLSearchParams(searchParams);
		if (value) {
			next.set(key, value);
		} else {
			next.delete(key);
		}
		setSearchParams(next);
	};

	const filteredStudents = useMemo(() => {
		if (!studentsQuery.data?.students) return [];

		const transformed = studentsQuery.data.students
			.filter((student) => {
				const hasProcess = Boolean(student.processId || student.processLabel);
				if (!showProcessStudents && hasProcess) {
					return false;
				}

				if (studentType === "group") {
					return student.courseType === "GROUP";
				}
				if (studentType === "individual") {
					return student.courseType === "INDIVIDUAL";
				}
				return true;
			})
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

		return transformed;
	}, [showProcessStudents, studentType, studentsQuery.data?.students]);

	// Build name lookup tables
	const mentorNameById = useMemo(() => {
		const map: Record<string, string> = {};
		(usersQuery.data?.users ?? []).forEach((user) => {
			map[user.id] = user.name ?? user.username ?? "Unknown";
		});
		return map;
	}, [usersQuery.data?.users]);

	// Calculate counts
	const stageCounts = useMemo(
		() =>
			getStudentStageCounts(
				(allStudentsQuery.data?.students ?? []).filter((student) => {
					const hasProcess = Boolean(student.processId || student.processLabel);
					// Exclude in-process students from sidebar counts when viewing group
					// or individual filters so those counts reflect only regular
					// group/individual students.
					if ((studentType === "group" || studentType === "individual") && hasProcess) {
						return false;
					}

					if (!showProcessStudents && hasProcess) {
						return false;
					}

					if (studentType === "group") {
						return student.courseType === "GROUP";
					}
					if (studentType === "individual") {
						return student.courseType === "INDIVIDUAL";
					}
					return true;
				}),
			),
		[allStudentsQuery.data?.students, showProcessStudents, studentType],
	);

	const columns = useMemo(
		() =>
			buildStudentColumns(getStudentStatusColor, mentorNameById, {
				canAddToGroup: canUpdateStudent,
				groupLabelByBatchId: (batchesQuery.data?.batches ?? []).reduce<
					Record<string, string>
				>((acc, batch) => {
					if (batch.type === "GROUP") {
						acc[batch.id] = (batch.groupId ?? batch.name ?? batch.id).toUpperCase();
					}
					return acc;
				}, {}),
				onAddToGroup: (student) => {
					setSelectedStudent(student);
					setSelectedGroupId("");
					setGroupSearch("");
					setAddToGroupModalOpen(true);
				},
			}),
		[batchesQuery.data?.batches, mentorNameById],
	);

	const availableGroups = useMemo(() => {
		const groups = (batchesQuery.data?.batches ?? []).filter(
			(batch) => batch.type === "GROUP" && batch.isActive,
		);

		const levelFiltered = selectedStudent?.level
			? groups.filter((batch) => batch.level === selectedStudent.level)
			: groups;

		const query = groupSearch.trim().toLowerCase();
		if (!query) {
			return levelFiltered;
		}

		return levelFiltered.filter((batch) => {
			const label = `${batch.groupId ?? ""} ${batch.name ?? ""} ${batch.level}`.toLowerCase();
			return label.includes(query);
		});
	}, [batchesQuery.data?.batches, groupSearch, selectedStudent?.level]);

	const closeAddToGroupModal = () => {
		setAddToGroupModalOpen(false);
		setSelectedStudent(null);
		setSelectedGroupId("");
		setGroupSearch("");
	};

	const submitAddToGroup = async () => {
		if (!selectedStudent || !selectedGroupId) {
			return;
		}

		try {
			await updateStudentMutation.mutateAsync({
				studentId: selectedStudent.id,
				payload: { batchId: selectedGroupId },
			});
			toast.success("Student added to group");
			closeAddToGroupModal();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to add student to group");
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
				<div className="flex-1">
					<label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
						Search students
					</label>
					<input
						value={searchTerm}
						onChange={(event) => setQueryParam("search", event.target.value)}
						placeholder="Search by name, phone, email, ZID, process"
						className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
					/>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setShowProcessStudents((current) => !current)}
						className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${showProcessStudents ? "bg-amber-500 text-white" : "border border-gray-300 bg-white text-gray-700 hover:border-amber-500 hover:text-amber-700"}`}
					>
						{showProcessStudents ? "Showing process students" : "Show process students"}
					</button>
					<button
						type="button"
						onClick={() => setLoadAllRequested(false)}
						className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${activeScope === "mine" ? "bg-teal-600 text-white" : "border border-gray-300 bg-white text-gray-700 hover:border-teal-500 hover:text-teal-700"}`}
					>
						Assigned to me
					</button>
					<button
						type="button"
						onClick={() => setLoadAllRequested(true)}
						disabled={!canReadAllStudents}
						className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${activeScope === "all" ? "bg-teal-600 text-white" : "border border-gray-300 bg-white text-gray-700 hover:border-teal-500 hover:text-teal-700"}`}
					>
						All students
					</button>
				</div>
				<div className="flex items-end gap-3">
					<div>
						<label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
							Sort by
						</label>
						<select
							value={sortBy}
							onChange={(event) => setQueryParam("sortBy", event.target.value)}
							className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
						>
							<option value="nextFollowUpAt">Next follow-up</option>
							<option value="admittedAt">Admitted date</option>
							<option value="name">Name</option>
							<option value="zid">ZID</option>
						</select>
					</div>
					<div>
						<label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
							Order
						</label>
						<button
							onClick={() =>
								setQueryParam("sortOrder", sortOrder === "asc" ? "desc" : "asc")
							}
							className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700"
						>
							{sortOrder === "asc" ? "Ascending" : "Descending"}
						</button>
					</div>
				</div>
			</div>

			{/* Stage Filter Tabs */}
			<div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
				{studentStageDefinitions.map((stage) => (
					<button
						key={stage.id}
						onClick={() => {
							const next = new URLSearchParams(searchParams);
							next.set("stage", stage.id);
							if (studentType) {
								next.set("type", studentType);
							}
							setSearchParams(next);
						}}
						className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
							currentStage === stage.id
								? "border-teal-600 text-teal-600"
								: "border-transparent text-gray-600 hover:text-gray-900"
						}`}
					>
						{stage.label}
						{stageCounts[stage.id] > 0 && (
							<span className="ml-2 inline-block rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-800">
								{stageCounts[stage.id]}
							</span>
						)}
					</button>
				))}
			</div>

			{/* Data Table */}
			<div className="overflow-hidden">
				<DataTable
					data={filteredStudents}
					columns={columns}
					enableGlobalFilter={false}
					enableTableSorting={false}
				/>
			</div>

			{/* Pagination */}
			<div className="flex items-center justify-between py-4">
				<div className="text-sm text-gray-600">
					<span>Page {page}</span>
				</div>
				<div className="flex items-center gap-2">
					<select
						value={String(limit)}
						onChange={(e) => setQueryParam("limit", e.target.value)}
						className="rounded-lg border border-gray-300 px-3 py-1 text-sm"
					>
						<option value="10">10</option>
						<option value="25">25</option>
						<option value="50">50</option>
						<option value="100">100</option>
					</select>
					<button
						onClick={() => setQueryParam("page", String(Math.max(1, page - 1)))}
						className="rounded-lg border border-gray-300 px-3 py-1 text-sm"
					>
						Prev
					</button>
					<button
						onClick={() => setQueryParam("page", String(page + 1))}
						className="rounded-lg border border-gray-300 px-3 py-1 text-sm"
					>
						Next
					</button>
				</div>
			</div>

			{filteredStudents.length === 0 && !studentsQuery.isLoading && (
				<div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
					<div>
						<p className="text-sm font-medium text-gray-900">
							No students found
						</p>
						<p className="mt-1 text-xs text-gray-500">
							No students match the current filter.
						</p>
					</div>
				</div>
			)}

			<Modal
				open={addToGroupModalOpen}
				onClose={closeAddToGroupModal}
				title="Add student to group"
				description={
					selectedStudent
						? `Select a group for ${selectedStudent.name ?? selectedStudent.zid}`
						: "Select a group"
				}
				footer={
					<>
						<button
							type="button"
							onClick={closeAddToGroupModal}
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => void submitAddToGroup()}
							disabled={!selectedGroupId || updateStudentMutation.isPending}
							className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{updateStudentMutation.isPending ? "Adding..." : "Add to group"}
						</button>
					</>
				}
			>
				<div className="space-y-4">
					<div>
						<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
							Search group
						</label>
						<input
							value={groupSearch}
							onChange={(event) => setGroupSearch(event.target.value)}
							placeholder="Search by group ID, name, or level"
							className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
						/>
					</div>

					<div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-gray-200 p-2">
						{availableGroups.length === 0 ? (
							<p className="px-2 py-6 text-center text-sm text-gray-500">
								No matching groups found
							</p>
						) : (
							availableGroups.map((batch) => {
								const label = (batch.groupId ?? batch.name ?? batch.id).toUpperCase();
								const isSelected = selectedGroupId === batch.id;
								return (
									<button
										key={batch.id}
										type="button"
										onClick={() => setSelectedGroupId(batch.id)}
										className={`w-full rounded-lg border px-3 py-2 text-left transition ${
											isSelected
												? "border-teal-500 bg-teal-50"
												: "border-gray-200 hover:border-gray-300"
										}`}
									>
										<p className="text-sm font-semibold text-gray-900">{label}</p>
										<p className="text-xs text-gray-600">
											{batch.name ?? "Unnamed group"} • Level: {batch.level}
										</p>
									</button>
								);
							})
						)}
					</div>
				</div>
			</Modal>
		</div>
	);
};
