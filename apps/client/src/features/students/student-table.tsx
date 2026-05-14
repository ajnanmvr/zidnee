import { type ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import type { Student } from "@repo/schema";

export type StudentTableRow = Student;

export const buildStudentColumns = (
	getColorByStatus: (status: string) => string,
	mentorNameById: Record<string, string>,
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
					{row.original.zid}
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
			accessorKey: "email",
			header: "Email",
			size: 180,
		},
		{
			accessorKey: "courseType",
			header: "Course",
			size: 100,
			cell: ({ row }) =>
				row.original.courseType ? (
					<span
						className={`rounded-full px-2 py-1 text-xs font-semibold ${
							row.original.courseType === "INDIVIDUAL"
								? "bg-amber-100 text-amber-800"
								: "bg-blue-100 text-blue-800"
						}`}
					>
						{row.original.courseType}
					</span>
				) : (
					<span className="text-gray-400">—</span>
				),
		},
		{
			accessorKey: "level",
			header: "Level",
			size: 100,
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
			cell: ({ row }) => (
				<span
					className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white ${getColorByStatus(
						row.original.status
					)}`}
				>
					{row.original.status}
				</span>
			),
		},
		{
			accessorKey: "admittedAt",
			header: "Admitted",
			size: 120,
			cell: ({ row }) =>
				new Date(row.original.admittedAt).toLocaleDateString("en-IN", {
					year: "numeric",
					month: "short",
					day: "numeric",
				}),
		},
	];
};

export const formatUserName = (user: { firstName?: string; lastName?: string; name?: string }): string => {
	if (user.name) return user.name;
	const parts = [];
	if (user.firstName) parts.push(user.firstName);
	if (user.lastName) parts.push(user.lastName);
	return parts.join(" ") || "Unknown";
};

export const getStudentStatusColor = (status: string): string => {
	switch (status) {
		case "STUDENT":
			return "bg-emerald-500";
		case "BREAK":
			return "bg-orange-500";
		case "DROPPED":
			return "bg-gray-500";
		default:
			return "bg-gray-500";
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
