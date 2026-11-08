import {
	CLASS_OBSERVATION_ITEMS,
	CLASSROOM_CHECK_ITEMS,
	type CounsellorReport,
} from "@repo/schema";
import type { UserOptions } from "jspdf-autotable";

type RGB = [number, number, number];

const COLORS = {
	teal: [13, 148, 136] as RGB,
	tealDark: [15, 118, 110] as RGB,
	emerald: [16, 185, 129] as RGB,
	amber: [245, 158, 11] as RGB,
	rose: [244, 63, 94] as RGB,
	violet: [139, 92, 246] as RGB,
	blue: [59, 130, 246] as RGB,
	slate: [148, 163, 184] as RGB,
	ink: [17, 24, 39] as RGB,
	body: [55, 65, 81] as RGB,
	muted: [107, 114, 128] as RGB,
	line: [229, 231, 235] as RGB,
	track: [241, 245, 249] as RGB,
	white: [255, 255, 255] as RGB,
};

const STATUS_COLORS: Record<string, RGB> = {
	Active: COLORS.emerald,
	"On break": COLORS.amber,
	Dropped: COLORS.rose,
};

const RESULT_COLORS: Record<string, RGB> = {
	Satisfactory: COLORS.emerald,
	"Needs improvement": COLORS.amber,
	"Urgent attention": COLORS.rose,
};

const EVENT_LABEL = {
	BREAK: "Break",
	DROP: "Drop",
	RESTART: "Restarted",
} as const;
const EVENT_COLOR: Record<string, RGB> = {
	BREAK: [180, 83, 9],
	DROP: [190, 18, 60],
	RESTART: [4, 120, 87],
};

const TREND_SERIES = [
	{ key: "admissions", label: "Admissions", color: COLORS.teal },
	{ key: "breaks", label: "Breaks", color: COLORS.amber },
	{ key: "drops", label: "Drops", color: COLORS.rose },
	{ key: "restarts", label: "Restarts", color: COLORS.emerald },
	{ key: "sessions", label: "Follow-up sessions", color: COLORS.violet },
] as const;

type Count = { label: string; count: number };

const fmtDate = (iso?: string) =>
	iso
		? new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" })
		: "-";

const slug = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "") || "report";

const pct = (part: number, whole: number) =>
	whole ? Math.round((part / whole) * 100) : 0;

export const generateCounsellorReportPdf = async (
	report: CounsellorReport,
): Promise<void> => {
	const [{ jsPDF }, { default: autoTable }] = await Promise.all([
		import("jspdf"),
		import("jspdf-autotable"),
	]);

	const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
	const PW = 210;
	const PH = 297;
	const M = 14;
	const CW = PW - M * 2;
	const BOTTOM = PH - 18;
	let y = 0;

	const scopeName = report.counsellor?.name ?? "All counsellors";
	const s = report.statusSummary;
	const prev = report.previous;

	const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
	const stroke = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
	const ink = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
	const font = (size: number, style: "normal" | "bold" = "normal") => {
		doc.setFont("helvetica", style);
		doc.setFontSize(size);
	};
	const ensure = (height: number) => {
		if (y + height > BOTTOM) {
			doc.addPage();
			y = M;
		}
	};

	/* ───────────── page 1 header ───────────── */
	fill(COLORS.teal);
	doc.rect(0, 0, PW, 42, "F");
	fill(COLORS.tealDark);
	doc.circle(PW - 8, 4, 30, "F");

	ink([204, 251, 241]);
	font(8, "bold");
	doc.text("COUNSELLOR REPORT", M, 13);
	ink(COLORS.white);
	font(21, "bold");
	doc.text(scopeName, M, 24);
	font(10);
	doc.text(
		`${fmtDate(report.range.from)}  to  ${fmtDate(report.range.to)}`,
		M,
		32,
	);
	ink([204, 251, 241]);
	font(8);
	doc.text(`Grouped by ${report.range.bucket}`, M, 38);
	doc.text(
		`Generated ${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`,
		PW - M,
		38,
		{ align: "right" },
	);
	y = 52;

	/* ───────────── building blocks ───────────── */
	const section = (title: string, hint?: string) => {
		ensure(hint ? 24 : 16);
		y += 3;
		font(13, "bold");
		ink(COLORS.ink);
		doc.text(title, M, y + 5);
		stroke(COLORS.teal);
		doc.setLineWidth(0.7);
		doc.line(M, y + 7.5, M + 14, y + 7.5);
		y += 11;
		if (hint) {
			font(8.5);
			ink(COLORS.muted);
			const lines = doc.splitTextToSize(hint, CW) as string[];
			doc.text(lines, M, y + 2);
			y += lines.length * 4 + 2;
		}
		y += 2;
	};

	const kpis = (
		items: {
			label: string;
			value: string | number;
			sub?: string;
			color: RGB;
		}[],
	) => {
		const gap = 3;
		const w = (CW - gap * (items.length - 1)) / items.length;
		const h = 27;
		ensure(h + 3);
		items.forEach((item, i) => {
			const x = M + i * (w + gap);
			fill(COLORS.white);
			stroke(COLORS.line);
			doc.setLineWidth(0.3);
			doc.roundedRect(x, y, w, h, 2.5, 2.5, "FD");
			fill(item.color);
			doc.roundedRect(x, y + 4, 1.4, h - 8, 0.7, 0.7, "F");
			font(19, "bold");
			ink(item.color);
			doc.text(String(item.value), x + 5, y + 12);
			font(6.5, "bold");
			ink(COLORS.muted);
			doc.text(item.label.toUpperCase(), x + 5, y + 17.2, { maxWidth: w - 7 });
			if (item.sub) {
				font(6.5);
				const lines = (doc.splitTextToSize(item.sub, w - 8) as string[]).slice(
					0,
					2,
				);
				doc.text(lines, x + 5, y + 21.2);
			}
		});
		y += h + 4;
	};

	const runTable = (options: UserOptions): number => {
		autoTable(doc, {
			startY: y,
			margin: { left: M, right: M, top: M, bottom: 18 },
			theme: "grid",
			styles: {
				font: "helvetica",
				fontSize: 8,
				cellPadding: 2,
				lineColor: COLORS.line,
				lineWidth: 0.2,
				textColor: COLORS.body,
				overflow: "linebreak",
				valign: "middle",
			},
			headStyles: {
				fillColor: COLORS.teal,
				textColor: 255,
				fontStyle: "bold",
			},
			alternateRowStyles: { fillColor: [249, 250, 251] },
			...options,
		});
		return (
			(doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
				?.finalY ?? y
		);
	};

	/* ranked horizontal bars inside a card; returns the card's outer height */
	const rankedCard = (
		x: number,
		top: number,
		w: number,
		title: string,
		data: Count[],
		opts: {
			color: RGB;
			colors?: Record<string, RGB>;
			maxRows?: number;
			forceHeight?: number;
			draw: boolean;
		},
	): number => {
		const pad = 4;
		const innerX = x + pad;
		const innerW = w - pad * 2;
		const total = data.reduce((n, d) => n + d.count, 0);
		const rows = data.slice(0, opts.maxRows ?? 8);
		const hidden = data.length - rows.length;
		const labelW = innerW * 0.4;
		const valueW = 20;
		const barW = innerW - labelW - valueW - 2;
		const max = Math.max(...rows.map((r) => r.count), 1);

		font(7.5);
		const laid = rows.map((r) => {
			const lines = (
				doc.splitTextToSize(r.label, labelW - 1) as string[]
			).slice(0, 2);
			return { r, lines, h: Math.max(6.2, lines.length * 3.5 + 2.6) };
		});
		let h = 11;
		if (!total) h += 8;
		else h += laid.reduce((n, l) => n + l.h, 0) + (hidden > 0 ? 5 : 0);
		h += pad - 1;
		const outer = opts.forceHeight ?? h;

		if (opts.draw) {
			fill(COLORS.white);
			stroke(COLORS.line);
			doc.setLineWidth(0.3);
			doc.roundedRect(x, top, w, outer, 3, 3, "FD");
			font(9, "bold");
			ink(COLORS.ink);
			doc.text(title, innerX, top + 7);
			let ry = top + 11;
			if (!total) {
				font(8);
				ink(COLORS.muted);
				doc.text("No data for this period", innerX, ry + 5);
			} else {
				for (const [i, l] of laid.entries()) {
					const color =
						opts.colors?.[l.r.label] ??
						(opts.colors ? COLORS.slate : opts.color);
					void i;
					font(7.5);
					ink(COLORS.body);
					doc.text(
						l.lines,
						innerX,
						ry + (l.h - l.lines.length * 3.5) / 2 + 2.9,
					);
					const by = ry + (l.h - 3) / 2;
					fill(COLORS.track);
					doc.roundedRect(innerX + labelW, by, barW, 3, 1.5, 1.5, "F");
					fill(color);
					doc.roundedRect(
						innerX + labelW,
						by,
						Math.max((barW * l.r.count) / max, 1.5),
						3,
						1.5,
						1.5,
						"F",
					);
					font(7.5, "bold");
					ink(COLORS.ink);
					doc.text(
						`${l.r.count}  ${pct(l.r.count, total)}%`,
						x + w - pad,
						ry + l.h / 2 + 1,
						{
							align: "right",
						},
					);
					ry += l.h;
				}
				if (hidden > 0) {
					font(7);
					ink(COLORS.muted);
					doc.text(`+ ${hidden} more`, innerX, ry + 3);
				}
			}
		}
		return outer;
	};

	const cardPair = (
		a: {
			title: string;
			data: Count[];
			color: RGB;
			colors?: Record<string, RGB>;
			maxRows?: number;
		},
		b: {
			title: string;
			data: Count[];
			color: RGB;
			colors?: Record<string, RGB>;
			maxRows?: number;
		},
	) => {
		const gap = 4;
		const w = (CW - gap) / 2;
		const ha = rankedCard(M, 0, w, a.title, a.data, { ...a, draw: false });
		const hb = rankedCard(M, 0, w, b.title, b.data, { ...b, draw: false });
		const h = Math.max(ha, hb);
		ensure(h + 4);
		rankedCard(M, y, w, a.title, a.data, { ...a, forceHeight: h, draw: true });
		rankedCard(M + w + gap, y, w, b.title, b.data, {
			...b,
			forceHeight: h,
			draw: true,
		});
		y += h + 5;
	};

	const cardFull = (
		title: string,
		data: Count[],
		color: RGB,
		colors?: Record<string, RGB>,
		maxRows = 10,
	) => {
		const h = rankedCard(M, 0, CW, title, data, {
			color,
			colors,
			maxRows,
			draw: false,
		});
		ensure(h + 4);
		rankedCard(M, y, CW, title, data, { color, colors, maxRows, draw: true });
		y += h + 5;
	};

	/* 100% stacked bars: one row per inspection point */
	const complianceCard = (
		title: string,
		items: readonly { key: string; label: string }[],
		data: CounsellorReport["followUp"]["classroomChecks"],
	) => {
		const pad = 4;
		const labelW = 74;
		const barX = M + pad + labelW;
		const barW = CW - pad * 2 - labelW;
		font(7.5);
		const rows = items.map((item) => {
			const lines = (
				doc.splitTextToSize(item.label, labelW - 2) as string[]
			).slice(0, 3);
			const c = data[item.key] ?? {
				COMPLIANT: 0,
				PARTIAL: 0,
				NON_COMPLIANT: 0,
			};
			return { lines, c, h: Math.max(8, lines.length * 3.5 + 3) };
		});
		const h = 20 + rows.reduce((n, r) => n + r.h, 0) + pad;
		ensure(h + 4);

		fill(COLORS.white);
		stroke(COLORS.line);
		doc.setLineWidth(0.3);
		doc.roundedRect(M, y, CW, h, 3, 3, "FD");
		font(9, "bold");
		ink(COLORS.ink);
		doc.text(title, M + pad, y + 7);

		// legend
		let lx = M + pad;
		for (const [label, color] of [
			["Compliant", COLORS.emerald],
			["Partially compliant", COLORS.amber],
			["Non-compliant", COLORS.rose],
		] as const) {
			fill(color);
			doc.roundedRect(lx, y + 10.3, 3, 3, 0.8, 0.8, "F");
			font(7);
			ink(COLORS.body);
			doc.text(label, lx + 4.5, y + 12.8);
			lx += 4.5 + doc.getTextWidth(label) + 6;
		}

		let ry = y + 17;
		for (const row of rows) {
			font(7.5);
			ink(COLORS.body);
			doc.text(
				row.lines,
				M + pad,
				ry + (row.h - row.lines.length * 3.5) / 2 + 2.9,
			);
			const total = row.c.COMPLIANT + row.c.PARTIAL + row.c.NON_COMPLIANT;
			const by = ry + (row.h - 5) / 2;
			if (!total) {
				fill(COLORS.track);
				doc.roundedRect(barX, by, barW, 5, 1.5, 1.5, "F");
				font(6.5);
				ink(COLORS.muted);
				doc.text("no sessions", barX + 2, by + 3.5);
			} else {
				let bx = barX;
				for (const [value, color] of [
					[row.c.COMPLIANT, COLORS.emerald],
					[row.c.PARTIAL, COLORS.amber],
					[row.c.NON_COMPLIANT, COLORS.rose],
				] as const) {
					if (!value) continue;
					const sw = (barW * value) / total;
					fill(color);
					doc.rect(bx, by, sw, 5, "F");
					if (sw > 5) {
						font(7, "bold");
						ink(COLORS.white);
						doc.text(String(value), bx + sw / 2, by + 3.5, { align: "center" });
					}
					bx += sw;
				}
			}
			ry += row.h;
		}
		y += h + 5;
	};

	/* line chart for the timeline */
	const trendChart = () => {
		const totals = TREND_SERIES.map((series) => ({
			...series,
			total: report.trend.reduce((n, t) => n + t[series.key], 0),
		}));
		const chartH = 62;
		const h = chartH + 22;
		ensure(h + 4);

		fill(COLORS.white);
		stroke(COLORS.line);
		doc.setLineWidth(0.3);
		doc.roundedRect(M, y, CW, h, 3, 3, "FD");

		// legend with totals
		let lx = M + 4;
		for (const series of totals) {
			fill(series.color);
			doc.circle(lx + 1.2, y + 6.2, 1.2, "F");
			font(7.5, "bold");
			ink(COLORS.body);
			const text = `${series.label}  ${series.total}`;
			doc.text(text, lx + 4, y + 7);
			lx += 4 + doc.getTextWidth(text) + 6;
		}

		const px = M + 14;
		const pw = CW - 14 - 6;
		const py = y + 13;
		const ph = chartH - 12;
		const maxVal = Math.max(
			4,
			...report.trend.flatMap((t) =>
				TREND_SERIES.map((series) => t[series.key]),
			),
		);
		const niceMax = Math.ceil(maxVal / 4) * 4;

		font(6.5);
		ink(COLORS.muted);
		doc.text("Number of events", M + 4, y + 11.5);
		for (let i = 0; i <= 4; i++) {
			const gy = py + ph - (ph * i) / 4;
			stroke(COLORS.line);
			doc.setLineWidth(0.2);
			doc.line(px, gy, px + pw, gy);
			doc.text(String(Math.round((niceMax * i) / 4)), px - 2, gy + 1, {
				align: "right",
			});
		}

		const n = report.trend.length;
		const xAt = (i: number) => px + (n <= 1 ? pw / 2 : (pw * i) / (n - 1));
		const yAt = (v: number) => py + ph - (ph * v) / niceMax;

		// x labels (thinned)
		const step = Math.max(1, Math.ceil(n / 9));
		font(6.5);
		ink(COLORS.muted);
		report.trend.forEach((t, i) => {
			if (i % step !== 0 && i !== n - 1) return;
			const label = new Date(t.start).toLocaleDateString("en-IN", {
				timeZone: "UTC",
				day: report.range.bucket === "month" ? undefined : "numeric",
				month: "short",
				year: report.range.bucket === "month" ? "2-digit" : undefined,
			});
			doc.text(label, xAt(i), py + ph + 5, { align: "center" });
		});
		doc.text(
			`Date (start of each ${report.range.bucket})`,
			px + pw / 2,
			py + ph + 9.5,
			{ align: "center" },
		);

		for (const series of TREND_SERIES) {
			stroke(series.color);
			doc.setLineWidth(0.7);
			for (let i = 1; i < n; i++) {
				const a = report.trend[i - 1];
				const b = report.trend[i];
				if (!a || !b) continue;
				doc.line(xAt(i - 1), yAt(a[series.key]), xAt(i), yAt(b[series.key]));
			}
			if (n <= 31) {
				fill(series.color);
				report.trend.forEach((t, i) => {
					doc.circle(xAt(i), yAt(t[series.key]), 0.7, "F");
				});
			}
		}
		y += h + 5;
	};

	const progressRows = () => {
		const rows = [
			{ label: "Oral", stat: report.assessments.oral, color: COLORS.teal },
			{
				label: "Written",
				stat: report.assessments.written,
				color: COLORS.blue,
			},
			{ label: "Level", stat: report.assessments.level, color: COLORS.violet },
		];
		const h = 14 + rows.length * 13;
		ensure(h + 4);
		fill(COLORS.white);
		stroke(COLORS.line);
		doc.setLineWidth(0.3);
		doc.roundedRect(M, y, CW, h, 3, 3, "FD");
		font(9, "bold");
		ink(COLORS.ink);
		doc.text("Completion", M + 4, y + 7);
		let ry = y + 13;
		for (const row of rows) {
			const p = pct(row.stat.done, row.stat.total);
			font(8.5, "bold");
			ink(COLORS.ink);
			doc.text(row.label, M + 4, ry + 3);
			font(7.5);
			ink(COLORS.muted);
			doc.text(
				`${row.stat.done} / ${row.stat.total} students  -  ${p}%   (+${row.stat.completedInPeriod} completed in this period)`,
				M + CW - 4,
				ry + 3,
				{ align: "right" },
			);
			fill(COLORS.track);
			doc.roundedRect(M + 4, ry + 5, CW - 8, 3, 1.5, 1.5, "F");
			if (row.stat.done) {
				fill(row.color);
				doc.roundedRect(
					M + 4,
					ry + 5,
					Math.max(
						((CW - 8) * row.stat.done) / Math.max(row.stat.total, 1),
						1.5,
					),
					3,
					1.5,
					1.5,
					"F",
				);
			}
			ry += 13;
		}
		y += h + 5;
	};

	const delta = (cur: number, before: number) => {
		if (!before && !cur) return "-";
		if (!before) return "new";
		const c = ((cur - before) / before) * 100;
		return `${c >= 0 ? "+" : ""}${c.toFixed(0)}%`;
	};

	/* ───────────── 1. Student status report ───────────── */
	section(
		"1. Student status report",
		`Students assigned to ${scopeName.toLowerCase()}, with their status as at ${fmtDate(report.range.to)} (the end of the selected period).`,
	);

	kpis([
		{ label: "Total assigned", value: s.totalAssigned, color: COLORS.blue },
		{
			label: "Active",
			value: s.active,
			sub: `${pct(s.active, s.totalAssigned)}% of assigned`,
			color: COLORS.emerald,
		},
		{
			label: "On break",
			value: s.onBreak,
			sub: `${pct(s.onBreak, s.totalAssigned)}% of assigned`,
			color: COLORS.amber,
		},
		{
			label: "Dropped",
			value: s.dropped,
			sub: `${pct(s.dropped, s.totalAssigned)}% of assigned`,
			color: COLORS.rose,
		},
		{
			label: "Restarted from break",
			value: s.restartedFromBreak,
			sub: s.restartedFromDrop
				? `+${s.restartedFromDrop} from drop`
				: "In this period",
			color: COLORS.teal,
		},
	]);

	// Template table + period activity side by side
	ensure(60);
	const half = (CW - 6) / 2;
	const y0 = y;
	const leftEnd = runTable({
		startY: y0,
		margin: { left: M, right: M + half + 6 },
		head: [["Particulars", "Number"]],
		body: [
			["Total assigned students", String(s.totalAssigned)],
			["Active students", String(s.active)],
			["Students on break", String(s.onBreak)],
			["Students dropped", String(s.dropped)],
			["Students restarted from break", String(s.restartedFromBreak)],
		],
		columnStyles: { 1: { halign: "right", fontStyle: "bold", cellWidth: 22 } },
	});
	const rightEnd = runTable({
		startY: y0,
		margin: { left: M + half + 6, right: M },
		head: [["In this period", "Now", "Before", "Change"]],
		body: [
			[
				"New admissions",
				String(s.newAdmissions),
				String(prev.newAdmissions),
				delta(s.newAdmissions, prev.newAdmissions),
			],
			[
				"Breaks started",
				String(s.breaksStarted),
				String(prev.breaksStarted),
				delta(s.breaksStarted, prev.breaksStarted),
			],
			[
				"Drops",
				String(s.dropsInPeriod),
				String(prev.dropsInPeriod),
				delta(s.dropsInPeriod, prev.dropsInPeriod),
			],
			[
				"Restarts",
				String(s.restartedFromBreak + s.restartedFromDrop),
				String(prev.restarts),
				delta(s.restartedFromBreak + s.restartedFromDrop, prev.restarts),
			],
			[
				"Follow-up sessions",
				String(s.sessionsInPeriod),
				String(prev.sessionsInPeriod),
				delta(s.sessionsInPeriod, prev.sessionsInPeriod),
			],
		],
		columnStyles: {
			1: { halign: "right", cellWidth: 14 },
			2: { halign: "right", cellWidth: 14 },
			3: { halign: "right", cellWidth: 16, fontStyle: "bold" },
		},
	});
	y = Math.max(leftEnd, rightEnd) + 2;
	font(7);
	ink(COLORS.muted);
	doc.text('"Before" is the previous period of the same length.', M, y + 3);
	y += 8;

	/* ───────────── 2. Break & drop details ───────────── */
	section(
		"2. Break & drop details",
		"Every break, drop and restart that happened in the selected period.",
	);
	if (report.events.length === 0) {
		ensure(16);
		fill([249, 250, 251]);
		doc.roundedRect(M, y, CW, 12, 3, 3, "F");
		font(8.5);
		ink(COLORS.muted);
		doc.text(
			"No breaks, drops or restarts in this period.",
			M + CW / 2,
			y + 7.2,
			{
				align: "center",
			},
		);
		y += 17;
	} else {
		const showCounsellor = !report.counsellor;
		y =
			runTable({
				head: [
					[
						"Student ID",
						"Student name",
						"Type",
						"Reason / details",
						"Date",
						"Mentor",
						...(showCounsellor ? ["Counsellor"] : []),
					],
				],
				body: report.events.map((e) => [
					e.zid.toUpperCase(),
					e.name,
					EVENT_LABEL[e.type],
					e.type === "DROP"
						? `${e.reason ?? "No reason recorded"}${e.temporary ? " (temporary)" : ""}`
						: e.type === "BREAK"
							? `${fmtDate(e.breakFrom)} to ${fmtDate(e.breakUntil)}`
							: `Back to active (now ${e.currentStatus.toLowerCase()})`,
					fmtDate(e.at),
					e.mentorName ?? "-",
					...(showCounsellor ? [e.counsellorName ?? "-"] : []),
				]),
				styles: { fontSize: 7.5, cellPadding: 1.8 },
				columnStyles: {
					0: { cellWidth: 20, font: "courier", fontStyle: "bold" },
					2: { cellWidth: 19, fontStyle: "bold" },
					4: { cellWidth: 22 },
				},
				didParseCell: (data) => {
					if (data.section !== "body" || data.column.index !== 2) return;
					const type = report.events[data.row.index]?.type;
					const color = type ? EVENT_COLOR[type] : undefined;
					if (color) data.cell.styles.textColor = color;
				},
			}) + 6;
	}

	/* ───────────── Trends ───────────── */
	section(
		"Trends over time",
		`How many of each event happened per ${report.range.bucket}.`,
	);
	if (report.trend.every((t) => TREND_SERIES.every((x) => t[x.key] === 0))) {
		ensure(16);
		fill([249, 250, 251]);
		doc.roundedRect(M, y, CW, 12, 3, 3, "F");
		font(8.5);
		ink(COLORS.muted);
		doc.text("No activity in this period.", M + CW / 2, y + 7.2, {
			align: "center",
		});
		y += 17;
	} else {
		trendChart();
	}

	/* ───────────── Student breakdown ───────────── */
	section(
		"Student breakdown",
		`Who the students were as at ${fmtDate(report.range.to)}.`,
	);
	cardPair(
		{
			title: "By status",
			data: report.distributions.byStatus,
			color: COLORS.teal,
			colors: STATUS_COLORS,
		},
		{
			title: "By course type",
			data: report.distributions.byCourseType,
			color: COLORS.blue,
		},
	);
	cardPair(
		{
			title: "By level",
			data: report.distributions.byLevel,
			color: COLORS.blue,
		},
		{
			title: "By mentor (top 8)",
			data: report.distributions.byMentor,
			color: COLORS.violet,
		},
	);
	cardFull(
		"Drop reasons (currently dropped students)",
		report.distributions.dropReasons,
		COLORS.rose,
	);

	/* ───────────── Follow-up & quality ───────────── */
	section(
		"Follow-up & quality",
		`Measured for the selected period, among students who were active on ${fmtDate(report.range.to)}.`,
	);
	const f = report.followUp;
	kpis([
		{
			label: "Students contacted",
			value: f.contactedInPeriod,
			sub: `${pct(f.contactedInPeriod, f.contactedInPeriod + f.notContactedInPeriod)}% of active students`,
			color: COLORS.emerald,
		},
		{
			label: "Not contacted",
			value: f.notContactedInPeriod,
			sub: "No follow-up in this period",
			color: COLORS.rose,
		},
		{
			label: "Needs attention",
			value: f.needsAttention,
			sub: "Flagged in sessions",
			color: COLORS.amber,
		},
		{
			label: "Parents contacted",
			value: f.parentContacted,
			sub: `${f.parentSatisfied} satisfied, ${f.parentNeedsImprovement} need improvement`,
			color: COLORS.teal,
		},
	]);
	ensure(10);
	fill([249, 250, 251]);
	stroke(COLORS.line);
	doc.setLineWidth(0.2);
	doc.roundedRect(M, y, CW, 8, 2, 2, "FD");
	font(7.5, "bold");
	ink(COLORS.muted);
	doc.text("LIVE QUEUE - TODAY", M + 3, y + 5.1);
	font(8);
	ink(COLORS.body);
	doc.text(
		`${f.dueNow} due now   |   ${f.upcoming7d} in the next 7 days   |   ${f.notScheduled} not scheduled   |   ${f.sessionsInPeriod} sessions and ${f.quickNotesInPeriod} quick notes in period`,
		M + 38,
		y + 5.1,
	);
	y += 13;

	cardPair(
		{
			title: "Time since last contact",
			data: f.recency,
			color: COLORS.teal,
			maxRows: 5,
		},
		{
			title: "Inspection results",
			data: f.resultBreakdown,
			color: COLORS.teal,
			colors: RESULT_COLORS,
		},
	);
	complianceCard(
		"Classroom group inspection",
		CLASSROOM_CHECK_ITEMS,
		f.classroomChecks,
	);
	complianceCard(
		"Class observation",
		CLASS_OBSERVATION_ITEMS,
		f.classObservation,
	);

	/* ───────────── Assessments ───────────── */
	section(
		"Assessment progress",
		`Students who were active on ${fmtDate(report.range.to)}, and how many had completed each assessment by then.`,
	);
	progressRows();

	/* ───────────── Counsellor comparison ───────────── */
	if (!report.counsellor && report.counsellors.length > 0) {
		section(
			"Counsellor comparison",
			"How each counsellor's students are doing.",
		);
		y =
			runTable({
				head: [
					[
						"Counsellor",
						"Assigned",
						"Active",
						"On break",
						"Dropped",
						"Sessions",
						"Overdue now",
					],
				],
				body: report.counsellors.map((c) => [
					c.name,
					String(c.assigned),
					String(c.active),
					String(c.onBreak),
					String(c.dropped),
					String(c.sessions),
					String(c.overdue),
				]),
				columnStyles: {
					0: { fontStyle: "bold" },
					1: { halign: "right" },
					2: { halign: "right" },
					3: { halign: "right" },
					4: { halign: "right" },
					5: { halign: "right" },
					6: { halign: "right" },
				},
			}) + 6;
	}

	/* ───────────── notes ───────────── */
	ensure(18);
	font(7);
	ink(COLORS.muted);
	const note = doc.splitTextToSize(
		"Notes: Status, breakdowns, follow-up coverage and assessments are as at the end of the selected period and are rebuilt from each student's change history. Restarts recorded before the previous status was stored are counted as restarts from break. 'Overdue now' and the live queue always describe today.",
		CW,
	) as string[];
	doc.text(note, M, y + 3);

	/* ───────────── footer on every page ───────────── */
	const pages = doc.getNumberOfPages();
	for (let i = 1; i <= pages; i++) {
		doc.setPage(i);
		stroke(COLORS.line);
		doc.setLineWidth(0.3);
		doc.line(M, PH - 12, PW - M, PH - 12);
		font(7.5);
		ink(COLORS.muted);
		doc.text(`Zidnee  -  Counsellor report  -  ${scopeName}`, M, PH - 7.5);
		doc.text(`Page ${i} of ${pages}`, PW - M, PH - 7.5, { align: "right" });
	}

	const date = new Date().toISOString().slice(0, 10);
	doc.save(`counsellor-report-${slug(scopeName)}-${date}.pdf`);
};
