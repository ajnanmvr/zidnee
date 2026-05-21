import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { HiMagnifyingGlass } from "react-icons/hi2";
import { Panel } from "@/components/dashboard-ui";
import { useStudentProcessHistoryQuery } from "@/features/students/students.queries";
import { useSession } from "@/lib/session";

const formatDate = (value?: string | null) => {
	if (!value) return "-";
	return new Date(value).toLocaleString();
};

export const ProcessHistoryPage = () => {
	const { token } = useSession();
	const historyQuery = useStudentProcessHistoryQuery(token);
	const [searchTerm, setSearchTerm] = useState("");
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);

	const allProcesses = historyQuery.data?.processes ?? [];

	const filteredProcesses = useMemo(() => {
		const query = searchTerm.trim().toLowerCase();
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
	}, [allProcesses, searchTerm]);

	const totalTasks = useMemo(
		() => filteredProcesses.reduce((sum, process) => sum + process.tasks.length, 0),
		[filteredProcesses],
	);
	const completedTasks = useMemo(
		() =>
			filteredProcesses.reduce(
				(sum, process) =>
					sum + process.tasks.filter((task) => task.completed).length,
				0,
			),
		[filteredProcesses],
	);

	return (
		<div className="grid gap-6">
			<section className="rounded-4xl border border-slate-200 bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-sm">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="max-w-2xl">
						<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-300">
							Process history
						</p>
						<h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
							Completed student processes
						</h1>
						<p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
							Review finished admission workflows and open any record to inspect the full task trail.
						</p>
					</div>
					<div className="grid grid-cols-2 gap-3 text-sm sm:min-w-72">
						<div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3">
							<p className="text-xs uppercase tracking-[0.18em] text-slate-400">Completed</p>
							<p className="mt-2 text-2xl font-semibold text-white">{filteredProcesses.length}</p>
						</div>
						<div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3">
							<p className="text-xs uppercase tracking-[0.18em] text-slate-400">Tasks done</p>
							<p className="mt-2 text-2xl font-semibold text-white">{completedTasks}/{totalTasks}</p>
						</div>
					</div>
				</div>
			</section>

			<Panel
				title="Process History"
				description="Archived student process records"
				action={
					<div className="flex items-center gap-3">
						<Link
							to="/processes"
							className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400"
						>
							Active processes
						</Link>
						<label className="relative block w-full min-w-72 max-w-md">
							<HiMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
							<input
								type="search"
								value={searchTerm}
								onChange={(event) => setSearchTerm(event.target.value)}
								placeholder="Search history by student, ZID, or process label"
								className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
							/>
						</label>
					</div>
				}
			>
				{historyQuery.isLoading ? (
					<div className="py-10 text-center text-sm text-slate-600">Loading process history...</div>
				) : historyQuery.isError ? (
					<div className="py-10 text-center text-sm text-slate-600">
						<p className="mb-2">Unable to load process history.</p>
					</div>
				) : filteredProcesses.length === 0 ? (
					<div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
						No archived processes found.
					</div>
				) : (
					<>
						<table className="w-full table-auto overflow-hidden rounded-2xl border-collapse bg-white">
							<thead>
								<tr className="text-left text-sm text-slate-600">
									<th className="px-4 py-3">Process</th>
									<th className="px-4 py-3">Student</th>
									<th className="px-4 py-3">Tasks</th>
									<th className="px-4 py-3">Progress</th>
									<th className="px-4 py-3">Archived At</th>
								</tr>
							</thead>
							<tbody>
								{filteredProcesses.slice((page - 1) * limit, page * limit).map((process) => {
									const completedCount = process.tasks.filter((task) => task.completed).length;
									const progress = process.tasks.length
										? Math.round((completedCount / process.tasks.length) * 100)
										: 0;

									return (
										<tr key={process.id} className="border-t align-top">
											<td className="px-4 py-3">
												<Link to={`/processes/${process.id}`} className="font-semibold text-slate-800">
													{process.label}
												</Link>
												<div className="text-sm text-slate-500">Completed process</div>
											</td>
											<td className="px-4 py-3">
												<div className="font-semibold text-slate-900">{process.student.zid}</div>
												<div className="text-sm text-slate-500">{process.student.name ?? process.student.phone}</div>
											</td>
											<td className="px-4 py-3 text-sm text-slate-700">{completedCount}/{process.tasks.length}</td>
											<td className="px-4 py-3 text-sm text-slate-700">
												<div className="w-full rounded-full bg-slate-100 h-2">
													<div className="h-2 rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
												</div>
											</td>
											<td className="px-4 py-3 text-sm text-slate-700">{formatDate(process.archivedAt)}</td>
										</tr>
									);
								})}
							</tbody>
						</table>

						<div className="flex items-center justify-between py-4">
							<div className="text-sm text-slate-600">
								Showing {Math.min(filteredProcesses.length, limit)} of {filteredProcesses.length} completed processes
							</div>
							<div className="flex items-center gap-2">
								<select value={String(limit)} onChange={(e) => setLimit(Number(e.target.value))} className="rounded-lg border border-gray-300 px-3 py-1 text-sm">
									<option value="10">10</option>
									<option value="20">20</option>
									<option value="50">50</option>
								</select>
								<button type="button" onClick={() => setPage(Math.max(1, page - 1))} className="rounded-lg border border-gray-300 px-3 py-1 text-sm">Prev</button>
								<button type="button" onClick={() => setPage(page + 1)} className="rounded-lg border border-gray-300 px-3 py-1 text-sm">Next</button>
							</div>
						</div>
					</>
				)}
			</Panel>
		</div>
	);
};

export default ProcessHistoryPage;