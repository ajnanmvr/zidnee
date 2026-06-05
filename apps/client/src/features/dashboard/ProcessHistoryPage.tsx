import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { HiArchiveBox, HiMagnifyingGlass } from "react-icons/hi2";
import { useStudentProcessHistoryQuery } from "@/features/students/students.queries";
import { useSession } from "@/lib/session";
import { useHasPermission } from "@/lib/hooks/use-has-permission";

type ProcessKind = "admission" | "drop" | "change" | "other";
const getKind = (label: string): ProcessKind => {
	const l = label.toLowerCase();
	if (l.includes("admission") || l.includes("welcome")) return "admission";
	if (l.includes("drop")) return "drop";
	if (l.includes("convert") || l.includes("change") || l.includes("steam") || l.includes("→")) return "change";
	return "other";
};
const KIND_BADGE: Record<ProcessKind, string> = {
	admission: "bg-emerald-100 text-emerald-700",
	drop: "bg-red-100 text-red-600",
	change: "bg-blue-100 text-blue-700",
	other: "bg-gray-100 text-gray-600",
};

const timeAgo = (v?: string | null) => {
	if (!v) return "—";
	const diff = Math.floor((Date.now() - new Date(v).getTime()) / 1000);
	const units: [number, string][] = [[60,"s"],[60,"m"],[24,"h"],[7,"d"],[4.34524,"w"],[12,"mo"],[Infinity,"y"]];
	let val = diff;
	let unit = "s";
	for (const [limit, u] of units) {
		if (Math.abs(val) < limit) { unit = u; break; }
		val = Math.round(val / limit);
	}
	return `${val}${unit} ago`;
};

export const ProcessHistoryPage = () => {
	const { token } = useSession();
	const [loadAllRequested, setLoadAllRequested] = useState(false);
	const canReadAll = useHasPermission("STUDENT_PROCESS_HISTORY_READ_ALL");
	const activeScope: "mine" | "all" = loadAllRequested && canReadAll ? "all" : "mine";
	const historyQuery = useStudentProcessHistoryQuery(token, { scope: activeScope });
	const location = useLocation();
	const navigate = useNavigate();

	const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
	const [searchTerm, setSearchTerm] = useState(params.get("q") ?? "");
	const [debouncedSearch, setDebouncedSearch] = useState(params.get("q") ?? "");
	const [page, setPage] = useState(1);
	const limit = 25;

	useEffect(() => {
		const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
		return () => clearTimeout(t);
	}, [searchTerm]);

	useEffect(() => {
		const url = new URL(window.location.href);
		debouncedSearch ? url.searchParams.set("q", debouncedSearch) : url.searchParams.delete("q");
		navigate(`${url.pathname}${url.search}`, { replace: true });
	}, [debouncedSearch, navigate]);

	useEffect(() => { setPage(1); }, [searchTerm, activeScope]);

	const allProcesses = historyQuery.data?.processes ?? [];

	const filtered = useMemo(() => {
		const q = debouncedSearch.toLowerCase();
		if (!q) return allProcesses;
		return allProcesses.filter((p) =>
			[p.label, p.status, p.student.zid, p.student.name ?? "", p.student.phone, p.student.email]
				.join(" ").toLowerCase().includes(q)
		);
	}, [allProcesses, debouncedSearch]);

	const pageCount = Math.max(1, Math.ceil(filtered.length / limit));
	const safeP = Math.min(page, pageCount);
	const pageItems = filtered.slice((safeP - 1) * limit, safeP * limit);

	return (
		<div className="space-y-4">
			{/* Toolbar */}
			<div className="flex flex-wrap items-center gap-2">
				<HiArchiveBox className="h-5 w-5 text-gray-400 shrink-0" />
				<button type="button" onClick={() => setLoadAllRequested(false)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${activeScope === "mine" ? "bg-slate-800 text-white" : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}>Mine</button>
				<button type="button" onClick={() => setLoadAllRequested(true)} disabled={!canReadAll} className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${activeScope === "all" ? "bg-slate-800 text-white" : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300"} disabled:opacity-40`}>All history</button>
				<div className="relative ml-auto">
					<HiMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
					<input type="search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search archived processes…" className="w-64 rounded-lg border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-sm outline-none transition focus:border-slate-400" />
				</div>
			</div>

			{/* Table */}
			<div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
				{historyQuery.isLoading ? (
					<p className="py-10 text-center text-sm text-gray-400">Loading…</p>
				) : historyQuery.isError ? (
					<p className="py-10 text-center text-sm text-red-400">Unable to load archived processes.</p>
				) : filtered.length === 0 ? (
					<p className="py-10 text-center text-sm text-gray-400">No archived processes found.</p>
				) : (
					<>
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
									<th className="px-4 py-2.5">Type</th>
									<th className="px-4 py-2.5">Process</th>
									<th className="px-4 py-2.5">Student</th>
									<th className="px-4 py-2.5 hidden sm:table-cell">Tasks</th>
									<th className="px-4 py-2.5 hidden md:table-cell">Archived</th>
									<th className="px-4 py-2.5" />
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100">
								{pageItems.map((process) => {
									const done = process.tasks.filter((t) => t.completed).length;
									const kind = getKind(process.label);
									return (
										<tr key={process.id} className="hover:bg-gray-50/60">
											<td className="px-4 py-3">
												<span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${KIND_BADGE[kind]}`}>
													{kind.charAt(0).toUpperCase() + kind.slice(1)}
												</span>
											</td>
											<td className="px-4 py-3">
												<Link to={`/processes/${process.id}`} className="font-medium text-gray-800 hover:text-emerald-700">{process.label}</Link>
											</td>
											<td className="px-4 py-3">
												<Link to={`/students/${process.student.id}`} className="font-medium text-gray-700 hover:text-emerald-700">{process.student.zid}</Link>
												<p className="text-xs text-gray-400">{process.student.name ?? process.student.phone}</p>
											</td>
											<td className="px-4 py-3 hidden sm:table-cell text-gray-600">{done}/{process.tasks.length}</td>
											<td className="px-4 py-3 hidden md:table-cell text-xs text-gray-400">{timeAgo(process.archivedAt as any)}</td>
											<td className="px-4 py-3 text-right">
												<Link to={`/processes/${process.id}`} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:border-emerald-300 hover:text-emerald-700">View</Link>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>

						<div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
							<p className="text-xs text-gray-400">{filtered.length} archived process{filtered.length !== 1 ? "es" : ""}</p>
							<div className="flex items-center gap-2">
								<button type="button" disabled={safeP <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs disabled:opacity-40">Prev</button>
								<span className="text-xs text-gray-500">{safeP} / {pageCount}</span>
								<button type="button" disabled={safeP >= pageCount} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs disabled:opacity-40">Next</button>
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default ProcessHistoryPage;
