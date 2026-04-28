import { useMemo } from "react";
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
				allUsers.map((user) => [user.id, formatUserName(user.name ?? user.username)]),
			),
		[allUsers],
	);

	return (
		<Panel title="Students" description="Admissions converted to enrolled students">
			{rows.length === 0 ? (
				<div className="py-8 text-center text-sm text-ink-soft">No students created yet.</div>
			) : (
				<div className="overflow-x-auto rounded-3xl border border-border">
					<table className="min-w-full border-collapse bg-surface text-left text-sm">
						<thead className="bg-surface-muted text-xs uppercase tracking-[0.14em] text-ink-soft">
							<tr>
								<th className="px-4 py-3 font-semibold">Student ID</th>
								<th className="px-4 py-3 font-semibold">Name</th>
								<th className="px-4 py-3 font-semibold">Phone</th>
								<th className="px-4 py-3 font-semibold">Counsellor</th>
								<th className="px-4 py-3 font-semibold">Mentor</th>
								<th className="px-4 py-3 font-semibold">Admitted</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((student) => (
								<tr key={student.id} className="border-t border-border">
									<td className="px-4 py-3 font-semibold text-ink">{student.zid}</td>
									<td className="px-4 py-3 text-ink-soft">{student.name}</td>
									<td className="px-4 py-3 text-ink-soft">{student.phone}</td>
									<td className="px-4 py-3 text-ink-soft">
										{student.counsellorId ? userNameById.get(student.counsellorId) ?? "-" : "-"}
									</td>
									<td className="px-4 py-3 text-ink-soft">
										{student.mentorId ? userNameById.get(student.mentorId) ?? "-" : "-"}
									</td>
									<td className="px-4 py-3 text-ink-soft">
										{new Date(student.admittedAt).toLocaleDateString()}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</Panel>
	);
};
