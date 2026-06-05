import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "@/lib/session";
import { useDueLeadFollowUpsQuery } from "@/features/leads/leads.queries";
import { useHasPermission } from "@/lib/hooks/use-has-permission";

const fmt = (v?: string | null) => {
	if (!v) return "—";
	return new Date(v).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
};

export const ClosedLeadsPage = () => {
	const { token } = useSession();
	const canReadAll = useHasPermission("LEAD_READ_ALL");
	const [scope, setScope] = useState<"mine" | "all">(canReadAll ? "all" : "mine");
	const [search, setSearch] = useState("");

	const leadsQuery = useDueLeadFollowUpsQuery(token, {
		scope,
		timeFilter: "all",
		status: "CLOSED",
		page: 1,
		limit: 200,
		enabled: true,
	});

	const all = useMemo(() => leadsQuery.data?.leads ?? [], [leadsQuery.data]);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return all;
		return all.filter((l) =>
			[l.name ?? "", l.phone, l.slNo ? String(l.slNo) : ""].join(" ").toLowerCase().includes(q)
		);
	}, [all, search]);

	return (
		<div className="space-y-4">
			{/* Toolbar */}
			<div className="flex flex-wrap items-center gap-2">
				{canReadAll ? (
					<>
						<button type="button" onClick={() => setScope("mine")} className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${scope === "mine" ? "bg-rose-600 text-white" : "border border-gray-200 bg-white text-gray-600 hover:border-rose-300 hover:text-rose-700"}`}>Mine</button>
						<button type="button" onClick={() => setScope("all")} className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${scope === "all" ? "bg-rose-600 text-white" : "border border-gray-200 bg-white text-gray-600 hover:border-rose-300 hover:text-rose-700"}`}>All</button>
					</>
				) : null}
				<input
					type="text"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search by name or phone…"
					className="ml-auto w-60 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-gray-400"
				/>
			</div>

			{/* Table */}
			<div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
				{leadsQuery.isLoading ? (
					<p className="py-10 text-center text-sm text-gray-400">Loading…</p>
				) : filtered.length === 0 ? (
					<p className="py-10 text-center text-sm text-gray-400">No deleted leads found.</p>
				) : (
					<>
						<table className="min-w-full text-sm">
							<thead className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
								<tr>
									<th className="px-4 py-2.5">#</th>
									<th className="px-4 py-2.5">Lead</th>
									<th className="px-4 py-2.5 hidden sm:table-cell">Reason</th>
									<th className="px-4 py-2.5 hidden md:table-cell">Deleted by</th>
									<th className="px-4 py-2.5 hidden md:table-cell">Date</th>
									<th className="px-4 py-2.5" />
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100">
								{filtered.map((lead) => (
									<tr key={lead.id} className="hover:bg-gray-50/60">
										<td className="px-4 py-3 text-xs text-gray-400">{lead.slNo ? `#${lead.slNo}` : "—"}</td>
										<td className="px-4 py-3">
											<Link to={`/leads/${lead.id}`} className="font-medium text-gray-800 hover:text-blue-700">{lead.name ?? "—"}</Link>
											<p className="text-xs text-gray-400">{lead.phone}</p>
										</td>
										<td className="px-4 py-3 hidden sm:table-cell">
											<span className="text-xs text-gray-600">{(lead as any).closeReason ?? "—"}</span>
										</td>
										<td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">{(lead as any).deletedBy ?? "—"}</td>
										<td className="px-4 py-3 hidden md:table-cell text-xs text-gray-400">{fmt((lead as any).deletedAt)}</td>
										<td className="px-4 py-3 text-right">
											<Link to={`/leads/${lead.id}`} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:border-gray-300">View</Link>
										</td>
									</tr>
								))}
							</tbody>
						</table>
						<div className="border-t border-gray-100 px-4 py-3">
							<p className="text-xs text-gray-400">{filtered.length} deleted lead{filtered.length !== 1 ? "s" : ""}{all.length !== filtered.length ? ` (${all.length} total)` : ""}</p>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default ClosedLeadsPage;
