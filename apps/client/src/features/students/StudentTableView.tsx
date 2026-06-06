import type { Student } from "@repo/schema";
import { Link } from "react-router-dom";
import { HiCog6Tooth, HiUserCircle } from "react-icons/hi2";
import { getStudentFollowUpState, getStudentStatusLabel } from "./student-table";

export type StudentTableRow = Student;

// ─── helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
	"bg-teal-500", "bg-blue-500", "bg-violet-500", "bg-rose-500",
	"bg-amber-500", "bg-emerald-500", "bg-cyan-500", "bg-indigo-500",
];
function avatarColor(id: string) {
	let h = 0;
	for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
	return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length] ?? "bg-teal-500";
}

const LEVEL_LABELS: Record<string | number, string> = {
	1: "Seed", 2: "Sprout", 3: "Root", 4: "Leaf", 5: "Bud", 6: "Bloom", 7: "Fruit",
};
const LEVEL_COLORS: Record<string | number, string> = {
	1: "bg-lime-100 text-lime-700", 2: "bg-emerald-100 text-emerald-700",
	3: "bg-teal-100 text-teal-700", 4: "bg-cyan-100 text-cyan-700",
	5: "bg-sky-100 text-sky-700", 6: "bg-violet-100 text-violet-700",
	7: "bg-orange-100 text-orange-700",
};

function levelInfo(raw?: string | number | null) {
	if (raw === undefined || raw === null || raw === "") return null;
	const k = typeof raw === "number" ? raw : Number(raw);
	return { label: LEVEL_LABELS[k] ?? String(raw), color: LEVEL_COLORS[k] ?? "bg-gray-100 text-gray-600" };
}

const URGENCY_BORDER: Record<string, string> = {
	"Past Due":    "border-l-red-500",
	"Today":       "border-l-amber-400",
	"Upcoming":    "border-l-emerald-400",
	"No Follow-up":"border-l-gray-200",
};
const URGENCY_DOT: Record<string, string> = {
	"Past Due":    "bg-red-500",
	"Today":       "bg-amber-400",
	"Upcoming":    "bg-emerald-500",
	"No Follow-up":"bg-gray-300",
};
const URGENCY_BADGE: Record<string, string> = {
	"Past Due": "bg-red-100 text-red-700",
	"Today":    "bg-amber-100 text-amber-700",
};

const STATUS_BADGE: Record<string, string> = {
	STUDENT: "bg-emerald-100 text-emerald-800",
	BREAK:   "bg-amber-100 text-amber-800",
	DROPPED: "bg-gray-100 text-gray-600",
};

function fmtDate(val?: Date | string | null) {
	if (!val) return null;
	const d = val instanceof Date ? val : new Date(val);
	if (Number.isNaN(d.getTime())) return null;
	return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ─── component ────────────────────────────────────────────────────────────────

type Props = {
	students: StudentTableRow[];
	mentorNameById: Record<string, string>;
	groupLabelByBatchId?: Record<string, string>;
	onAddToGroup?: (s: StudentTableRow) => void;
	canAddToGroup?: boolean;
	emptyMessage?: string;
};

export function StudentTableView({
	students,
	mentorNameById,
	groupLabelByBatchId,
	onAddToGroup,
	canAddToGroup,
	emptyMessage = "No students match the current filter.",
}: Props) {
	if (students.length === 0) {
		return (
			<div className="py-16 text-center">
				<HiUserCircle className="mx-auto h-10 w-10 text-gray-200" />
				<p className="mt-2 text-sm text-gray-400">{emptyMessage}</p>
			</div>
		);
	}

	return (
		<div className="overflow-x-auto">
			<table className="min-w-full border-collapse text-sm">
				<thead>
					<tr className="border-b border-gray-100 bg-gray-50/80">
						<th className="py-2.5 pl-5 pr-4 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Student</th>
						<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Group · Level</th>
						<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Mentor</th>
						<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Follow-up</th>
						<th className="px-4 py-2.5 pr-5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Status</th>
					</tr>
				</thead>
				<tbody>
					{students.map((s) => {
						const fu = getStudentFollowUpState(s.customNextFollowUpAt, s.nextFollowUpAt);
						const fuDate = fmtDate(s.customNextFollowUpAt ?? s.nextFollowUpAt);
						const level = levelInfo(s.level);
						const hasProcess = Boolean(s.processId || s.processLabel);
						const mentor = s.mentorId ? (mentorNameById[s.mentorId] ?? null) : null;
						const borderCls = URGENCY_BORDER[fu.label] ?? "border-l-gray-200";
						const dotCls = URGENCY_DOT[fu.label] ?? "bg-gray-300";
						const badgeCls = URGENCY_BADGE[fu.label];
						const groupLabel = s.batchId ? (groupLabelByBatchId?.[s.batchId] ?? s.batchId) : null;

						return (
							<tr
								key={s.id}
								className="group border-b border-gray-100 transition-colors duration-75 hover:bg-slate-50"
							>
								{/* Student — left urgency border lives here */}
								<td className={`border-l-[3px] ${borderCls} py-3.5 pl-3 pr-6`}>
									<div className="flex items-center gap-3 min-w-0">
										<div
											className={`h-9 w-9 shrink-0 rounded-full ${avatarColor(s.id)} flex items-center justify-center text-xs font-bold text-white select-none`}
											aria-hidden="true"
										>
											{(s.name ?? s.zid)[0]?.toUpperCase()}
										</div>
										<div className="min-w-0">
											<Link
												to={`/students/${s.id}`}
												className="block font-bold text-teal-700 hover:underline leading-tight"
											>
												{s.zid.toUpperCase()}
											</Link>
											{s.name
												? <p className="text-xs text-gray-500 truncate leading-snug">{s.name}</p>
												: null}
											{s.phone
												? <p className="text-[11px] text-gray-400 leading-snug">{s.phone}</p>
												: null}
										</div>
									</div>
								</td>

								{/* Group · Level */}
								<td className="px-4 py-3.5">
									{s.courseType === "GROUP" ? (
										<div className="flex flex-col gap-1">
											{groupLabel ? (
												<span className="inline-flex w-fit items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
													{groupLabel}
												</span>
											) : onAddToGroup && canAddToGroup ? (
												<button
													type="button"
													onClick={() => onAddToGroup(s)}
													className="inline-flex w-fit items-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-200"
												>
													+ Add to group
												</button>
											) : (
												<span className="text-xs text-gray-400">—</span>
											)}
											{level ? (
												<span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${level.color}`}>
													{level.label}
												</span>
											) : null}
										</div>
									) : (
										<div className="flex flex-col gap-1">
											<span className="inline-flex w-fit rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-700">
												Individual
											</span>
											{level ? (
												<span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${level.color}`}>
													{level.label}
												</span>
											) : null}
										</div>
									)}
								</td>

								{/* Mentor */}
								<td className="px-4 py-3.5">
									{mentor ? (
										<span className="text-sm text-gray-700">{mentor}</span>
									) : (
										<span className="text-xs text-gray-400">—</span>
									)}
								</td>

								{/* Follow-up */}
								<td className="px-4 py-3.5">
									<div className="flex flex-col gap-0.5">
										<div className="flex items-center gap-2">
											<span className={`h-2 w-2 shrink-0 rounded-full ${dotCls}`} />
											{fuDate ? (
												<span className="text-sm font-medium text-gray-700">{fuDate}</span>
											) : (
												<span className="text-xs text-gray-400">Not set</span>
											)}
										</div>
										{badgeCls ? (
											<span className={`ml-4 inline-flex w-fit rounded-full px-1.5 py-px text-[10px] font-semibold ${badgeCls}`}>
												{fu.label}
											</span>
										) : null}
									</div>
								</td>

								{/* Status / Process */}
								<td className="px-4 py-3.5 pr-5">
									{hasProcess ? (
										<span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
											<HiCog6Tooth className="h-3 w-3" />
											{s.processLabel ?? "In process"}
										</span>
									) : (
										<span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_BADGE[s.status] ?? "bg-gray-100 text-gray-600"}`}>
											{getStudentStatusLabel(s.status)}
										</span>
									)}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
