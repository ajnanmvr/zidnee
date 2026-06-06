import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { HiCheckCircle } from "react-icons/hi2";
import { useSession } from "@/lib/session";
import { useDueLeadFollowUpsQuery } from "@/features/leads/leads.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useHasPermission } from "@/lib/hooks/use-has-permission";

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

function ordinal(n: number): string {
	if (n === 1) return "1st";
	if (n === 2) return "2nd";
	if (n === 3) return "3rd";
	return `${n}th`;
}

export const CompletedDemosPage = () => {
	const { token } = useSession();
	const [searchParams, setSearchParams] = useSearchParams();
	const searchTerm = searchParams.get("search") ?? "";
	const page = Number(searchParams.get("page") ?? "1");
	const limit = Number(searchParams.get("limit") ?? "25");
	const scope = (searchParams.get("scope") ?? "mine") as "mine" | "all";

	const canReadAll = useHasPermission("LEAD_READ_ALL");

	const setQueryParam = (key: string, value?: string) => {
		const next = new URLSearchParams(searchParams);
		if (value) next.set(key, value);
		else next.delete(key);
		setSearchParams(next);
	};

	const leadsQuery = useDueLeadFollowUpsQuery(token, {
		scope: canReadAll ? scope : "mine",
		status: "DEMO_COMPLETED",
		search: searchTerm || undefined,
		sortBy: "updatedAt",
		sortOrder: "desc",
		page,
		limit,
	});

	const usersQuery = useUsersQuery(token, Boolean(token));

	const userNameById = useMemo(() => {
		const users = (usersQuery.data?.users ?? []) as any[];
		return new Map(users.map((u) => [u.id, u.name || u.username]));
	}, [usersQuery.data]);

	const rows = (leadsQuery.data?.leads ?? []) as any[];
	const pagination = (leadsQuery.data as any)?.pagination;
	const totalPages = pagination?.totalPages ?? 1;
	const totalCount = pagination?.total ?? rows.length;

	const activeScope: "mine" | "all" = canReadAll ? scope : "mine";

	return (
		<div className="space-y-3">
			{/* Page header */}
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
						<HiCheckCircle className="h-5 w-5 text-blue-600" />
					</div>
					<div>
						<h1 className="text-lg font-bold text-gray-900">Completed Demos</h1>
						<p className="mt-0.5 text-sm text-gray-500">
							{totalCount > 0 ? `${totalCount} demo${totalCount !== 1 ? "s" : ""}` : "No completed demos"} · Demo marked as done
						</p>
					</div>
				</div>
				<div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
					<button
						type="button"
						onClick={() => { setQueryParam("scope", "mine"); setQueryParam("page", undefined); }}
						className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${activeScope === "mine" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
					>
						Mine
					</button>
					<button
						type="button"
						onClick={() => { setQueryParam("scope", "all"); setQueryParam("page", undefined); }}
						disabled={!canReadAll}
						className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition disabled:opacity-40 ${activeScope === "all" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
					>
						All
					</button>
				</div>
			</div>

			{/* Search toolbar */}
			<div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3">
				<input
					value={searchTerm}
					onChange={(e) => { setQueryParam("search", e.target.value); setQueryParam("page", undefined); }}
					placeholder="Search by name or phone…"
					className="w-64 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
				/>
				{searchTerm ? (
					<button
						type="button"
						onClick={() => setQueryParam("search", undefined)}
						className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50"
					>
						Clear
					</button>
				) : null}
			</div>

			{/* Table */}
			<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
				{leadsQuery.isLoading ? (
					<div className="flex justify-center py-16">
						<div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
					</div>
				) : rows.length === 0 ? (
					<div className="py-16 text-center">
						<HiCheckCircle className="mx-auto h-10 w-10 text-gray-200" />
						<p className="mt-2 text-sm text-gray-400">No completed demos found.</p>
					</div>
				) : (
					<>
						<div className="overflow-x-auto">
							<table className="min-w-full border-collapse text-sm">
								<thead>
									<tr className="border-b border-gray-100 bg-gray-50/80">
										<th className="py-2.5 pl-5 pr-4 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Lead</th>
										<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Level</th>
										<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Mentor</th>
										<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Attempt</th>
										<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Completed</th>
										<th className="px-4 py-2.5 pr-5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400"></th>
									</tr>
								</thead>
								<tbody>
									{rows.map((lead: any) => {
										const latestDemo = lead.demos?.[(lead.demos?.length ?? 0) - 1];
										const mentorName = latestDemo?.mentorId
											? (userNameById.get(latestDemo.mentorId) ?? "—")
											: "—";
										const completedAt = latestDemo?.completedAt ?? lead.updatedAt;
										const attemptNum = Math.max(1, lead.demos?.length ?? 1);

										return (
											<tr key={lead.id} className="border-b border-gray-100 transition-colors hover:bg-slate-50">
												{/* Lead */}
												<td className="border-l-[3px] border-l-blue-300 py-3.5 pl-3 pr-6">
													<div className="flex items-center gap-3 min-w-0">
														<div className="h-8 w-8 shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
															{(lead.name ?? lead.phone ?? "?")[0]?.toUpperCase()}
														</div>
														<div className="min-w-0">
															<Link
																to={`/leads/${lead.id}`}
																className="block font-bold text-blue-600 hover:underline text-sm leading-tight"
															>
																{lead.phone}
															</Link>
															{lead.name ? (
																<p className="text-[11px] text-gray-500 truncate leading-snug">{lead.name}</p>
															) : null}
														</div>
													</div>
												</td>

												{/* Level */}
												<td className="px-4 py-3.5">
													<span className="text-sm font-medium text-gray-700">{lead.level ?? "—"}</span>
												</td>

												{/* Mentor */}
												<td className="px-4 py-3.5">
													<span className="text-sm text-gray-700">{mentorName}</span>
												</td>

												{/* Attempt */}
												<td className="px-4 py-3.5">
													<span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
														{ordinal(attemptNum)} demo
													</span>
												</td>

												{/* Completed At */}
												<td className="px-4 py-3.5">
													<div className="flex flex-col gap-0.5">
														<span className="text-sm font-medium text-gray-800">{fmtDate(completedAt)}</span>
														{completedAt ? (
															<span className="text-[11px] text-gray-400">{fmtRelative(completedAt)}</span>
														) : null}
													</div>
												</td>

												{/* View */}
												<td className="px-4 py-3.5 pr-5">
													<Link
														to={`/leads/${lead.id}`}
														className="inline-flex items-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
													>
														View Lead
													</Link>
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

export default CompletedDemosPage;
