import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
	HiArchiveBox,
	HiCalendarDays,
	HiCheckCircle,
	HiClock,
	HiMagnifyingGlass,
	HiSquares2X2,
} from "react-icons/hi2";
import { useStudentProcessHistoryQuery } from "@/features/students/students.queries";
import { useSession } from "@/lib/session";

const formatDate = (value?: string | null) => {
	if (!value) return "-";
	return new Date(value).toLocaleString();
};

const formatCompactDate = (value?: string | null) => {
	if (!value) return "-";
	return new Date(value).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
};

const formatGroupDate = (value?: string | null) => {
	if (!value) return "Unknown date";
	return new Date(value).toLocaleDateString(undefined, {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
	});
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

	useEffect(() => {
		setPage(1);
	}, [searchTerm, limit]);

	const pageCount = Math.max(1, Math.ceil(filteredProcesses.length / limit));
	const currentPage = Math.min(page, pageCount);
	const pageItems = useMemo(
		() => filteredProcesses.slice((currentPage - 1) * limit, currentPage * limit),
		[filteredProcesses, currentPage, limit],
	);

	const archiveGroups = useMemo(() => {
		const groups = new Map<string, typeof pageItems>();

		for (const process of pageItems) {
			const key = process.archivedAt ? new Date(process.archivedAt).toDateString() : "Unknown date";
			const existing = groups.get(key) ?? [];
			existing.push(process);
			groups.set(key, existing);
		}

		return Array.from(groups.entries()).map(([key, items]) => ({ key, items }));
	}, [pageItems]);

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
	const averageProgress = useMemo(() => {
		if (!filteredProcesses.length) return 0;
		const totalProgress = filteredProcesses.reduce((sum, process) => {
			const completedCount = process.tasks.filter((task) => task.completed).length;
			const progress = process.tasks.length
				? Math.round((completedCount / process.tasks.length) * 100)
				: 0;
			return sum + progress;
		}, 0);
		return Math.round(totalProgress / filteredProcesses.length);
	}, [filteredProcesses]);
	const latestArchivedAt = useMemo(() => {
		return filteredProcesses.reduce<string | null>((latest, process) => {
			if (!process.archivedAt) return latest;
			if (!latest) return process.archivedAt;
			return new Date(process.archivedAt).getTime() > new Date(latest).getTime()
				? process.archivedAt
				: latest;
		}, null);
	}, [filteredProcesses]);
	const oldestArchivedAt = useMemo(() => {
		return filteredProcesses.reduce<string | null>((oldest, process) => {
			if (!process.archivedAt) return oldest;
			if (!oldest) return process.archivedAt;
			return new Date(process.archivedAt).getTime() < new Date(oldest).getTime()
				? process.archivedAt
				: oldest;
		}, null);
	}, [filteredProcesses]);

	return (
		<div className="grid gap-6">
			<section className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-sm">
				<div className="bg-linear-to-r from-slate-950 via-slate-900 to-emerald-900 px-6 py-6 text-white sm:px-8">
					<div className="flex flex-wrap items-start justify-between gap-6">
						<div className="max-w-2xl">
							<div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">
								<HiArchiveBox className="h-3.5 w-3.5" />
								Process history
							</div>
							<h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
								Archived student journeys
							</h1>
							<p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
								Browse completed workflows in a visual archive, grouped by date so finished records are easier to scan.
							</p>
						</div>

						<div className="grid grid-cols-2 gap-3 text-sm sm:min-w-[18rem]">
							<div className="rounded-3xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
								<p className="text-xs uppercase tracking-[0.18em] text-slate-300">Archived</p>
								<p className="mt-2 text-2xl font-semibold text-white">{filteredProcesses.length}</p>
							</div>
							<div className="rounded-3xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
								<p className="text-xs uppercase tracking-[0.18em] text-slate-300">Avg progress</p>
								<p className="mt-2 text-2xl font-semibold text-white">{averageProgress}%</p>
							</div>
							<div className="rounded-3xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
								<p className="text-xs uppercase tracking-[0.18em] text-slate-300">Tasks done</p>
								<p className="mt-2 text-2xl font-semibold text-white">{completedTasks}/{totalTasks}</p>
							</div>
							<div className="rounded-3xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
								<p className="text-xs uppercase tracking-[0.18em] text-slate-300">Latest</p>
								<p className="mt-2 text-sm font-semibold text-white">{formatCompactDate(latestArchivedAt)}</p>
							</div>
						</div>
					</div>
				</div>

				<div className="grid gap-4 p-4 sm:p-6">
					<div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
						<div className="flex flex-wrap items-center gap-3">
							<Link
								to="/processes"
								className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50"
							>
								<HiSquares2X2 className="h-4 w-4" />
								Active processes
							</Link>
							<div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
								<HiCalendarDays className="h-4 w-4 text-emerald-600" />
								{oldestArchivedAt ? `Oldest ${formatCompactDate(oldestArchivedAt)}` : "No history yet"}
							</div>
							<div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
								<HiClock className="h-4 w-4 text-emerald-600" />
								{latestArchivedAt ? `Latest ${formatCompactDate(latestArchivedAt)}` : "No archive date"}
							</div>
						</div>

						<label className="relative block w-full lg:justify-self-end">
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

					{historyQuery.isLoading ? (
						<div className="py-12 text-center text-sm text-slate-600">Loading process history...</div>
					) : historyQuery.isError ? (
						<div className="py-12 text-center text-sm text-slate-600">
							<p className="mb-2">Unable to load process history.</p>
						</div>
					) : filteredProcesses.length === 0 ? (
						<div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-14 text-center text-sm text-slate-600">
							<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
								<HiArchiveBox className="h-7 w-7" />
							</div>
							<p className="text-base font-semibold text-slate-800">No archived processes found.</p>
							<p className="mt-1">Try a different search term or complete a process first.</p>
						</div>
					) : (
						<>
							<div className="grid gap-4">
								{archiveGroups.map((group) => (
									<section key={group.key} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
										<header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
											<div>
												<p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Archived on</p>
												<h2 className="mt-1 text-lg font-semibold text-slate-900">{formatGroupDate(group.key)}</h2>
											</div>
											<p className="text-sm text-slate-500">{group.items.length} record{group.items.length === 1 ? "" : "s"}</p>
										</header>

										<div className="grid gap-4 p-4 sm:p-5">
											{group.items.map((process) => {
												const completedCount = process.tasks.filter((task) => task.completed).length;
												const progress = process.tasks.length
													? Math.round((completedCount / process.tasks.length) * 100)
													: 0;

												return (
													<article
														key={process.id}
														className="group rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
													>
														<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
															<div className="min-w-0 flex-1">
																<div className="flex flex-wrap items-center gap-3">
																	<Link to={`/processes/${process.id}`} className="text-base font-semibold text-slate-900 transition group-hover:text-emerald-700">
																		{process.label}
																	</Link>
																	<span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
																		<HiCheckCircle className="h-3.5 w-3.5" />
																		Completed
																	</span>
																	<span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
																		<HiClock className="h-3.5 w-3.5" />
																		{formatDate(process.archivedAt)}
																	</span>
																</div>

																<div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
																	<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
																		<p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Student</p>
																		<p className="mt-2 text-sm font-semibold text-slate-900">{process.student.zid}</p>
																		<p className="mt-1 text-sm text-slate-600">{process.student.name ?? process.student.phone}</p>
																	</div>
																	<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
																		<p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Tasks completed</p>
																		<p className="mt-2 text-sm font-semibold text-slate-900">{completedCount}/{process.tasks.length}</p>
																		<p className="mt-1 text-sm text-slate-600">Archive snapshot</p>
																	</div>
																	<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
																		<p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Progress</p>
																		<p className="mt-2 text-sm font-semibold text-slate-900">{progress}% complete</p>
																		<div className="mt-3 h-2 rounded-full bg-slate-200">
																			<div className="h-2 rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
																		</div>
																	</div>
																	<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
																		<p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Archived</p>
																		<p className="mt-2 text-sm font-semibold text-slate-900">{formatCompactDate(process.archivedAt)}</p>
																		<p className="mt-1 text-sm text-slate-600">Recovered from history</p>
																	</div>
																</div>
															</div>

															<div className="flex items-center gap-3 lg:shrink-0">
																<Link
																	to={`/students/${process.student.id}`}
																	className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
																>
																	Student profile
																</Link>
																<Link
																	to={`/processes/${process.id}`}
																	className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
																>
																	Open record
																</Link>
															</div>
														</div>
													</article>
												);
											})}
										</div>
									</section>
								))}
							</div>

							<div className="flex flex-col gap-3 border-t border-slate-100 px-1 pt-2 sm:flex-row sm:items-center sm:justify-between">
								<div className="text-sm text-slate-600">
									Showing {pageItems.length} of {filteredProcesses.length} archived processes
								</div>
								<div className="flex items-center gap-2">
									<select
										value={String(limit)}
										onChange={(event) => setLimit(Number(event.target.value))}
										className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
									>
										<option value="10">10</option>
										<option value="20">20</option>
										<option value="50">50</option>
									</select>
									<button
										type="button"
										onClick={() => setPage(Math.max(1, currentPage - 1))}
										disabled={currentPage === 1}
										className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
									>
										Prev
									</button>
									<span className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600">
										Page {currentPage} of {pageCount}
									</span>
									<button
										type="button"
										onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
										disabled={currentPage >= pageCount}
										className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
									>
										Next
									</button>
								</div>
							</div>
						</>
					)}
				</div>
			</section>
		</div>
	);
};

export default ProcessHistoryPage;