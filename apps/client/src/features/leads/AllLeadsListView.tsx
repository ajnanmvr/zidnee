import type { LeadResponse } from "@repo/schema";
import { Link } from "react-router-dom";
import { HiChevronRight, HiPhone, HiStar } from "react-icons/hi2";
import { getLeadUrgency } from "@/features/dashboard/lead-table";

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
	CLOSED:         { bg: "bg-slate-100",   text: "text-slate-600",   dot: "bg-slate-400",   label: "Deleted" },
	CONVERTED:      { bg: "bg-teal-100",    text: "text-teal-700",    dot: "bg-teal-500",    label: "Converted" },
	DEMO_COMPLETED: { bg: "bg-violet-100",  text: "text-violet-700",  dot: "bg-violet-500",  label: "Demo Done" },
	DEMO_ASSIGNED:  { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", label: "Demo Scheduled" },
	DEMO_REQUEST:   { bg: "bg-orange-100",  text: "text-orange-700",  dot: "bg-orange-500",  label: "Demo Request" },
	FORM_FILLED:    { bg: "bg-cyan-100",    text: "text-cyan-700",    dot: "bg-cyan-500",    label: "Form Filled" },
	FORM_SENT:      { bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-500",   label: "Form Sent" },
};
const DEFAULT_STATUS = { bg: "bg-lime-100", text: "text-lime-700", dot: "bg-lime-500", label: "Follow Up" };

const URGENCY_TEXT: Record<string, string> = {
	past: "text-red-600",
	today: "text-amber-600",
	upcoming: "text-emerald-600",
	neutral: "text-gray-400",
};

function getStatus(lead: LeadResponse) {
	return STATUS_CONFIG[lead.status] ?? DEFAULT_STATUS;
}

function fmtDate(val?: string | Date | null) {
	if (!val) return null;
	const d = typeof val === "string" ? new Date(val) : val;
	if (Number.isNaN(d.getTime())) return null;
	return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

type Props = {
	leads: LeadResponse[];
};

export function AllLeadsListView({ leads }: Props) {
	if (leads.length === 0) {
		return (
			<div className="py-16 text-center">
				<HiPhone className="mx-auto h-10 w-10 text-gray-200" />
				<p className="mt-2 text-sm text-gray-400">No leads found.</p>
			</div>
		);
	}

	return (
		<ul className="divide-y divide-gray-100">
			{leads.map((lead) => {
				const status = getStatus(lead);
				const urgency = getLeadUrgency(lead);
				const fuDate = fmtDate(lead.nextFollowUpAt ? String(lead.nextFollowUpAt) : null);
				const urgencyCls = URGENCY_TEXT[urgency.tone] ?? "text-gray-400";

				return (
					<li key={lead.id}>
						<Link
							to={`/leads/${lead.id}`}
							className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50"
						>
							{/* Avatar */}
							<div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${status.bg}`}>
								<span className={`text-sm font-bold ${status.text}`}>
									{(lead.name ?? lead.phone ?? "?")[0]?.toUpperCase()}
								</span>
							</div>

							{/* Name / phone */}
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2">
									<p className="truncate text-sm font-bold text-gray-900">
										{lead.name ?? lead.phone}
									</p>
									{lead.isOrganic ? (
										<span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
											<HiStar className="h-2.5 w-2.5" /> Organic
										</span>
									) : null}
								</div>
								<p className="truncate text-xs text-gray-500">{lead.phone}</p>
								{(lead.price || lead.admissionFee) ? (
									<div className="mt-0.5 flex flex-wrap gap-1">
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

							{/* Status pill */}
							<span className={`hidden shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline-flex ${status.bg} ${status.text}`}>
								<span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
								{status.label}
							</span>

							{/* Follow-up */}
							<div className="hidden w-28 shrink-0 text-right md:block">
								{fuDate ? (
									<>
										<p className={`text-sm font-medium ${urgencyCls}`}>{fuDate}</p>
										<p className="text-[11px] text-gray-400">{urgency.label}</p>
									</>
								) : (
									<p className="text-xs text-gray-400">No follow-up</p>
								)}
							</div>

							<HiChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
						</Link>
					</li>
				);
			})}
		</ul>
	);
}
