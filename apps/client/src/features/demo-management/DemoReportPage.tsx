import type { DemoReportRow } from "@repo/schema";
import { type ReactNode, useMemo, useState } from "react";
import {
	HiArrowPath,
	HiBolt,
	HiCalendarDays,
	HiCheckBadge,
	HiCheckCircle,
	HiClock,
	HiExclamationTriangle,
	HiInboxStack,
	HiMagnifyingGlass,
	HiUserPlus,
	HiXMark,
} from "react-icons/hi2";
import { Link } from "react-router-dom";
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
import { useDemoReportQuery } from "@/features/leads/leads.queries";
import { useHasPermission } from "@/lib/hooks/use-has-permission";
import { useSession } from "@/lib/session";

// ─── Types & constants ────────────────────────────────────────────────────────

type TimeScope =
	| "today"
	| "yesterday"
	| "thisWeek"
	| "lastWeek"
	| "thisMonth"
	| "lastMonth"
	| "last3months"
	| "thisYear"
	| "custom"
	| "all";

type Range = { start: Date; end: Date; label: string };

type DemoState = "AWAITING" | "UPCOMING" | "OVERDUE" | "COMPLETED" | "CANCELLED";

type Row = DemoReportRow & {
	state: DemoState;
	requested: Date | null;
	assigned: Date | null;
	scheduled: Date | null;
	completed: Date | null;
};

type GroupBy = "mentor" | "coordinator" | "sales";

const TIME_PRESETS: { id: TimeScope; label: string }[] = [
	{ id: "today", label: "Today" },
	{ id: "yesterday", label: "Yesterday" },
	{ id: "thisWeek", label: "This Week" },
	{ id: "lastWeek", label: "Last Week" },
	{ id: "thisMonth", label: "This Month" },
	{ id: "lastMonth", label: "Last Month" },
	{ id: "last3months", label: "Last 3 Months" },
	{ id: "thisYear", label: "This Year" },
	{ id: "custom", label: "Custom" },
	{ id: "all", label: "All Time" },
];

const STATE_META: Record<DemoState, { label: string; color: string; badge: string }> = {
	AWAITING: { label: "Awaiting Assignment", color: "#f59e0b", badge: "bg-amber-50 text-amber-700 ring-amber-200" },
	UPCOMING: { label: "Upcoming", color: "#6366f1", badge: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
	OVERDUE: { label: "Overdue", color: "#f43f5e", badge: "bg-rose-50 text-rose-700 ring-rose-200" },
	COMPLETED: { label: "Completed", color: "#10b981", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
	CANCELLED: { label: "Cancelled / Re-demo", color: "#94a3b8", badge: "bg-slate-100 text-slate-600 ring-slate-200" },
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_MS = 86_400_000;

// ─── Date helpers ─────────────────────────────────────────────────────────────

const toDate = (v: string | null) => {
	if (!v) return null;
	const d = new Date(v);
	return Number.isNaN(d.getTime()) ? null : d;
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
const monthName = (m: number) => new Date(2000, m, 1).toLocaleString("en-US", { month: "short" });

const inRange = (d: Date | null, r: Range | null) => (d ? !r || (d >= r.start && d <= r.end) : false);

const buildRange = (scope: TimeScope, now: Date, customFrom: string, customTo: string): Range | null => {
	const y = now.getFullYear();
	const m = now.getMonth();
	switch (scope) {
		case "all":
			return null;
		case "today":
			return { start: startOfDay(now), end: endOfDay(now), label: "Today" };
		case "yesterday": {
			const d = addDays(now, -1);
			return { start: startOfDay(d), end: endOfDay(d), label: "Yesterday" };
		}
		case "thisWeek": {
			const s = startOfWeek(now);
			return { start: s, end: endOfDay(addDays(s, 6)), label: "This week" };
		}
		case "lastWeek": {
			const s = addDays(startOfWeek(now), -7);
			return { start: s, end: endOfDay(addDays(s, 6)), label: "Last week" };
		}
		case "thisMonth":
			return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0, 23, 59, 59, 999), label: `${monthName(m)} ${y}` };
		case "lastMonth":
			return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0, 23, 59, 59, 999), label: `${monthName((m + 11) % 12)} ${m === 0 ? y - 1 : y}` };
		case "last3months":
			return { start: new Date(y, m - 2, 1), end: new Date(y, m + 1, 0, 23, 59, 59, 999), label: "Last 3 months" };
		case "thisYear":
			return { start: new Date(y, 0, 1), end: new Date(y, 11, 31, 23, 59, 59, 999), label: String(y) };
		case "custom": {
			const start = customFrom ? startOfDay(new Date(customFrom)) : new Date(y, m, 1);
			const end = customTo ? endOfDay(new Date(customTo)) : endOfDay(now);
			return { start, end, label: "Custom range" };
		}
	}
};

// Same-length window immediately before `r`; calendar presets shift by months.
const previousRange = (r: Range, scope: TimeScope): Range => {
	const months = scope === "thisMonth" || scope === "lastMonth" ? 1 : scope === "last3months" ? 3 : scope === "thisYear" ? 12 : 0;
	if (months) {
		const start = new Date(r.start.getFullYear(), r.start.getMonth() - months, 1);
		return { start, end: new Date(r.start.getTime() - 1), label: "Previous period" };
	}
	const len = r.end.getTime() - r.start.getTime() + 1;
	return { start: new Date(r.start.getTime() - len), end: new Date(r.start.getTime() - 1), label: "Previous period" };
};

const toInputDate = (d: Date) => {
	const p = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const fmtDateTime = (d: Date | null) =>
	d ? d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—";

const fmtDuration = (ms: number | null) => {
	if (ms === null) return "—";
	const hours = ms / 3_600_000;
	if (hours < 1) return `${Math.max(1, Math.round(ms / 60_000))}m`;
	if (hours < 48) return `${hours.toFixed(1)}h`;
	return `${(hours / 24).toFixed(1)}d`;
};

const pct = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0);
const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

// ─── Row state ────────────────────────────────────────────────────────────────

const getState = (row: DemoReportRow, now: Date): DemoState => {
	if (row.completedAt) return "COMPLETED";
	// A superseded attempt (lead re-demoed) or a withdrawn request never happened.
	if (!row.isLatest || !row.requestedAt || row.leadStatus === "DEMO_CANCELLED") return "CANCELLED";
	if (!row.assignedAt) return "AWAITING";
	const scheduled = toDate(row.scheduledFor);
	return scheduled && scheduled < now ? "OVERDUE" : "UPCOMING";
};

// ─── Metrics ──────────────────────────────────────────────────────────────────

type Metrics = {
	requested: number;
	assigned: number;
	held: number;
	completed: number;
	converted: number;
	redemos: number;
	conversionRate: number;
	completionRate: number;
	avgAssign: number | null;
	avgComplete: number | null;
};

const computeMetrics = (rows: Row[], r: Range | null): Metrics => {
	let requested = 0;
	let assigned = 0;
	let held = 0;
	let completed = 0;
	let converted = 0;
	let redemos = 0;
	const assignTimes: number[] = [];
	const completeTimes: number[] = [];

	for (const row of rows) {
		if (inRange(row.requested, r)) {
			requested++;
			if (row.attempt > 1) redemos++;
		}
		if (inRange(row.assigned, r)) {
			assigned++;
			if (row.requested) assignTimes.push(row.assigned!.getTime() - row.requested.getTime());
		}
		if (inRange(row.scheduled, r) && row.state !== "CANCELLED") held++;
		if (inRange(row.completed, r)) {
			completed++;
			if (row.converted) converted++;
			if (row.requested) completeTimes.push(row.completed!.getTime() - row.requested.getTime());
		}
	}

	return {
		requested,
		assigned,
		held,
		completed,
		converted,
		redemos,
		conversionRate: pct(converted, completed),
		completionRate: pct(completed, assigned),
		avgAssign: avg(assignTimes.filter((t) => t >= 0)),
		avgComplete: avg(completeTimes.filter((t) => t >= 0)),
	};
};

const delta = (cur: number, prev: number) => {
	if (prev === 0) return cur === 0 ? { label: "—", tone: "neutral" as const } : { label: "New", tone: "up" as const };
	const ch = ((cur - prev) / prev) * 100;
	return { label: `${ch > 0 ? "+" : ""}${ch.toFixed(0)}%`, tone: ch > 0 ? ("up" as const) : ch < 0 ? ("down" as const) : ("neutral" as const) };
};

// ─── Small UI pieces ──────────────────────────────────────────────────────────

const Card = ({ title, subtitle, action, children, className = "" }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) => (
	<div className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ${className}`}>
		<div className="mb-4 flex flex-wrap items-start justify-between gap-2">
			<div>
				<p className="text-sm font-bold text-gray-800">{title}</p>
				{subtitle ? <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p> : null}
			</div>
			{action}
		</div>
		{children}
	</div>
);

const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color?: string; fill?: string; payload?: { fill?: string } }[]; label?: string }) => {
	if (!active || !payload?.length) return null;
	return (
		<div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs shadow-lg">
			{label ? <p className="mb-1.5 font-semibold text-gray-700">{label}</p> : null}
			{payload.map((p) => (
				<p key={p.name} className="flex items-center gap-2" style={{ color: p.color ?? p.fill ?? p.payload?.fill }}>
					<span className="font-medium">{p.name}:</span>
					<span className="font-bold">{p.value}</span>
				</p>
			))}
		</div>
	);
};

const Segmented = <T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) => (
	<div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
		{options.map((o) => (
			<button
				key={o.id}
				type="button"
				onClick={() => onChange(o.id)}
				className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${value === o.id ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
			>
				{o.label}
			</button>
		))}
	</div>
);

const Empty = ({ text = "No data for this selection" }: { text?: string }) => (
	<div className="flex h-44 flex-col items-center justify-center gap-2 text-sm text-gray-400">
		<HiInboxStack className="h-6 w-6" aria-hidden="true" />
		{text}
	</div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export const DemoReportPage = () => {
	const { token } = useSession();
	const canReadAll = useHasPermission("DEMO_REPORT_READ_ALL");
	const now = useMemo(() => new Date(), []);

	const [scopeChoice, setScopeChoice] = useState<"mine" | "all" | null>(null);
	const scope: "mine" | "all" = scopeChoice ?? (canReadAll ? "all" : "mine");

	const [timeScope, setTimeScope] = useState<TimeScope>("thisMonth");
	const [customFrom, setCustomFrom] = useState(() => toInputDate(new Date(now.getFullYear(), now.getMonth(), 1)));
	const [customTo, setCustomTo] = useState(() => toInputDate(now));
	const [courseType, setCourseType] = useState<"ALL" | "INDIVIDUAL" | "GROUP">("ALL");
	const [attemptType, setAttemptType] = useState<"ALL" | "FIRST" | "REDEMO">("ALL");
	const [mentorId, setMentorId] = useState("");
	const [coordinatorId, setCoordinatorId] = useState("");
	const [salesId, setSalesId] = useState("");
	const [search, setSearch] = useState("");
	const [groupBy, setGroupBy] = useState<GroupBy>("mentor");
	const [listTab, setListTab] = useState<"upcoming" | "overdue" | "awaiting" | "recent">("upcoming");

	const reportQuery = useDemoReportQuery(token, scope);

	const allRows = useMemo<Row[]>(
		() =>
			(reportQuery.data?.demos ?? []).map((d) => ({
				...d,
				state: getState(d, now),
				requested: toDate(d.requestedAt),
				assigned: toDate(d.assignedAt),
				scheduled: toDate(d.scheduledFor),
				completed: toDate(d.completedAt),
			})),
		[reportQuery.data, now],
	);

	// Filter option lists come from the unfiltered data so choices never vanish.
	const people = useMemo(() => {
		const collect = (pick: (r: Row) => { id: string; name: string } | null) => {
			const map = new Map<string, string>();
			for (const r of allRows) {
				const p = pick(r);
				if (p) map.set(p.id, p.name);
			}
			return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
		};
		return {
			mentors: collect((r) => r.mentor),
			coordinators: collect((r) => r.coordinator),
			sales: collect((r) => r.sales),
		};
	}, [allRows]);

	const rows = useMemo(() => {
		const q = search.trim().toLowerCase();
		return allRows.filter((r) => {
			if (courseType !== "ALL" && r.courseType !== courseType) return false;
			if (attemptType === "FIRST" && r.attempt !== 1) return false;
			if (attemptType === "REDEMO" && r.attempt === 1) return false;
			if (mentorId && r.mentor?.id !== mentorId) return false;
			if (coordinatorId && r.coordinator?.id !== coordinatorId) return false;
			if (salesId && r.sales?.id !== salesId) return false;
			if (q && !`${r.leadName ?? ""} ${r.slNo ?? ""}`.toLowerCase().includes(q)) return false;
			return true;
		});
	}, [allRows, courseType, attemptType, mentorId, coordinatorId, salesId, search]);

	const range = useMemo(() => buildRange(timeScope, now, customFrom, customTo), [timeScope, now, customFrom, customTo]);
	const prevRange = useMemo(() => (range ? previousRange(range, timeScope) : null), [range, timeScope]);

	const cur = useMemo(() => computeMetrics(rows, range), [rows, range]);
	const prev = useMemo(() => (prevRange ? computeMetrics(rows, prevRange) : null), [rows, prevRange]);

	// Live pipeline — current state, independent of the time frame.
	const live = useMemo(() => {
		const weekEnd = endOfDay(addDays(now, 6));
		let awaiting = 0;
		let overdue = 0;
		let upcoming = 0;
		let next7 = 0;
		let today = 0;
		for (const r of rows) {
			if (r.state === "AWAITING") awaiting++;
			if (r.state === "OVERDUE") overdue++;
			if (r.state === "UPCOMING") {
				upcoming++;
				if (r.scheduled && r.scheduled <= weekEnd) next7++;
				if (r.scheduled && r.scheduled <= endOfDay(now)) today++;
			}
		}
		return { awaiting, overdue, upcoming, next7, today };
	}, [rows, now]);

	// Trend buckets sized to the selected window.
	const trend = useMemo(() => {
		let start: Date;
		let end: Date;
		if (range) {
			start = range.start;
			end = range.end;
		} else {
			const dates = rows.map((r) => r.requested?.getTime()).filter((t): t is number => typeof t === "number");
			start = dates.length ? new Date(Math.min(...dates)) : new Date(now.getFullYear(), now.getMonth() - 11, 1);
			end = endOfDay(now);
		}
		const days = Math.ceil((end.getTime() - start.getTime()) / DAY_MS);
		const unit: "day" | "week" | "month" = days <= 35 ? "day" : days <= 120 ? "week" : "month";

		const buckets: { label: string; start: Date; end: Date; requested: number; completed: number; converted: number }[] = [];
		let cursor = unit === "day" ? startOfDay(start) : unit === "week" ? startOfWeek(start) : new Date(start.getFullYear(), start.getMonth(), 1);
		while (cursor <= end && buckets.length < 400) {
			const next = unit === "day" ? addDays(cursor, 1) : unit === "week" ? addDays(cursor, 7) : new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
			const label =
				unit === "month"
					? `${monthName(cursor.getMonth())}${cursor.getFullYear() !== now.getFullYear() ? ` ${String(cursor.getFullYear()).slice(2)}` : ""}`
					: `${cursor.getDate()} ${monthName(cursor.getMonth())}`;
			buckets.push({ label, start: cursor, end: new Date(next.getTime() - 1), requested: 0, completed: 0, converted: 0 });
			cursor = next;
		}
		for (const r of rows) {
			for (const b of buckets) {
				if (r.requested && r.requested >= b.start && r.requested <= b.end) b.requested++;
				if (r.completed && r.completed >= b.start && r.completed <= b.end) {
					b.completed++;
					if (r.converted) b.converted++;
				}
			}
		}
		return { data: buckets, unit };
	}, [rows, range, now]);

	// Cohort funnel: demos requested in the window and how far they got.
	const funnel = useMemo(() => {
		const cohort = rows.filter((r) => inRange(r.requested, range));
		const requested = cohort.length;
		const assigned = cohort.filter((r) => r.assigned).length;
		const completed = cohort.filter((r) => r.completed).length;
		const converted = cohort.filter((r) => r.completed && r.converted).length;
		return [
			{ label: "Requested", value: requested, color: "#6366f1" },
			{ label: "Mentor assigned", value: assigned, color: "#8b5cf6" },
			{ label: "Demo completed", value: completed, color: "#10b981" },
			{ label: "Converted to student", value: converted, color: "#22c55e" },
		];
	}, [rows, range]);

	const funnelTop = funnel[0]?.value ?? 0;

	const stateBreakdown = useMemo(() => {
		const cohort = rows.filter((r) => inRange(r.requested, range));
		const counts: Record<DemoState, number> = { AWAITING: 0, UPCOMING: 0, OVERDUE: 0, COMPLETED: 0, CANCELLED: 0 };
		for (const r of cohort) counts[r.state]++;
		return (Object.keys(counts) as DemoState[])
			.map((s) => ({ name: STATE_META[s].label, value: counts[s], fill: STATE_META[s].color }))
			.filter((d) => d.value > 0);
	}, [rows, range]);

	const weekdayData = useMemo(() => {
		const counts = WEEKDAYS.map((day) => ({ day, demos: 0 }));
		for (const r of rows) {
			if (r.state === "CANCELLED" || !inRange(r.scheduled, range) || !r.scheduled) continue;
			const bucket = counts[(r.scheduled.getDay() + 6) % 7];
			if (bucket) bucket.demos++;
		}
		return counts;
	}, [rows, range]);

	const hourData = useMemo(() => {
		const counts = new Map<number, number>();
		for (const r of rows) {
			if (r.state === "CANCELLED" || !inRange(r.scheduled, range) || !r.scheduled) continue;
			const h = r.scheduled.getHours();
			counts.set(h, (counts.get(h) ?? 0) + 1);
		}
		return [...counts]
			.sort((a, b) => a[0] - b[0])
			.map(([h, demos]) => ({ hour: `${h % 12 || 12}${h < 12 ? "am" : "pm"}`, demos }));
	}, [rows, range]);

	const courseSplit = useMemo(() => {
		const out = { INDIVIDUAL: { completed: 0, converted: 0 }, GROUP: { completed: 0, converted: 0 } };
		for (const r of rows) {
			if (!r.courseType || !inRange(r.completed, range)) continue;
			out[r.courseType].completed++;
			if (r.converted) out[r.courseType].converted++;
		}
		return out;
	}, [rows, range]);

	const leaderboard = useMemo(() => {
		const map = new Map<string, { id: string; name: string; requested: number; assigned: number; completed: number; converted: number; overdue: number; upcoming: number; assignTimes: number[] }>();
		for (const r of rows) {
			const person = groupBy === "mentor" ? r.mentor : groupBy === "coordinator" ? r.coordinator : r.sales;
			if (!person) continue;
			let e = map.get(person.id);
			if (!e) {
				e = { id: person.id, name: person.name, requested: 0, assigned: 0, completed: 0, converted: 0, overdue: 0, upcoming: 0, assignTimes: [] };
				map.set(person.id, e);
			}
			if (inRange(r.requested, range)) e.requested++;
			if (inRange(r.assigned, range)) {
				e.assigned++;
				if (r.requested && r.assigned) e.assignTimes.push(r.assigned.getTime() - r.requested.getTime());
			}
			if (inRange(r.completed, range)) {
				e.completed++;
				if (r.converted) e.converted++;
			}
			if (r.state === "OVERDUE") e.overdue++;
			if (r.state === "UPCOMING") e.upcoming++;
		}
		return [...map.values()]
			.map((e) => ({ ...e, rate: pct(e.converted, e.completed), avgAssign: avg(e.assignTimes.filter((t) => t >= 0)) }))
			.filter((e) => e.requested + e.assigned + e.completed + e.overdue + e.upcoming > 0)
			.sort((a, b) => b.completed - a.completed || b.assigned - a.assigned || b.requested - a.requested);
	}, [rows, range, groupBy]);

	const maxCompleted = Math.max(1, ...leaderboard.map((e) => e.completed));

	const demoList = useMemo(() => {
		const list = rows.filter((r) => {
			if (listTab === "upcoming") return r.state === "UPCOMING";
			if (listTab === "overdue") return r.state === "OVERDUE";
			if (listTab === "awaiting") return r.state === "AWAITING";
			return r.state === "COMPLETED" && inRange(r.completed, range);
		});
		const key = (r: Row) =>
			listTab === "recent" ? -(r.completed?.getTime() ?? 0) : listTab === "awaiting" ? (r.requested?.getTime() ?? 0) : listTab === "overdue" ? -(r.scheduled?.getTime() ?? 0) : (r.scheduled?.getTime() ?? 0);
		return list.sort((a, b) => key(a) - key(b)).slice(0, 50);
	}, [rows, listTab, range]);

	const activeFilterCount = [courseType !== "ALL", attemptType !== "ALL", mentorId, coordinatorId, salesId, search.trim()].filter(Boolean).length;
	const clearFilters = () => {
		setCourseType("ALL");
		setAttemptType("ALL");
		setMentorId("");
		setCoordinatorId("");
		setSalesId("");
		setSearch("");
	};

	const periodLabel = range?.label ?? "All time";

	const kpis = [
		{ label: "Requested", value: cur.requested, prev: prev?.requested, icon: HiInboxStack, tint: "from-indigo-500 to-indigo-600", hint: "Demo requests raised" },
		{ label: "Assigned", value: cur.assigned, prev: prev?.assigned, icon: HiUserPlus, tint: "from-violet-500 to-violet-600", hint: "Mentor assigned" },
		{ label: "Scheduled", value: cur.held, prev: prev?.held, icon: HiCalendarDays, tint: "from-sky-500 to-sky-600", hint: "Demo slots in this period" },
		{ label: "Completed", value: cur.completed, prev: prev?.completed, icon: HiCheckCircle, tint: "from-emerald-500 to-emerald-600", hint: "Demos marked done" },
		{ label: "Converted", value: cur.converted, prev: prev?.converted, icon: HiCheckBadge, tint: "from-green-500 to-green-600", hint: "Completed demos that became students" },
		{ label: "Re-demos", value: cur.redemos, prev: prev?.redemos, icon: HiArrowPath, tint: "from-orange-400 to-orange-500", hint: "2nd+ attempts requested" },
	];

	const selectCls = "w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

	return (
		<div className="space-y-6 pb-8">
			{/* Hero */}
			<div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-slate-950 via-violet-950 to-fuchsia-900 px-6 py-7 text-white shadow-xl">
				<div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
				<div className="pointer-events-none absolute -bottom-10 left-10 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />

				<div className="relative flex flex-wrap items-end justify-between gap-5">
					<div>
						<p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-fuchsia-300">Demo Management</p>
						<h1 className="mt-2 text-2xl font-bold sm:text-3xl">Demo Report</h1>
						<p className="mt-1 text-sm text-violet-200">
							{periodLabel} · {scope === "all" ? "All demos" : "My demos"}
							{activeFilterCount ? ` · ${activeFilterCount} filter${activeFilterCount > 1 ? "s" : ""}` : ""}
						</p>
					</div>

					{canReadAll ? (
						<div className="flex rounded-xl border border-white/15 bg-white/10 p-1 backdrop-blur">
							{(["mine", "all"] as const).map((s) => (
								<button
									key={s}
									type="button"
									onClick={() => setScopeChoice(s)}
									className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${scope === s ? "bg-white text-violet-900 shadow" : "text-violet-100 hover:bg-white/10"}`}
								>
									{s === "mine" ? "My demos" : "All demos"}
								</button>
							))}
						</div>
					) : null}
				</div>

				<div className="relative mt-5 flex flex-wrap gap-2">
					{TIME_PRESETS.map((p) => (
						<button
							key={p.id}
							type="button"
							onClick={() => setTimeScope(p.id)}
							className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${timeScope === p.id ? "border-white/40 bg-white/20 text-white shadow-sm" : "border-white/10 bg-white/5 text-violet-200 hover:border-white/25 hover:bg-white/10 hover:text-white"}`}
						>
							{p.label}
						</button>
					))}
				</div>
				{timeScope === "custom" ? (
					<div className="relative mt-3 flex flex-wrap items-center gap-2 text-xs">
						<span className="font-medium text-violet-300">From</span>
						<input type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-sm text-white outline-none scheme-dark focus:border-white/40" />
						<span className="font-medium text-violet-300">To</span>
						<input type="date" value={customTo} min={customFrom} onChange={(e) => setCustomTo(e.target.value)} className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-sm text-white outline-none scheme-dark focus:border-white/40" />
					</div>
				) : null}

				{/* Live pipeline strip */}
				<div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
					{[
						{ l: "Awaiting assignment", v: live.awaiting, icon: HiInboxStack, tone: "text-amber-300" },
						{ l: "Today", v: live.today, icon: HiBolt, tone: "text-sky-300" },
						{ l: "Next 7 days", v: live.next7, icon: HiCalendarDays, tone: "text-violet-200" },
						{ l: "Overdue", v: live.overdue, icon: HiExclamationTriangle, tone: "text-rose-300" },
					].map(({ l, v, icon: Icon, tone }) => (
						<div key={l} className="rounded-xl border border-white/10 bg-white/8 px-3 py-2.5 backdrop-blur">
							<p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-violet-300">
								<Icon className={`h-3.5 w-3.5 ${tone}`} aria-hidden="true" />
								{l}
							</p>
							<p className="mt-1 text-xl font-bold">{v}</p>
						</div>
					))}
				</div>
				<p className="relative mt-2 text-[11px] text-violet-300/80">Live pipeline — reflects right now, not the selected time frame.</p>
			</div>

			{/* Filters */}
			<div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
					<label className="relative xl:col-span-2">
						<span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">Search lead</span>
						<HiMagnifyingGlass className="pointer-events-none absolute bottom-2.5 left-2.5 h-4 w-4 text-gray-400" aria-hidden="true" />
						<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or SL no." className={`${selectCls} pl-8`} />
					</label>
					<label>
						<span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">Mentor</span>
						<select value={mentorId} onChange={(e) => setMentorId(e.target.value)} className={selectCls}>
							<option value="">All mentors</option>
							{people.mentors.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
						</select>
					</label>
					<label>
						<span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">Coordinator</span>
						<select value={coordinatorId} onChange={(e) => setCoordinatorId(e.target.value)} className={selectCls}>
							<option value="">All coordinators</option>
							{people.coordinators.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
						</select>
					</label>
					<label>
						<span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">Sales</span>
						<select value={salesId} onChange={(e) => setSalesId(e.target.value)} className={selectCls}>
							<option value="">All sales</option>
							{people.sales.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
						</select>
					</label>
					<div className="flex items-end gap-2">
						<button
							type="button"
							onClick={clearFilters}
							disabled={!activeFilterCount}
							className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-600 transition hover:border-gray-300 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
						>
							<HiXMark className="h-4 w-4" aria-hidden="true" /> Clear
						</button>
					</div>
				</div>
				<div className="mt-3 flex flex-wrap items-center gap-3">
					<Segmented value={courseType} onChange={setCourseType} options={[{ id: "ALL", label: "All courses" }, { id: "INDIVIDUAL", label: "Individual" }, { id: "GROUP", label: "Group" }]} />
					<Segmented value={attemptType} onChange={setAttemptType} options={[{ id: "ALL", label: "All attempts" }, { id: "FIRST", label: "First demo" }, { id: "REDEMO", label: "Re-demos" }]} />
				</div>
			</div>

			{reportQuery.isLoading ? (
				<div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white py-20">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
				</div>
			) : reportQuery.isError ? (
				<div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-center text-sm text-rose-700">
					Unable to load the demo report.
					<button type="button" onClick={() => reportQuery.refetch()} className="ml-2 font-semibold underline">Retry</button>
				</div>
			) : (
				<>
					{/* KPI cards */}
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
						{kpis.map(({ label, value, prev: p, icon: Icon, tint, hint }) => {
							const d = p === undefined ? null : delta(value, p);
							return (
								<div key={label} title={hint} className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md">
									<div className={`absolute -right-3 -top-3 h-16 w-16 rounded-full bg-linear-to-br ${tint} opacity-10 transition group-hover:opacity-20`} />
									<div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br ${tint} text-white shadow-sm`}>
										<Icon className="h-4 w-4" aria-hidden="true" />
									</div>
									<p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
									<p className="mt-1 text-2xl font-extrabold text-gray-900">{value}</p>
									{d ? (
										<p className={`mt-1 text-[11px] font-semibold ${d.tone === "up" ? "text-emerald-600" : d.tone === "down" ? "text-rose-500" : "text-gray-400"}`}>
											{d.tone === "up" ? "▲ " : d.tone === "down" ? "▼ " : ""}{d.label} <span className="font-normal text-gray-400">vs {p} prev</span>
										</p>
									) : (
										<p className="mt-1 text-[11px] text-gray-400">{hint}</p>
									)}
								</div>
							);
						})}
					</div>

					{/* Rate strip */}
					<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
						{[
							{ label: "Demo → Student", value: `${cur.conversionRate.toFixed(1)}%`, sub: `${cur.converted} of ${cur.completed} completed demos`, bar: cur.conversionRate, color: "bg-emerald-500" },
							{ label: "Completion rate", value: `${cur.completionRate.toFixed(1)}%`, sub: "Completed vs assigned in period", bar: Math.min(100, cur.completionRate), color: "bg-violet-500" },
							{ label: "Avg. time to assign", value: fmtDuration(cur.avgAssign), sub: "Request → mentor assigned", bar: null, color: "" },
							{ label: "Avg. request → done", value: fmtDuration(cur.avgComplete), sub: "Request → demo completed", bar: null, color: "" },
						].map((s) => (
							<div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
								<div className="flex items-center justify-between">
									<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{s.label}</p>
									<HiClock className="h-4 w-4 text-gray-300" aria-hidden="true" />
								</div>
								<p className="mt-2 text-2xl font-extrabold text-gray-900">{s.value}</p>
								{s.bar !== null ? (
									<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
										<div className={`h-full rounded-full ${s.color} transition-all duration-500`} style={{ width: `${s.bar}%` }} />
									</div>
								) : null}
								<p className="mt-1.5 text-[11px] text-gray-400">{s.sub}</p>
							</div>
						))}
					</div>

					{/* Trend + state donut */}
					<div className="grid gap-4 lg:grid-cols-3">
						<Card className="lg:col-span-2" title="Demo activity" subtitle={`Requested, completed and converted per ${trend.unit} — ${periodLabel}`}>
							{trend.data.every((b) => !b.requested && !b.completed) ? (
								<Empty />
							) : (
								<>
									<ResponsiveContainer width="100%" height={240}>
										<AreaChart data={trend.data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
											<defs>
												{[["gReq", "#6366f1"], ["gDone", "#10b981"], ["gConv", "#f59e0b"]].map(([id, c]) => (
													<linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
														<stop offset="5%" stopColor={c} stopOpacity={0.28} />
														<stop offset="95%" stopColor={c} stopOpacity={0} />
													</linearGradient>
												))}
											</defs>
											<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
											<XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} minTickGap={12} />
											<YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
											<Tooltip content={<ChartTooltip />} />
											<Area type="monotone" dataKey="requested" name="Requested" stroke="#6366f1" strokeWidth={2} fill="url(#gReq)" dot={false} />
											<Area type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} fill="url(#gDone)" dot={false} />
											<Area type="monotone" dataKey="converted" name="Converted" stroke="#f59e0b" strokeWidth={2} fill="url(#gConv)" dot={false} />
										</AreaChart>
									</ResponsiveContainer>
									<div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
										<span className="flex items-center gap-1.5"><span className="inline-block h-2 w-4 rounded-full bg-indigo-500" /> Requested</span>
										<span className="flex items-center gap-1.5"><span className="inline-block h-2 w-4 rounded-full bg-emerald-500" /> Completed</span>
										<span className="flex items-center gap-1.5"><span className="inline-block h-2 w-4 rounded-full bg-amber-500" /> Converted</span>
									</div>
								</>
							)}
						</Card>

						<Card title="Where requests stand" subtitle={`Current state of demos requested — ${periodLabel}`}>
							{stateBreakdown.length === 0 ? (
								<Empty />
							) : (
								<>
									<ResponsiveContainer width="100%" height={170}>
										<PieChart>
											<Pie data={stateBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={76} paddingAngle={3} dataKey="value" stroke="none">
												{stateBreakdown.map((d) => <Cell key={d.name} fill={d.fill} />)}
											</Pie>
											<Tooltip content={<ChartTooltip />} />
										</PieChart>
									</ResponsiveContainer>
									<div className="mt-2 space-y-1.5">
										{stateBreakdown.map((d) => {
											const total = stateBreakdown.reduce((a, b) => a + b.value, 0);
											return (
												<div key={d.name} className="flex items-center justify-between text-xs">
													<span className="flex items-center gap-1.5 text-gray-600">
														<span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.fill }} />
														{d.name}
													</span>
													<span className="font-semibold text-gray-800">
														{d.value} <span className="font-normal text-gray-400">({pct(d.value, total).toFixed(0)}%)</span>
													</span>
												</div>
											);
										})}
									</div>
								</>
							)}
						</Card>
					</div>

					{/* Funnel + course split */}
					<div className="grid gap-4 lg:grid-cols-3">
						<Card className="lg:col-span-2" title="Demo funnel" subtitle={`How far demos requested in ${periodLabel.toLowerCase()} have progressed`}>
							{funnelTop === 0 ? (
								<Empty />
							) : (
								<div className="space-y-3">
									{funnel.map((step, i) => {
										const width = pct(step.value, funnelTop);
										const fromPrev = i === 0 ? null : pct(step.value, funnel[i - 1]?.value ?? 0);
										return (
											<div key={step.label}>
												<div className="mb-1 flex items-center justify-between text-xs">
													<span className="font-semibold text-gray-700">{step.label}</span>
													<span className="text-gray-500">
														<span className="font-bold text-gray-800">{step.value}</span>
														{fromPrev !== null ? <span className="ml-2 text-gray-400">{fromPrev.toFixed(0)}% of previous step</span> : null}
													</span>
												</div>
												<div className="h-7 overflow-hidden rounded-lg bg-gray-50">
													<div
														className="flex h-full items-center justify-end rounded-lg px-2 text-[11px] font-bold text-white transition-all duration-700"
														style={{ width: `${Math.max(width, 4)}%`, background: `linear-gradient(90deg, ${step.color}cc, ${step.color})` }}
													>
														{width >= 12 ? `${width.toFixed(0)}%` : ""}
													</div>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</Card>

						<Card title="By course type" subtitle={`Completed demos — ${periodLabel}`}>
							<div className="space-y-4">
								{(["INDIVIDUAL", "GROUP"] as const).map((type) => {
									const s = courseSplit[type];
									const rate = pct(s.converted, s.completed);
									return (
										<div key={type} className="rounded-xl bg-gray-50 p-3.5">
											<div className="flex items-center justify-between">
												<p className="text-sm font-semibold text-gray-700">{type === "INDIVIDUAL" ? "Individual" : "Group"}</p>
												<p className="text-xs text-gray-400">{s.completed} completed</p>
											</div>
											<div className="mt-2 flex items-end justify-between">
												<p className="text-2xl font-extrabold text-gray-900">{rate.toFixed(0)}%</p>
												<p className="text-xs text-gray-500">{s.converted} converted</p>
											</div>
											<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
												<div className={`h-full rounded-full ${type === "INDIVIDUAL" ? "bg-cyan-500" : "bg-fuchsia-500"}`} style={{ width: `${rate}%` }} />
											</div>
										</div>
									);
								})}
							</div>
						</Card>
					</div>

					{/* Leaderboard */}
					<Card
						title="Team performance"
						subtitle={`Counts for ${periodLabel.toLowerCase()} · overdue and upcoming are live`}
						action={<Segmented value={groupBy} onChange={setGroupBy} options={[{ id: "mentor", label: "Mentors" }, { id: "coordinator", label: "Coordinators" }, { id: "sales", label: "Sales" }]} />}
					>
						{leaderboard.length === 0 ? (
							<Empty />
						) : (
							<div className="-mx-5 overflow-x-auto">
								<table className="w-full min-w-180 text-sm">
									<thead>
										<tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
											<th className="px-5 py-2">Name</th>
											<th className="px-3 py-2 text-right">Requested</th>
											<th className="px-3 py-2 text-right">Assigned</th>
											<th className="px-3 py-2">Completed</th>
											<th className="px-3 py-2 text-right">Converted</th>
											<th className="px-3 py-2 text-right">Conv. %</th>
											<th className="px-3 py-2 text-right">Avg. assign</th>
											<th className="px-3 py-2 text-right">Upcoming</th>
											<th className="px-5 py-2 text-right">Overdue</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-50">
										{leaderboard.map((e, i) => (
											<tr key={e.id} className="transition hover:bg-gray-50/70">
												<td className="px-5 py-2.5">
													<div className="flex items-center gap-2.5">
														<span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-700" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"}`}>
															{i + 1}
														</span>
														<span className="font-medium text-gray-800">{e.name}</span>
													</div>
												</td>
												<td className="px-3 py-2.5 text-right text-gray-600">{e.requested}</td>
												<td className="px-3 py-2.5 text-right text-gray-600">{e.assigned}</td>
												<td className="px-3 py-2.5">
													<div className="flex items-center gap-2">
														<div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
															<div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct(e.completed, maxCompleted)}%` }} />
														</div>
														<span className="font-semibold text-gray-800">{e.completed}</span>
													</div>
												</td>
												<td className="px-3 py-2.5 text-right text-gray-600">{e.converted}</td>
												<td className="px-3 py-2.5 text-right">
													<span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${e.completed === 0 ? "text-gray-400" : e.rate >= 50 ? "bg-emerald-50 text-emerald-700" : e.rate >= 25 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-600"}`}>
														{e.completed ? `${e.rate.toFixed(0)}%` : "—"}
													</span>
												</td>
												<td className="px-3 py-2.5 text-right text-gray-500">{fmtDuration(e.avgAssign)}</td>
												<td className="px-3 py-2.5 text-right text-indigo-600">{e.upcoming || "—"}</td>
												<td className="px-5 py-2.5 text-right">{e.overdue ? <span className="font-semibold text-rose-600">{e.overdue}</span> : <span className="text-gray-300">—</span>}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</Card>

					{/* Timing */}
					<div className="grid gap-4 lg:grid-cols-2">
						<Card title="Busiest days" subtitle={`Scheduled demos by weekday — ${periodLabel}`}>
							{weekdayData.every((d) => d.demos === 0) ? (
								<Empty />
							) : (
								<ResponsiveContainer width="100%" height={200}>
									<BarChart data={weekdayData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={26}>
										<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
										<XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
										<YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
										<Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8fafc" }} />
										<Bar dataKey="demos" name="Demos" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
									</BarChart>
								</ResponsiveContainer>
							)}
						</Card>
						<Card title="Popular time slots" subtitle={`Scheduled demos by hour — ${periodLabel}`}>
							{hourData.length === 0 ? (
								<Empty />
							) : (
								<ResponsiveContainer width="100%" height={200}>
									<BarChart data={hourData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={18}>
										<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
										<XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
										<YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
										<Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8fafc" }} />
										<Bar dataKey="demos" name="Demos" fill="#ec4899" radius={[6, 6, 0, 0]} />
									</BarChart>
								</ResponsiveContainer>
							)}
						</Card>
					</div>

					{/* Demo list */}
					<Card
						title="Demo list"
						subtitle={listTab === "recent" ? `Completed in ${periodLabel.toLowerCase()}` : "Live — independent of the time frame"}
						action={
							<Segmented
								value={listTab}
								onChange={setListTab}
								options={[
									{ id: "upcoming", label: `Upcoming (${live.upcoming})` },
									{ id: "overdue", label: `Overdue (${live.overdue})` },
									{ id: "awaiting", label: `Awaiting (${live.awaiting})` },
									{ id: "recent", label: "Completed" },
								]}
							/>
						}
					>
						{demoList.length === 0 ? (
							<Empty text="Nothing here" />
						) : (
							<div className="-mx-5 overflow-x-auto">
								<table className="w-full min-w-180 text-sm">
									<thead>
										<tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
											<th className="px-5 py-2">Lead</th>
											<th className="px-3 py-2">Status</th>
											<th className="px-3 py-2">{listTab === "awaiting" ? "Requested" : listTab === "recent" ? "Completed" : "Scheduled for"}</th>
											<th className="px-3 py-2">Mentor</th>
											<th className="px-3 py-2">Coordinator</th>
											<th className="px-5 py-2">Course</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-50">
										{demoList.map((r) => (
											<tr key={`${r.leadId}-${r.attempt}`} className="transition hover:bg-gray-50/70">
												<td className="px-5 py-2.5">
													<Link to={`/leads/${r.leadId}`} className="font-medium text-gray-800 hover:text-violet-700 hover:underline">
														{r.leadName || "Unnamed lead"}
													</Link>
													<p className="text-[11px] text-gray-400">
														{r.slNo ? `#${r.slNo}` : ""}
														{r.attempt > 1 ? ` · Attempt ${r.attempt}` : ""}
														{r.converted ? " · Converted" : ""}
													</p>
												</td>
												<td className="px-3 py-2.5">
													<span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${STATE_META[r.state].badge}`}>{STATE_META[r.state].label}</span>
												</td>
												<td className="px-3 py-2.5 text-gray-600">
													{fmtDateTime(listTab === "awaiting" ? r.requested : listTab === "recent" ? r.completed : r.scheduled)}
												</td>
												<td className="px-3 py-2.5 text-gray-600">{r.mentor?.name ?? "—"}</td>
												<td className="px-3 py-2.5 text-gray-600">{r.coordinator?.name ?? "—"}</td>
												<td className="px-5 py-2.5 text-gray-500">{r.courseType === "GROUP" ? "Group" : r.courseType === "INDIVIDUAL" ? "Individual" : "—"}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</Card>
				</>
			)}
		</div>
	);
};

export default DemoReportPage;
