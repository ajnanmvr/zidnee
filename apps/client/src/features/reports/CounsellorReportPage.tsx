import {
	CLASS_OBSERVATION_ITEMS,
	CLASSROOM_CHECK_ITEMS,
	type CounsellorReport,
} from "@repo/schema";
import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
	HiArrowDownTray,
	HiArrowPath,
	HiChatBubbleLeftRight,
	HiCheckCircle,
	HiDocumentArrowDown,
	HiPauseCircle,
	HiUserGroup,
	HiUserPlus,
	HiXCircle,
} from "react-icons/hi2";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	LabelList,
	Legend,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	ChartCard,
	ChartTooltip,
	EmptyChart,
	KpiCard,
	PALETTE,
	ProgressRow,
	SERIES_COLORS,
	SectionHeading,
	trendOf,
} from "@/features/reports/report-ui";
import { useCounsellorReportQuery } from "@/features/reports/reports.queries";
import { useCounsellorsQuery } from "@/features/users/users.queries";
import { useSession } from "@/lib/session";

/* ───────────────────────── timeframe ───────────────────────── */

type PresetId =
	| "today"
	| "7d"
	| "30d"
	| "thisMonth"
	| "lastMonth"
	| "3m"
	| "6m"
	| "thisYear"
	| "custom";

const PRESETS: { id: PresetId; label: string }[] = [
	{ id: "today", label: "Today" },
	{ id: "7d", label: "Last 7 days" },
	{ id: "30d", label: "Last 30 days" },
	{ id: "thisMonth", label: "This month" },
	{ id: "lastMonth", label: "Last month" },
	{ id: "3m", label: "3 months" },
	{ id: "6m", label: "6 months" },
	{ id: "thisYear", label: "This year" },
	{ id: "custom", label: "Custom" },
];

const startOfDay = (d: Date) =>
	new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) =>
	new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const toInputDate = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromInputDate = (value: string) => {
	const [y, m, d] = value.split("-").map(Number);
	return y && m && d ? new Date(y, m - 1, d) : new Date();
};

const resolveRange = (
	preset: PresetId,
	customFrom: string,
	customTo: string,
) => {
	const now = new Date();
	const daysBack = (n: number) =>
		startOfDay(new Date(now.getTime() - n * 86_400_000));
	switch (preset) {
		case "today":
			return { from: startOfDay(now), to: endOfDay(now) };
		case "7d":
			return { from: daysBack(6), to: endOfDay(now) };
		case "30d":
			return { from: daysBack(29), to: endOfDay(now) };
		case "thisMonth":
			return {
				from: new Date(now.getFullYear(), now.getMonth(), 1),
				to: endOfDay(now),
			};
		case "lastMonth":
			return {
				from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
				to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
			};
		case "3m":
			return {
				from: new Date(now.getFullYear(), now.getMonth() - 2, 1),
				to: endOfDay(now),
			};
		case "6m":
			return {
				from: new Date(now.getFullYear(), now.getMonth() - 5, 1),
				to: endOfDay(now),
			};
		case "thisYear":
			return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(now) };
		case "custom": {
			const from = startOfDay(fromInputDate(customFrom));
			const to = endOfDay(fromInputDate(customTo));
			return from <= to ? { from, to } : { from: to, to: from };
		}
	}
};

/* ───────────────────────── helpers ───────────────────────── */

const formatDate = (iso?: string) =>
	iso
		? new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" })
		: "-";

const formatBucket = (
	iso: string,
	bucket: CounsellorReport["range"]["bucket"],
) =>
	new Date(iso).toLocaleDateString("en-IN", {
		timeZone: "UTC",
		day: bucket === "month" ? undefined : "numeric",
		month: "short",
		year: bucket === "month" ? "2-digit" : undefined,
	});

const downloadCsv = (filename: string, rows: string[][]) => {
	const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
	const blob = new Blob([rows.map((r) => r.map(quote).join(",")).join("\n")], {
		type: "text/csv;charset=utf-8;",
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
};

const EVENT_STYLES = {
	BREAK: { label: "Break", badge: "bg-amber-100 text-amber-800" },
	DROP: { label: "Drop", badge: "bg-rose-100 text-rose-800" },
	RESTART: { label: "Restarted", badge: "bg-emerald-100 text-emerald-800" },
} as const;

const COMPLIANCE_COLORS = {
	COMPLIANT: PALETTE.emerald,
	PARTIAL: PALETTE.amber,
	NON_COMPLIANT: PALETTE.rose,
} as const;

const TREND_SERIES = [
	{ key: "admissions", label: "Admissions", color: PALETTE.teal },
	{ key: "breaks", label: "Breaks", color: PALETTE.amber },
	{ key: "drops", label: "Drops", color: PALETTE.rose },
	{ key: "restarts", label: "Restarts", color: PALETTE.emerald },
	{ key: "sessions", label: "Follow-up sessions", color: PALETTE.violet },
] as const;

const STATUS_COLORS: Record<string, string> = {
	Active: PALETTE.emerald,
	"On break": PALETTE.amber,
	Dropped: PALETTE.rose,
};

const RESULT_COLORS: Record<string, string> = {
	Satisfactory: PALETTE.emerald,
	"Needs improvement": PALETTE.amber,
	"Urgent attention": PALETTE.rose,
};

const EVENTS_PAGE = 10;

/* ───────────────────────── small chart pieces ───────────────────────── */

const AXIS_TICK = { fontSize: 11, fill: "#64748b" } as const;
const AXIS_TITLE = { fontSize: 11, fill: "#475569", fontWeight: 600 } as const;
const VALUE_LABEL = { fontSize: 11, fontWeight: 700, fill: "#334155" } as const;

/** Hide "0" labels so empty segments stay clean. */
const hideZero = (value: unknown) => (Number(value) ? String(value) : "");

const Donut = ({
	data,
	colors,
	unit = "students",
}: {
	data: { label: string; count: number }[];
	colors?: Record<string, string>;
	/** What is being counted, e.g. "students" or "sessions". */
	unit?: string;
}) => {
	const total = data.reduce((n, d) => n + d.count, 0);
	if (!total) return <EmptyChart />;
	return (
		<div className="flex flex-col items-center gap-4 sm:flex-row">
			<div className="relative h-44 w-44 shrink-0">
				<ResponsiveContainer width="100%" height="100%">
					<PieChart>
						<Pie
							data={data}
							dataKey="count"
							nameKey="label"
							innerRadius={52}
							outerRadius={78}
							paddingAngle={2}
							stroke="none"
						>
							{data.map((d, i) => (
								<Cell
									key={d.label}
									fill={
										colors?.[d.label] ?? SERIES_COLORS[i % SERIES_COLORS.length]
									}
								/>
							))}
						</Pie>
						<Tooltip content={<ChartTooltip />} />
					</PieChart>
				</ResponsiveContainer>
				<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
					<span className="text-2xl font-bold text-gray-900">{total}</span>
					<span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
						{unit}
					</span>
				</div>
			</div>
			<ul className="w-full space-y-2 text-sm">
				{data.map((d, i) => (
					<li key={d.label} className="flex items-center justify-between gap-3">
						<span className="flex min-w-0 items-center gap-2">
							<span
								className="h-3 w-3 shrink-0 rounded-full"
								style={{
									background:
										colors?.[d.label] ??
										SERIES_COLORS[i % SERIES_COLORS.length],
								}}
							/>
							<span className="truncate font-medium text-gray-700">
								{d.label}
							</span>
						</span>
						<span className="shrink-0 font-bold text-gray-900">
							{d.count}{" "}
							<span className="text-xs font-semibold text-gray-400">
								{Math.round((d.count / total) * 100)}%
							</span>
						</span>
					</li>
				))}
			</ul>
		</div>
	);
};

const SimpleBars = ({
	data,
	horizontal = false,
	color = PALETTE.teal,
	height = 220,
	unit = "students",
	categoryTitle,
}: {
	data: { label: string; count: number }[];
	horizontal?: boolean;
	color?: string;
	height?: number;
	/** What each bar counts, e.g. "students". Shown as the number-axis title. */
	unit?: string;
	/** Title for the category axis (e.g. "Level"). */
	categoryTitle?: string;
}) => {
	if (!data.length || data.every((d) => d.count === 0)) return <EmptyChart />;
	const numberTitle = `Number of ${unit}`;
	return (
		<ResponsiveContainer
			width="100%"
			height={(horizontal ? Math.max(height, data.length * 34) : height) + 28}
		>
			<BarChart
				data={data}
				layout={horizontal ? "vertical" : "horizontal"}
				margin={{
					left: horizontal ? 8 : 0,
					right: horizontal ? 32 : 12,
					top: 18,
					bottom: 22,
				}}
			>
				<CartesianGrid
					strokeDasharray="3 3"
					stroke="#f1f5f9"
					horizontal={!horizontal}
					vertical={horizontal}
				/>
				{horizontal ? (
					<>
						<XAxis
							type="number"
							allowDecimals={false}
							tick={AXIS_TICK}
							stroke="#cbd5e1"
							label={{
								value: numberTitle,
								position: "insideBottom",
								offset: -12,
								...AXIS_TITLE,
							}}
						/>
						<YAxis
							type="category"
							dataKey="label"
							width={120}
							tick={AXIS_TICK}
							stroke="#cbd5e1"
						/>
					</>
				) : (
					<>
						<XAxis
							dataKey="label"
							tick={AXIS_TICK}
							stroke="#cbd5e1"
							label={
								categoryTitle
									? {
											value: categoryTitle,
											position: "insideBottom",
											offset: -12,
											...AXIS_TITLE,
										}
									: undefined
							}
						/>
						<YAxis
							allowDecimals={false}
							tick={AXIS_TICK}
							stroke="#cbd5e1"
							label={{
								value: numberTitle,
								angle: -90,
								position: "insideLeft",
								offset: 12,
								...AXIS_TITLE,
							}}
						/>
					</>
				)}
				<Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8fafc" }} />
				<Bar
					dataKey="count"
					name={unit.charAt(0).toUpperCase() + unit.slice(1)}
					fill={color}
					radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]}
					maxBarSize={32}
				>
					<LabelList
						dataKey="count"
						position={horizontal ? "right" : "top"}
						style={VALUE_LABEL}
					/>
				</Bar>
			</BarChart>
		</ResponsiveContainer>
	);
};

/** Ranked list with proportional bars: every label stays fully readable, however long. */
const RankedBars = ({
	data,
	color = PALETTE.teal,
	initial = 6,
}: {
	data: { label: string; count: number }[];
	color?: string;
	/** Rows shown before "Show all". */
	initial?: number;
}) => {
	const [expanded, setExpanded] = useState(false);
	const total = data.reduce((n, d) => n + d.count, 0);
	if (!total) return <EmptyChart />;
	const max = Math.max(...data.map((d) => d.count), 1);
	const rows = expanded ? data : data.slice(0, initial);
	return (
		<div>
			<ul className="space-y-3.5">
				{rows.map((d, i) => (
					<li key={d.label}>
						<div className="mb-1.5 flex items-start justify-between gap-3 text-sm">
							<span className="flex min-w-0 items-start gap-2">
								<span className="w-5 shrink-0 text-xs font-bold leading-5 text-gray-400">
									{i + 1}
								</span>
								<span className="wrap-break-word font-semibold leading-5 text-gray-800">
									{d.label}
								</span>
							</span>
							<span className="shrink-0 whitespace-nowrap font-bold leading-5 text-gray-900">
								{d.count}{" "}
								<span className="text-xs font-semibold text-gray-400">
									{Math.round((d.count / total) * 100)}%
								</span>
							</span>
						</div>
						<div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
							<div
								className="h-full rounded-full transition-all"
								style={{
									width: `${(d.count / max) * 100}%`,
									background: color,
								}}
							/>
						</div>
					</li>
				))}
			</ul>
			{data.length > initial ? (
				<button
					type="button"
					onClick={() => setExpanded((v) => !v)}
					className="mt-4 text-sm font-semibold text-teal-600 hover:text-teal-700 print:hidden"
				>
					{expanded ? "Show less" : `Show all ${data.length}`}
				</button>
			) : null}
			<p className="mt-3 text-xs text-gray-400">
				Total: <span className="font-semibold text-gray-600">{total}</span>
			</p>
		</div>
	);
};

const ComplianceBars = ({
	items,
	data,
}: {
	items: readonly { key: string; label: string }[];
	data: CounsellorReport["followUp"]["classroomChecks"];
}) => {
	const rows = items.map((item) => ({
		label: item.label.length > 34 ? `${item.label.slice(0, 32)}…` : item.label,
		Compliant: data[item.key]?.COMPLIANT ?? 0,
		"Partially compliant": data[item.key]?.PARTIAL ?? 0,
		"Non-compliant": data[item.key]?.NON_COMPLIANT ?? 0,
	}));
	if (
		rows.every(
			(r) => r.Compliant + r["Partially compliant"] + r["Non-compliant"] === 0,
		)
	) {
		return <EmptyChart text="No follow-up sessions in this period" />;
	}
	const inside = { ...VALUE_LABEL, fill: "#ffffff" };
	return (
		<ResponsiveContainer
			width="100%"
			height={Math.max(220, rows.length * 38) + 56}
		>
			<BarChart
				data={rows}
				layout="vertical"
				margin={{ left: 8, right: 16, top: 4, bottom: 22 }}
			>
				<CartesianGrid
					strokeDasharray="3 3"
					stroke="#f1f5f9"
					horizontal={false}
				/>
				<XAxis
					type="number"
					allowDecimals={false}
					tick={AXIS_TICK}
					stroke="#cbd5e1"
					label={{
						value: "Number of follow-up sessions",
						position: "insideBottom",
						offset: -12,
						...AXIS_TITLE,
					}}
				/>
				<YAxis
					type="category"
					dataKey="label"
					width={170}
					tick={AXIS_TICK}
					stroke="#cbd5e1"
				/>
				<Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8fafc" }} />
				<Legend
					verticalAlign="top"
					wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
				/>
				<Bar dataKey="Compliant" stackId="a" fill={COMPLIANCE_COLORS.COMPLIANT}>
					<LabelList dataKey="Compliant" formatter={hideZero} style={inside} />
				</Bar>
				<Bar
					dataKey="Partially compliant"
					stackId="a"
					fill={COMPLIANCE_COLORS.PARTIAL}
				>
					<LabelList
						dataKey="Partially compliant"
						formatter={hideZero}
						style={inside}
					/>
				</Bar>
				<Bar
					dataKey="Non-compliant"
					stackId="a"
					fill={COMPLIANCE_COLORS.NON_COMPLIANT}
					radius={[0, 6, 6, 0]}
				>
					<LabelList
						dataKey="Non-compliant"
						formatter={hideZero}
						style={inside}
					/>
				</Bar>
			</BarChart>
		</ResponsiveContainer>
	);
};

/* ───────────────────────── page ───────────────────────── */

export const CounsellorReportPage = () => {
	const { token } = useSession();
	const counsellorsQuery = useCounsellorsQuery(token);
	const counsellors = counsellorsQuery.data?.users ?? [];

	const today = toInputDate(new Date());
	const [counsellorId, setCounsellorId] = useState("");
	const [preset, setPreset] = useState<PresetId>("30d");
	const [customFrom, setCustomFrom] = useState(today);
	const [customTo, setCustomTo] = useState(today);

	const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
	const [eventFilter, setEventFilter] = useState<
		"ALL" | "BREAK" | "DROP" | "RESTART"
	>("ALL");
	const [eventSearch, setEventSearch] = useState("");
	const [eventsShown, setEventsShown] = useState(EVENTS_PAGE);

	const range = useMemo(
		() => resolveRange(preset, customFrom, customTo),
		[preset, customFrom, customTo],
	);
	const reportQuery = useCounsellorReportQuery(token, {
		counsellorId: counsellorId || undefined,
		from: range.from.toISOString(),
		to: range.to.toISOString(),
	});
	const report = reportQuery.data;
	// While a new selection loads, the previous response is kept on screen (dimmed).
	const isUpdating = reportQuery.isFetching && reportQuery.isPlaceholderData;
	const [exportingPdf, setExportingPdf] = useState(false);
	const downloadPdf = async () => {
		if (!report) return;
		setExportingPdf(true);
		try {
			const { generateCounsellorReportPdf } = await import(
				"@/features/reports/report-pdf"
			);
			await generateCounsellorReportPdf(report);
		} catch (error) {
			console.error("PDF export failed", error);
			toast.error("Couldn't create the PDF. Please try again.");
		} finally {
			setExportingPdf(false);
		}
	};
	const selectedCounsellorName = counsellorId
		? (counsellors.find((c) => c.id === counsellorId)?.name ??
			counsellors.find((c) => c.id === counsellorId)?.username ??
			"Counsellor")
		: "All counsellors";

	const filteredEvents = useMemo(() => {
		if (!report) return [];
		const q = eventSearch.trim().toLowerCase();
		return report.events.filter((e) => {
			if (eventFilter !== "ALL" && e.type !== eventFilter) return false;
			if (!q) return true;
			return [e.zid, e.name, e.reason, e.mentorName, e.counsellorName]
				.filter(Boolean)
				.some((v) => String(v).toLowerCase().includes(q));
		});
	}, [report, eventFilter, eventSearch]);

	const exportTemplateCsv = () => {
		if (!report) return;
		const s = report.statusSummary;
		const rows: string[][] = [
			["Student Status Report"],
			[
				"Counsellor",
				report.counsellor?.name ?? "All counsellors",
				"Period",
				`${formatDate(report.range.from)} - ${formatDate(report.range.to)}`,
			],
			["Particulars", "Number"],
			["Total assigned students", String(s.totalAssigned)],
			["Active students", String(s.active)],
			["Students on break", String(s.onBreak)],
			["Students dropped", String(s.dropped)],
			["Students restarted from break", String(s.restartedFromBreak)],
			[],
			["Break & Drop Details"],
			[
				"Student ID",
				"Student name",
				"Status",
				"Reason / details",
				"Date",
				"Mentor",
				"Counsellor",
			],
			...report.events
				.filter((e) => e.type !== "RESTART")
				.map((e) => [
					e.zid.toUpperCase(),
					e.name,
					EVENT_STYLES[e.type].label,
					e.type === "DROP"
						? `${e.reason ?? ""}${e.temporary ? " (temporary)" : ""}`.trim()
						: `${formatDate(e.breakFrom)} to ${formatDate(e.breakUntil)}`,
					formatDate(e.at),
					e.mentorName ?? "",
					e.counsellorName ?? "",
				]),
		];
		downloadCsv(`counsellor-report-${toInputDate(new Date())}.csv`, rows);
	};

	const s = report?.statusSummary;
	const prev = report?.previous;
	const pctOfTotal = (n: number) =>
		s?.totalAssigned
			? `${Math.round((n / s.totalAssigned) * 100)}% of assigned`
			: undefined;

	return (
		<div className="mx-auto max-w-7xl space-y-6">
			{/* Hero + filters */}
			<div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-teal-700 via-teal-600 to-emerald-600 px-6 py-7 text-white shadow-lg">
				<div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10" />
				<div className="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/10" />
				<div className="relative flex flex-wrap items-start justify-between gap-4">
					<div>
						<p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-teal-100">
							Counsellor report
						</p>
						<h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
							{selectedCounsellorName}
						</h1>
						<p className="mt-1 text-sm text-teal-50">
							{`${formatDate(range.from.toISOString())} – ${formatDate(range.to.toISOString())}`}
							{report ? ` · grouped by ${report.range.bucket}` : ""}
							{isUpdating ? (
								<span className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">
									<span className="h-2 w-2 animate-pulse rounded-full bg-white" />
									Updating…
								</span>
							) : null}
						</p>
					</div>
					<div className="flex gap-2 print:hidden">
						<button
							type="button"
							onClick={() => void reportQuery.refetch()}
							className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25"
						>
							<HiArrowPath
								className={`h-4 w-4 ${reportQuery.isFetching ? "animate-spin" : ""}`}
							/>
							Refresh
						</button>
						<button
							type="button"
							onClick={exportTemplateCsv}
							disabled={!report}
							className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25 disabled:opacity-50"
						>
							<HiArrowDownTray className="h-4 w-4" />
							CSV
						</button>
						<button
							type="button"
							onClick={() => void downloadPdf()}
							disabled={!report || isUpdating || exportingPdf}
							className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 disabled:opacity-60"
						>
							<HiDocumentArrowDown className="h-4 w-4" />
							{exportingPdf ? "Preparing PDF…" : "Download PDF"}
						</button>
					</div>
				</div>

				<div className="relative mt-5 space-y-3 print:hidden">
					<div className="flex flex-wrap gap-1.5">
						{PRESETS.map((p) => (
							<button
								key={p.id}
								type="button"
								onClick={() => setPreset(p.id)}
								className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
									preset === p.id
										? "bg-white text-teal-800 shadow"
										: "bg-white/15 text-white hover:bg-white/25"
								}`}
							>
								{p.label}
							</button>
						))}
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<select
							value={counsellorId}
							onChange={(e) => {
								setCounsellorId(e.target.value);
								setEventsShown(EVENTS_PAGE);
							}}
							className="rounded-xl border-0 bg-white px-3.5 py-2 text-sm font-semibold text-gray-900 outline-none ring-2 ring-transparent focus:ring-teal-300"
						>
							<option value="">All counsellors</option>
							{counsellors.map((c) => (
								<option key={c.id} value={c.id}>
									{c.name ?? c.username}
								</option>
							))}
						</select>
						{preset === "custom" ? (
							<div className="flex items-center gap-2 text-sm">
								<input
									type="date"
									value={customFrom}
									max={customTo}
									onChange={(e) => setCustomFrom(e.target.value)}
									className="rounded-xl border-0 bg-white px-3 py-2 text-gray-900 outline-none"
								/>
								<span className="text-teal-100">to</span>
								<input
									type="date"
									value={customTo}
									min={customFrom}
									onChange={(e) => setCustomTo(e.target.value)}
									className="rounded-xl border-0 bg-white px-3 py-2 text-gray-900 outline-none"
								/>
							</div>
						) : null}
					</div>
				</div>
			</div>

			{reportQuery.isError ? (
				<div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
					Couldn't load the report. You may not have permission to view reports,
					or the server is unreachable.
				</div>
			) : null}

			{!report ? (
				reportQuery.isError ? null : (
					<div className="flex items-center justify-center py-24">
						<div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
					</div>
				)
			) : (
				<div
					className={`space-y-6 transition-opacity duration-200 ${isUpdating ? "pointer-events-none opacity-40" : ""}`}
					aria-busy={isUpdating}
				>
					{/* 1. Student status report */}
					<section className="space-y-3">
						<SectionHeading
							title="1. Student status report"
							hint={`Students assigned to ${selectedCounsellorName.toLowerCase()}, with their status as at ${formatDate(report.range.to)} (the end of the selected period). The second row counts what happened inside the period.`}
						/>
						<div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
							<KpiCard
								label="Total assigned"
								value={s?.totalAssigned}
								tone="blue"
								icon={<HiUserGroup className="h-5 w-5" />}
							/>
							<KpiCard
								label="Active students"
								value={s?.active}
								sub={pctOfTotal(s?.active ?? 0)}
								tone="emerald"
								icon={<HiCheckCircle className="h-5 w-5" />}
							/>
							<KpiCard
								label="On break"
								value={s?.onBreak}
								sub={pctOfTotal(s?.onBreak ?? 0)}
								tone="amber"
								icon={<HiPauseCircle className="h-5 w-5" />}
							/>
							<KpiCard
								label="Dropped"
								value={s?.dropped}
								sub={pctOfTotal(s?.dropped ?? 0)}
								tone="rose"
								icon={<HiXCircle className="h-5 w-5" />}
							/>
							<KpiCard
								label="Restarted from break"
								value={s?.restartedFromBreak}
								sub={
									s?.restartedFromDrop
										? `+${s.restartedFromDrop} restarted from drop`
										: "In the selected period"
								}
								tone="teal"
								icon={<HiArrowPath className="h-5 w-5" />}
								trend={
									s && prev
										? trendOf(
												s.restartedFromBreak + s.restartedFromDrop,
												prev.restarts,
												"up",
											)
										: undefined
								}
							/>
						</div>
						<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
							<KpiCard
								label="New admissions"
								value={s?.newAdmissions}
								sub="In the selected period"
								tone="teal"
								icon={<HiUserPlus className="h-5 w-5" />}
								trend={
									s && prev
										? trendOf(s.newAdmissions, prev.newAdmissions, "up")
										: undefined
								}
							/>
							<KpiCard
								label="Breaks started"
								value={s?.breaksStarted}
								sub="In the selected period"
								tone="amber"
								icon={<HiPauseCircle className="h-5 w-5" />}
								trend={
									s && prev
										? trendOf(s.breaksStarted, prev.breaksStarted, "down")
										: undefined
								}
							/>
							<KpiCard
								label="Drops"
								value={s?.dropsInPeriod}
								sub="In the selected period"
								tone="rose"
								icon={<HiXCircle className="h-5 w-5" />}
								trend={
									s && prev
										? trendOf(s.dropsInPeriod, prev.dropsInPeriod, "down")
										: undefined
								}
							/>
							<KpiCard
								label="Follow-up sessions"
								value={s?.sessionsInPeriod}
								sub={`${report.followUp.quickNotesInPeriod} quick notes logged`}
								tone="violet"
								icon={<HiChatBubbleLeftRight className="h-5 w-5" />}
								trend={
									s && prev
										? trendOf(s.sessionsInPeriod, prev.sessionsInPeriod, "up")
										: undefined
								}
							/>
						</div>
					</section>

					{/* Trends */}
					<section className="space-y-3">
						<SectionHeading
							title="Trends over time"
							hint="Click a coloured chip to show or hide that line. The number on each chip is the total for the whole period."
						/>
						<ChartCard
							title="Activity timeline"
							subtitle={`One point per ${report.range.bucket} · horizontal axis = date, vertical axis = number of events`}
							help="Each line counts how many times that event happened in the day / week / month shown along the bottom. A rising line means more of it. Compare admissions with breaks and drops to see whether the student base is growing or shrinking."
						>
							<div className="mb-3 flex flex-wrap gap-2">
								{TREND_SERIES.map((series) => {
									const total = report.trend.reduce(
										(n, t) => n + t[series.key],
										0,
									);
									const hidden = hiddenSeries.includes(series.key);
									return (
										<button
											key={series.key}
											type="button"
											onClick={() =>
												setHiddenSeries((cur) =>
													cur.includes(series.key)
														? cur.filter((k) => k !== series.key)
														: [...cur, series.key],
												)
											}
											className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${hidden ? "border-gray-200 bg-white text-gray-400" : "border-transparent bg-gray-100 text-gray-800"}`}
										>
											<span
												className="h-2.5 w-2.5 rounded-full"
												style={{
													background: hidden ? "#cbd5e1" : series.color,
												}}
											/>
											{series.label}
											<span className="font-bold">{total}</span>
										</button>
									);
								})}
							</div>
							{report.trend.every((t) =>
								TREND_SERIES.every((series) => t[series.key] === 0),
							) ? (
								<EmptyChart />
							) : (
								<ResponsiveContainer width="100%" height={300}>
									<LineChart
										data={report.trend.map((t) => ({
											...t,
											label: formatBucket(t.start, report.range.bucket),
										}))}
										margin={{ left: 0, right: 12, top: 8, bottom: 24 }}
									>
										<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
										<XAxis
											dataKey="label"
											tick={AXIS_TICK}
											stroke="#cbd5e1"
											label={{
												value: `Date (start of each ${report.range.bucket})`,
												position: "insideBottom",
												offset: -14,
												...AXIS_TITLE,
											}}
										/>
										<YAxis
											allowDecimals={false}
											tick={AXIS_TICK}
											stroke="#cbd5e1"
											label={{
												value: "Number of events",
												angle: -90,
												position: "insideLeft",
												offset: 14,
												...AXIS_TITLE,
											}}
										/>
										<Tooltip content={<ChartTooltip />} />
										{TREND_SERIES.map((series) => (
											<Line
												key={series.key}
												type="monotone"
												dataKey={series.key}
												name={series.label}
												stroke={series.color}
												strokeWidth={2.5}
												dot={{ r: 2.5 }}
												hide={hiddenSeries.includes(series.key)}
											/>
										))}
									</LineChart>
								</ResponsiveContainer>
							)}
						</ChartCard>
					</section>

					{/* Students */}
					<section className="space-y-3">
						<SectionHeading
							title="Student breakdown"
							hint={`Who the students were as at ${formatDate(report.range.to)}. Mentor and level are each student's latest values.`}
						/>
						<div className="grid gap-4 lg:grid-cols-3">
							<ChartCard
								title="By status"
								help="Each slice is a share of all students assigned to this counsellor, by what they are doing right now. Green = learning, amber = paused on a break, red = dropped out."
							>
								<Donut
									data={report.distributions.byStatus}
									colors={STATUS_COLORS}
								/>
							</ChartCard>
							<ChartCard
								title="By course type"
								help="How the assigned students split between group classes and individual (one-to-one) classes."
							>
								<Donut data={report.distributions.byCourseType} />
							</ChartCard>
							<ChartCard
								title="By level"
								help="Each bar is a learning level; its height (and the number on top) is how many students are at that level."
							>
								<SimpleBars
									data={report.distributions.byLevel}
									color={PALETTE.blue}
									categoryTitle="Learning level"
								/>
							</ChartCard>
						</div>
						<div className="grid gap-4 lg:grid-cols-2">
							<ChartCard
								title="By mentor"
								subtitle="Top 8 mentors by assigned students"
								help="Mentors are ranked from most to least students. The bar shows each mentor's share relative to the busiest one; the number and percentage are their students out of all assigned."
							>
								<RankedBars
									data={report.distributions.byMentor}
									color={PALETTE.violet}
								/>
							</ChartCard>
							<ChartCard
								title="Drop reasons"
								subtitle="Currently dropped students"
								help="Reasons are ranked from most to least common among currently dropped students. The number is how many students gave that reason, and the percentage is their share of all dropped students."
							>
								<RankedBars
									data={report.distributions.dropReasons}
									color={PALETTE.rose}
								/>
							</ChartCard>
						</div>
					</section>

					{/* 2. Break & drop details */}
					<section className="space-y-3">
						<SectionHeading
							title="2. Break & drop details"
							hint="Every break, drop and restart that happened in the selected period."
						/>
						<div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
							<div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4 print:hidden">
								<div className="flex gap-1 rounded-xl bg-gray-100 p-1">
									{(
										[
											["ALL", "All"],
											["BREAK", "Breaks"],
											["DROP", "Drops"],
											["RESTART", "Restarts"],
										] as const
									).map(([key, label]) => {
										const n =
											key === "ALL"
												? report.events.length
												: report.events.filter((e) => e.type === key).length;
										return (
											<button
												key={key}
												type="button"
												onClick={() => {
													setEventFilter(key);
													setEventsShown(EVENTS_PAGE);
												}}
												className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
													eventFilter === key
														? "bg-white text-teal-700 shadow-sm"
														: "text-gray-500 hover:text-gray-700"
												}`}
											>
												{label} <span className="text-xs opacity-60">{n}</span>
											</button>
										);
									})}
								</div>
								<input
									value={eventSearch}
									onChange={(e) => {
										setEventSearch(e.target.value);
										setEventsShown(EVENTS_PAGE);
									}}
									placeholder="Search ID, name, reason, mentor…"
									className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 sm:w-72"
								/>
							</div>

							{filteredEvents.length === 0 ? (
								<p className="px-5 py-12 text-center text-sm text-gray-400">
									No matching events in this period.
								</p>
							) : (
								<div className="overflow-x-auto">
									<table className="w-full min-w-190 text-left text-sm">
										<thead>
											<tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
												<th className="px-5 py-3 font-semibold">Student ID</th>
												<th className="px-3 py-3 font-semibold">
													Student name
												</th>
												<th className="px-3 py-3 font-semibold">Status</th>
												<th className="px-3 py-3 font-semibold">
													Reason / details
												</th>
												<th className="px-3 py-3 font-semibold">Date</th>
												<th className="px-3 py-3 font-semibold">Mentor</th>
												{!report.counsellor ? (
													<th className="px-3 py-3 font-semibold">
														Counsellor
													</th>
												) : null}
											</tr>
										</thead>
										<tbody className="divide-y divide-gray-50">
											{filteredEvents.slice(0, eventsShown).map((e) => (
												<tr
													key={`${e.studentId}-${e.type}-${e.at}`}
													className="hover:bg-gray-50/70"
												>
													<td className="px-5 py-3 font-mono text-xs font-semibold text-gray-700">
														{e.zid.toUpperCase()}
													</td>
													<td className="px-3 py-3 font-semibold text-gray-900">
														{e.name}
													</td>
													<td className="px-3 py-3">
														<span
															className={`rounded-full px-2.5 py-1 text-xs font-bold ${EVENT_STYLES[e.type].badge}`}
														>
															{EVENT_STYLES[e.type].label}
														</span>
													</td>
													<td className="max-w-xs px-3 py-3 text-gray-600">
														{e.type === "DROP" ? (
															<>
																{e.reason ?? "No reason recorded"}
																{e.temporary ? (
																	<span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
																		Temporary
																	</span>
																) : null}
															</>
														) : e.type === "BREAK" ? (
															`${formatDate(e.breakFrom)} → ${formatDate(e.breakUntil)}`
														) : (
															`Back to active (now ${e.currentStatus.toLowerCase()})`
														)}
													</td>
													<td className="whitespace-nowrap px-3 py-3 text-gray-600">
														{formatDate(e.at)}
													</td>
													<td className="px-3 py-3 text-gray-600">
														{e.mentorName ?? "-"}
													</td>
													{!report.counsellor ? (
														<td className="px-3 py-3 text-gray-600">
															{e.counsellorName ?? "-"}
														</td>
													) : null}
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}

							{filteredEvents.length > eventsShown ? (
								<div className="border-t border-gray-100 p-3 text-center print:hidden">
									<button
										type="button"
										onClick={() => setEventsShown((n) => n + EVENTS_PAGE)}
										className="text-sm font-semibold text-teal-600 hover:text-teal-700"
									>
										Show more ({filteredEvents.length - eventsShown} remaining)
									</button>
								</div>
							) : null}
						</div>
					</section>

					{/* Follow-up quality */}
					<section className="space-y-3">
						<SectionHeading
							title="Follow-up & quality"
							hint={`Measured for the selected period, among students who were active on ${formatDate(report.range.to)}. The grey strip shows today's live follow-up queue.`}
						/>
						<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
							<KpiCard
								label="Students contacted"
								value={report.followUp.contactedInPeriod}
								sub={`${
									report.followUp.contactedInPeriod +
									report.followUp.notContactedInPeriod
										? Math.round(
												(report.followUp.contactedInPeriod /
													(report.followUp.contactedInPeriod +
														report.followUp.notContactedInPeriod)) *
													100,
											)
										: 0
								}% of active students had a follow-up`}
								tone="emerald"
								icon={<HiChatBubbleLeftRight className="h-5 w-5" />}
							/>
							<KpiCard
								label="Not contacted"
								value={report.followUp.notContactedInPeriod}
								sub="Active students with no follow-up in this period"
								tone="rose"
								icon={<HiChatBubbleLeftRight className="h-5 w-5" />}
							/>
							<KpiCard
								label="Needs attention"
								value={report.followUp.needsAttention}
								sub="Flagged in sessions this period"
								tone="amber"
								icon={<HiChatBubbleLeftRight className="h-5 w-5" />}
							/>
							<KpiCard
								label="Parents contacted"
								value={report.followUp.parentContacted}
								sub={`${report.followUp.parentSatisfied} satisfied · ${report.followUp.parentNeedsImprovement} need improvement · ${report.followUp.quickNotesInPeriod} quick notes logged`}
								tone="emerald"
								icon={<HiChatBubbleLeftRight className="h-5 w-5" />}
							/>
						</div>
						<div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-600">
							<span className="text-xs font-bold uppercase tracking-wide text-gray-400">
								Live queue · today
							</span>
							<span>
								<span className="font-bold text-rose-600">
									{report.followUp.dueNow}
								</span>{" "}
								due now
							</span>
							<span>
								<span className="font-bold text-gray-800">
									{report.followUp.upcoming7d}
								</span>{" "}
								in the next 7 days
							</span>
							<span>
								<span className="font-bold text-gray-800">
									{report.followUp.notScheduled}
								</span>{" "}
								not scheduled
							</span>
							<span className="text-xs text-gray-400">
								(these always describe today)
							</span>
						</div>
						<div className="grid gap-4 lg:grid-cols-2">
							<ChartCard
								title="Time since last contact"
								subtitle={`As at ${formatDate(report.range.to)}, for students active then`}
								help="Each bar is a group of active students, based on how long ago they were last followed up. Bars on the left are healthy; tall bars on the right (30+ days, Never) are students who may be slipping through the cracks."
							>
								<SimpleBars
									data={report.followUp.recency}
									color={PALETTE.teal}
									height={240}
									categoryTitle="Time since last follow-up"
								/>
							</ChartCard>
							<ChartCard
								title="Inspection results"
								subtitle="Follow-up sessions in this period"
								help="The overall verdict on each inspection session held in this period. Green = satisfactory, amber = needs improvement, red = urgent attention required."
							>
								<Donut
									data={report.followUp.resultBreakdown}
									colors={RESULT_COLORS}
									unit="sessions"
								/>
							</ChartCard>
						</div>
						<div className="grid gap-4 lg:grid-cols-2">
							<ChartCard
								title="Classroom group inspection"
								subtitle="Compliance per inspection point"
								help="One bar per item on the inspection form. The bar is split by how sessions rated it: green = compliant, amber = partially compliant, red = non-compliant. A lot of red or amber on one row shows where to focus."
							>
								<ComplianceBars
									items={CLASSROOM_CHECK_ITEMS}
									data={report.followUp.classroomChecks}
								/>
							</ChartCard>
							<ChartCard
								title="Class observation"
								subtitle="Compliance per observation point"
								help="Same colours as the chart on the left, but for what was observed during the live class (punctuality, teaching quality and so on)."
							>
								<ComplianceBars
									items={CLASS_OBSERVATION_ITEMS}
									data={report.followUp.classObservation}
								/>
							</ChartCard>
						</div>
					</section>

					{/* Assessments */}
					<section className="space-y-3">
						<SectionHeading
							title="Assessment progress"
							hint={`Students who were active on ${formatDate(report.range.to)}, and how many had completed each assessment by then.`}
						/>
						<ChartCard
							title="Completion"
							help="The filled part of each bar is the share of those students who had finished that assessment by the end of the period (done / total and a percentage). The line underneath counts how many were completed during the period itself."
						>
							<div className="grid gap-5 sm:grid-cols-3">
								<ProgressRow
									label="Oral"
									{...report.assessments.oral}
									extra={`${report.assessments.oral.completedInPeriod} completed in this period`}
									color={PALETTE.teal}
								/>
								<ProgressRow
									label="Written"
									{...report.assessments.written}
									extra={`${report.assessments.written.completedInPeriod} completed in this period`}
									color={PALETTE.blue}
								/>
								<ProgressRow
									label="Level"
									{...report.assessments.level}
									extra={`${report.assessments.level.completedInPeriod} completed in this period`}
									color={PALETTE.violet}
								/>
							</div>
						</ChartCard>
					</section>

					{/* Counsellor comparison */}
					{!report.counsellor && report.counsellors.length > 0 ? (
						<section className="space-y-3">
							<SectionHeading
								title="Counsellor comparison"
								hint="How each counsellor's students are doing."
							/>
							<div className="grid gap-4 lg:grid-cols-2">
								<ChartCard
									title="Students by status"
									help="One bar per counsellor, split into active (green), on break (amber) and dropped (red). The full bar length is how many students that counsellor has."
								>
									<ResponsiveContainer
										width="100%"
										height={Math.max(220, report.counsellors.length * 40)}
									>
										<BarChart
											data={report.counsellors.map((c) => ({
												name: c.name,
												Active: c.active,
												"On break": c.onBreak,
												Dropped: c.dropped,
											}))}
											layout="vertical"
											margin={{ left: 8, right: 16, top: 4, bottom: 24 }}
										>
											<CartesianGrid
												strokeDasharray="3 3"
												stroke="#f1f5f9"
												horizontal={false}
											/>
											<XAxis
												type="number"
												allowDecimals={false}
												tick={AXIS_TICK}
												stroke="#cbd5e1"
												label={{
													value: "Number of students",
													position: "insideBottom",
													offset: -14,
													...AXIS_TITLE,
												}}
											/>
											<YAxis
												type="category"
												dataKey="name"
												width={110}
												tick={{ fontSize: 11 }}
												stroke="#cbd5e1"
											/>
											<Tooltip
												content={<ChartTooltip />}
												cursor={{ fill: "#f8fafc" }}
											/>
											<Legend
												verticalAlign="top"
												wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
											/>
											<Bar dataKey="Active" stackId="s" fill={PALETTE.emerald}>
												<LabelList
													dataKey="Active"
													formatter={hideZero}
													style={{ ...VALUE_LABEL, fill: "#ffffff" }}
												/>
											</Bar>
											<Bar dataKey="On break" stackId="s" fill={PALETTE.amber}>
												<LabelList
													dataKey="On break"
													formatter={hideZero}
													style={{ ...VALUE_LABEL, fill: "#ffffff" }}
												/>
											</Bar>
											<Bar
												dataKey="Dropped"
												stackId="s"
												fill={PALETTE.rose}
												radius={[0, 6, 6, 0]}
											>
												<LabelList
													dataKey="Dropped"
													formatter={hideZero}
													style={{ ...VALUE_LABEL, fill: "#ffffff" }}
												/>
											</Bar>
										</BarChart>
									</ResponsiveContainer>
								</ChartCard>
								<ChartCard title="Leaderboard">
									<div className="overflow-x-auto">
										<table className="w-full min-w-105 text-left text-sm">
											<thead>
												<tr className="text-xs uppercase tracking-wide text-gray-400">
													<th className="py-2 font-semibold">Counsellor</th>
													<th className="px-2 py-2 text-right font-semibold">
														Assigned
													</th>
													<th className="px-2 py-2 text-right font-semibold">
														Sessions
													</th>
													<th className="px-2 py-2 text-right font-semibold">
														Overdue
													</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-gray-50">
												{report.counsellors.map((c) => (
													<tr key={c.id}>
														<td className="py-2.5">
															<button
																type="button"
																onClick={() => setCounsellorId(c.id)}
																className="font-semibold text-gray-900 hover:text-teal-700 print:pointer-events-none"
															>
																{c.name}
															</button>
														</td>
														<td className="px-2 py-2.5 text-right text-gray-700">
															{c.assigned}
														</td>
														<td className="px-2 py-2.5 text-right text-gray-700">
															{c.sessions}
														</td>
														<td
															className={`px-2 py-2.5 text-right font-semibold ${c.overdue ? "text-rose-600" : "text-gray-400"}`}
														>
															{c.overdue}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</ChartCard>
							</div>
						</section>
					) : null}
				</div>
			)}
		</div>
	);
};

export default CounsellorReportPage;
