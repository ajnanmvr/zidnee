import type { Student } from "@repo/schema";
import type { ColumnDef } from "@tanstack/react-table";
import { HiCog6Tooth } from "react-icons/hi2";
import { Link } from "react-router-dom";

export type StudentTableRow = Student;

type FollowUpState = {
	label: "Today" | "Past Due" | "Upcoming" | "No Follow-up";
	className: string;
	priority: number;
};

const toValidDate = (value?: Date | string | null): Date | null => {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
};

const isSameDay = (left: Date, right: Date) =>
	left.getFullYear() === right.getFullYear() &&
	left.getMonth() === right.getMonth() &&
	left.getDate() === right.getDate();

export const getStudentFollowUpState = (
	customNextFollowUpAt?: Date | string | null,
	nextFollowUpAt?: Date | string | null,
): FollowUpState => {
	const followUpDate = toValidDate(customNextFollowUpAt) ?? toValidDate(nextFollowUpAt);
	if (!followUpDate) {
		return { label: "No Follow-up", className: "bg-gray-100 text-gray-700", priority: 3 };
	}
	const now = new Date();
	if (isSameDay(followUpDate, now)) {
		return { label: "Today", className: "bg-amber-100 text-amber-800", priority: 0 };
	}
	if (followUpDate.getTime() < now.getTime()) {
		return { label: "Past Due", className: "bg-red-100 text-red-800", priority: 1 };
	}
	return { label: "Upcoming", className: "bg-emerald-100 text-emerald-800", priority: 2 };
};

const LEVEL_LABELS: Record<string | number, string> = {
	1: "Seed", 2: "Sprout", 3: "Root", 4: "Leaf", 5: "Bud", 6: "Bloom", 7: "Fruit",
};

const LEVEL_COLORS: Record<string | number, string> = {
	1: "bg-lime-100 text-lime-700",
	2: "bg-emerald-100 text-emerald-700",
	3: "bg-teal-100 text-teal-700",
	4: "bg-cyan-100 text-cyan-700",
	5: "bg-sky-100 text-sky-700",
	6: "bg-violet-100 text-violet-700",
	7: "bg-orange-100 text-orange-700",
};

function getInitial(name?: string | null): string {
	return (name ?? "?")[0]?.toUpperCase() ?? "?";
}

const AVATAR_COLORS = [
	"bg-teal-500", "bg-blue-500", "bg-violet-500", "bg-rose-500",
	"bg-amber-500", "bg-emerald-500", "bg-cyan-500", "bg-indigo-500",
];

function getAvatarColor(id: string): string {
	let hash = 0;
	for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
	return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] ?? "bg-teal-500";
}

export const buildStudentColumns = (
	getColorByStatus: (status: string) => string,
	mentorNameById: Record<string, string>,
	options?: {
		groupLabelByBatchId?: Record<string, string>;
		onAddToGroup?: (student: StudentTableRow) => void;
		canAddToGroup?: boolean;
	},
): ColumnDef<StudentTableRow>[] => {
	return [
		{
			id: "student",
			header: "Student",
			cell: ({ row }) => {
				const s = row.original;
				const avatarColor = getAvatarColor(s.id);
				return (
					<div className="flex items-center gap-3 min-w-0">
						<div className={`h-8 w-8 shrink-0 rounded-full ${avatarColor} flex items-center justify-center text-xs font-bold text-white`}>
							{getInitial(s.name)}
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-1.5">
								<Link to={`/students/${s.id}`} className="font-bold text-teal-700 hover:underline text-sm leading-tight">
									{s.zid.toUpperCase()}
								</Link>
							</div>
							{s.name ? <p className="text-xs text-gray-600 truncate leading-tight">{s.name}</p> : null}
							{s.phone ? <p className="text-[11px] text-gray-400 leading-tight">{s.phone}</p> : null}
						</div>
					</div>
				);
			},
		},
		{
			id: "groupLevel",
			header: "Group / Level",
			cell: ({ row }) => {
				const s = row.original;
				const k = s.level !== undefined && s.level !== null && s.level !== ""
					? (typeof s.level === "number" ? s.level : Number(s.level))
					: null;
				const levelLabel = k !== null ? (LEVEL_LABELS[k] ?? String(s.level)) : null;
				const levelColor = k !== null ? (LEVEL_COLORS[k] ?? "bg-gray-100 text-gray-600") : null;

				if (s.courseType === "GROUP") {
					if (s.batchId) {
						const groupLabel = options?.groupLabelByBatchId?.[s.batchId] ?? s.batchId;
						return (
							<div className="flex flex-col gap-1">
								<span className="inline-flex w-fit rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">{groupLabel}</span>
								{levelLabel ? <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${levelColor}`}>{levelLabel}</span> : null}
							</div>
						);
					}
					if (options?.onAddToGroup && options.canAddToGroup) {
						return (
							<button type="button" onClick={() => options.onAddToGroup?.(s)}
								className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700 hover:bg-rose-200">
								+ Add to group
							</button>
						);
					}
					return (
						<div className="flex flex-col gap-1">
							<span className="inline-flex w-fit rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">Group</span>
							{levelLabel ? <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${levelColor}`}>{levelLabel}</span> : null}
						</div>
					);
				}

				return (
					<div className="flex flex-col gap-1">
						<span className="inline-flex w-fit rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">Individual</span>
						{levelLabel ? <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${levelColor}`}>{levelLabel}</span> : null}
					</div>
				);
			},
		},
		{
			accessorKey: "mentorId",
			header: "Mentor",
			size: 130,
			cell: ({ row }) => {
				const name = row.original.mentorId ? (mentorNameById[row.original.mentorId] ?? "—") : "—";
				return <span className="text-sm text-gray-600">{name}</span>;
			},
		},
		{
			id: "followUp",
			header: "Follow-up",
			cell: ({ row }) => {
				const s = row.original;
				const date = s.customNextFollowUpAt ?? s.nextFollowUpAt;
				const state = getStudentFollowUpState(s.customNextFollowUpAt, s.nextFollowUpAt);
				const dotColor = state.label === "Past Due" ? "bg-red-500" : state.label === "Today" ? "bg-amber-400" : state.label === "Upcoming" ? "bg-emerald-500" : "bg-gray-300";
				return (
					<div className="flex flex-col gap-0.5">
						<div className="flex items-center gap-1.5">
							<span className={`h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
							<span className="text-xs font-medium text-gray-700">
								{date ? new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
							</span>
						</div>
						{state.label !== "No Follow-up" ? (
							<span className={`ml-3.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold w-fit ${state.className}`}>
								{state.label}
							</span>
						) : null}
					</div>
				);
			},
		},
		{
			id: "status",
			header: "Status",
			cell: ({ row }) => {
				const s = row.original;
				const hasProcess = Boolean(s.processId || s.processLabel);
				if (hasProcess) {
					return (
						<span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
							<HiCog6Tooth className="h-3 w-3" />
							{s.processLabel ?? "In process"}
						</span>
					);
				}
				return (
					<span className={`rounded-full px-2.5 py-1 text-xs font-semibold text-white ${getColorByStatus(s.status)}`}>
						{getStudentStatusLabel(s.status)}
					</span>
				);
			},
		},
	];
};

export const formatUserName = (user: {
	firstName?: string;
	lastName?: string;
	name?: string;
}): string => {
	if (user.name) return user.name;
	const parts = [];
	if (user.firstName) parts.push(user.firstName);
	if (user.lastName) parts.push(user.lastName);
	return parts.join(" ") || "Unknown";
};

export const getStudentStatusColor = (status: string): string => {
	switch (status) {
		case "STUDENT": return "bg-emerald-500";
		case "BREAK": return "bg-amber-500";
		case "DROPPED": return "bg-gray-500";
		default: return "bg-gray-500";
	}
};

export const getStudentStatusLabel = (status: string): string => {
	switch (status) {
		case "STUDENT": return "Active";
		case "BREAK": return "On Break";
		case "DROPPED": return "Dropped";
		default: return status;
	}
};
