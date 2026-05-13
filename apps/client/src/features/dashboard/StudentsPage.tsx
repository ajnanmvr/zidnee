import type { StudentResponse } from "@repo/schema";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { DataTable } from "@/components/DataTable";
import { DateCell } from "@/components/DateCell";
import { Panel } from "@/components/dashboard-ui";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useSession } from "@/lib/session";

const formatUserName = (userName?: string | null) => userName?.trim() || "-";

export const StudentsPage = () => {
	const { token } = useSession();
	const studentsQuery = useStudentsQuery(token);
	const usersQuery = useUsersQuery(token);
	const rows = studentsQuery.data?.students ?? [];
	const allUsers = usersQuery.data?.users ?? [];

	const userNameById = useMemo(
		() =>
			new Map(
				allUsers.map((user) => [
					user.id,
					formatUserName(user.name ?? user.username),
				]),
			),
		[allUsers],
	);

	const columns: ColumnDef<StudentResponse>[] = useMemo(
		() => [
			{
				accessorKey: "zid",
				header: "Student ID",
				cell: (info) => (
					<div className="font-semibold text-gray-900">
						{String(info.getValue())}
					</div>
				),
			},
			{ accessorKey: "name", header: "Name" },
			{ accessorKey: "phone", header: "Phone" },
			{
				id: "counsellor",
				header: "Counsellor",
				cell: (info) => {
					const mentorId = info.row.original.mentorId;
					if (!mentorId) {
						return "-";
					}

					const mentor = allUsers.find((user) => user.id === mentorId);
					return mentor?.counsellorId
						? (userNameById.get(mentor.counsellorId) ?? "-")
						: "-";
				},
			},
			{
				id: "mentor",
				header: "Mentor",
				cell: (info) =>
					info.row.original.mentorId
						? (userNameById.get(info.row.original.mentorId) ?? "-")
						: "-",
			},
			{
				accessorKey: "admittedAt",
				header: "Admitted",
				cell: (info) => (
					<DateCell
						date={String(info.getValue())}
						className="font-medium text-gray-900"
					/>
				),
			},
		],
		[allUsers, userNameById],
	);

	return (
		<Panel
			title="Students"
			description="Admissions converted to enrolled students"
		>
			{studentsQuery.isLoading ? (
				<div className="py-8 text-center text-sm text-gray-600">Loading...</div>
			) : studentsQuery.isError ? (
				<div className="py-8 text-center text-sm text-gray-600">
					Unable to load students.
				</div>
			) : (
				<DataTable
					columns={columns}
					data={rows}
					exportFilename="students"
					searchPlaceholder="Search students..."
				/>
			)}
		</Panel>
	);
};
