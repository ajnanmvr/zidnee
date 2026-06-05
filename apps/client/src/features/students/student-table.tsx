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
	if (!value) {
		return null;
	}

	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
};

const isSameDay = (left: Date, right: Date) => {
	return (
		left.getFullYear() === right.getFullYear() &&
		left.getMonth() === right.getMonth() &&
		left.getDate() === right.getDate()
	);
};

export const getStudentFollowUpState = (
	customNextFollowUpAt?: Date | string | null,
	nextFollowUpAt?: Date | string | null,
): FollowUpState => {
	const followUpDate = toValidDate(customNextFollowUpAt) ?? toValidDate(nextFollowUpAt);
	if (!followUpDate) {
		return {
			label: "No Follow-up",
			className: "bg-gray-100 text-gray-700",
			priority: 3,
		};
	}

	const now = new Date();
	if (isSameDay(followUpDate, now)) {
		return {
			label: "Today",
			className: "bg-amber-100 text-amber-800",
			priority: 0,
		};
	}

	if (followUpDate.getTime() < now.getTime()) {
		return {
			label: "Past Due",
			className: "bg-red-100 text-red-800",
			priority: 1,
		};
	}

	return {
		label: "Upcoming",
		className: "bg-emerald-100 text-emerald-800",
		priority: 2,
	};
};

const LEVEL_LABELS: Record<string | number, string> = {
	1: "Seed", 2: "Sprout", 3: "Root", 4: "Leaf", 5: "Bud", 6: "Bloom", 7: "Fruit",
};

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
				return (
					<div>
						<Link to={`/students/${s.id}`} className="font-semibold text-teal-700 hover:underline text-sm">
							{s.zid.toUpperCase()}
						</Link>
						<p className="text-xs text-gray-500">{s.name ?? "—"}</p>
					</div>
				);
			},
		},
		{
			accessorKey: "phone",
			header: "Phone",
			size: 120,
			cell: ({ row }) => <span className="text-sm text-gray-700">{row.original.phone}</span>,
		},
		{
			id: "batch",
			header: "Group",
			cell: ({ row }) => {
				const s = row.original;
				if (s.courseType === "GROUP") {
					if (s.batchId) {
						const label = options?.groupLabelByBatchId?.[s.batchId] ?? s.batchId;
						return <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">{label}</span>;
					}
					if (options?.onAddToGroup && options.canAddToGroup) {
						return (
							<button type="button" onClick={() => options.onAddToGroup?.(s)} className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 hover:bg-rose-200">
								Add to group
							</button>
						);
					}
				}
				return <span className="text-xs text-gray-400">—</span>;
			},
		},
		{
			accessorKey: "level",
			header: "Level",
			size: 80,
			cell: ({ row }) => {
				const v = row.original.level;
				if (v === undefined || v === null || v === "") return <span className="text-gray-400">—</span>;
				const k = typeof v === "number" ? v : Number(v);
				return <span className="text-sm font-medium">{LEVEL_LABELS[k] ?? String(v)}</span>;
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
				return (
					<div className="flex items-center gap-1.5">
						<span className={`h-2 w-2 rounded-full shrink-0 ${state.label === "Past Due" ? "bg-red-500" : state.label === "Today" ? "bg-amber-400" : "bg-emerald-500"}`} />
						<span className="text-xs text-gray-600">
							{date ? new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
						</span>
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
						<span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
							<HiCog6Tooth className="h-3 w-3" />
							{s.processLabel ?? "In process"}
						</span>
					);
				}
				return (
					<span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${getColorByStatus(s.status)}`}>
						{s.status}
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
		case "STUDENT":
			return "bg-emerald-500 border-emerald-700";
		case "BREAK":
			return "bg-purple-500 border-purple-700";
		case "DROPPED":
			return "bg-gray-500 border-gray-700";
		default:
			return "bg-gray-500 border-gray-700";
	}
};

export const getStudentStatusLabel = (status: string): string => {
	switch (status) {
		case "STUDENT":
			return "Active";
		case "BREAK":
			return "On Break";
		case "DROPPED":
			return "Dropped";
		default:
			return status;
	}
};
