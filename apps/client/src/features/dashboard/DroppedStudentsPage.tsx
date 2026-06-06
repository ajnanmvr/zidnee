import type { Student } from "@repo/schema";
import { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useHasPermission } from "@/lib/hooks/use-has-permission";
import { useSession } from "@/lib/session";
import { HiArchiveBox } from "react-icons/hi2";

type StudentRow = Student;

const AVATAR_COLORS = [
	"bg-teal-500", "bg-blue-500", "bg-violet-500", "bg-rose-500",
	"bg-amber-500", "bg-emerald-500", "bg-cyan-500", "bg-indigo-500",
];

function getAvatarColor(id: string): string {
	let hash = 0;
	for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
	return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] ?? "bg-teal-500";
}

function fmtDate(val?: Date | string | null): string {
	if (!val) return "—";
	const d = val instanceof Date ? val : new Date(val);
	if (Number.isNaN(d.getTime())) return "—";
	return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export const DroppedStudentsPage = () => {
	const { token } = useSession();
	const [searchParams, setSearchParams] = useSearchParams();
	const searchTerm = searchParams.get("search") ?? "";
	const page = Number(searchParams.get("page") ?? "1");
	const limit = Number(searchParams.get("limit") ?? "25");
	const [loadAllRequested, setLoadAllRequested] = useState(false);
	const canReadAll = useHasPermission("STUDENT_READ_ALL");
	const activeScope: "mine" | "all" = loadAllRequested && canReadAll ? "all" : "mine";

	const [viewingReason, setViewingReason] = useState<StudentRow | null>(null);

	const studentsQuery = useStudentsQuery(token, {
		scope: activeScope,
		status: "DROPPED",
		search: searchTerm || undefined,
		sortBy: "updatedAt",
		sortOrder: "desc",
		page,
		limit,
	});

	const setQueryParam = (key: string, value?: string) => {
		const next = new URLSearchParams(searchParams);
		if (value) next.set(key, value); else next.delete(key);
		setSearchParams(next);
	};

	const rows = useMemo(
		() =>
			(studentsQuery.data?.students ?? []).map((s) => ({
				...s,
				updatedAt: s.updatedAt ? new Date(s.updatedAt) : undefined,
			})) as unknown as StudentRow[],
		[studentsQuery.data?.students],
	);

	const totalPages = (studentsQuery.data as any)?.pagination?.totalPages ?? 1;
	const totalCount = (studentsQuery.data as any)?.pagination?.total ?? rows.length;

	return (
		<div className="space-y-3">
			{/* Page header */}
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-200">
						<HiArchiveBox className="h-5 w-5 text-rose-700" />
					</div>
					<div>
						<p className="text-base font-bold text-rose-900">Dropped Students</p>
						<p className="text-xs text-rose-700">
							{totalCount} student{totalCount !== 1 ? "s" : ""}
						</p>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<input
						value={searchTerm}
						onChange={(e) => setQueryParam("search", e.target.value)}
						placeholder="Search by name, phone, ZID…"
						className="w-52 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
					/>
					<div className="flex items-center gap-1 rounded-xl border border-rose-200 bg-white p-1">
						<button
							type="button"
							onClick={() => setLoadAllRequested(false)}
							className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${activeScope === "mine" ? "bg-rose-600 text-white shadow-sm" : "text-rose-700 hover:bg-rose-50"}`}
						>
							Mine
						</button>
						<button
							type="button"
							onClick={() => setLoadAllRequested(true)}
							disabled={!canReadAll}
							className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:opacity-40 ${activeScope === "all" ? "bg-rose-600 text-white shadow-sm" : "text-rose-700 hover:bg-rose-50"}`}
						>
							All
						</button>
					</div>
				</div>
			</div>

			{/* Table */}
			<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
				{studentsQuery.isLoading ? (
					<div className="flex justify-center py-12">
						<div className="h-6 w-6 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
					</div>
				) : rows.length === 0 ? (
					<div className="py-14 text-center">
						<HiArchiveBox className="mx-auto h-8 w-8 text-gray-300" />
						<p className="mt-2 text-sm text-gray-400">No dropped students found.</p>
					</div>
				) : (
					<>
						<div className="overflow-x-auto">
							<table className="min-w-full border-collapse text-sm">
								<thead>
									<tr className="border-b border-gray-100 bg-gray-50/80">
										<th className="py-2.5 pl-5 pr-4 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Student</th>
										<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Dropped On</th>
										<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Drop Reason</th>
										<th className="px-4 py-2.5 pr-5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400" />
									</tr>
								</thead>
								<tbody>
									{rows.map((s) => (
										<tr key={s.id} className="border-b border-gray-100 transition-colors hover:bg-slate-50">
											<td className="py-3.5 pl-5 pr-4">
												<div className="flex items-center gap-3 min-w-0">
													<div className={`h-8 w-8 shrink-0 rounded-full ${getAvatarColor(s.id)} flex items-center justify-center text-xs font-bold text-white`}>
														{(s.name ?? s.zid)[0]?.toUpperCase()}
													</div>
													<div className="min-w-0">
														<Link to={`/students/${s.id}`} className="block font-bold text-teal-700 hover:underline text-sm leading-tight">
															{s.zid.toUpperCase()}
														</Link>
														{s.name ? <p className="text-xs text-gray-500 truncate leading-snug">{s.name}</p> : null}
														{s.phone ? <p className="text-[11px] text-gray-400 leading-snug">{s.phone}</p> : null}
													</div>
												</div>
											</td>
											<td className="px-4 py-3.5">
												<span className="text-sm text-gray-700">{fmtDate(s.updatedAt)}</span>
											</td>
											<td className="px-4 py-3.5">
												{s.dropReason ? (
													<div className="flex items-start gap-2 max-w-xs">
														<p className="flex-1 text-sm text-gray-700 line-clamp-2">{s.dropReason}</p>
														{s.dropReason.length > 50 ? (
															<button
																type="button"
																onClick={() => setViewingReason(s)}
																className="mt-0.5 shrink-0 rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-500 hover:bg-gray-50"
															>
																More
															</button>
														) : null}
													</div>
												) : (
													<span className="text-xs text-gray-400">—</span>
												)}
											</td>
											<td className="px-4 py-3.5 pr-5">
												<Link
													to={`/students/${s.id}`}
													className="inline-flex items-center rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
												>
													View
												</Link>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
							<p className="text-xs text-gray-400">
								{totalCount > 0 ? `${(page - 1) * limit + 1}–${Math.min(page * limit, totalCount)} of ${totalCount}` : "0 results"}
							</p>
							<div className="flex items-center gap-2">
								<select value={String(limit)} onChange={(e) => setQueryParam("limit", e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs">
									<option value="25">25 / page</option>
									<option value="50">50 / page</option>
									<option value="100">100 / page</option>
								</select>
								<button onClick={() => setQueryParam("page", String(Math.max(1, page - 1)))} disabled={page <= 1} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium disabled:opacity-40 hover:bg-gray-50">Prev</button>
								<button onClick={() => setQueryParam("page", String(page + 1))} disabled={page >= totalPages} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium disabled:opacity-40 hover:bg-gray-50">Next</button>
							</div>
						</div>
					</>
				)}
			</div>

			{/* Full drop reason modal */}
			{viewingReason ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
						<div className="border-b border-gray-100 px-5 py-4">
							<div className="flex items-center gap-2">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100">
									<HiArchiveBox className="h-4 w-4 text-rose-600" />
								</div>
								<div>
									<p className="text-sm font-bold text-gray-900">Drop Reason</p>
									<p className="text-xs text-gray-500">
										{viewingReason.name ?? viewingReason.zid.toUpperCase()}
										{viewingReason.updatedAt ? ` · ${fmtDate(viewingReason.updatedAt)}` : ""}
									</p>
								</div>
							</div>
						</div>
						<div className="px-5 py-4">
							<p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
								{viewingReason.dropReason ?? "No reason provided."}
							</p>
						</div>
						<div className="flex justify-end border-t border-gray-100 px-5 py-4">
							<button
								type="button"
								onClick={() => setViewingReason(null)}
								className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
};
