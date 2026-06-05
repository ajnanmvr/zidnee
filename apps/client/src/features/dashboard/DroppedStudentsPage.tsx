import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DataTable } from "@/components/DataTable";
import { buildStudentColumns, getStudentStatusColor, type StudentTableRow } from "@/features/students/student-table";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useHasPermission } from "@/lib/hooks/use-has-permission";
import { useSession } from "@/lib/session";

export const DroppedStudentsPage = () => {
	const { token } = useSession();
	const [searchParams, setSearchParams] = useSearchParams();
	const searchTerm = searchParams.get("search") ?? "";
	const sortBy = searchParams.get("sortBy") ?? "updatedAt";
	const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
	const page = Number(searchParams.get("page") ?? "1");
	const limit = Number(searchParams.get("limit") ?? "25");
	const [loadAllRequested, setLoadAllRequested] = useState(false);
	const canReadAll = useHasPermission("STUDENT_READ_ALL");
	const activeScope: "mine" | "all" = loadAllRequested && canReadAll ? "all" : "mine";

	const studentsQuery = useStudentsQuery(token, { scope: activeScope, status: "DROPPED", search: searchTerm || undefined, sortBy, sortOrder, page, limit });
	const usersQuery = useUsersQuery(token);

	const setQueryParam = (key: string, value?: string) => {
		const next = new URLSearchParams(searchParams);
		if (value) next.set(key, value); else next.delete(key);
		setSearchParams(next);
	};

	const mentorNameById = useMemo(() => {
		const map: Record<string, string> = {};
		(usersQuery.data?.users ?? []).forEach((u) => { map[u.id] = u.name ?? u.username ?? "Unknown"; });
		return map;
	}, [usersQuery.data?.users]);

	const rows = useMemo(() => {
		return (studentsQuery.data?.students ?? []).map((s) => ({
			...s,
			admittedAt: s.admittedAt ? new Date(s.admittedAt) : new Date(),
			nextFollowUpAt: s.nextFollowUpAt ? new Date(s.nextFollowUpAt) : undefined,
			customNextFollowUpAt: s.customNextFollowUpAt ? new Date(s.customNextFollowUpAt) : undefined,
		})) as unknown as StudentTableRow[];
	}, [studentsQuery.data?.students]);

	const columns = useMemo(() => buildStudentColumns(getStudentStatusColor, mentorNameById), [mentorNameById]);
	const totalPages = (studentsQuery.data as any)?.pagination?.totalPages ?? 1;

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
				<span className="text-sm font-semibold text-red-700">Dropped Students</span>
				<input value={searchTerm} onChange={(e) => setQueryParam("search", e.target.value)} placeholder="Search…" className="ml-auto w-52 rounded-lg border border-red-200 px-3 py-1.5 text-sm outline-none focus:border-red-400 bg-white" />
				<div className="flex items-center gap-1">
					<button type="button" onClick={() => setLoadAllRequested(false)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${activeScope === "mine" ? "bg-red-600 text-white" : "border border-red-200 bg-white text-red-700"}`}>Mine</button>
					<button type="button" onClick={() => setLoadAllRequested(true)} disabled={!canReadAll} className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${activeScope === "all" ? "bg-red-600 text-white" : "border border-red-200 bg-white text-red-700"} disabled:opacity-40`}>All</button>
				</div>
			</div>

			<div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
				{studentsQuery.isLoading ? (
					<p className="py-10 text-center text-sm text-gray-400">Loading…</p>
				) : (
					<>
						<DataTable data={rows} columns={columns} enableGlobalFilter={false} enableTableSorting={false} />
						{rows.length === 0 ? <p className="py-10 text-center text-sm text-gray-400">No dropped students found.</p> : null}
						<div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
							<p className="text-xs text-gray-400">Page {page}{totalPages > 1 ? ` of ${totalPages}` : ""}</p>
							<div className="flex items-center gap-2">
								<select value={String(limit)} onChange={(e) => setQueryParam("limit", e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs">
									<option value="25">25</option><option value="50">50</option><option value="100">100</option>
								</select>
								<button onClick={() => setQueryParam("page", String(Math.max(1, page - 1)))} disabled={page <= 1} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs disabled:opacity-40">Prev</button>
								<button onClick={() => setQueryParam("page", String(page + 1))} disabled={page >= totalPages} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs disabled:opacity-40">Next</button>
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
};
