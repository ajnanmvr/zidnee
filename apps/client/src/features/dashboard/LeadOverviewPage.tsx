import { useMemo, useState } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { useDueLeadFollowUpsQuery } from "@/features/leads/leads.queries";
import { useSalesUsersQuery } from "@/features/users/users.queries";
import { useSession } from "@/lib/session";
import { useHasPermission } from "@/lib/hooks/use-has-permission";

type TimeScope = "today" | "last3days" | "thisWeek" | "currentMonth" | "previousMonth" | "last3months" | "last6months" | "currentYear" | "custom" | "all";

type PeriodRange = { start: Date; end: Date; label: string };

const getMonthName = (i: number) => new Date(2000, i, 1).toLocaleString("en-US", { month: "short" });
const getMonthFull = (i: number) => new Date(2000, i, 1).toLocaleString("en-US", { month: "long" });

const toDate = (v?: string | null) => {
	if (!v) return null;
	const d = new Date(v);
	return Number.isNaN(d.getTime()) ? null : d;
};

const monthRange = (year: number, month: number): PeriodRange => ({
	start: new Date(year, month, 1, 0, 0, 0, 0),
	end: new Date(year, month + 1, 0, 23, 59, 59, 999),
	label: `${getMonthFull(month)} ${year}`,
});

const startOfWeek = (d: Date): Date => {
	const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
	const dayIndex = (date.getDay() + 6) % 7; // Monday = 0
	date.setDate(date.getDate() - dayIndex);
	return date;
};

const weekRange = (anyDayInWeek: Date): PeriodRange => {
	const start = startOfWeek(anyDayInWeek);
	const end = new Date(start);
	end.setDate(end.getDate() + 6);
	end.setHours(23, 59, 59, 999);
	const sameMonth = start.getMonth() === end.getMonth();
	const label = sameMonth
		? `${start.getDate()}–${end.getDate()} ${getMonthName(start.getMonth())}`
		: `${start.getDate()} ${getMonthName(start.getMonth())} – ${end.getDate()} ${getMonthName(end.getMonth())}`;
	return { start: new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0), end, label };
};

const nthMonthsAgo = (n: number): PeriodRange => {
	const now = new Date();
	const start = new Date(now.getFullYear(), now.getMonth() - n + 1, 1);
	const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
	return { start, end, label: `Last ${n} months` };
};

const prevMonth = (r: PeriodRange): PeriodRange => {
	const m = r.start.getMonth();
	const y = r.start.getFullYear();
	return monthRange(m === 0 ? y - 1 : y, m === 0 ? 11 : m - 1);
};

const pct = (v: number) => `${v.toFixed(1)}%`;

const delta = (cur: number, prev: number): { label: string; positive: boolean; neutral: boolean } => {
	if (prev === 0) {
		if (cur === 0) return { label: "—", positive: false, neutral: true };
		return { label: "New", positive: true, neutral: false };
	}
	const ch = ((cur - prev) / prev) * 100;
	return {
		label: `${ch > 0 ? "+" : ""}${ch.toFixed(1)}%`,
		positive: ch >= 0,
		neutral: false,
	};
};

const STAGE_COLORS: Record<string, string> = {
	FOLLOW_UP: "#6366f1",
	FORM_SENT: "#f59e0b",
	FORM_FILLED: "#06b6d4",
	DEMO_REQUEST: "#f97316",
	DEMO_ASSIGNED: "#10b981",
	DEMO_COMPLETED: "#8b5cf6",
	CONVERTED: "#22c55e",
	CLOSED: "#94a3b8",
};

const STAGE_LABELS: Record<string, string> = {
	FOLLOW_UP: "Follow Up",
	FORM_SENT: "Form Sent",
	FORM_FILLED: "Form Filled",
	DEMO_REQUEST: "Demo Request",
	DEMO_ASSIGNED: "Demo Assigned",
	DEMO_COMPLETED: "Demo Completed",
	CONVERTED: "Converted",
	CLOSED: "Deleted",
};

const PIPELINE_ORDER = [
	"FOLLOW_UP","FORM_SENT","FORM_FILLED","DEMO_REQUEST","DEMO_ASSIGNED","DEMO_COMPLETED",
];

const TIME_PRESETS: { id: TimeScope; label: string; hint: string }[] = [
	{ id: "today", label: "Today", hint: "Leads created today" },
	{ id: "last3days", label: "Last 3 Days", hint: "Rolling 3-day window" },
	{ id: "thisWeek", label: "This Week", hint: "Current Mon–Sun week" },
	{ id: "currentMonth", label: "This Month", hint: "Current calendar month" },
	{ id: "previousMonth", label: "Last Month", hint: "Previous calendar month" },
	{ id: "last3months", label: "Last 3 Months", hint: "Rolling 3-month window" },
	{ id: "last6months", label: "Last 6 Months", hint: "Rolling 6-month window" },
	{ id: "currentYear", label: "This Year", hint: "Current calendar year" },
	{ id: "custom", label: "Custom", hint: "Pick a date & time range" },
	{ id: "all", label: "All Time", hint: "Every lead on record" },
];

const CustomTooltip = ({ active, payload, label }: any) => {
	if (!active || !payload?.length) return null;
	return (
		<div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-lg text-xs">
			<p className="mb-1.5 font-semibold text-gray-700">{label}</p>
			{payload.map((p: any) => (
				<p key={p.name} style={{ color: p.color ?? p.fill }} className="flex items-center gap-2">
					<span className="font-medium">{p.name}:</span>
					<span className="font-bold">{p.value}</span>
				</p>
			))}
		</div>
	);
};

export const LeadOverviewPage = () => {
	const { token } = useSession();
	const canReadAll = useHasPermission("LEAD_READ_ALL");
	const canSeeSalesUsers = useHasPermission("SALES_READ") || useHasPermission("SALES_USERS_READ")
		|| useHasPermission("LEADS_OVERVIEW_READ") || useHasPermission("LEAD_ASSIGN");
	const [scope, setScope] = useState<"mine" | "all">("mine");
	const [timeScope, setTimeScope] = useState<TimeScope>("currentMonth");
	const [trendGranularity, setTrendGranularity] = useState<"weekly" | "monthly">("monthly");
	const [selectedSalesUserId, setSelectedSalesUserId] = useState<string>("");
	const now = useMemo(() => new Date(), []);

	const toDatetimeLocal = (d: Date) => {
		const p = (n: number) => String(n).padStart(2, "0");
		return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
	};

	const [customFrom, setCustomFrom] = useState(() =>
		toDatetimeLocal(new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)),
	);
	const [customTo, setCustomTo] = useState(() => toDatetimeLocal(now));
	// Draft values bound to the inputs — only flow into customFrom/customTo (and
	// thus the actual filter) once the user clicks Apply.
	const [customFromDraft, setCustomFromDraft] = useState(customFrom);
	const [customToDraft, setCustomToDraft] = useState(customTo);
	const customRangeDirty = customFromDraft !== customFrom || customToDraft !== customTo;

	const salesUsersQuery = useSalesUsersQuery(token, canReadAll && canSeeSalesUsers);
	const salesUsers = salesUsersQuery.data?.users ?? [];

	const leadsQuery = useDueLeadFollowUpsQuery(token, {
		scope,
		timeFilter: "all",
		limit: 2000,
		sortBy: "createdAt",
		sortOrder: "desc",
		enabled: Boolean(token),
	});

	const allLeads = leadsQuery.data?.leads ?? [];
	const leads = useMemo(
		() => selectedSalesUserId
			? allLeads.filter((l) => (l as any).createdBy === selectedSalesUserId)
			: allLeads,
		[allLeads, selectedSalesUserId],
	);

	const selectedRange = useMemo<PeriodRange | null>(() => {
		if (timeScope === "all") return null;
		if (timeScope === "today") {
			const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
			const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
			return { start, end, label: "Today" };
		}
		if (timeScope === "last3days") {
			const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
			const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 0, 0, 0, 0);
			return { start, end, label: "Last 3 Days" };
		}
		if (timeScope === "thisWeek") return weekRange(now);
		if (timeScope === "previousMonth") return prevMonth(monthRange(now.getFullYear(), now.getMonth()));
		if (timeScope === "currentMonth") return monthRange(now.getFullYear(), now.getMonth());
		if (timeScope === "last3months") return nthMonthsAgo(3);
		if (timeScope === "last6months") return nthMonthsAgo(6);
		if (timeScope === "currentYear") return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999), label: String(now.getFullYear()) };
		// custom: use the datetime-local inputs
		const start = customFrom ? new Date(customFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
		const end = customTo ? new Date(customTo) : now;
		return { start, end, label: "Custom range" };
	}, [now, timeScope, customFrom, customTo]);

	const compRange = useMemo(() => selectedRange ? prevMonth(selectedRange) : null, [selectedRange]);

	const inRange = (d: Date | null, r: PeriodRange | null) =>
		d ? (!r || (d >= r.start && d <= r.end)) : false;

	const cur = useMemo(() => {
		const c = { created: 0, converted: 0, deleted: 0, inProgress: 0 };
		for (const l of leads) {
			if (!inRange(toDate(l.createdAt), selectedRange)) continue;
			c.created++;
			if (l.status === "CONVERTED") c.converted++;
			else if (l.status === "CLOSED") c.deleted++;
			else c.inProgress++;
		}
		return { ...c, rate: c.created > 0 ? (c.converted / c.created) * 100 : 0 };
	}, [leads, selectedRange]);

	const prev = useMemo(() => {
		const c = { created: 0, converted: 0, deleted: 0, inProgress: 0 };
		if (!compRange) return { ...c, rate: 0 };
		for (const l of leads) {
			if (!inRange(toDate(l.createdAt), compRange)) continue;
			c.created++;
			if (l.status === "CONVERTED") c.converted++;
			else if (l.status === "CLOSED") c.deleted++;
			else c.inProgress++;
		}
		return { ...c, rate: c.created > 0 ? (c.converted / c.created) * 100 : 0 };
	}, [leads, compRange]);

	// Monthly trend: last 12 months
	const monthlyTrend = useMemo(() => {
		const months: { label: string; created: number; converted: number; deleted: number }[] = [];
		for (let i = 11; i >= 0; i--) {
			const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const r = monthRange(d.getFullYear(), d.getMonth());
			const row = { label: `${getMonthName(d.getMonth())} ${d.getFullYear() !== now.getFullYear() ? d.getFullYear() : ""}`.trim(), created: 0, converted: 0, deleted: 0 };
			for (const l of leads) {
				if (!inRange(toDate(l.createdAt), r)) continue;
				row.created++;
				if (l.status === "CONVERTED") row.converted++;
				else if (l.status === "CLOSED") row.deleted++;
			}
			months.push(row);
		}
		return months;
	}, [leads, now]);

	// Weekly trend: last 12 weeks (Mon–Sun)
	const weeklyTrend = useMemo(() => {
		const weeks: { label: string; created: number; converted: number; deleted: number }[] = [];
		const currentWeekStart = startOfWeek(now);
		for (let i = 11; i >= 0; i--) {
			const weekStart = new Date(currentWeekStart);
			weekStart.setDate(weekStart.getDate() - i * 7);
			const r = weekRange(weekStart);
			const row = { label: r.label, created: 0, converted: 0, deleted: 0 };
			for (const l of leads) {
				if (!inRange(toDate(l.createdAt), r)) continue;
				row.created++;
				if (l.status === "CONVERTED") row.converted++;
				else if (l.status === "CLOSED") row.deleted++;
			}
			weeks.push(row);
		}
		return weeks;
	}, [leads, now]);

	const trendData = trendGranularity === "weekly" ? weeklyTrend : monthlyTrend;
	const trendWindowLabel = trendGranularity === "weekly" ? "last 12 weeks" : "last 12 months";

	// Stage funnel — current period
	const stageCounts = useMemo(() => {
		const map: Record<string, number> = {};
		for (const l of leads) {
			if (!inRange(toDate(l.createdAt), selectedRange)) continue;
			map[l.status ?? "FOLLOW_UP"] = (map[l.status ?? "FOLLOW_UP"] ?? 0) + 1;
		}
		return map;
	}, [leads, selectedRange]);

	const pipelineData = PIPELINE_ORDER.map((s) => ({
		name: STAGE_LABELS[s],
		value: stageCounts[s] ?? 0,
		fill: STAGE_COLORS[s],
	})).filter((d) => d.value > 0);

	const donutData = [
		{ name: "Converted", value: cur.converted, fill: "#22c55e" },
		{ name: "In Progress", value: cur.inProgress, fill: "#6366f1" },
		{ name: "Deleted", value: cur.deleted, fill: "#94a3b8" },
	].filter((d) => d.value > 0);

	const cards = [
		{ label: "Total Leads", value: cur.created, d: delta(cur.created, prev.created), color: "from-indigo-500 to-indigo-600", icon: "📋" },
		{ label: "Converted", value: cur.converted, d: delta(cur.converted, prev.converted), color: "from-emerald-500 to-emerald-600", icon: "✅" },
		{ label: "In Progress", value: cur.inProgress, d: delta(cur.inProgress, prev.inProgress), color: "from-violet-500 to-violet-600", icon: "⏳" },
		{ label: "Deleted", value: cur.deleted, d: delta(cur.deleted, prev.deleted), color: "from-slate-400 to-slate-500", icon: "🗑️" },
		{ label: "Conversion Rate", value: pct(cur.rate), d: { label: `${(cur.rate - prev.rate).toFixed(1)} pts`, positive: cur.rate >= prev.rate, neutral: false }, color: "from-blue-500 to-blue-600", icon: "📈" },
		{ label: "vs Prev Period", value: delta(cur.created, prev.created).label, d: { label: `${prev.created} prev`, positive: cur.created >= prev.created, neutral: prev.created === 0 }, color: "from-amber-400 to-amber-500", icon: "🔁" },
	];

	const periodLabel = selectedRange?.label ?? "All time";

	const selectCls = "rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white placeholder-white/60 outline-none backdrop-blur focus:border-white/40 focus:bg-white/15 [&>option]:bg-white [&>option]:text-gray-900";

	return (
		<div className="space-y-6 pb-8">
			{/* Hero header */}
			<div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-indigo-950 via-indigo-900 to-violet-900 px-6 py-7 text-white shadow-xl">
				{/* Decorative blobs */}
				<div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
				<div className="pointer-events-none absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-indigo-400/15 blur-3xl" />

				<div className="relative flex flex-wrap items-end justify-between gap-5">
					<div>
						<p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-indigo-300">Lead Reports</p>
						<h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Lead Report</h1>
						<p className="mt-1 text-sm text-indigo-200">
							{periodLabel} · {selectedSalesUserId ? (salesUsers.find((u) => u.id === selectedSalesUserId)?.name ?? "Sales user") : scope === "all" ? "All users" : "My leads"} · {cur.created} leads
						</p>
					</div>

					{/* Scope + sales person filter */}
					{canReadAll ? (
						<div className="flex flex-wrap items-center gap-2">
							<select value={scope} onChange={(e) => { setScope(e.target.value as "mine" | "all"); setSelectedSalesUserId(""); }} className={selectCls}>
								<option value="mine">My leads</option>
								<option value="all">All users</option>
							</select>
							{scope === "all" && salesUsers.length > 0 ? (
								<select
									value={selectedSalesUserId}
									onChange={(e) => setSelectedSalesUserId(e.target.value)}
									className={selectCls}
								>
									<option value="">All sales staff</option>
									{salesUsers.map((u) => (
										<option key={u.id} value={u.id}>{u.name ?? u.username}</option>
									))}
								</select>
							) : null}
						</div>
					) : null}
				</div>

				{/* Time frame suggestions */}
				<div className="relative mt-5">
					<p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-300">Time frame</p>
					<div className="flex flex-wrap gap-2">
						{TIME_PRESETS.map((preset) => (
							<button
								key={preset.id}
								type="button"
								onClick={() => setTimeScope(preset.id)}
								title={preset.hint}
								className={`rounded-xl border px-3.5 py-2 text-left text-xs font-semibold transition ${
									timeScope === preset.id
										? "border-white/40 bg-white/20 text-white shadow-sm"
										: "border-white/10 bg-white/5 text-indigo-200 hover:border-white/25 hover:bg-white/10 hover:text-white"
								}`}
							>
								{preset.label}
							</button>
						))}
					</div>
					{timeScope === "custom" ? (
						<div className="mt-3 flex flex-wrap items-center gap-2">
							<div className="flex items-center gap-1.5">
								<span className="text-xs font-medium text-indigo-300">From</span>
								<input
									type="datetime-local"
									value={customFromDraft}
									onChange={(e) => setCustomFromDraft(e.target.value)}
									className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-sm text-white outline-none focus:border-white/40 scheme-dark"
								/>
							</div>
							<div className="flex items-center gap-1.5">
								<span className="text-xs font-medium text-indigo-300">To</span>
								<input
									type="datetime-local"
									value={customToDraft}
									onChange={(e) => setCustomToDraft(e.target.value)}
									className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-sm text-white outline-none focus:border-white/40 scheme-dark"
								/>
							</div>
							<button
								type="button"
								onClick={() => {
									setCustomFrom(customFromDraft);
									setCustomTo(customToDraft);
								}}
								disabled={!customRangeDirty}
								className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-indigo-300"
							>
								{customRangeDirty ? "Apply" : "Applied"}
							</button>
						</div>
					) : null}
				</div>

				{/* Mini stat row */}
				<div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
					{[
						{ l: "Total", v: cur.created },
						{ l: "Converted", v: cur.converted },
						{ l: "In Progress", v: cur.inProgress },
						{ l: "Deleted", v: cur.deleted },
					].map(({ l, v }) => (
						<div key={l} className="rounded-xl border border-white/10 bg-white/8 px-3 py-2.5 backdrop-blur">
							<p className="text-[11px] font-medium uppercase tracking-wide text-indigo-300">{l}</p>
							<p className="mt-1 text-xl font-bold text-white">{v}</p>
						</div>
					))}
				</div>
			</div>

			{/* KPI cards */}
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
				{cards.map((c) => (
					<div key={c.label} className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
						<div className={`absolute right-0 top-0 h-16 w-16 rounded-bl-3xl bg-linear-to-br ${c.color} opacity-10`} />
						<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{c.label}</p>
						<p className="mt-2 text-2xl font-extrabold text-gray-900">{c.value}</p>
						<p className={`mt-1 text-[11px] font-semibold ${c.d.neutral ? "text-gray-400" : c.d.positive ? "text-emerald-600" : "text-red-500"}`}>
							{c.d.neutral ? c.d.label : c.d.positive ? `▲ ${c.d.label}` : `▼ ${c.d.label}`}
						</p>
					</div>
				))}
			</div>

			{/* Charts row 1 */}
			<div className="grid gap-4 lg:grid-cols-3">
				{/* Trend (area) */}
				<div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
					<div className="mb-1 flex flex-wrap items-center justify-between gap-2">
						<p className="text-sm font-bold text-gray-800">Trend</p>
						<div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
							{(["monthly", "weekly"] as const).map((g) => (
								<button
									key={g}
									type="button"
									onClick={() => setTrendGranularity(g)}
									className={`rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize transition ${
										trendGranularity === g ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600"
									}`}
								>
									{g}
								</button>
							))}
						</div>
					</div>
					<p className="mb-4 text-xs text-gray-400">Lead creation & conversion over the {trendWindowLabel}</p>
					<ResponsiveContainer width="100%" height={220}>
						<AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
							<defs>
								<linearGradient id="gCreated" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
									<stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
								</linearGradient>
								<linearGradient id="gConverted" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
									<stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
								</linearGradient>
							</defs>
							<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
							<XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
							<YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
							<Tooltip content={<CustomTooltip />} />
							<Area type="monotone" dataKey="created" name="Created" stroke="#6366f1" strokeWidth={2} fill="url(#gCreated)" dot={false} />
							<Area type="monotone" dataKey="converted" name="Converted" stroke="#22c55e" strokeWidth={2} fill="url(#gConverted)" dot={false} />
						</AreaChart>
					</ResponsiveContainer>
					<div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
						<span className="flex items-center gap-1.5"><span className="inline-block h-2 w-4 rounded-full bg-indigo-500" /> Created</span>
						<span className="flex items-center gap-1.5"><span className="inline-block h-2 w-4 rounded-full bg-emerald-500" /> Converted</span>
					</div>
				</div>

				{/* Outcome donut */}
				<div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
					<p className="mb-1 text-sm font-bold text-gray-800">Lead Outcomes</p>
					<p className="mb-2 text-xs text-gray-400">{periodLabel}</p>
					{donutData.length === 0 ? (
						<div className="flex h-48 items-center justify-center text-sm text-gray-400">No data</div>
					) : (
						<>
							<ResponsiveContainer width="100%" height={180}>
								<PieChart>
									<Pie data={donutData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value" stroke="none">
										{donutData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
									</Pie>
									<Tooltip content={<CustomTooltip />} />
								</PieChart>
							</ResponsiveContainer>
							<div className="mt-2 space-y-1.5">
								{donutData.map((d) => (
									<div key={d.name} className="flex items-center justify-between text-xs">
										<span className="flex items-center gap-1.5">
											<span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
											<span className="text-gray-600">{d.name}</span>
										</span>
										<span className="font-semibold text-gray-800">{d.value} <span className="font-normal text-gray-400">({cur.created > 0 ? pct((d.value / cur.created) * 100) : "0%"})</span></span>
									</div>
								))}
							</div>
						</>
					)}
				</div>
			</div>

			{/* Charts row 2 */}
			<div className="grid gap-4 lg:grid-cols-2">
				{/* Pipeline bar */}
				<div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
					<p className="mb-1 text-sm font-bold text-gray-800">Pipeline Breakdown</p>
					<p className="mb-4 text-xs text-gray-400">Leads by stage — {periodLabel}</p>
					{pipelineData.length === 0 ? (
						<div className="flex h-48 items-center justify-center text-sm text-gray-400">No pipeline data</div>
					) : (
						<ResponsiveContainer width="100%" height={200}>
							<BarChart data={pipelineData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={20}>
								<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
								<XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
								<YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
								<Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
								<Bar dataKey="value" name="Leads" radius={[4, 4, 0, 0]}>
									{pipelineData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					)}
				</div>

				{/* Stage summary table */}
				<div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
					<p className="mb-1 text-sm font-bold text-gray-800">Stage Summary</p>
					<p className="mb-4 text-xs text-gray-400">{periodLabel}</p>
					<div className="space-y-2">
						{[...PIPELINE_ORDER, "CONVERTED", "CLOSED"].map((status) => {
							const count = stageCounts[status] ?? 0;
							const total = cur.created || 1;
							const width = Math.round((count / total) * 100);
							return (
								<div key={status} className="flex items-center gap-3">
									<span className="w-28 shrink-0 text-xs text-gray-600">{STAGE_LABELS[status]}</span>
									<div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
										<div
											className="h-full rounded-full transition-all duration-500"
											style={{ width: `${width}%`, backgroundColor: STAGE_COLORS[status] }}
										/>
									</div>
									<span className="w-8 shrink-0 text-right text-xs font-semibold text-gray-700">{count}</span>
								</div>
							);
						})}
					</div>

					{/* Conversion rate big number */}
					<div className="mt-5 flex items-center justify-between rounded-xl bg-linear-to-r from-emerald-50 to-teal-50 px-4 py-3">
						<div>
							<p className="text-xs font-semibold text-emerald-700">Conversion Rate</p>
							<p className="text-xs text-emerald-600">{periodLabel}</p>
						</div>
						<p className="text-2xl font-extrabold text-emerald-700">{pct(cur.rate)}</p>
					</div>
				</div>
			</div>

			{/* Created vs deleted bar */}
			<div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
				<p className="mb-1 text-sm font-bold text-gray-800">Created vs Deleted — {trendGranularity === "weekly" ? "Last 12 Weeks" : "Last 12 Months"}</p>
				<p className="mb-4 text-xs text-gray-400">Side-by-side comparison of new leads created and leads deleted each {trendGranularity === "weekly" ? "week" : "month"}</p>
				<ResponsiveContainer width="100%" height={200}>
					<BarChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={4} barSize={14}>
						<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
						<XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
						<YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
						<Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
						<Bar dataKey="created" name="Created" fill="#6366f1" radius={[3, 3, 0, 0]} />
						<Bar dataKey="converted" name="Converted" fill="#22c55e" radius={[3, 3, 0, 0]} />
						<Bar dataKey="deleted" name="Deleted" fill="#94a3b8" radius={[3, 3, 0, 0]} />
					</BarChart>
				</ResponsiveContainer>
				<div className="mt-3 flex items-center gap-5 text-xs text-gray-500">
					<span className="flex items-center gap-1.5"><span className="inline-block h-2 w-4 rounded-full bg-indigo-500" /> Created</span>
					<span className="flex items-center gap-1.5"><span className="inline-block h-2 w-4 rounded-full bg-emerald-500" /> Converted</span>
					<span className="flex items-center gap-1.5"><span className="inline-block h-2 w-4 rounded-full bg-slate-400" /> Deleted</span>
				</div>
			</div>

			{leadsQuery.isLoading ? (
				<div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white py-16">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
				</div>
			) : null}
		</div>
	);
};

export default LeadOverviewPage;
