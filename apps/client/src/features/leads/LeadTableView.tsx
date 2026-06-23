import type { LeadResponse } from "@repo/schema";
import { Link } from "react-router-dom";
import { HiStar, HiPhone } from "react-icons/hi2";
import { getLatestLeadDemo } from "@/features/dashboard/lead-demo-utils";
import type { LeadStageId } from "@/features/leads/lead-stage-filters";
import type { LeadTableAction } from "@/features/dashboard/lead-table";
import { getLeadUrgency } from "@/features/dashboard/lead-table";

// ─── helpers ──────────────────────────────────────────────────────────────────

const URGENCY_BORDER: Record<string, string> = {
	past:     "border-l-red-500",
	today:    "border-l-amber-400",
	upcoming: "border-l-emerald-400",
	neutral:  "border-l-gray-200",
};
const URGENCY_DOT: Record<string, string> = {
	past:     "bg-red-500",
	today:    "bg-amber-400",
	upcoming: "bg-emerald-500",
	neutral:  "bg-gray-300",
};
const URGENCY_BADGE: Record<string, string> = {
	past:  "bg-red-100 text-red-700",
	today: "bg-amber-100 text-amber-700",
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
	CLOSED:         { bg: "bg-slate-100",    text: "text-slate-600",    dot: "bg-slate-400",    label: "Deleted" },
	CONVERTED:      { bg: "bg-teal-100",     text: "text-teal-700",     dot: "bg-teal-500",     label: "Converted" },
	DEMO_COMPLETED: { bg: "bg-violet-100",   text: "text-violet-700",   dot: "bg-violet-500",   label: "Demo Done" },
	DEMO_ASSIGNED:  { bg: "bg-emerald-100",  text: "text-emerald-700",  dot: "bg-emerald-500",  label: "Demo Scheduled" },
	DEMO_REQUEST:   { bg: "bg-orange-100",   text: "text-orange-700",   dot: "bg-orange-500",   label: "Demo Request" },
	FORM_FILLED:    { bg: "bg-cyan-100",     text: "text-cyan-700",     dot: "bg-cyan-500",     label: "Form Filled" },
	FORM_SENT:      { bg: "bg-amber-100",    text: "text-amber-700",    dot: "bg-amber-500",    label: "Form Sent" },
};
const DEFAULT_STATUS = { bg: "bg-lime-100", text: "text-lime-700", dot: "bg-lime-500", label: "Follow Up" };

function getStatus(lead: LeadResponse) {
	return STATUS_CONFIG[lead.status] ?? DEFAULT_STATUS;
}

function fmtDate(val?: string | Date | null) {
	if (!val) return null;
	const d = typeof val === "string" ? new Date(val) : val;
	if (Number.isNaN(d.getTime())) return null;
	return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ─── component ────────────────────────────────────────────────────────────────

type Props = {
	leads: LeadResponse[];
	activeStage?: LeadStageId;
	userNameById?: Map<string, string>;
	getActions?: (lead: LeadResponse) => LeadTableAction[];
};

export function LeadTableView({ leads, activeStage, userNameById, getActions }: Props) {
	const showHandler = activeStage === "demoRequest" || activeStage === "demoAssigned" || activeStage === "demoCompleted";

	if (leads.length === 0) {
		return (
			<div className="py-16 text-center">
				<HiPhone className="mx-auto h-10 w-10 text-gray-200" />
				<p className="mt-2 text-sm text-gray-400">No leads found.</p>
			</div>
		);
	}

	return (
		<div className="overflow-x-auto">
			<table className="min-w-full border-collapse text-sm">
				<thead>
					<tr className="border-b border-gray-100 bg-gray-50/80">
						<th className="py-2.5 pl-5 pr-4 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Lead</th>
						<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Stage</th>
						{showHandler
							? <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Handler</th>
							: null}
						<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Follow-up</th>
						<th className="px-4 py-2.5 pr-5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400" />
					</tr>
				</thead>
				<tbody>
					{leads.map((lead) => {
						const urgency = getLeadUrgency(lead);
						const status = getStatus(lead);
						const latestDemo = getLatestLeadDemo(lead);
						const borderCls = URGENCY_BORDER[urgency.tone] ?? "border-l-gray-200";
						const dotCls = URGENCY_DOT[urgency.tone] ?? "bg-gray-300";
						const badgeCls = URGENCY_BADGE[urgency.tone];
						const fuDate = fmtDate(lead.nextFollowUpAt ? String(lead.nextFollowUpAt) : null);

						// Handler
						let handlerName: string | null = null;
						if (activeStage === "demoRequest") {
							handlerName = lead.demoRequestAssignedTo ? (userNameById?.get(lead.demoRequestAssignedTo) ?? null) : null;
						} else if (activeStage === "demoAssigned" || activeStage === "demoCompleted") {
							handlerName = latestDemo?.mentorId ? (userNameById?.get(latestDemo.mentorId) ?? null) : null;
						}

						const actions = getActions ? getActions(lead) : [];

						return (
							<tr
								key={lead.id}
								className="group border-b border-gray-100 transition-colors duration-75 hover:bg-slate-50"
							>
								{/* Lead — left urgency border */}
								<td className={`border-l-[3px] ${borderCls} py-3.5 pl-3 pr-6`}>
									<div className="flex items-start gap-3 min-w-0">
										{/* Avatar / status circle */}
										<div className={`mt-0.5 h-8 w-8 shrink-0 rounded-full ${status.bg} flex items-center justify-center`}>
											<span className={`text-xs font-bold ${status.text}`}>
												{(lead.name ?? lead.phone ?? "?")[0]?.toUpperCase()}
											</span>
										</div>
										<div className="min-w-0">
											<Link
												to={`/leads/${lead.id}`}
												className="block font-bold text-blue-600 hover:underline leading-tight"
											>
												{lead.phone}
											</Link>
											{lead.name
												? <p className="text-xs text-gray-500 truncate leading-snug">{lead.name}</p>
												: null}
											{lead.isOrganic ? (
												<span className="mt-0.5 inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
													<HiStar className="h-2.5 w-2.5" /> Organic
												</span>
											) : null}
											{(lead.price || lead.admissionFee) ? (
												<div className="mt-1 flex flex-wrap gap-1">
													{lead.price ? (
														<span className="inline-flex rounded-full bg-emerald-50 px-1.5 py-px text-[10px] font-semibold text-emerald-700">
															₹{lead.price}
														</span>
													) : null}
													{lead.admissionFee ? (
														<span className="inline-flex rounded-full bg-violet-50 px-1.5 py-px text-[10px] font-semibold text-violet-700">
															Adm: ₹{lead.admissionFee}
														</span>
													) : null}
												</div>
											) : null}
										</div>
									</div>
								</td>

								{/* Stage badge */}
								<td className="px-4 py-3.5">
									<div className="flex items-center gap-1.5">
										<span className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`} />
										<span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.bg} ${status.text}`}>
											{status.label}
										</span>
									</div>
								</td>

								{/* Handler */}
								{showHandler ? (
									<td className="px-4 py-3.5">
										{handlerName
											? <span className="text-sm text-gray-700">{handlerName}</span>
											: <span className="text-xs text-gray-400">—</span>}
									</td>
								) : null}

								{/* Follow-up */}
								<td className="px-4 py-3.5">
									<div className="flex flex-col gap-0.5">
										<div className="flex items-center gap-2">
											<span className={`h-2 w-2 shrink-0 rounded-full ${dotCls}`} />
											{fuDate
												? <span className="text-sm font-medium text-gray-700">{fuDate}</span>
												: <span className="text-xs text-gray-400">Not set</span>}
										</div>
										{badgeCls ? (
											<span className={`ml-4 inline-flex w-fit rounded-full px-1.5 py-px text-[10px] font-semibold ${badgeCls}`}>
												{urgency.label}
											</span>
										) : null}
									</div>
								</td>

								{/* Actions */}
								<td className="px-4 py-3.5 pr-5">
									<div className="flex flex-wrap items-center gap-1.5">
										{actions.map((action) =>
											action.to ? (
												<Link
													key={action.key}
													to={action.to(lead)}
													className={action.className ?? "inline-flex items-center rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"}
												>
													{action.label}
												</Link>
											) : (
												<button
													key={action.key}
													type="button"
													onClick={() => action.onClick?.(lead)}
													className={action.className ?? "inline-flex items-center rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"}
												>
													{action.label}
												</button>
											),
										)}
									</div>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
