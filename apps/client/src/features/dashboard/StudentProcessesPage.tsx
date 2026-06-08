import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { HiAcademicCap, HiArrowPath, HiExclamationTriangle, HiMagnifyingGlass, HiMinusCircle, HiTrash, HiUserPlus } from "react-icons/hi2";
import {
	useStudentProcessesQuery,
	useCompleteProcessMutation,
	useDeleteProcessMutation,
} from "@/features/students/students.queries";
import { useSession } from "@/lib/session";
import { useHasPermission } from "@/lib/hooks/use-has-permission";
import { ApiError } from "@/api/request";

type ProcessKind = "admission" | "drop" | "change" | "other";

const getProcessKind = (label: string): ProcessKind => {
	const l = label.toLowerCase();
	if (l.includes("admission") || l.includes("welcome")) return "admission";
	if (l.includes("drop")) return "drop";
	if (l.includes("convert") || l.includes("change") || l.includes("steam") || l.includes("→")) return "change";
	return "other";
};

const PROCESS_KIND_META: Record<ProcessKind, { Icon: React.ComponentType<{ className?: string }>; badge: string; dot: string }> = {
	admission: { Icon: HiUserPlus, badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
	drop:      { Icon: HiMinusCircle, badge: "bg-red-100 text-red-600", dot: "bg-red-400" },
	change:    { Icon: HiArrowPath, badge: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
	other:     { Icon: HiAcademicCap, badge: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
};

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
	const deleteProcess = useDeleteProcessMutation();
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

	return (
		<div className="space-y-4">
			{/* Toolbar */}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setLoadAllRequested(false)}
						className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${activeScope === "mine" ? "bg-emerald-600 text-white" : "border border-gray-200 bg-white text-gray-600 hover:border-emerald-400 hover:text-emerald-700"}`}
					>
						Assigned to me
					</button>
					<button
						type="button"
						onClick={() => setLoadAllRequested(true)}
						disabled={!canReadAllProcesses}
						className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${activeScope === "all" ? "bg-emerald-600 text-white" : "border border-gray-200 bg-white text-gray-600 hover:border-emerald-400 hover:text-emerald-700"} disabled:opacity-40`}
					>
						All processes
					</button>
					<Link
						to="/process-history"
						className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-600 transition hover:border-emerald-400 hover:text-emerald-700"
					>
						History
					</Link>
				</div>
				<div className="relative">
					<HiMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
					<input
						type="search"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						placeholder="Search by student, ZID, or label…"
						className="w-64 rounded-lg border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-500"
					/>
				</div>
			</div>

			{/* Table */}
			<div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
				{processesQuery.isLoading ? (
					<p className="py-10 text-center text-sm text-gray-500">Loading…</p>
				) : processesQuery.isError ? (
					<p className="py-10 text-center text-sm text-red-500">Unable to load processes.</p>
				) : filteredProcesses.length === 0 ? (
					<p className="py-10 text-center text-sm text-gray-400">No matching processes.</p>
				) : (
					<>
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
								<th className="px-4 py-3">Student</th>
								<th className="px-4 py-3">Process</th>
								<th className="px-4 py-3">Type</th>
								<th className="px-4 py-3">Progress</th>
								<th className="px-4 py-3" />
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{filteredProcesses.slice((page - 1) * limit, page * limit).map((process) => {
								const completedCount = process.tasks.filter((t) => t.completed).length;
								const progress = process.tasks.length
									? Math.round((completedCount / process.tasks.length) * 100)
									: 0;
								const kind = getProcessKind(process.label);
								const meta = PROCESS_KIND_META[kind];
								const isDroppedStudent = process.student.status === "DROPPED";
								return (
									<tr key={process.id} className="hover:bg-gray-50">
										<td className="px-4 py-3">
											<Link to={`/students/${process.student.id}`} className="font-medium text-gray-800 hover:text-emerald-700">
												{process.student.zid}
											</Link>
											<p className="text-xs text-gray-400">{process.student.name ?? process.student.phone}</p>
											{isDroppedStudent ? (
												<span className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
													<HiExclamationTriangle className="h-3 w-3 shrink-0" />
													Dropped student
												</span>
											) : null}
										</td>
										<td className="px-4 py-3">
											<Link to={`/processes/${process.id}`} className="font-medium text-gray-800 hover:text-emerald-700">
												{process.label}
											</Link>
											<p className="text-xs text-gray-400">{timeAgo(process.createdAt as any)}</p>
										</td>
										<td className="px-4 py-3">
											<span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
												<meta.Icon className="h-3 w-3 shrink-0" />
												{kind.charAt(0).toUpperCase() + kind.slice(1)}
											</span>
										</td>
										<td className="px-4 py-3">
											<div className="flex items-center gap-2">
												<div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
													<div
														className={`h-full rounded-full ${meta.dot}`}
														style={{ width: `${progress}%` }}
													/>
												</div>
												<span className="text-xs text-gray-500">{progress}%</span>
											</div>
										</td>
										<td className="px-4 py-3 text-right">
											<div className="flex items-center justify-end gap-2">
												{isDroppedStudent ? (
													<button
														type="button"
														onClick={async () => {
															if (confirm("This student has been dropped. Delete this process?")) {
																try {
																	await deleteProcess.mutateAsync({ processId: process.id });
																	toast.success("Process deleted");
																} catch (error) {
																	toast.error(
																		error instanceof ApiError
																			? (error.payload.message ?? "Unable to delete process")
																			: error instanceof Error ? error.message : "Unable to delete process",
																	);
																}
															}
														}}
														disabled={deleteProcess.isPending}
														className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
													>
														<HiTrash className="h-3.5 w-3.5" />
														Delete
													</button>
												) : null}
												{progress === 100 ? (
													<button
														type="button"
														onClick={async () => {
															if (confirm("Mark this process as completed?")) {
																await completeProcess.mutateAsync({ processId: process.id });
																navigate("/processes");
															}
														}}
														disabled={completeProcess.isPending}
														className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
													>
														Complete
													</button>
												) : (
													<Link
														to={`/processes/${process.id}`}
														className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:border-emerald-300 hover:text-emerald-700"
													>
														View
													</Link>
												)}
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>

					<div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
						<p className="text-xs text-gray-500">
							{filteredProcesses.length} process{filteredProcesses.length !== 1 ? "es" : ""}
						</p>
						<div className="flex items-center gap-2">
							<select
								value={String(limit)}
								onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
								className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
							>
								<option value="10">10</option>
								<option value="20">20</option>
								<option value="50">50</option>
							</select>
							<button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs disabled:opacity-40">Prev</button>
							<span className="text-xs text-gray-500">{page}</span>
							<button type="button" disabled={page * limit >= filteredProcesses.length} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs disabled:opacity-40">Next</button>
						</div>
					</div>
					</>
				)}
			</div>
		</div>
	);
};