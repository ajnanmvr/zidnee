import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Modal } from "@/components/dashboard-ui";
import { useBatchesQuery } from "@/features/batches/batches.queries";
import { StudentTableView, type StudentTableRow } from "@/features/students/StudentTableView";
import { useUpdateStudentMutation } from "@/features/students/use-update-student-mutation";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useHasPermission } from "@/lib/hooks/use-has-permission";
import { useSession } from "@/lib/session";

type CourseTab = "all" | "group" | "individual";

export const StudentsPage = () => {
	const { token } = useSession();
	const [searchParams, setSearchParams] = useSearchParams();
	const courseTab = (searchParams.get("type") ?? "all") as CourseTab;
	const searchTerm = searchParams.get("search") ?? "";
	const sortBy = searchParams.get("sortBy") ?? "nextFollowUpAt";
	const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";
	const page = Number(searchParams.get("page") ?? "1");
	const limit = Number(searchParams.get("limit") ?? "25");
	const [loadAllRequested, setLoadAllRequested] = useState(false);
	const [showProcessStudents, setShowProcessStudents] = useState(false);
	const canReadAllStudents = useHasPermission("STUDENT_READ_ALL");
	const canUpdateStudent = useHasPermission("STUDENT_UPDATE");
	const activeScope: "mine" | "all" = loadAllRequested && canReadAllStudents ? "all" : "mine";

	const studentsQuery = useStudentsQuery(token, {
		scope: activeScope,
		status: "STUDENT",
		search: searchTerm || undefined,
		sortBy,
		sortOrder,
		page,
		limit,
	});
	const allActiveQuery = useStudentsQuery(token, { scope: activeScope, status: "STUDENT" });

	const batchesQuery = useBatchesQuery(token);
	const usersQuery = useUsersQuery(token);
	const updateStudentMutation = useUpdateStudentMutation();

	const [addToGroupModalOpen, setAddToGroupModalOpen] = useState(false);
	const [selectedStudent, setSelectedStudent] = useState<StudentTableRow | null>(null);
	const [groupSearch, setGroupSearch] = useState("");
	const [selectedGroupId, setSelectedGroupId] = useState<string>("");

	const setQueryParam = (key: string, value?: string) => {
		const next = new URLSearchParams(searchParams);
		if (value) next.set(key, value);
		else next.delete(key);
		setSearchParams(next);
	};

	const allActive = allActiveQuery.data?.students ?? [];
	const groupCount = allActive.filter((s) => s.courseType === "GROUP").length;
	const individualCount = allActive.filter((s) => s.courseType === "INDIVIDUAL").length;

	const filteredStudents = useMemo(() => {
		if (!studentsQuery.data?.students) return [];
		return studentsQuery.data.students
			.filter((s) => {
				const hasProcess = Boolean(s.processId || s.processLabel);
				if (!showProcessStudents && hasProcess) return false;
				if (courseTab === "group") return s.courseType === "GROUP";
				if (courseTab === "individual") return s.courseType === "INDIVIDUAL";
				return true;
			})
			.map((s) => ({
				...s,
				admittedAt: s.admittedAt ? new Date(s.admittedAt) : new Date(),
				nextFollowUpAt: s.nextFollowUpAt ? new Date(s.nextFollowUpAt) : undefined,
				customNextFollowUpAt: s.customNextFollowUpAt ? new Date(s.customNextFollowUpAt) : undefined,
			})) as unknown as StudentTableRow[];
	}, [showProcessStudents, courseTab, studentsQuery.data?.students]);

	const mentorNameById = useMemo(() => {
		const map: Record<string, string> = {};
		(usersQuery.data?.users ?? []).forEach((u) => { map[u.id] = u.name ?? u.username ?? "Unknown"; });
		return map;
	}, [usersQuery.data?.users]);

	const groupLabelByBatchId = useMemo(() =>
		(batchesQuery.data?.batches ?? []).reduce<Record<string, string>>((acc, b) => {
			if (b.type === "GROUP") acc[b.id] = (b.groupId ?? b.name ?? b.id).toUpperCase();
			return acc;
		}, {}),
		[batchesQuery.data?.batches],
	);

	const availableGroups = useMemo(() => {
		const groups = (batchesQuery.data?.batches ?? []).filter((b) => b.type === "GROUP" && b.isActive);
		const byLevel = selectedStudent?.level ? groups.filter((b) => b.level === selectedStudent.level) : groups;
		const q = groupSearch.trim().toLowerCase();
		return q ? byLevel.filter((b) => `${b.groupId ?? ""} ${b.name ?? ""} ${b.level}`.toLowerCase().includes(q)) : byLevel;
	}, [batchesQuery.data?.batches, groupSearch, selectedStudent?.level]);

	const closeAddToGroupModal = () => {
		setAddToGroupModalOpen(false);
		setSelectedStudent(null);
		setSelectedGroupId("");
		setGroupSearch("");
	};

	const submitAddToGroup = async () => {
		if (!selectedStudent || !selectedGroupId) return;
		try {
			await updateStudentMutation.mutateAsync({ studentId: selectedStudent.id, payload: { batchId: selectedGroupId } });
			toast.success("Student added to group");
			closeAddToGroupModal();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to add student to group");
		}
	};

	const totalPages = (studentsQuery.data as any)?.pagination?.totalPages ?? 1;
	const totalCount = (studentsQuery.data as any)?.pagination?.total ?? filteredStudents.length;

	const COURSE_TABS: { id: CourseTab; label: string; count: number }[] = [
		{ id: "all", label: "All Active", count: allActive.length },
		{ id: "group", label: "Group", count: groupCount },
		{ id: "individual", label: "Individual", count: individualCount },
	];

	return (
		<div className="space-y-3">
			{/* Page header */}
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
				<div>
					<h1 className="text-lg font-bold text-gray-900">Students</h1>
					<p className="mt-0.5 text-sm text-gray-500">
						{allActive.length > 0 ? `${allActive.length} active` : "No active students"}
						{groupCount > 0 ? ` · ${groupCount} group` : ""}
						{individualCount > 0 ? ` · ${individualCount} individual` : ""}
					</p>
				</div>
				<div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
					<button
						type="button"
						onClick={() => setLoadAllRequested(false)}
						className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${activeScope === "mine" ? "bg-white text-teal-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
					>
						Mine
					</button>
					<button
						type="button"
						onClick={() => setLoadAllRequested(true)}
						disabled={!canReadAllStudents}
						className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition disabled:opacity-40 ${activeScope === "all" ? "bg-white text-teal-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
					>
						All
					</button>
				</div>
			</div>

			{/* Course type tabs + shortcuts */}
			<div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-1">
				{COURSE_TABS.map((tab) => {
					const isActive = courseTab === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => { setQueryParam("type", tab.id === "all" ? undefined : tab.id); setQueryParam("page", undefined); }}
							className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition ${isActive ? "bg-white text-teal-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
						>
							{tab.label}
							{tab.count > 0
								? <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${isActive ? "bg-teal-100 text-teal-700" : "bg-gray-200 text-gray-600"}`}>{tab.count}</span>
								: null}
						</button>
					);
				})}
				<div className="ml-auto flex items-center gap-1 px-1">
					<Link to="/students/break" className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:border-amber-300 hover:text-amber-700">On Break</Link>
					<Link to="/students/dropped" className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:border-rose-300 hover:text-rose-600">Dropped</Link>
				</div>
			</div>

			{/* Toolbar – search + process toggle + sort */}
			<div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3">
				<input
					value={searchTerm}
					onChange={(e) => setQueryParam("search", e.target.value)}
					placeholder="Search by name, phone, ZID…"
					className="w-52 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
				/>
				<button
					type="button"
					onClick={() => setShowProcessStudents((c) => !c)}
					className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${showProcessStudents ? "bg-amber-500 text-white" : "border border-gray-200 text-gray-600 hover:border-amber-300 hover:text-amber-700"}`}
				>
					{showProcessStudents ? "Incl. in process" : "Excl. in process"}
				</button>
				<div className="ml-auto flex items-center gap-2">
					<select value={sortBy} onChange={(e) => setQueryParam("sortBy", e.target.value)} className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none">
						<option value="nextFollowUpAt">Follow-up date</option>
						<option value="admittedAt">Admitted date</option>
						<option value="name">Name</option>
						<option value="zid">ZID</option>
					</select>
					<button onClick={() => setQueryParam("sortOrder", sortOrder === "asc" ? "desc" : "asc")} className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
						{sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
					</button>
				</div>
			</div>

			{/* Table */}
			{studentsQuery.isLoading ? (
				<div className="flex justify-center py-12">
					<div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
				</div>
			) : (
				<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
					<StudentTableView
						students={filteredStudents}
						mentorNameById={mentorNameById}
						groupLabelByBatchId={groupLabelByBatchId}
						canAddToGroup={canUpdateStudent}
						onAddToGroup={(s) => { setSelectedStudent(s); setSelectedGroupId(""); setGroupSearch(""); setAddToGroupModalOpen(true); }}
					/>
					{/* Pagination */}
					<div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
						<p className="text-xs text-gray-400">
							{totalCount > 0 ? `${(page - 1) * limit + 1}–${Math.min(page * limit, totalCount)} of ${totalCount}` : "0 results"}
						</p>
						<div className="flex items-center gap-2">
							<select value={String(limit)} onChange={(e) => setQueryParam("limit", e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs">
								<option value="10">10</option>
								<option value="25">25</option>
								<option value="50">50</option>
								<option value="100">100</option>
							</select>
							<button onClick={() => setQueryParam("page", String(Math.max(1, page - 1)))} disabled={page <= 1} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium disabled:opacity-40 hover:bg-gray-50">Prev</button>
							<button onClick={() => setQueryParam("page", String(page + 1))} disabled={page >= totalPages} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium disabled:opacity-40 hover:bg-gray-50">Next</button>
						</div>
					</div>
				</div>
			)}

			{/* Add to group modal */}
			<Modal
				open={addToGroupModalOpen}
				onClose={closeAddToGroupModal}
				title="Add student to group"
				description={selectedStudent ? `Select a group for ${selectedStudent.name ?? selectedStudent.zid}` : "Select a group"}
				footer={
					<>
						<button type="button" onClick={closeAddToGroupModal} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button>
						<button type="button" onClick={() => void submitAddToGroup()} disabled={!selectedGroupId || updateStudentMutation.isPending} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
							{updateStudentMutation.isPending ? "Adding…" : "Add to group"}
						</button>
					</>
				}
			>
				<div className="space-y-3">
					<input value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} placeholder="Search by group ID, name, or level" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500" />
					<div className="max-h-64 space-y-1.5 overflow-y-auto rounded-xl border border-gray-100 p-2">
						{availableGroups.length === 0 ? (
							<p className="py-6 text-center text-sm text-gray-400">No matching groups found</p>
						) : availableGroups.map((batch) => {
							const label = (batch.groupId ?? batch.name ?? batch.id).toUpperCase();
							const isSelected = selectedGroupId === batch.id;
							return (
								<button key={batch.id} type="button" onClick={() => setSelectedGroupId(batch.id)} className={`w-full rounded-lg border px-3 py-2 text-left transition ${isSelected ? "border-teal-500 bg-teal-50" : "border-gray-100 hover:border-gray-200"}`}>
									<p className="text-sm font-semibold text-gray-900">{label}</p>
									<p className="text-xs text-gray-500">{batch.name ?? "Unnamed"} · Level {batch.level}</p>
								</button>
							);
						})}
					</div>
				</div>
			</Modal>
		</div>
	);
};
