import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { HiArrowUturnLeft, HiCheckCircle } from "react-icons/hi2";
import toast from "react-hot-toast";
import { useSession } from "@/lib/session";
import { useMeQuery } from "@/features/auth/auth.queries";
import { fetchCompletedDemos } from "@/features/leads/leads.service";
import { useUnmarkDemoCompletedMutation } from "@/features/leads/use-lead-mutations";
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
	const requestedScope = (searchParams.get("scope") ?? "mine") as "mine" | "all";

	const canViewMine = useHasPermission("DEMO_COMPLETED_READ_MY");
	const canViewAll = useHasPermission("DEMO_COMPLETED_READ_ALL");
	const canToggleScope = canViewMine && canViewAll;
	const canUnmark = useHasPermission("LEAD_DEMO_COMPLETE");
	const unmarkMutation = useUnmarkDemoCompletedMutation();
	const [confirmingId, setConfirmingId] = useState<string | null>(null);
	const activeScope: "mine" | "all" = canToggleScope
		? requestedScope
		: canViewAll
			? "all"
			: "mine";

	const setQueryParam = (key: string, value?: string) => {
		updateQueryParams({ [key]: value });
	};

	function updateQueryParams(updates: Record<string, string | undefined>) {
		const next = new URLSearchParams(searchParams);
		for (const [key, value] of Object.entries(updates)) {
			if (value) next.set(key, value);
			else next.delete(key);
		}
		setSearchParams(next);
	}

	const meQuery = useMeQuery(token);
	const currentUserId = meQuery.data?.id;

	// Fetch the full set of completed-demo leads (the route's DEMO_SCHEDULED_READ_MY/ALL
	// permissions already gate access) so "mine" can be scoped by who the demo request was
	// assigned to — matching the convention used on the Scheduled/Unassigned demo pages —
	// rather than the lead-ownership-based "mine" that the generic /leads endpoint applies.
	const completedDemosQuery = useQuery({
		queryKey: ["completed-demos", token],
		queryFn: () => fetchCompletedDemos(token ?? ""),
		enabled: Boolean(token),
	});

	const usersQuery = useUsersQuery(token, Boolean(token));

	const userNameById = useMemo(() => {
		const users = (usersQuery.data?.users ?? []) as any[];
		return new Map(users.map((u) => [u.id, u.name || u.username]));
	}, [usersQuery.data]);

	const allCompletedDemos = (completedDemosQuery.data?.leads ?? []) as any[];

	const scopedDemos = useMemo(() => {
		if (activeScope !== "mine") return allCompletedDemos;
		return allCompletedDemos.filter((lead) => lead.demoRequestAssignedTo === currentUserId);
	}, [allCompletedDemos, activeScope, currentUserId]);

	const filteredDemos = useMemo(() => {
		const q = searchTerm.trim().toLowerCase();
		if (!q) return scopedDemos;
		return scopedDemos.filter((lead) =>
			(lead.name ?? "").toLowerCase().includes(q) ||
			(lead.phone ?? "").toLowerCase().includes(q),
		);
	}, [scopedDemos, searchTerm]);

	const totalCount = filteredDemos.length;
	const totalPages = Math.max(1, Math.ceil(totalCount / limit));
	const rows = filteredDemos.slice((page - 1) * limit, page * limit);

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
				{canToggleScope ? (
					<div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
						<button
							type="button"
							onClick={() => updateQueryParams({ scope: "mine", page: undefined })}
							className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${activeScope === "mine" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
						>
							Mine
						</button>
						<button
							type="button"
							onClick={() => updateQueryParams({ scope: "all", page: undefined })}
							className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${activeScope === "all" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
						>
							All
						</button>
					</div>
				) : null}
			</div>

			{/* Search toolbar */}
			<div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3">
				<input
					value={searchTerm}
					onChange={(e) => updateQueryParams({ search: e.target.value, page: undefined })}
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
				{completedDemosQuery.isLoading ? (
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
										<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Sales</th>
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
										const salesName = lead.assignedTo
											? (userNameById.get(lead.assignedTo) ?? "—")
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

												{/* Sales */}
												<td className="px-4 py-3.5">
													<span className="text-sm text-gray-700">{salesName}</span>
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

												{/* Actions */}
												<td className="px-4 py-3.5 pr-5">
													<div className="flex items-center gap-2">
														<Link
															to={`/leads/${lead.id}`}
															className="inline-flex items-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
														>
															View Lead
														</Link>
														{canUnmark ? (
															confirmingId === lead.id ? (
																<div className="flex items-center gap-1">
																	<button
																		type="button"
																		onClick={async () => {
																			try {
																				await unmarkMutation.mutateAsync(lead.id);
																				toast.success("Demo marked as uncompleted");
																				setConfirmingId(null);
																			} catch {
																				toast.error("Failed to revert demo");
																			}
																		}}
																		disabled={unmarkMutation.isPending}
																		className="rounded-xl bg-amber-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
																	>
																		{unmarkMutation.isPending ? "…" : "Confirm"}
																	</button>
																	<button
																		type="button"
																		onClick={() => setConfirmingId(null)}
																		className="rounded-xl border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50"
																	>
																		Cancel
																	</button>
																</div>
															) : (
																<button
																	type="button"
																	onClick={() => setConfirmingId(lead.id)}
																	className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
																>
																	<HiArrowUturnLeft className="h-3 w-3" />
																	Undo
																</button>
															)
														) : null}
													</div>
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
