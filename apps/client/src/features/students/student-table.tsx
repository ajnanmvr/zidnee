import type { Student } from "@repo/schema";
import type { ColumnDef } from "@tanstack/react-table";
import { HiCog6Tooth } from "react-icons/hi2";
import { Link } from "react-router-dom";

export type StudentTableRow = Student;

type FollowUpState = {
	label: "Today" | "Past Due" | "Valid" | "No Follow-up";
	className: string;
	priority: number;
};

const isSameDay = (left: Date, right: Date) => {
	return (
		left.getFullYear() === right.getFullYear() &&
		left.getMonth() === right.getMonth() &&
		left.getDate() === right.getDate()
	);
};

export const getStudentFollowUpState = (
	customNextFollowUpAt?: Date,
	nextFollowUpAt?: Date,
): FollowUpState => {
	const followUpDate = customNextFollowUpAt ?? nextFollowUpAt;
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
		label: "Valid",
		className: "bg-emerald-100 text-emerald-800",
		priority: 2,
	};
};

export const buildStudentColumns = (
	getColorByStatus: (status: string) => string,
	mentorNameById: Record<string, string>,
	options?: {
		groupLabelByBatchId?: Record<string, string>;
		onAddToGroup?: (student: StudentTableRow) => void;
	},
): ColumnDef<StudentTableRow>[] => {
	return [
		{
			accessorKey: "zid",
			header: "ZID",
			size: 100,
			cell: ({ row }) => (
				<Link
					to={`/students/${row.original.id}`}
					className="font-mono font-semibold text-teal-600 hover:underline"
				>
					{row.original.zid.toUpperCase()}
				</Link>
			),
		},
		{
			accessorKey: "name",
			header: "Name",
			size: 150,
		},
		{
			accessorKey: "phone",
			header: "Phone",
			size: 120,
		},
		{
			accessorKey: "courseType",
			header: "batch",
			size: 100,
			cell: ({ row }) => {
				const student = row.original;

				if (!student.courseType) {
					return <span className="text-gray-400">—</span>;
				}

				if (student.courseType === "GROUP") {
					if (student.batchId) {
						const groupLabel =
							options?.groupLabelByBatchId?.[student.batchId] ?? student.batchId;
						return (
							<span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
								{groupLabel}
							</span>
						);
					}

					if (options?.onAddToGroup) {
						return (
							<button
								type="button"
								onClick={() => options.onAddToGroup?.(student)}
								className="inline-flex rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-200"
							>
								Add to group
							</button>
						);
					}
				}

				return (
					<span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
						{student.courseType}
					</span>
				);
			},
		},
		{
			accessorKey: "level",
			header: "Level",
			size: 100,
			cell: ({ row }) => {
				const levelValue = row.original.level;
				const levelMap: Record<string | number, string> = {
					1: "Seed",
					2: "Sprout",
					3: "Root",
					4: "Leaf",
					5: "Bud",
					6: "Bloom",
					7: "Fruit",
				};

				if (levelValue === undefined || levelValue === null || levelValue === "") {
					return <span className="text-gray-400">—</span>;
				}

				const key = typeof levelValue === "number" ? levelValue : Number(levelValue);
				return <span className="font-semibold">{levelMap[key] ?? String(levelValue)}</span>;
			},
		},
		{
			accessorKey: "mentorId",
			header: "Mentor",
			size: 140,
			cell: ({ row }) =>
				row.original.mentorId
					? mentorNameById[row.original.mentorId] || "Unassigned"
					: "—",
		},
		{
			accessorKey: "status",
			header: "Status",
			size: 130,
			cell: ({ row }) => {
				const hasProcess = Boolean(
					row.original.processId || row.original.processLabel,
				);

				return (
					<span
						className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white ${getColorByStatus(
							row.original.status,
						)} ${hasProcess ? "animate-pulse bg-yellow-500" : ""}`}
					>
						{hasProcess ? (
							<HiCog6Tooth
								className="h-3.5 w-3.5"
								title={row.original.processLabel ?? "Process linked"}
								aria-label="Process linked"
							/>
						) : null}
						{row.original.status}
					</span>
				);
			},
		},
		{
			accessorKey: "nextFollowUpAt",
			header: "Next Follow-up",
			size: 200,
			cell: ({ row }) => {
				const followUpDate =
					row.original.customNextFollowUpAt ?? row.original.nextFollowUpAt;
				const state = getStudentFollowUpState(
					row.original.customNextFollowUpAt,
					row.original.nextFollowUpAt,
				);

				return (
					<div className="space-y-1">
						<p>
							{followUpDate
								? new Date(followUpDate).toLocaleDateString("en-IN", {
									year: "numeric",
									month: "short",
									day: "numeric",
								})
								: "—"}
						</p>
						<span
							className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${state.className}`}
						>
							{state.label}
						</span>
					</div>
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
		case "COMPLETED":
			return "bg-emerald-700 border-emerald-900";
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
		case "COMPLETED":
			return "Completed";
		default:
			return status;
	}
};
