import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { DataTable } from "@/components/DataTable";
import {
	buildStudentColumns,
	getStudentFollowUpState,
	getStudentStatusColor,
	type StudentTableRow,
} from "@/features/students/student-table";
import {
	getStudentStageCounts,
	studentStageDefinitions,
	type StudentStageId,
} from "@/features/students/student-stage-filters";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useSession } from "@/lib/session";

export const StudentsPage = () => {
	const { token } = useSession();
	const [searchParams, setSearchParams] = useSearchParams();
	const currentStage = (searchParams.get("stage") ?? "all") as StudentStageId;
	const searchTerm = searchParams.get("search") ?? "";
	const sortBy = searchParams.get("sortBy") ?? "nextFollowUpAt";
	const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";
	const selectedStatus =
		currentStage === "all"
			? undefined
			: studentStageDefinitions.find((stage) => stage.id === currentStage)
				?.statusFilter?.[0];

	const allStudentsQuery = useStudentsQuery(token);
	const studentsQuery = useStudentsQuery(token, {
		status: selectedStatus,
		search: searchTerm || undefined,
		sortBy,
		sortOrder,
	});
	const usersQuery = useUsersQuery(token);

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

		const transformed = studentsQuery.data.students.map((s) => ({
			...s,
			admittedAt: s.admittedAt ? new Date(s.admittedAt) : new Date(),
			createdAt: s.createdAt ? new Date(s.createdAt) : undefined,
			updatedAt: s.updatedAt ? new Date(s.updatedAt) : undefined,
			nextFollowUpAt: s.nextFollowUpAt ? new Date(s.nextFollowUpAt) : undefined,
			customNextFollowUpAt: s.customNextFollowUpAt
				? new Date(s.customNextFollowUpAt)
				: undefined,
		})) as unknown as StudentTableRow[];

		return transformed.sort((left, right) => {
			const leftState = getStudentFollowUpState(
				left.customNextFollowUpAt,
				left.nextFollowUpAt,
			);
			const rightState = getStudentFollowUpState(
				right.customNextFollowUpAt,
				right.nextFollowUpAt,
			);

			if (leftState.priority !== rightState.priority) {
				return leftState.priority - rightState.priority;
			}

			const leftDate = (left.customNextFollowUpAt ?? left.nextFollowUpAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
			const rightDate = (right.customNextFollowUpAt ?? right.nextFollowUpAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;

			return leftDate - rightDate;
		});
	}, [studentsQuery.data?.students]);

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
		() => getStudentStageCounts(allStudentsQuery.data?.students ?? []),
		[allStudentsQuery.data?.students]
	);

	const columns = useMemo(
		() =>
			buildStudentColumns(
				getStudentStatusColor,
				mentorNameById
			),
		[mentorNameById]
	);

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
							onClick={() => setQueryParam("sortOrder", sortOrder === "asc" ? "desc" : "asc")}
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
		</div>
	);
};
