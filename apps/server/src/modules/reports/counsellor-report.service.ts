import {
	CLASS_OBSERVATION_ITEMS,
	CLASSROOM_CHECK_ITEMS,
	type CounsellorReport,
	type ReportEventType,
} from "@repo/schema";
import { Types } from "mongoose";
import {
	type StudentDocument,
	StudentModel,
} from "../students/student.model.js";
import { StudentActivityModel } from "../students/student-activity.model.js";
import { StudentFollowUpSessionModel } from "../students/student-followup-session.model.js";
import { UserModel } from "../users/user.model.js";

const DAY_MS = 86_400_000;

type Bucket = CounsellorReport["range"]["bucket"];
type Compliance = "COMPLIANT" | "PARTIAL" | "NON_COMPLIANT";

const pickBucket = (from: Date, to: Date): Bucket => {
	const days = (to.getTime() - from.getTime()) / DAY_MS;
	if (days <= 31) return "day";
	if (days <= 120) return "week";
	return "month";
};

/** Start of the bucket containing `date` (UTC; weeks start on Monday). */
const bucketStart = (date: Date, bucket: Bucket): Date => {
	const d = new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
	);
	if (bucket === "week") {
		const dow = (d.getUTCDay() + 6) % 7;
		d.setUTCDate(d.getUTCDate() - dow);
	} else if (bucket === "month") {
		d.setUTCDate(1);
	}
	return d;
};

const nextBucket = (date: Date, bucket: Bucket): Date => {
	const d = new Date(date);
	if (bucket === "day") d.setUTCDate(d.getUTCDate() + 1);
	else if (bucket === "week") d.setUTCDate(d.getUTCDate() + 7);
	else d.setUTCMonth(d.getUTCMonth() + 1);
	return d;
};

const tally = (values: Array<string | undefined | null>, limit?: number) => {
	const counts = new Map<string, number>();
	for (const value of values) {
		const key = value?.trim() || "Unknown";
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	const rows = [...counts.entries()]
		.map(([label, count]) => ({ label, count }))
		.sort((a, b) => b.count - a.count);
	return limit ? rows.slice(0, limit) : rows;
};

type LeanActivity = {
	studentId: Types.ObjectId;
	description: string;
	createdAt: Date;
	oldValue?: Record<string, unknown>;
	newValue?: Record<string, unknown>;
};

type ClassifiedEvent = {
	type: ReportEventType;
	at: Date;
	studentId: string;
	fromStatus?: string;
	/** Status the student had after this change. */
	toStatus: "STUDENT" | "BREAK" | "DROPPED";
};

/** Status changes are identified by the new status, falling back to the description for older records. */
const classify = (a: LeanActivity): ClassifiedEvent | null => {
	const newStatus =
		typeof a.newValue?.status === "string" ? a.newValue.status : undefined;
	const oldStatus =
		typeof a.oldValue?.status === "string" ? a.oldValue.status : undefined;
	let type: ReportEventType | null = null;
	if (newStatus === "BREAK" || a.description === "Student put on break") {
		type = "BREAK";
	} else if (newStatus === "DROPPED" || a.description === "Student dropped") {
		type = "DROP";
	} else if (
		newStatus === "STUDENT" ||
		a.description === "Student marked active"
	) {
		type = "RESTART";
	}
	if (!type) return null;
	// Re-saving a student with an unchanged status is not a real transition.
	if (oldStatus && newStatus && oldStatus === newStatus) return null;
	return {
		type,
		at: a.createdAt,
		studentId: a.studentId.toString(),
		fromStatus: oldStatus,
		toStatus:
			type === "BREAK" ? "BREAK" : type === "DROP" ? "DROPPED" : "STUDENT",
	};
};

const emptyCompliance = () => ({ COMPLIANT: 0, PARTIAL: 0, NON_COMPLIANT: 0 });

export const CounsellorReportService = {
	build: async (params: {
		counsellorId?: string;
		from?: Date;
		to?: Date;
	}): Promise<CounsellorReport> => {
		const now = new Date();
		const to = params.to ?? now;
		const from = params.from ?? new Date(to.getTime() - 30 * DAY_MS);
		const lengthMs = Math.max(to.getTime() - from.getTime(), DAY_MS);
		const prevFrom = new Date(from.getTime() - lengthMs);
		const bucket = pickBucket(from, to);

		const studentFilter = params.counsellorId
			? { counsellorId: new Types.ObjectId(params.counsellorId) }
			: { counsellorId: { $exists: true } };
		const students =
			await StudentModel.find(studentFilter).lean<StudentDocument[]>();
		const studentIds = students.map((s) => s._id);
		const byId = new Map(students.map((s) => [s._id.toString(), s]));

		// Names for counsellors / mentors referenced by these students.
		const userIds = new Set<string>();
		for (const s of students) {
			if (s.counsellorId) userIds.add(s.counsellorId.toString());
			if (s.mentorId) userIds.add(s.mentorId.toString());
		}
		const users = await UserModel.find({ _id: { $in: [...userIds] } })
			.select("name username")
			.lean<Array<{ _id: Types.ObjectId; name?: string; username?: string }>>();
		const nameOf = new Map(
			users.map((u) => [u._id.toString(), u.name ?? u.username ?? "Unknown"]),
		);

		const [
			activities,
			sessions,
			lastSessionAgg,
			lastNoteAgg,
			notesInRange,
			assessmentActs,
		] = await Promise.all([
			StudentActivityModel.find({
				studentId: { $in: studentIds },
				type: "STATUS_CHANGED",
			})
				.sort({ createdAt: 1 })
				.lean<LeanActivity[]>(),
			StudentFollowUpSessionModel.find({
				studentId: { $in: studentIds },
				createdAt: { $gte: prevFrom, $lte: to },
			}).lean(),
			StudentFollowUpSessionModel.aggregate<{
				_id: Types.ObjectId;
				at: Date;
			}>([
				{
					$match: {
						studentId: { $in: studentIds },
						createdAt: { $lte: to },
					},
				},
				{ $group: { _id: "$studentId", at: { $max: "$createdAt" } } },
			]),
			StudentActivityModel.aggregate<{ _id: Types.ObjectId; at: Date }>([
				{
					$match: {
						studentId: { $in: studentIds },
						type: "FOLLOW_UP_RECORDED",
						createdAt: { $lte: to },
					},
				},
				{ $group: { _id: "$studentId", at: { $max: "$createdAt" } } },
			]),
			StudentActivityModel.find({
				studentId: { $in: studentIds },
				type: "FOLLOW_UP_RECORDED",
				createdAt: { $gte: from, $lte: to },
			})
				.select("studentId createdAt")
				.lean<Array<{ studentId: Types.ObjectId; createdAt: Date }>>(),
			StudentActivityModel.find({
				studentId: { $in: studentIds },
				type: "ASSESSMENT_UPDATED",
			})
				.sort({ createdAt: 1 })
				.lean<LeanActivity[]>(),
		]);

		const inRange = (d: Date) => d >= from && d <= to;
		const inPrev = (d: Date) => d >= prevFrom && d < from;

		const events = activities
			.map(classify)
			.filter((e): e is ClassifiedEvent => e !== null);
		const curEvents = events.filter((e) => inRange(e.at));
		const prevEvents = events.filter((e) => inPrev(e.at));
		const curSessions = sessions.filter((s) => inRange(s.createdAt));
		const prevSessions = sessions.filter((s) => inPrev(s.createdAt));

		const count = (list: ClassifiedEvent[], type: ReportEventType) =>
			list.filter((e) => e.type === type).length;
		const restartsCur = curEvents.filter((e) => e.type === "RESTART");

		// Status at the END of the selected period, rebuilt from each student's
		// status-change history. Students admitted after the period are excluded.
		const eventsByStudent = new Map<string, ClassifiedEvent[]>();
		for (const e of events) {
			eventsByStudent.set(e.studentId, [
				...(eventsByStudent.get(e.studentId) ?? []),
				e,
			]);
		}
		const statusAt = (s: StudentDocument, date: Date): string => {
			const history = eventsByStudent.get(s._id.toString());
			if (!history?.length) return s.status;
			let status = "STUDENT";
			for (const e of history) {
				if (e.at <= date) status = e.toStatus;
			}
			return status;
		};
		const cohort = students.filter((s) => s.admittedAt <= to);
		const statusOf = new Map(
			cohort.map((s) => [s._id.toString(), statusAt(s, to)]),
		);
		const inCohort = (status: string) =>
			cohort.filter((s) => statusOf.get(s._id.toString()) === status);
		const cohortActive = inCohort("STUDENT");
		const cohortBreak = inCohort("BREAK");
		const cohortDropped = inCohort("DROPPED");

		// Live view (today) — used for follow-up health and assessments.
		const active = students.filter((s) => s.status === "STUDENT");

		const statusSummary = {
			totalAssigned: cohort.length,
			active: cohortActive.length,
			onBreak: cohortBreak.length,
			dropped: cohortDropped.length,
			// Older records don't store the previous status, so restarts that
			// aren't known to be from a drop are counted as "from break".
			restartedFromBreak: restartsCur.filter((e) => e.fromStatus !== "DROPPED")
				.length,
			restartedFromDrop: restartsCur.filter((e) => e.fromStatus === "DROPPED")
				.length,
			newAdmissions: students.filter((s) => inRange(s.admittedAt)).length,
			breaksStarted: count(curEvents, "BREAK"),
			dropsInPeriod: count(curEvents, "DROP"),
			sessionsInPeriod: curSessions.length,
		};

		const previous = {
			newAdmissions: students.filter((s) => inPrev(s.admittedAt)).length,
			breaksStarted: count(prevEvents, "BREAK"),
			dropsInPeriod: count(prevEvents, "DROP"),
			restarts: count(prevEvents, "RESTART"),
			sessionsInPeriod: prevSessions.length,
		};

		// Break & drop detail rows (newest first).
		const eventRows = curEvents
			.map((e) => {
				const s = byId.get(e.studentId);
				if (!s) return null;
				return {
					studentId: e.studentId,
					zid: s.zid,
					name: s.name ?? "-",
					type: e.type,
					currentStatus: s.status,
					reason: e.type === "DROP" ? (s.dropReason ?? undefined) : undefined,
					temporary: e.type === "DROP" ? Boolean(s.dropTemporary) : undefined,
					breakFrom:
						e.type === "BREAK" ? s.inactiveFrom?.toISOString() : undefined,
					breakUntil:
						e.type === "BREAK" ? s.inactiveUntil?.toISOString() : undefined,
					at: e.at.toISOString(),
					mentorName: s.mentorId
						? nameOf.get(s.mentorId.toString())
						: undefined,
					counsellorName: s.counsellorId
						? nameOf.get(s.counsellorId.toString())
						: undefined,
					courseType: s.courseType,
					level: s.level ? String(s.level) : undefined,
				};
			})
			.filter((row): row is NonNullable<typeof row> => row !== null)
			.sort((a, b) => b.at.localeCompare(a.at));

		// Trend buckets.
		const trendMap = new Map<
			number,
			{
				start: string;
				admissions: number;
				breaks: number;
				drops: number;
				restarts: number;
				sessions: number;
			}
		>();
		for (
			let cursor = bucketStart(from, bucket);
			cursor <= to;
			cursor = nextBucket(cursor, bucket)
		) {
			trendMap.set(cursor.getTime(), {
				start: cursor.toISOString(),
				admissions: 0,
				breaks: 0,
				drops: 0,
				restarts: 0,
				sessions: 0,
			});
		}
		const bump = (
			date: Date,
			field: "admissions" | "breaks" | "drops" | "restarts" | "sessions",
		) => {
			const row = trendMap.get(bucketStart(date, bucket).getTime());
			if (row) row[field] += 1;
		};
		for (const s of students)
			if (inRange(s.admittedAt)) bump(s.admittedAt, "admissions");
		for (const e of curEvents) {
			bump(
				e.at,
				e.type === "BREAK"
					? "breaks"
					: e.type === "DROP"
						? "drops"
						: "restarts",
			);
		}
		for (const s of curSessions) bump(s.createdAt, "sessions");

		// Distributions across everyone assigned.
		const statusLabel: Record<string, string> = {
			STUDENT: "Active",
			BREAK: "On break",
			DROPPED: "Dropped",
		};
		const distributions = {
			byStatus: tally(
				cohort.map((s) => {
					const status = statusOf.get(s._id.toString()) ?? s.status;
					return statusLabel[status] ?? status;
				}),
			),
			byCourseType: tally(cohort.map((s) => s.courseType)),
			byLevel: tally(
				cohort.map((s) => (s.level ? `Level ${s.level}` : undefined)),
			).sort((a, b) =>
				a.label.localeCompare(b.label, undefined, { numeric: true }),
			),
			byMentor: tally(
				cohort.map((s) =>
					s.mentorId ? nameOf.get(s.mentorId.toString()) : "Unassigned",
				),
				8,
			),
			dropReasons: tally(cohortDropped.map((s) => s.dropReason)),
		};

		// Follow-up health for active students.
		const lastContact = new Map<string, Date>();
		for (const row of [...lastSessionAgg, ...lastNoteAgg]) {
			const key = row._id.toString();
			const existing = lastContact.get(key);
			if (!existing || row.at > existing) lastContact.set(key, row.at);
		}
		let dueNow = 0;
		let upcoming7d = 0;
		let notScheduled = 0;
		const recencyBuckets = {
			"Within 7 days": 0,
			"8–14 days": 0,
			"15–30 days": 0,
			"Over 30 days": 0,
			Never: 0,
		};
		// Live queue (today)
		for (const s of active) {
			const due = s.customNextFollowUpAt ?? s.nextFollowUpAt;
			if (!due) notScheduled += 1;
			else if (due <= now) dueNow += 1;
			else if (due.getTime() - now.getTime() <= 7 * DAY_MS) upcoming7d += 1;
		}

		// Period view: who was active at the end of the period, and were they contacted?
		const contactedIds = new Set<string>([
			...curSessions.map((x) => x.studentId.toString()),
			...notesInRange.map((x) => x.studentId.toString()),
		]);
		let contactedInPeriod = 0;
		for (const s of cohortActive) {
			if (contactedIds.has(s._id.toString())) contactedInPeriod += 1;
			const last = lastContact.get(s._id.toString());
			if (!last) recencyBuckets.Never += 1;
			else {
				const days = (to.getTime() - last.getTime()) / DAY_MS;
				if (days <= 7) recencyBuckets["Within 7 days"] += 1;
				else if (days <= 14) recencyBuckets["8–14 days"] += 1;
				else if (days <= 30) recencyBuckets["15–30 days"] += 1;
				else recencyBuckets["Over 30 days"] += 1;
			}
		}

		const classroomChecks: Record<
			string,
			ReturnType<typeof emptyCompliance>
		> = Object.fromEntries(
			CLASSROOM_CHECK_ITEMS.map((i) => [i.key, emptyCompliance()]),
		);
		const classObservation: Record<
			string,
			ReturnType<typeof emptyCompliance>
		> = Object.fromEntries(
			CLASS_OBSERVATION_ITEMS.map((i) => [i.key, emptyCompliance()]),
		);
		for (const session of curSessions) {
			for (const [key, value] of Object.entries(
				session.classroomChecks ?? {},
			)) {
				const bucketRow = classroomChecks[key];
				if (bucketRow) bucketRow[value as Compliance] += 1;
			}
			for (const [key, value] of Object.entries(
				session.classObservation ?? {},
			)) {
				const bucketRow = classObservation[key];
				if (bucketRow) bucketRow[value as Compliance] += 1;
			}
		}

		const resultLabels: Record<string, string> = {
			SATISFACTORY: "Satisfactory",
			NEEDS_IMPROVEMENT: "Needs improvement",
			URGENT_ATTENTION: "Urgent attention",
		};

		const followUp = {
			dueNow,
			upcoming7d,
			notScheduled,
			contactedInPeriod,
			notContactedInPeriod: cohortActive.length - contactedInPeriod,
			quickNotesInPeriod: notesInRange.length,
			recency: Object.entries(recencyBuckets).map(([label, c]) => ({
				label,
				count: c,
			})),
			sessionsInPeriod: curSessions.length,
			resultBreakdown: tally(
				curSessions.map(
					(s) => resultLabels[s.findings.result] ?? s.findings.result,
				),
			),
			needsAttention: curSessions.filter(
				(s) => s.findings.needsAdditionalAttention,
			).length,
			parentContacted: curSessions.filter((s) => s.parent.contacted).length,
			parentSatisfied: curSessions.filter(
				(s) => s.parent.satisfaction === "SATISFIED",
			).length,
			parentNeedsImprovement: curSessions.filter(
				(s) => s.parent.satisfaction === "NEEDS_IMPROVEMENT",
			).length,
			classroomChecks,
			classObservation,
		};

		// Assessment state is rebuilt from the change log, like student status.
		type AssessmentField =
			| "oralAssessmentDone"
			| "writtenAssessmentDone"
			| "levelAssessmentDone";
		const assessmentActsByStudent = new Map<string, LeanActivity[]>();
		for (const a of assessmentActs) {
			const key = a.studentId.toString();
			assessmentActsByStudent.set(key, [
				...(assessmentActsByStudent.get(key) ?? []),
				a,
			]);
		}
		const flag = (value: unknown) => Boolean(value);
		const assessmentAt = (s: StudentDocument, field: AssessmentField) => {
			const acts = assessmentActsByStudent.get(s._id.toString()) ?? [];
			if (!acts.length) return flag(s[field]);
			let value: boolean | undefined;
			for (const a of acts) {
				if (a.createdAt > to) break;
				value = flag(a.newValue?.[field] ?? a.oldValue?.[field]);
			}
			// No change yet by the end of the period: the value before the first change.
			return value ?? flag(acts[0]?.oldValue?.[field]);
		};
		const cohortActiveIds = new Set(cohortActive.map((x) => x._id.toString()));
		const assessmentOf = (field: AssessmentField) => ({
			done: cohortActive.filter((x) => assessmentAt(x, field)).length,
			total: cohortActive.length,
			completedInPeriod: assessmentActs.filter(
				(a) =>
					inRange(a.createdAt) &&
					cohortActiveIds.has(a.studentId.toString()) &&
					a.newValue?.[field] === true &&
					a.oldValue?.[field] === false,
			).length,
		});

		// Per-counsellor comparison (only when viewing everyone).
		const counsellors: CounsellorReport["counsellors"] = [];
		if (!params.counsellorId) {
			const groups = new Map<string, StudentDocument[]>();
			for (const s of cohort) {
				if (!s.counsellorId) continue;
				const key = s.counsellorId.toString();
				groups.set(key, [...(groups.get(key) ?? []), s]);
			}
			const sessionCountByStudent = new Map<string, number>();
			for (const s of curSessions) {
				const key = s.studentId.toString();
				sessionCountByStudent.set(
					key,
					(sessionCountByStudent.get(key) ?? 0) + 1,
				);
			}
			for (const [id, group] of groups) {
				counsellors.push({
					id,
					name: nameOf.get(id) ?? "Unknown",
					assigned: group.length,
					active: group.filter(
						(s) => statusOf.get(s._id.toString()) === "STUDENT",
					).length,
					onBreak: group.filter(
						(s) => statusOf.get(s._id.toString()) === "BREAK",
					).length,
					dropped: group.filter(
						(s) => statusOf.get(s._id.toString()) === "DROPPED",
					).length,
					sessions: group.reduce(
						(sum, s) =>
							sum + (sessionCountByStudent.get(s._id.toString()) ?? 0),
						0,
					),
					overdue: group.filter((s) => {
						if (s.status !== "STUDENT") return false;
						const due = s.customNextFollowUpAt ?? s.nextFollowUpAt;
						return Boolean(due && due <= now);
					}).length,
				});
			}
			counsellors.sort((a, b) => b.assigned - a.assigned);
		}

		return {
			range: { from: from.toISOString(), to: to.toISOString(), bucket },
			counsellor: params.counsellorId
				? {
						id: params.counsellorId,
						name:
							nameOf.get(params.counsellorId) ??
							(
								await UserModel.findById(params.counsellorId)
									.select("name username")
									.lean<{ name?: string; username?: string } | null>()
							)?.name ??
							"Counsellor",
					}
				: null,
			statusSummary,
			previous,
			events: eventRows,
			trend: [...trendMap.values()],
			distributions,
			followUp,
			assessments: {
				oral: assessmentOf("oralAssessmentDone"),
				written: assessmentOf("writtenAssessmentDone"),
				level: assessmentOf("levelAssessmentDone"),
			},
			counsellors,
		};
	},
};
