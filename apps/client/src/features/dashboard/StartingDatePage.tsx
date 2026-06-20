import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { HiCalendarDays, HiMagnifyingGlass, HiRocketLaunch } from "react-icons/hi2";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useHasPermission } from "@/lib/hooks/use-has-permission";
import { useSession } from "@/lib/session";

type StartUrgency = "overdue" | "today" | "soon" | "upcoming" | "unknown";

function getStartUrgency(dateStr?: string | null): StartUrgency {
	if (!dateStr) return "unknown";
	const d = new Date(dateStr);
	if (Number.isNaN(d.getTime())) return "unknown";
	const msLeft = d.getTime() - Date.now();
	if (msLeft < 0) return "overdue";
	if (msLeft < 2 * 24 * 60 * 60 * 1000) return "today";
	if (msLeft < 7 * 24 * 60 * 60 * 1000) return "soon";
	return "upcoming";
}

const URGENCY_META: Record<StartUrgency, { label: string; badgeClass: string; textClass: string }> = {
	overdue: { label: "Overdue", badgeClass: "bg-red-100 text-red-700", textClass: "text-red-700" },
	today: { label: "Today / Tomorrow", badgeClass: "bg-orange-100 text-orange-700", textClass: "text-orange-600" },
	soon: { label: "This week", badgeClass: "bg-amber-100 text-amber-700", textClass: "text-amber-600" },
	upcoming: { label: "Upcoming", badgeClass: "bg-emerald-100 text-emerald-700", textClass: "text-emerald-700" },
	unknown: { label: "Not set", badgeClass: "bg-gray-100 text-gray-500", textClass: "text-gray-400" },
};

const AVATAR_COLORS = [
	"bg-teal-500", "bg-blue-500", "bg-violet-500", "bg-rose-500",
	"bg-amber-500", "bg-emerald-500", "bg-cyan-500", "bg-indigo-500",
];
function getAvatarColor(id: string) {
	let h = 0;
	for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
	return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length] ?? "bg-teal-500";
}

function fmtDate(val?: string | null): string {
	if (!val) return "—";
	const d = new Date(val);
	if (Number.isNaN(d.getTime())) return "—";
	return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export const StartingDatePage = () => {
	const { token } = useSession();
	const [searchParams, setSearchParams] = useSearchParams();
	const searchTerm = searchParams.get("search") ?? "";
	const requestedScope = (searchParams.get("scope") ?? "mine") as "mine" | "all";
	const canViewMine = useHasPermission("STUDENT_STARTING_DATE_READ");
	const canReadAll = useHasPermission("STUDENT_READ_ALL");
	const canToggleScope = canViewMine && canReadAll;
	const activeScope: "mine" | "all" = canReadAll && requestedScope === "all" ? "all" : "mine";

	const studentsQuery = useStudentsQuery(token, {
		scope: activeScope,
		status: "STUDENT",
		limit: 500,
	});
	const usersQuery = useUsersQuery(token);

	const mentorNameById = useMemo(() => {
		const map: Record<string, string> = {};
		(usersQuery.data?.users ?? []).forEach((u) => { map[u.id] = u.name ?? u.username ?? "Unknown"; });
		return map;
	}, [usersQuery.data?.users]);

	const rows = useMemo(() => {
		const q = searchTerm.trim().toLowerCase();
		const students = (studentsQuery.data?.students ?? []) as Array<{
			id: string; zid: string; name?: string | null; phone: string; mentorId?: string | null;
			classStartConfirmedAt?: string | null;
		}>;
		return students
			.filter((s) => {
				if (q && !`${s.name ?? ""} ${s.zid} ${s.phone}`.toLowerCase().includes(q)) return false;
				return true;
			})
			.map((s) => ({ ...s, urgency: getStartUrgency(s.classStartConfirmedAt) }))
			.sort((a, b) => {
				const order: StartUrgency[] = ["overdue", "today", "soon", "upcoming", "unknown"];
				const ai = order.indexOf(a.urgency);
				const bi = order.indexOf(b.urgency);
				if (ai !== bi) return ai - bi;
				const da = a.classStartConfirmedAt ? new Date(a.classStartConfirmedAt).getTime() : Number.MAX_SAFE_INTEGER;
				const db = b.classStartConfirmedAt ? new Date(b.classStartConfirmedAt).getTime() : Number.MAX_SAFE_INTEGER;
				return da - db;
			});
	}, [studentsQuery.data?.students, searchTerm]);

	const overdueCount = rows.filter((s) => s.urgency === "overdue").length;
	const todayCount = rows.filter((s) => s.urgency === "today").length;

	const setQueryParam = (key: string, value?: string) => {
		const next = new URLSearchParams(searchParams);
		if (value) next.set(key, value); else next.delete(key);
		setSearchParams(next);
	};

	const setScope = (scope: "mine" | "all") => {
		const next = new URLSearchParams(searchParams);
		if (scope === "mine") next.delete("scope"); else next.set("scope", scope);
		setSearchParams(next);
	};

	return (
		<div className="space-y-3">
			{/* Page header */}
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-200">
						<HiRocketLaunch className="h-5 w-5 text-blue-700" />
					</div>
					<div>
						<p className="text-base font-bold text-blue-900">Starting Date Monitor</p>
						<p className="text-xs text-blue-700">
							{rows.length} active student{rows.length !== 1 ? "s" : ""}
							{overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}
							{todayCount > 0 ? ` · ${todayCount} starting today/tomorrow` : ""}
						</p>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<div className="relative">
						<HiMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />
						<input
							value={searchTerm}
							onChange={(e) => setQueryParam("search", e.target.value)}
							placeholder="Search by name, phone, ZID…"
							className="w-52 rounded-xl border border-blue-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
						/>
					</div>
					{canToggleScope ? (
						<div className="flex items-center gap-1 rounded-xl border border-blue-200 bg-white p-1">
							<button
								type="button"
								onClick={() => setScope("mine")}
								className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${activeScope === "mine" ? "bg-blue-500 text-white shadow-sm" : "text-blue-700 hover:bg-blue-50"}`}
							>
								Mine
							</button>
							<button
								type="button"
								onClick={() => setScope("all")}
								className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${activeScope === "all" ? "bg-blue-500 text-white shadow-sm" : "text-blue-700 hover:bg-blue-50"}`}
							>
								All
							</button>
						</div>
					) : null}
				</div>
			</div>

			{/* Table */}
			<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
				{studentsQuery.isLoading ? (
					<div className="flex justify-center py-12">
						<div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
					</div>
				) : rows.length === 0 ? (
					<div className="py-14 text-center">
						<HiCalendarDays className="mx-auto h-8 w-8 text-gray-300" />
						<p className="mt-2 text-sm text-gray-400">No active students found.</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="min-w-full border-collapse text-sm">
							<thead>
								<tr className="border-b border-gray-100 bg-gray-50/80">
									<th className="py-2.5 pl-5 pr-4 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Student</th>
									<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Mentor</th>
									<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Starting Date</th>
									<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Status</th>
								</tr>
							</thead>
							<tbody>
								{rows.map((s) => {
									const meta = URGENCY_META[s.urgency];
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
												<span className={`text-sm font-medium ${meta.textClass}`}>
													{fmtDate(s.classStartConfirmedAt)}
												</span>
											</td>
											<td className="px-4 py-3.5">
												<span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.badgeClass}`}>
													{meta.label}
												</span>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
};
