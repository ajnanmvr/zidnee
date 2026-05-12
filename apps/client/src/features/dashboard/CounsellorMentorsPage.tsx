import { useMemo } from "react";
import { HiEnvelope, HiUserGroup } from "react-icons/hi2";
import { Link } from "react-router-dom";
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

export const CounsellorMentorsPage = () => {
	const { token } = useSession();
	const meQuery = useMeQuery(token);
	const usersQuery = useUsersQuery(token);
	const studentsQuery = useStudentsQuery(token);

	const currentUserId = meQuery.data?.id ?? "";
	const allUsers = usersQuery.data?.users ?? [];
	const allStudents = studentsQuery.data?.students ?? [];
	const studentLeadIds = allStudents.map((student) => student.leadId);
	const { activitiesByLeadId, isLoading: activitiesLoading } =
		useLeadActivitiesMap(token, studentLeadIds);

	const mentorCards = useMemo(() => {
		const mentors = allUsers.filter(
			(user) =>
				user.roles.some((role) => (role.type ?? "admin") === "mentor") &&
				user.counsellorId === currentUserId,
		);

		return mentors.map((mentor) => {
			const mentorStudents = allStudents.filter(
				(student) => student.mentorId === mentor.id,
			);
			const activeStudents = mentorStudents.filter(
				(student) => student.status === "ACTIVE",
			);
			const mentorActivities = mentorStudents.flatMap(
				(student) => activitiesByLeadId.get(student.leadId) ?? [],
			);
			const latestActivity = getLatestActivity(mentorActivities);

			return {
				mentor,
				mentorStudents,
				activeStudents,
				latestActivity,
				monthCount: countActivitiesThisMonth(mentorActivities),
			};
		});
	}, [activitiesByLeadId, allStudents, allUsers, currentUserId]);

	return (
		<div className="grid gap-6">
			<Panel title="Mentor follow-up" description="Mentors assigned to you">
				{activitiesLoading ? (
					<div className="py-8 text-center text-sm text-gray-600">
						Loading follow-up history...
					</div>
				) : mentorCards.length === 0 ? (
					<div className="rounded-3xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-600">
						No mentors are assigned to your counsellor account yet.
					</div>
				) : (
					<div className="grid gap-4 lg:grid-cols-2">
						{mentorCards.map(
							({
								mentor,
								mentorStudents,
								activeStudents,
								latestActivity,
								monthCount,
							}) => (
								<div
									key={mentor.id}
									className="rounded-3xl border border-gray-300 bg-white p-5 shadow-sm"
								>
									<div className="flex items-start justify-between gap-4">
										<div>
											<p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
												Mentor
											</p>
											<h3 className="mt-1 text-lg font-semibold text-gray-900">
												{formatUserName(mentor.name, mentor.username)}
											</h3>
											<p className="text-sm text-gray-600">
												ID: {mentor.username ?? mentor.mentorId ?? "-"}
											</p>
											{mentor.email ? (
												<p className="mt-1 text-sm text-gray-600">
													{mentor.email}
												</p>
											) : null}
										</div>
										<div className="grid gap-2 text-right">
											<div className="rounded-2xl bg-teal-50 px-3 py-2">
												<p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
													Students
												</p>
												<p className="text-lg font-bold text-teal-800">
													{mentorStudents.length}
												</p>
											</div>
											<div className="rounded-2xl bg-amber-50 px-3 py-2">
												<p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
													Follow-ups this month
												</p>
												<p className="text-lg font-bold text-amber-800">
													{monthCount}
												</p>
											</div>
										</div>
									</div>

									<div className="mt-4 grid gap-3 text-sm text-gray-600">
										<p>Active students: {activeStudents.length}</p>
										<p>
											Latest follow-up:{" "}
											{latestActivity
												? `${latestActivity.description} by ${latestActivity.performedByName}`
												: "No follow-up history yet."}
										</p>
										<div className="flex flex-wrap gap-2">
											{mentor.email ? (
												<a
													href={`mailto:${mentor.email}`}
													className="inline-flex items-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800 transition hover:border-teal-300"
												>
													<HiEnvelope className="h-4 w-4" aria-hidden="true" />
													Email mentor
												</a>
											) : null}
											<Link
												to={`/users/${mentor.id}/edit`}
												className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-900 transition hover:border-gray-400"
											>
												<HiUserGroup className="h-4 w-4" aria-hidden="true" />
												Edit mentor record
											</Link>
										</div>
									</div>

									<div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
										<p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
											Students under this mentor
										</p>
										<div className="mt-3 grid gap-3">
											{mentorStudents.length === 0 ? (
												<p className="text-sm text-gray-600">
													No students assigned yet.
												</p>
											) : (
												mentorStudents.map((student) => {
													const studentActivities =
														activitiesByLeadId.get(student.leadId) ?? [];
													const studentLatest =
														getLatestActivity(studentActivities);
													const studentMonthCount =
														countActivitiesThisMonth(studentActivities);

													return (
														<details
															key={student.id}
															className="rounded-2xl border border-gray-200 bg-white px-3 py-2"
														>
															<summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm">
																<div>
																	<p className="font-semibold text-gray-900">
																		{student.name}
																	</p>
																	<p className="text-xs text-gray-500">
																		{student.zid} · {student.phone}
																	</p>
																</div>
																<div className="flex items-center gap-2">
																	<span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
																		{studentMonthCount} this month
																	</span>
																	<span
																		className={
																			student.status === "ACTIVE"
																				? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700"
																				: "rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700"
																		}
																	>
																		{student.status}
																	</span>
																</div>
															</summary>
															<div className="mt-3 grid gap-3">
																<p className="text-xs text-gray-600">
																	Latest follow-up:{" "}
																	{studentLatest
																		? `${studentLatest.description} by ${studentLatest.performedByName}`
																		: "No follow-up history yet."}
																</p>
																<ActivityTimeline
																	activities={studentActivities}
																	emptyMessage="No follow-up history yet."
																/>
															</div>
														</details>
													);
												})
											)}
										</div>
									</div>
								</div>
							),
						)}
					</div>
				)}
			</Panel>
		</div>
	);
};
