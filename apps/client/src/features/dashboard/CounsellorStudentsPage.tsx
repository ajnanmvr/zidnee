import { useMemo } from "react";
import { HiClock, HiEnvelope } from "react-icons/hi2";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { Panel } from "@/components/dashboard-ui";
import { useMeQuery } from "@/features/auth/auth.queries";
import {
	countActivitiesThisMonth,
	getLatestActivity,
	useLeadActivitiesMap,
} from "@/features/dashboard/counsellor-followup-history";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useSession } from "@/lib/session";

const formatUserName = (name?: string | null, username?: string | null) =>
	name?.trim() || username?.trim() || "-";

export const CounsellorStudentsPage = () => {
	const { token } = useSession();
	const meQuery = useMeQuery(token);
	const studentsQuery = useStudentsQuery(token);
	const usersQuery = useUsersQuery(token);

	const currentUserId = meQuery.data?.id ?? "";
	const allStudents = studentsQuery.data?.students ?? [];
	const allUsers = usersQuery.data?.users ?? [];
	const studentLeadIds = allStudents.map((student) => student.leadId);
	const { activitiesByLeadId, isLoading: activitiesLoading } =
		useLeadActivitiesMap(token, studentLeadIds);

	const mentorIds = useMemo(
		() =>
			new Set(
				allUsers
					.filter(
						(user) =>
							user.roles.some(
								(role) => (role.type ?? "admin") === "mentor",
							) && user.counsellorId === currentUserId,
					)
					.map((mentor) => mentor.id),
			),
		[allUsers, currentUserId],
	);

	const rows = useMemo(() => {
		return allStudents.filter(
			(student) => (student.mentorId ? mentorIds.has(student.mentorId) : false),
		);
	}, [allStudents, currentUserId, mentorIds]);

	const userNameById = useMemo(
		() =>
			new Map(
				allUsers.map((user) => [
					user.id,
					formatUserName(user.name, user.username),
				]),
			),
		[allUsers],
	);

	const studentCards = useMemo(() => {
		return rows.map((student) => {
			const activities = activitiesByLeadId.get(student.leadId) ?? [];
			return {
				student,
				activities,
				monthCount: countActivitiesThisMonth(activities),
				latestActivity: getLatestActivity(activities),
				mentorName: student.mentorId
					? (userNameById.get(student.mentorId) ?? "-")
					: "-",
			};
		});
	}, [activitiesByLeadId, rows, userNameById]);

	return (
		<Panel
			title="My students"
			description="Students under mentors assigned to you"
		>
			{studentsQuery.isLoading || activitiesLoading ? (
				<div className="py-8 text-center text-sm text-gray-600">Loading...</div>
			) : studentsQuery.isError ? (
				<div className="py-8 text-center text-sm text-gray-600">
					Unable to load students.
				</div>
			) : rows.length === 0 ? (
				<div className="rounded-3xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-600">
					No students are assigned to your mentors yet.
				</div>
			) : (
				<div className="grid gap-4">
					{studentCards.map(
						({
							student,
							activities,
							monthCount,
							latestActivity,
							mentorName,
						}) => (
							<article
								key={student.id}
								className="rounded-3xl border border-gray-300 bg-white p-5 shadow-sm"
							>
								<div className="flex items-start justify-between gap-4">
									<div>
										<p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
											Student
										</p>
										<h3 className="mt-1 text-lg font-semibold text-gray-900">
											{student.name}
										</h3>
										<p className="text-sm text-gray-600">
											{student.zid} · {student.phone}
										</p>
										<p className="mt-1 text-sm text-gray-600">
											Mentor: {mentorName}
										</p>
									</div>
									<div className="grid gap-2 text-right">
										<div className="rounded-2xl bg-amber-50 px-3 py-2">
											<p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
												Follow-ups this month
											</p>
											<p className="text-lg font-bold text-amber-800">
												{monthCount}
											</p>
										</div>
										<span
											className={
												student.status === "STUDENT"
													? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700"
													: "rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700"
											}
										>
											{student.status}
										</span>
									</div>
								</div>

								<div className="mt-4 grid gap-3 text-sm text-gray-600">
									<p>
										Latest follow-up:{" "}
										{latestActivity
											? `${latestActivity.description} by ${latestActivity.performedByName}`
											: "No follow-up history yet."}
									</p>
									<div className="flex flex-wrap gap-2">
										{student.phone ? (
											<a
												href={`tel:${student.phone}`}
												className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-900 transition hover:border-gray-400"
											>
												<HiClock className="h-4 w-4" aria-hidden="true" />
												Call student
											</a>
										) : null}
										{student.mentorId ? (
											<a
												href={`mailto:${allUsers.find((user) => user.id === student.mentorId)?.email ?? ""}`}
												className="inline-flex items-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800 transition hover:border-teal-300"
											>
												<HiEnvelope className="h-4 w-4" aria-hidden="true" />
												Email mentor
											</a>
										) : null}
									</div>
								</div>

								<div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
									<p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
										Follow-up timeline
									</p>
									<div className="mt-3">
										<ActivityTimeline
											activities={activities}
											emptyMessage="No follow-up history yet."
										/>
									</div>
								</div>
							</article>
						),
					)}
				</div>
			)}
		</Panel>
	);
};
