import type { Student } from "@repo/schema";
import { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useUpdateStudentMutation } from "@/features/students/use-update-student-mutation";
import { useUsersQuery } from "@/features/users/users.queries";
import { useHasPermission } from "@/lib/hooks/use-has-permission";
import { useSession } from "@/lib/session";
import { HiCalendarDays, HiArrowRight, HiPauseCircle } from "react-icons/hi2";

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

function toInputDate(val?: Date | string | null): string {
	if (!val) return "";
	const d = val instanceof Date ? val : new Date(val);
	if (Number.isNaN(d.getTime())) return "";
	return d.toISOString().slice(0, 10);
}

type BreakUrgency = "overdue" | "critical" | "warning" | "normal" | "unknown";

function getBreakUrgency(val?: Date | string | null): BreakUrgency {
	if (!val) return "unknown";
	const d = val instanceof Date ? val : new Date(val);
	const msLeft = d.getTime() - Date.now();
	if (msLeft < 0) return "overdue";
	if (msLeft < 3 * 24 * 60 * 60 * 1000) return "critical";
	if (msLeft < 7 * 24 * 60 * 60 * 1000) return "warning";
	return "normal";
}


export const BreakStudentsPage = () => {
	const { token } = useSession();
	const [searchParams, setSearchParams] = useSearchParams();
	const searchTerm = searchParams.get("search") ?? "";
	const page = Number(searchParams.get("page") ?? "1");
	const limit = Number(searchParams.get("limit") ?? "25");
	const [loadAllRequested, setLoadAllRequested] = useState(false);
	const canReadAll = useHasPermission("STUDENT_READ_ALL");
	const canUpdate = useHasPermission("STUDENT_UPDATE");
	const activeScope: "mine" | "all" = loadAllRequested && canReadAll ? "all" : "mine";

	const studentsQuery = useStudentsQuery(token, {
		scope: activeScope,
		status: "BREAK",
		search: searchTerm || undefined,
		page,
		limit,
	});
	const usersQuery = useUsersQuery(token);
	const updateMutation = useUpdateStudentMutation();

	const [extendStudent, setExtendStudent] = useState<StudentRow | null>(null);
	const [extendDate, setExtendDate] = useState("");

	const setQueryParam = (key: string, value?: string) => {
		const next = new URLSearchParams(searchParams);
		if (value) next.set(key, value); else next.delete(key);
		setSearchParams(next);
	};

	const openExtend = (s: StudentRow) => {
		setExtendStudent(s);
		setExtendDate(toInputDate(s.inactiveUntil) || toInputDate(new Date()));
	};

	const handleExtend = async () => {
		if (!extendStudent || !extendDate) return;
		try {
			await updateMutation.mutateAsync({
				studentId: extendStudent.id,
				payload: { inactiveUntil: new Date(extendDate) },
			});
			toast.success("Break extended.");
			setExtendStudent(null);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to extend break");
		}
	};

	const mentorNameById = useMemo(() => {
		const map: Record<string, string> = {};
		(usersQuery.data?.users ?? []).forEach((u) => { map[u.id] = u.name ?? u.username ?? "Unknown"; });
		return map;
	}, [usersQuery.data?.users]);

	const rows = useMemo(
		() =>
			(studentsQuery.data?.students ?? []).map((s) => ({
				...s,
				inactiveFrom: s.inactiveFrom ? new Date(s.inactiveFrom) : undefined,
				inactiveUntil: s.inactiveUntil ? new Date(s.inactiveUntil) : undefined,
			})) as unknown as StudentRow[],
		[studentsQuery.data?.students],
	);

	const overdueCount = rows.filter((s) => getBreakUrgency(s.inactiveUntil) === "overdue").length;
	const criticalCount = rows.filter((s) => getBreakUrgency(s.inactiveUntil) === "critical").length;
	const totalPages = (studentsQuery.data as any)?.pagination?.totalPages ?? 1;
	const totalCount = (studentsQuery.data as any)?.pagination?.total ?? rows.length;

	return (
		<div className="space-y-3">
			{/* Page header */}
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-200">
						<HiPauseCircle className="h-5 w-5 text-amber-700" />
					</div>
					<div>
						<p className="text-base font-bold text-amber-900">Students on Break</p>
						<p className="text-xs text-amber-700">
							{totalCount} student{totalCount !== 1 ? "s" : ""}
							{overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}
							{criticalCount > 0 ? ` · ${criticalCount} ending soon` : ""}
						</p>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<input
						value={searchTerm}
						onChange={(e) => setQueryParam("search", e.target.value)}
						placeholder="Search by name, phone, ZID…"
						className="w-52 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
					/>
					<div className="flex items-center gap-1 rounded-xl border border-amber-200 bg-white p-1">
						<button
							type="button"
							onClick={() => setLoadAllRequested(false)}
							className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${activeScope === "mine" ? "bg-amber-500 text-white shadow-sm" : "text-amber-700 hover:bg-amber-50"}`}
						>
							Mine
						</button>
						<button
							type="button"
							onClick={() => setLoadAllRequested(true)}
							disabled={!canReadAll}
							className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:opacity-40 ${activeScope === "all" ? "bg-amber-500 text-white shadow-sm" : "text-amber-700 hover:bg-amber-50"}`}
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
						<div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
					</div>
				) : rows.length === 0 ? (
					<div className="py-14 text-center">
						<HiPauseCircle className="mx-auto h-8 w-8 text-gray-300" />
						<p className="mt-2 text-sm text-gray-400">No students currently on break.</p>
					</div>
				) : (
					<>
						<div className="overflow-x-auto">
							<table className="min-w-full border-collapse text-sm">
								<thead>
									<tr className="border-b border-gray-100 bg-gray-50/80">
										<th className="py-2.5 pl-5 pr-4 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Student</th>
										<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Mentor</th>
										<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Break From</th>
										<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Break Until</th>
										{canUpdate ? <th className="px-4 py-2.5 pr-5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400" /> : null}
									</tr>
								</thead>
								<tbody>
									{rows.map((s) => {
										const urgency = getBreakUrgency(s.inactiveUntil);
										const dateColor = urgency === "overdue" ? "text-red-700" : urgency === "critical" ? "text-orange-600" : urgency === "warning" ? "text-amber-600" : "text-gray-700";
										const mentor = s.mentorId ? (mentorNameById[s.mentorId] ?? null) : null;
										return (
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
													{mentor
														? <span className="text-sm text-gray-700">{mentor}</span>
														: <span className="text-xs text-gray-400">—</span>}
												</td>
												<td className="px-4 py-3.5">
													<span className="text-sm text-gray-700">{fmtDate(s.inactiveFrom)}</span>
												</td>
												<td className="px-4 py-3.5">
													<div className="flex flex-col gap-0.5">
														<span className={`text-sm font-medium ${dateColor}`}>
															{fmtDate(s.inactiveUntil)}
														</span>
														{urgency === "overdue" && s.inactiveUntil ? (
															<span className="inline-flex w-fit rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">Overdue</span>
														) : urgency === "critical" ? (
															<span className="inline-flex w-fit rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">Ends soon · &lt;3 days</span>
														) : urgency === "warning" ? (
															<span className="inline-flex w-fit rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">Ending this week</span>
														) : !s.inactiveUntil ? (
															<span className="inline-flex w-fit rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-400">No end date</span>
														) : null}
													</div>
												</td>
												{canUpdate ? (
													<td className="px-4 py-3.5 pr-5">
														<button
															type="button"
															onClick={() => openExtend(s)}
															className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
														>
															<HiCalendarDays className="h-3.5 w-3.5" />
															Extend
														</button>
													</td>
												) : null}
											</tr>
										);
									})}
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

			{/* Extend break modal */}
			{extendStudent ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
						<div className="border-b border-gray-100 px-5 py-4">
							<div className="flex items-center gap-2">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
									<HiCalendarDays className="h-4 w-4 text-amber-600" />
								</div>
								<div>
									<p className="text-sm font-bold text-gray-900">Extend Break</p>
									<p className="text-xs text-gray-500">{extendStudent.name ?? extendStudent.zid.toUpperCase()}</p>
								</div>
							</div>
						</div>
						<div className="space-y-4 px-5 py-4">
							<div className="grid grid-cols-2 gap-3">
								<div className="rounded-xl bg-gray-50 px-3 py-2.5">
									<p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Break Started</p>
									<p className="mt-1 text-sm font-semibold text-gray-800">{fmtDate(extendStudent.inactiveFrom)}</p>
								</div>
								<div className="rounded-xl bg-amber-50 px-3 py-2.5">
									<p className="text-[10px] font-bold uppercase tracking-wide text-amber-500">Current End</p>
									<p className="mt-1 text-sm font-semibold text-amber-800">{fmtDate(extendStudent.inactiveUntil)}</p>
								</div>
							</div>
							<div>
								<label className="mb-1.5 block text-sm font-semibold text-gray-700">New end date</label>
								<input
									type="date"
									value={extendDate}
									onChange={(e) => setExtendDate(e.target.value)}
									min={toInputDate(new Date())}
									className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
								/>
							</div>
						</div>
						<div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
							<button
								type="button"
								onClick={() => setExtendStudent(null)}
								className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={() => void handleExtend()}
								disabled={!extendDate || updateMutation.isPending}
								className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
							>
								<HiArrowRight className="h-4 w-4" />
								{updateMutation.isPending ? "Saving…" : "Extend Break"}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
};
