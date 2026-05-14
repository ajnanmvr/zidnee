import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { DataTable } from "@/components/DataTable";
import {
	buildStudentColumns,
	getStudentStatusColor,
	type StudentTableRow,
} from "@/features/students/student-table";
import {
	getStudentStageCounts,
	getStudentStatusFilterByStage,
	studentStageDefinitions,
	type StudentStageId,
} from "@/features/students/student-stage-filters";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useSession } from "@/lib/session";

export const StudentsPage = () => {
	const { token } = useSession();
	const [searchParams, setSearchParams] = useSearchParams();
	const studentsQuery = useStudentsQuery(token);
	const usersQuery = useUsersQuery(token);

	const currentStage = (searchParams.get("stage") ?? "all") as StudentStageId;

	// Filter students by stage
	const filteredStudents = useMemo(() => {
		if (!studentsQuery.data?.students) return [];

		const statusFilter = getStudentStatusFilterByStage(currentStage);
		const students = statusFilter === null
			? studentsQuery.data.students
			: studentsQuery.data.students.filter((s) =>
			statusFilter.includes(s.status)
		);

		// Convert string dates to Date objects
		return students.map((s) => ({
			...s,
			admittedAt: s.admittedAt ? new Date(s.admittedAt) : new Date(),
			createdAt: s.createdAt ? new Date(s.createdAt) : undefined,
			updatedAt: s.updatedAt ? new Date(s.updatedAt) : undefined,
		})) as unknown as StudentTableRow[];
	}, [studentsQuery.data?.students, currentStage]);

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
		() => getStudentStageCounts(studentsQuery.data?.students ?? []),
		[studentsQuery.data?.students]
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
			{/* Stage Filter Tabs */}
			<div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
				{studentStageDefinitions.map((stage) => (
					<button
						key={stage.id}
						onClick={() => setSearchParams({ stage: stage.id })}
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
