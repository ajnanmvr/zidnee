import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HiMagnifyingGlass } from "react-icons/hi2";
import { Panel } from "@/components/dashboard-ui";
import {
	useStudentProcessesQuery,
	useCompleteProcessMutation,
} from "@/features/students/students.queries";
import { useSession } from "@/lib/session";
import { useHasPermission } from "@/lib/hooks/use-has-permission";

const timeAgo = (dateString?: string | null) => {
	if (!dateString) return "-";
	const then = new Date(dateString).getTime();
	const now = Date.now();
	const diff = Math.floor((now - then) / 1000);

	const units: Array<[number, string]> = [
		[60, "second"],
		[60, "minute"],
		[24, "hour"],
		[7, "day"],
		[4.34524, "week"],
		[12, "month"],
		[Number.POSITIVE_INFINITY, "year"],
 	];

 	let value = diff;
 	let unit = "second";

	for (let i = 0; i < units.length; i++) {
		const pair = units[i] as [number, string];
		const limit = pair[0];
		const unitName = pair[1];
		if (Math.abs(value) < limit) {
			unit = unitName;
			break;
		}
		value = Math.round(value / limit);
	}

 	if (Math.abs(value) !== 1) unit = unit + "s";
 	return `${value} ${unit} ago`;
};

export const StudentProcessesPage = () => {
	const { token } = useSession();
	const navigate = useNavigate();
	const [loadAllRequested, setLoadAllRequested] = useState(false);
	const canReadAllProcesses = useHasPermission("STUDENT_PROCESS_READ_ALL");
	const activeScope: "mine" | "all" = loadAllRequested && canReadAllProcesses ? "all" : "mine";
	const processesQuery = useStudentProcessesQuery(token, { scope: activeScope });
	const completeProcess = useCompleteProcessMutation();
	const [searchTerm, setSearchTerm] = useState("");

	const allProcesses = processesQuery.data?.processes ?? [];

	// Simple client-side pagination
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);

	const filteredProcesses = useMemo(() => {
		const query = searchTerm.trim().toLowerCase();
		if (!query) {
			return allProcesses;
		}

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
							Student processes
						</p>
						<h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
							All process records in one place
						</h1>
						<p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
							Track every student process, see task completion, and jump back to the
							student profile when needed.
						</p>
					</div>
					<div className="grid grid-cols-2 gap-3 text-sm sm:min-w-72">
						<div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3">
							<p className="text-xs uppercase tracking-[0.18em] text-slate-400">
								Processes
							</p>
							<p className="mt-2 text-2xl font-semibold text-white">
								{filteredProcesses.length}
							</p>
						</div>
						<div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3">
							<p className="text-xs uppercase tracking-[0.18em] text-slate-400">
								Tasks done
							</p>
							<p className="mt-2 text-2xl font-semibold text-white">
								{completedTasks}/{totalTasks}
							</p>
						</div>
					</div>
				</div>
			</section>

			<Panel
				title="Processes"
				description="Browse all active and archived student process records"
				action={
					<div className="flex items-center gap-3">
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => setLoadAllRequested(false)}
								className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${activeScope === "mine" ? "bg-emerald-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-500 hover:text-emerald-700"}`}
							>
								Assigned to me
							</button>
							<button
								type="button"
								onClick={() => setLoadAllRequested(true)}
								disabled={!canReadAllProcesses}
								className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${activeScope === "all" ? "bg-emerald-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-500 hover:text-emerald-700"}`}
							>
								All processes
							</button>
						</div>
						<Link
							to="/process-history"
							className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-100"
						>
							Process history
						</Link>
						<label className="relative block w-full min-w-72 max-w-md">
							<HiMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
							<input
								type="search"
								value={searchTerm}
								onChange={(event) => setSearchTerm(event.target.value)}
								placeholder="Search by student, ZID, or process label"
								className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
							/>
						</label>
					</div>
				}
			>
				{processesQuery.isLoading ? (
					<div className="py-10 text-center text-sm text-slate-600">Loading processes...</div>
				) : processesQuery.isError ? (
					<div className="py-10 text-center text-sm text-slate-600">
						<p className="mb-2">Unable to load processes.</p>
						{processesQuery.error ? (
							<pre className="mx-auto max-w-xl whitespace-pre-wrap text-left text-xs text-rose-600">
								{(processesQuery.error as any)?.payload?.message || (processesQuery.error as any)?.message || String(processesQuery.error)}
							</pre>
						) : null}
					</div>
				) : filteredProcesses.length === 0 ? (
					<div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
						No matching processes found.
					</div>
				) : (
					<>
					<table className="w-full table-auto rounded-2xl border-collapse overflow-hidden bg-white">
						<thead>
							<tr className="text-left text-sm text-slate-600">
								<th className="px-4 py-3">Process</th>
								<th className="px-4 py-3">Student</th>
								<th className="px-4 py-3">Status</th>
								<th className="px-4 py-3">Tasks</th>
								<th className="px-4 py-3">Progress</th>
							</tr>
						</thead>
						<tbody>
								{filteredProcesses
									.slice((page - 1) * limit, page * limit)
									.map((process) => {
									const completedCount = process.tasks.filter((task) => task.completed).length;
									const progress = process.tasks.length ? Math.round((completedCount / process.tasks.length) * 100) : 0;
									return (
										<tr key={process.id} className="border-t">
											<td className="px-4 py-3">
												<Link to={`/students/${process.student.id}`} className="text-slate-800 font-semibold">
													{process.student.zid}
												</Link>
												<div className="text-sm text-slate-500">{process.student.name ?? process.student.phone}</div>
											</td>
											<td className="px-4 py-3">
												<Link to={`/processes/${process.id}`} className="text-emerald-600 font-semibold">{process.label}</Link>
												<div className="text-sm text-slate-500">{process.label}</div>
											</td>
											<td className="px-4 py-3">{timeAgo(process.createdAt as any)}</td>
											<td className="px-4 py-3">{completedCount}/{process.tasks.length}</td>
											<td className="px-4 py-3">
												<div className="w-full bg-slate-100 h-2 rounded-full">
													<div className="h-2 rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
												</div>
												{progress === 100 && (
													<div className="mt-2">
														<button
															onClick={async () => {
															if (confirm("Mark this process as completed?")) {
																await completeProcess.mutateAsync({ processId: process.id });
																navigate("/processes");
															}
															}}
															disabled={completeProcess.isPending}
															className="mt-1 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-3 py-1 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
														>
															Mark as completed
														</button>
													</div>
												)}
											</td>
										</tr>
									);
								})}
						</tbody>
					</table>

					{/* Pagination controls */}
					<div className="flex items-center justify-between py-4">
						<div className="text-sm text-slate-600">Showing {Math.min(filteredProcesses.length, limit)} of {filteredProcesses.length} processes</div>
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