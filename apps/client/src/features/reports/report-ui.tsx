import type { ReactNode } from "react";

export const PALETTE = {
	teal: "#0d9488",
	emerald: "#10b981",
	amber: "#f59e0b",
	rose: "#f43f5e",
	violet: "#8b5cf6",
	blue: "#3b82f6",
	sky: "#0ea5e9",
	slate: "#94a3b8",
} as const;

export const SERIES_COLORS = [
	PALETTE.teal,
	PALETTE.blue,
	PALETTE.violet,
	PALETTE.amber,
	PALETTE.rose,
	PALETTE.sky,
	PALETTE.emerald,
	PALETTE.slate,
];

type TooltipPayload = {
	name?: string | number;
	value?: string | number;
	color?: string;
	fill?: string;
};

export const ChartTooltip = ({
	active,
	payload,
	label,
}: {
	active?: boolean;
	payload?: TooltipPayload[];
	label?: string | number;
}) => {
	if (!active || !payload?.length) return null;
	return (
		<div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs shadow-lg">
			{label !== undefined ? (
				<p className="mb-1.5 font-semibold text-gray-700">{label}</p>
			) : null}
			{payload.map((p) => (
				<p
					key={String(p.name)}
					style={{ color: p.color ?? p.fill }}
					className="flex items-center gap-2"
				>
					<span className="font-medium">{p.name}:</span>
					<span className="font-bold">{p.value}</span>
				</p>
			))}
		</div>
	);
};

export const SectionHeading = ({
	title,
	hint,
	action,
}: {
	title: string;
	hint?: string;
	action?: ReactNode;
}) => (
	<div className="flex flex-wrap items-end justify-between gap-2">
		<div>
			<h2 className="text-lg font-bold tracking-tight text-gray-900">
				{title}
			</h2>
			{hint ? <p className="text-sm text-gray-500">{hint}</p> : null}
		</div>
		{action}
	</div>
);

export const ChartCard = ({
	title,
	subtitle,
	help,
	action,
	children,
	className = "",
}: {
	title: string;
	subtitle?: string;
	/** Plain-language "how to read this chart" caption. */
	help?: string;
	action?: ReactNode;
	children: ReactNode;
	className?: string;
}) => (
	<section
		className={`rounded-3xl border border-gray-200 bg-white p-5 shadow-sm print:break-inside-avoid ${className}`}
	>
		<div className="mb-3 flex items-start justify-between gap-3">
			<div>
				<h3 className="text-sm font-bold text-gray-900">{title}</h3>
				{subtitle ? <p className="text-xs text-gray-500">{subtitle}</p> : null}
			</div>
			{action}
		</div>
		{help ? (
			<p className="mb-3 rounded-xl bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-500">
				<span className="font-semibold text-gray-600">How to read: </span>
				{help}
			</p>
		) : null}
		{children}
	</section>
);

export const EmptyChart = ({
	text = "No data for this period",
}: {
	text?: string;
}) => (
	<div className="flex h-40 items-center justify-center rounded-2xl bg-gray-50 text-sm text-gray-400">
		{text}
	</div>
);

const KPI_TONES = {
	teal: "bg-teal-50 text-teal-700",
	emerald: "bg-emerald-50 text-emerald-700",
	amber: "bg-amber-50 text-amber-700",
	rose: "bg-rose-50 text-rose-700",
	violet: "bg-violet-50 text-violet-700",
	blue: "bg-blue-50 text-blue-700",
} as const;

export type Trend = { label: string; good: boolean; neutral: boolean };

/** Percentage change vs the previous period. `goodWhen` says which direction is positive news. */
export const trendOf = (
	current: number,
	previous: number,
	goodWhen: "up" | "down",
): Trend => {
	if (previous === 0 && current === 0) {
		return { label: "no change", good: true, neutral: true };
	}
	if (previous === 0) {
		return { label: "new", good: goodWhen === "up", neutral: false };
	}
	const change = ((current - previous) / previous) * 100;
	const up = change >= 0;
	return {
		label: `${up ? "+" : ""}${change.toFixed(0)}%`,
		good: goodWhen === "up" ? up : !up,
		neutral: change === 0,
	};
};

export const KpiCard = ({
	label,
	value,
	sub,
	tone,
	icon,
	trend,
}: {
	label: string;
	value: ReactNode;
	sub?: string;
	tone: keyof typeof KPI_TONES;
	icon: ReactNode;
	trend?: Trend;
}) => (
	<div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm print:break-inside-avoid">
		<div className="flex items-center justify-between">
			<span
				className={`flex h-9 w-9 items-center justify-center rounded-xl ${KPI_TONES[tone]}`}
			>
				{icon}
			</span>
			{trend ? (
				<span
					className={`rounded-full px-2 py-0.5 text-xs font-bold ${
						trend.neutral
							? "bg-gray-100 text-gray-500"
							: trend.good
								? "bg-emerald-100 text-emerald-700"
								: "bg-rose-100 text-rose-700"
					}`}
					title="Compared with the previous period of the same length"
				>
					{trend.label}
				</span>
			) : null}
		</div>
		<p className="mt-3 text-3xl font-bold tracking-tight text-gray-900">
			{value}
		</p>
		<p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
			{label}
		</p>
		{sub ? <p className="mt-1 text-xs text-gray-500">{sub}</p> : null}
	</div>
);

export const ProgressRow = ({
	label,
	done,
	total,
	color = PALETTE.teal,
	extra,
}: {
	label: string;
	done: number;
	total: number;
	color?: string;
	/** Small note under the bar, e.g. what changed in the period. */
	extra?: string;
}) => {
	const pct = total ? Math.round((done / total) * 100) : 0;
	return (
		<div>
			<div className="mb-1 flex items-baseline justify-between text-sm">
				<span className="font-semibold text-gray-800">{label}</span>
				<span className="text-xs text-gray-500">
					{done}/{total} ·{" "}
					<span className="font-bold text-gray-800">{pct}%</span>
				</span>
			</div>
			<div className="h-2 overflow-hidden rounded-full bg-gray-100">
				<div
					className="h-full rounded-full transition-all"
					style={{ width: `${pct}%`, background: color }}
				/>
			</div>
			{extra ? <p className="mt-1.5 text-xs text-gray-500">{extra}</p> : null}
		</div>
	);
};
