import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { HiCheckCircle, HiMagnifyingGlass } from "react-icons/hi2";
import { useSession } from "@/lib/session";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useHasPermission } from "@/lib/hooks/use-has-permission";
import { getStudentStatusColor, getStudentStatusLabel } from "@/features/students/student-table";

function fmtDate(val?: string | Date | null): string {
	if (!val) return "—";
	const d = typeof val === "string" ? new Date(val) : val;
	if (Number.isNaN(d.getTime())) return "—";
	return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtRelative(val?: string | Date | null): string {
	if (!val) return "";
	const d = typeof val === "string" ? new Date(val) : val;
	if (Number.isNaN(d.getTime())) return "";
	const diffMs = Date.now() - d.getTime();
	const diffDays = Math.floor(diffMs / 86_400_000);
	if (diffDays === 0) return "Today";
	if (diffDays === 1) return "Yesterday";
	if (diffDays < 30) return `${diffDays}d ago`;
	const diffMonths = Math.floor(diffDays / 30);
	if (diffMonths < 12) return `${diffMonths}mo ago`;
	return `${Math.floor(diffMonths / 12)}y ago`;
}

const AVATAR_COLORS = [
	"bg-teal-500", "bg-blue-500", "bg-violet-500", "bg-rose-500",
	"bg-amber-500", "bg-emerald-500", "bg-cyan-500", "bg-indigo-500",
];
function avatarColor(id: string) {
	let h = 0;
	for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
	return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length] ?? "bg-teal-500";
}

export const ConvertedLeadsPage = () => {
	const { token } = useSession();
	const [searchParams, setSearchParams] = useSearchParams();
	const searchTerm = searchParams.get("search") ?? "";
	const page = Number(searchParams.get("page") ?? "1");
	const limit = Number(searchParams.get("limit") ?? "25");
	const sortBy = searchParams.get("sortBy") ?? "admittedAt";
	const [salesPersonFilter, setSalesPersonFilter] = useState("");

	const canReadAll = useHasPermission("LEAD_READ_ALL") || useHasPermission("LEADS_CONVERTED_READ");
	const [loadAllRequested, setLoadAllRequested] = useState(false);
	const activeScope: "mine" | "all" = loadAllRequested && canReadAll ? "all" : "mine";

	const studentsQuery = useStudentsQuery(token, {
		admittedBy: activeScope === "mine" ? "me" : "all",
		search: searchTerm || undefined,
		sortBy: sortBy === "salesPerson" ? "admittedAt" : sortBy,
		sortOrder: "desc",
		page,
		limit,
	});
	const usersQuery = useUsersQuery(token, Boolean(token));

	const setQueryParam = (key: string, value?: string) => {
		const next = new URLSearchParams(searchParams);
		if (value) next.set(key, value); else next.delete(key);
		setSearchParams(next);
	};

	const userNameById = useMemo(() => {
		const users = usersQuery.data?.users ?? [];
		return new Map((users as any[]).map((u) => [u.id, u.name || u.username]));
	}, [usersQuery.data]);

	const allRows = useMemo(
		() => (studentsQuery.data?.students ?? []) as any[],
		[studentsQuery.data?.students],
	);

	// Client-side search + sales-person filter (server search is primary; this is a failsafe)
	const rows = useMemo(() => {
		let out = allRows;
		if (searchTerm.trim()) {
			const q = searchTerm.trim().toLowerCase();
			out = out.filter((r) =>
				[r.name ?? "", r.phone ?? "", r.zid ?? "", r.email ?? ""].join(" ").toLowerCase().includes(q),
			);
		}
		if (salesPersonFilter) {
			out = out.filter((r) => r.admittedBy === salesPersonFilter);
		}
		if (sortBy === "salesPerson") {
			out = out.slice().sort((a, b) => {
				const nameA = (userNameById.get(a.admittedBy) ?? "") as string;
				const nameB = (userNameById.get(b.admittedBy) ?? "") as string;
				return nameA.localeCompare(nameB);
			});
		}
		return out;
	}, [allRows, searchTerm, salesPersonFilter, sortBy, userNameById]);

	// Build list of unique sales people from loaded rows
	const salesPersonOptions = useMemo(() => {
		const seen = new Set<string>();
		const opts: Array<{ id: string; name: string }> = [];
		allRows.forEach((r) => {
			if (r.admittedBy && !seen.has(r.admittedBy)) {
				seen.add(r.admittedBy);
				opts.push({ id: r.admittedBy, name: (userNameById.get(r.admittedBy) ?? "Unknown") as string });
			}
		});
		return opts.sort((a, b) => a.name.localeCompare(b.name));
	}, [allRows, userNameById]);

	const totalPages = (studentsQuery.data as any)?.pagination?.totalPages ?? 1;
	const totalCount = (studentsQuery.data as any)?.pagination?.total ?? rows.length;

	return (
		<div className="space-y-3">
			{/* Page header */}
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
						<HiCheckCircle className="h-5 w-5 text-emerald-600" />
					</div>
					<div>
						<h1 className="text-lg font-bold text-gray-900">Converted Leads</h1>
						<p className="mt-0.5 text-sm text-gray-500">
							{totalCount > 0 ? `${totalCount} student${totalCount !== 1 ? "s" : ""}` : "No students"} · Leads successfully admitted
						</p>
					</div>
				</div>
				<div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
					<button
						type="button"
						onClick={() => setLoadAllRequested(false)}
						className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${activeScope === "mine" ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
					>
						Mine
					</button>
					<button
						type="button"
						onClick={() => setLoadAllRequested(true)}
						disabled={!canReadAll}
						className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition disabled:opacity-40 ${activeScope === "all" ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
					>
						All
					</button>
				</div>
			</div>

			{/* Search + filter toolbar */}
			<div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3">
				<div className="relative">
					<HiMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
					<input
						value={searchTerm}
						onChange={(e) => {
							const next = new URLSearchParams(searchParams);
							if (e.target.value) next.set("search", e.target.value); else next.delete("search");
							next.delete("page");
							setSearchParams(next);
						}}
						placeholder="Search by name, phone, or ZID…"
						className="w-60 rounded-lg border border-gray-200 py-1.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
					/>
				</div>
				{searchTerm ? (
					<button
						type="button"
						onClick={() => setQueryParam("search", undefined)}
						className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50"
					>
						Clear
					</button>
				) : null}
				{salesPersonOptions.length > 1 ? (
					<select
						value={salesPersonFilter}
						onChange={(e) => setSalesPersonFilter(e.target.value)}
						className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
					>
						<option value="">All sales people</option>
						{salesPersonOptions.map((sp) => (
							<option key={sp.id} value={sp.id}>{sp.name}</option>
						))}
					</select>
				) : null}
				<div className="ml-auto flex items-center gap-2">
					<label className="text-xs font-medium text-gray-500">Sort by</label>
					<select
						value={sortBy}
						onChange={(e) => setQueryParam("sortBy", e.target.value === "admittedAt" ? undefined : e.target.value)}
						className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
					>
						<option value="admittedAt">Converted date</option>
						<option value="name">Name (A-Z)</option>
						<option value="salesPerson">Sales person (A-Z)</option>
					</select>
				</div>
			</div>

			{/* Table */}
			<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
				{studentsQuery.isLoading ? (
					<div className="flex justify-center py-16">
						<div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
					</div>
				) : rows.length === 0 ? (
					<div className="py-16 text-center">
						<HiCheckCircle className="mx-auto h-10 w-10 text-gray-200" />
						<p className="mt-2 text-sm text-gray-400">No converted leads found.</p>
					</div>
				) : (
					<>
						<div className="overflow-x-auto">
							<table className="min-w-full border-collapse text-sm">
								<thead>
									<tr className="border-b border-gray-100 bg-gray-50/80">
										<th className="py-2.5 pl-5 pr-4 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Student</th>
										<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">ZID</th>
										<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Status</th>
										<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Converted At</th>
										<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Converted By</th>
										<th className="px-4 py-2.5 pr-5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Lead</th>
									</tr>
								</thead>
								<tbody>
									{rows.map((s) => {
										const convertedByName = s.admittedBy ? (userNameById.get(s.admittedBy) ?? "—") : "—";
										return (
											<tr key={s.id} className="border-b border-gray-100 transition-colors hover:bg-slate-50">
												{/* Student */}
												<td className="py-3.5 pl-5 pr-4">
													<div className="flex items-center gap-3 min-w-0">
														<div className={`h-8 w-8 shrink-0 rounded-full ${avatarColor(s.id)} flex items-center justify-center text-xs font-bold text-white`}>
															{(s.name ?? s.zid)[0]?.toUpperCase()}
														</div>
														<div className="min-w-0">
															<Link to={`/students/${s.id}`} className="block font-bold text-teal-700 hover:underline text-sm leading-tight">
																{s.name ?? "—"}
															</Link>
															{s.phone ? <p className="text-[11px] text-gray-400 leading-snug">{s.phone}</p> : null}
														</div>
													</div>
												</td>

												{/* ZID */}
												<td className="px-4 py-3.5">
													<span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-700">
														{s.zid?.toUpperCase()}
													</span>
												</td>

												{/* Status */}
												<td className="px-4 py-3.5">
													<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600">
														<span className={`h-1.5 w-1.5 rounded-full ${getStudentStatusColor(s.status)}`} />
														{getStudentStatusLabel(s.status)}
													</span>
												</td>

												{/* Converted At */}
												<td className="px-4 py-3.5">
													<div className="flex flex-col gap-0.5">
														<span className="text-sm font-medium text-gray-800">{fmtDate(s.admittedAt)}</span>
														{s.admittedAt ? (
															<span className="text-[11px] text-gray-400">{fmtRelative(s.admittedAt)}</span>
														) : null}
													</div>
												</td>

												{/* Converted By */}
												<td className="px-4 py-3.5">
													<span className="text-sm text-gray-700">{convertedByName}</span>
												</td>

												{/* Lead link */}
												<td className="px-4 py-3.5 pr-5">
													{s.leadId ? (
														<Link
															to={`/leads/${s.leadId}`}
															className="inline-flex items-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
														>
															View Lead
														</Link>
													) : (
														<span className="text-xs text-gray-400">—</span>
													)}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>

						{/* Pagination */}
						<div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
							<p className="text-xs text-gray-400">
								{totalCount > 0 ? `${(page - 1) * limit + 1}–${Math.min(page * limit, totalCount)} of ${totalCount}` : "0 results"}
							</p>
							<div className="flex items-center gap-2">
								<select
									value={String(limit)}
									onChange={(e) => setQueryParam("limit", e.target.value)}
									className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
								>
									<option value="10">10</option>
									<option value="25">25</option>
									<option value="50">50</option>
									<option value="100">100</option>
								</select>
								<button
									onClick={() => setQueryParam("page", String(Math.max(1, page - 1)))}
									disabled={page <= 1}
									className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium disabled:opacity-40 hover:bg-gray-50"
								>
									Prev
								</button>
								<button
									onClick={() => setQueryParam("page", String(page + 1))}
									disabled={page >= totalPages}
									className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium disabled:opacity-40 hover:bg-gray-50"
								>
									Next
								</button>
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default ConvertedLeadsPage;
