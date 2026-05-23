import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { HiMagnifyingGlass } from "react-icons/hi2";
import { useStudentProcessHistoryQuery } from "@/features/students/students.queries";
import { useSession } from "@/lib/session";


export const ProcessHistoryPage = () => {
	const { token } = useSession();
	const [loadAllRequested, setLoadAllRequested] = useState(false);
	const activeScope: "mine" | "all" = loadAllRequested ? "all" : "mine";
	const historyQuery = useStudentProcessHistoryQuery(token, { scope: activeScope });
	const location = useLocation();
	const navigate = useNavigate();

	const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
	const initialQuery = params.get("q") ?? "";
	const [searchTerm, setSearchTerm] = useState(initialQuery);
	const [debouncedSearch, setDebouncedSearch] = useState(initialQuery);
	const [page, setPage] = useState(1);
	const limit = 20;

	const allProcesses = historyQuery.data?.processes ?? [];

	useEffect(() => {
		const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
		return () => clearTimeout(t);
	}, [searchTerm]);

	useEffect(() => {
		const url = new URL(window.location.href);
		if (debouncedSearch) {
			url.searchParams.set("q", debouncedSearch);
		} else {
			url.searchParams.delete("q");
		}
		// replace so browser history isn't flooded
		navigate(`${url.pathname}${url.search}`, { replace: true });
	}, [debouncedSearch, navigate]);

	const filteredProcesses = useMemo(() => {
		const query = debouncedSearch.toLowerCase();
		if (!query) return allProcesses;

		return allProcesses.filter((process) => {
			const haystack = [
				process.label,
				process.status,
				process.student.zid,
				process.student.name ?? "",
				process.student.phone,
				process.student.email,
			].join(" ").toLowerCase();
			return haystack.includes(query);
		});
	}, [allProcesses, debouncedSearch]);

	useEffect(() => {
		setPage(1);
	}, [searchTerm]);

	const pageCount = Math.max(1, Math.ceil(filteredProcesses.length / limit));
	const currentPage = Math.min(page, pageCount);
	const pageItems = useMemo(
		() => filteredProcesses.slice((currentPage - 1) * limit, currentPage * limit),
		[filteredProcesses, currentPage, limit],
	);

	// summary metrics intentionally omitted to keep this view compact

	return (
		<div className="grid gap-4">
			<section className="px-2 py-3">
				<div className="flex items-center justify-between gap-3">
					<h2 className="text-lg font-semibold">Process History</h2>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setLoadAllRequested(false)}
							className={`rounded-md px-3 py-2 text-sm font-semibold transition ${activeScope === "mine" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"}`}
						>
							Assigned to me
						</button>
						<button
							type="button"
							onClick={() => setLoadAllRequested(true)}
							className={`rounded-md px-3 py-2 text-sm font-semibold transition ${activeScope === "all" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"}`}
						>
							All history
						</button>
						<div className="relative">
							<span className="absolute inset-y-0 left-2 flex items-center text-slate-400"><HiMagnifyingGlass /></span>
							<input
								type="search"
								value={searchTerm}
								onChange={(event) => setSearchTerm(event.target.value)}
								placeholder="Search archived processes"
								className="rounded-md border border-slate-200 px-3 py-2 pl-9 text-sm outline-none"
							/>
							{searchTerm ? (
								<button
									onClick={() => setSearchTerm("")}
									className="absolute inset-y-0 right-2 flex items-center text-slate-500 text-xs px-2"
									aria-label="Clear search"
								>
									Clear
								</button>
							) : null}
						</div>
					</div>
				</div>
			</section>

			<section className="rounded-md border border-slate-200 bg-white p-2">
				{historyQuery.isLoading ? (
					<div className="py-6 text-center text-sm text-slate-600">Loading...</div>
				) : historyQuery.isError ? (
					<div className="py-6 text-center text-sm text-slate-600">Unable to load archived processes.</div>
				) : filteredProcesses.length === 0 ? (
					<div className="py-6 text-center text-sm text-slate-600">No archived processes found.</div>
				) : (
					<ul className="divide-y">
						{pageItems.map((process) => {
							const completedCount = process.tasks.filter((t) => t.completed).length;
							return (
								<li key={process.id} className="flex items-center justify-between py-2 px-3">
									<div>
										<div className="text-sm font-semibold text-slate-900">{process.label}</div>
										<div className="text-xs text-slate-500">{process.student.name ?? process.student.zid} · {process.student.zid}</div>
									</div>
									<div className="flex items-center gap-3">
										<div className="text-xs text-slate-600">{completedCount}/{process.tasks.length}</div>
										<Link to={`/students/${process.student.id}`} className="text-xs text-slate-700">Student</Link>
										<Link to={`/processes/${process.id}`} className="text-xs text-emerald-600">Open</Link>
									</div>
								</li>
							);
						})}
					</ul>
				)}

				{/* Simple pagination */}
				{filteredProcesses.length > 0 && (
					<div className="mt-2 flex items-center justify-between px-2 py-2 text-sm text-slate-600">
						<div>Showing {pageItems.length} of {filteredProcesses.length}</div>
						<div className="flex items-center gap-2">
							<button onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-2 py-1 rounded border">Prev</button>
							<span>Page {currentPage} of {pageCount}</span>
							<button onClick={() => setPage(Math.min(pageCount, currentPage + 1))} disabled={currentPage >= pageCount} className="px-2 py-1 rounded border">Next</button>
						</div>
					</div>
				)}
			</section>
		</div>
	);
};

export default ProcessHistoryPage;