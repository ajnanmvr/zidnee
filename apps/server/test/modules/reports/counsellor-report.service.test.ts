import { Types } from "mongoose";
import { describe, expect, it } from "vitest";
import { CounsellorReportService } from "../../../src/modules/reports/counsellor-report.service.js";
import { StudentModel } from "../../../src/modules/students/student.model.js";
import { StudentActivityModel } from "../../../src/modules/students/student-activity.model.js";
import { StudentFollowUpSessionModel } from "../../../src/modules/students/student-followup-session.model.js";

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

let counter = 0;
const makeStudent = async (
	counsellorId: Types.ObjectId,
	overrides: Record<string, unknown> = {},
) => {
	counter += 1;
	return StudentModel.create({
		zid: `T${counter}`,
		leadId: new Types.ObjectId(),
		phone: "9999999999",
		email: `s${counter}@example.com`,
		admittedBy: new Types.ObjectId(),
		admittedAt: daysAgo(100),
		counsellorId,
		status: "STUDENT",
		...overrides,
	});
};

const statusActivity = (
	studentId: Types.ObjectId,
	description: string,
	createdAt: Date,
	oldStatus?: string,
	newStatus?: string,
) =>
	StudentActivityModel.create({
		studentId,
		type: "STATUS_CHANGED",
		performedBy: new Types.ObjectId(),
		description,
		createdAt,
		oldValue: oldStatus ? { status: oldStatus } : undefined,
		newValue: newStatus ? { status: newStatus } : undefined,
	});

describe("CounsellorReportService", () => {
	it("summarises status counts, events and follow-up sessions for one counsellor", async () => {
		const counsellor = new Types.ObjectId();
		const other = new Types.ObjectId();

		const active = await makeStudent(counsellor, { admittedAt: daysAgo(3) });
		const onBreak = await makeStudent(counsellor, { status: "BREAK" });
		const dropped = await makeStudent(counsellor, {
			status: "DROPPED",
			dropReason: "Payment issue",
		});
		const restarted = await makeStudent(counsellor);
		await makeStudent(other); // belongs to another counsellor — must be excluded

		await statusActivity(
			onBreak._id,
			"Student put on break",
			daysAgo(5),
			"STUDENT",
			"BREAK",
		);
		await statusActivity(
			dropped._id,
			"Student dropped",
			daysAgo(4),
			"STUDENT",
			"DROPPED",
		);
		// New-style restart that records where it came from
		await statusActivity(
			restarted._id,
			"Student marked active",
			daysAgo(2),
			"BREAK",
			"STUDENT",
		);
		// Legacy restart with no status stored — counted as from break
		await statusActivity(active._id, "Student marked active", daysAgo(1));
		// Outside the 30-day window — ignored
		await statusActivity(
			onBreak._id,
			"Student put on break",
			daysAgo(90),
			"STUDENT",
			"BREAK",
		);

		const checks = {
			groupSetup: "COMPLIANT",
			dailyClassUpdates: "PARTIAL",
			activitiesAndInfo: "COMPLIANT",
			quranRecordings: "COMPLIANT",
			practicalDemonstration: "COMPLIANT",
			arabicWritingReading: "COMPLIANT",
			assessmentStatus: "COMPLIANT",
			mentorFeedback: "NON_COMPLIANT",
		};
		const observation = {
			mentorPunctuality: "COMPLIANT",
			teachingQuality: "COMPLIANT",
			studentInteraction: "COMPLIANT",
			syllabusProgress: "COMPLIANT",
			parentsCommitments: "COMPLIANT",
			overallClassQuality: "COMPLIANT",
		};
		await StudentFollowUpSessionModel.create({
			studentId: active._id,
			performedBy: new Types.ObjectId(),
			studentName: "A",
			inspectionDate: daysAgo(1),
			classroomChecks: checks,
			classObservation: observation,
			parent: { contacted: true, satisfaction: "SATISFIED" },
			findings: {
				needsAdditionalAttention: true,
				result: "NEEDS_IMPROVEMENT",
			},
		});

		const report = await CounsellorReportService.build({
			counsellorId: counsellor.toString(),
			from: daysAgo(30),
			to: new Date(),
		});

		expect(report.statusSummary).toMatchObject({
			totalAssigned: 4,
			active: 2,
			onBreak: 1,
			dropped: 1,
			restartedFromBreak: 2,
			restartedFromDrop: 0,
			newAdmissions: 1,
			breaksStarted: 1,
			dropsInPeriod: 1,
			sessionsInPeriod: 1,
		});

		expect(report.events.map((e) => e.type).sort()).toEqual([
			"BREAK",
			"DROP",
			"RESTART",
			"RESTART",
		]);
		const dropRow = report.events.find((e) => e.type === "DROP");
		expect(dropRow?.reason).toBe("Payment issue");

		expect(report.distributions.dropReasons).toEqual([
			{ label: "Payment issue", count: 1 },
		]);
		expect(report.followUp.sessionsInPeriod).toBe(1);
		expect(report.followUp.needsAttention).toBe(1);
		expect(report.followUp.parentContacted).toBe(1);
		expect(report.followUp.classroomChecks.mentorFeedback?.NON_COMPLIANT).toBe(
			1,
		);
		expect(report.followUp.classroomChecks.dailyClassUpdates?.PARTIAL).toBe(1);

		// Whole range is covered by day buckets and totals line up with the summary.
		expect(report.range.bucket).toBe("day");
		expect(report.trend.reduce((n, t) => n + t.breaks, 0)).toBe(1);
		expect(report.trend.reduce((n, t) => n + t.sessions, 0)).toBe(1);
		expect(report.counsellors).toEqual([]);
	});

	it("aggregates every counsellor with a per-counsellor breakdown when none is selected", async () => {
		const a = new Types.ObjectId();
		const b = new Types.ObjectId();
		await makeStudent(a);
		await makeStudent(a, { status: "DROPPED" });
		await makeStudent(b);

		const report = await CounsellorReportService.build({
			from: daysAgo(7),
			to: new Date(),
		});

		expect(report.counsellor).toBeNull();
		expect(report.statusSummary.totalAssigned).toBeGreaterThanOrEqual(3);
		const rowA = report.counsellors.find((c) => c.id === a.toString());
		expect(rowA).toMatchObject({ assigned: 2, active: 1, dropped: 1 });
	});

	it("reports status as at the end of the selected period, so changing the timeframe changes the numbers", async () => {
		const counsellor = new Types.ObjectId();
		const other = new Types.ObjectId();

		const lateJoiner = await makeStudent(counsellor, {
			admittedAt: daysAgo(3),
		});
		const breakStudent = await makeStudent(counsellor, { status: "BREAK" });
		const droppedStudent = await makeStudent(counsellor, { status: "DROPPED" });
		await makeStudent(other, { status: "DROPPED" }); // different counsellor

		await statusActivity(
			breakStudent._id,
			"Student put on break",
			daysAgo(20),
			"STUDENT",
			"BREAK",
		);
		await statusActivity(
			droppedStudent._id,
			"Student dropped",
			daysAgo(4),
			"STUDENT",
			"DROPPED",
		);
		// Re-saving with an unchanged status must not count as a transition.
		await statusActivity(
			lateJoiner._id,
			"Student marked active",
			daysAgo(1),
			"STUDENT",
			"STUDENT",
		);

		const now = await CounsellorReportService.build({
			counsellorId: counsellor.toString(),
			from: daysAgo(30),
			to: new Date(),
		});
		expect(now.statusSummary).toMatchObject({
			totalAssigned: 3,
			active: 1,
			onBreak: 1,
			dropped: 1,
			restartedFromBreak: 0,
		});

		// Six days ago: the late joiner hadn't been admitted, the drop hadn't happened yet.
		const earlier = await CounsellorReportService.build({
			counsellorId: counsellor.toString(),
			from: daysAgo(36),
			to: daysAgo(6),
		});
		expect(earlier.statusSummary).toMatchObject({
			totalAssigned: 2,
			active: 1,
			onBreak: 1,
			dropped: 0,
		});
		expect(earlier.distributions.byStatus.map((d) => d.label).sort()).toEqual([
			"Active",
			"On break",
		]);

		// Before the break started.
		const longAgo = await CounsellorReportService.build({
			counsellorId: counsellor.toString(),
			from: daysAgo(60),
			to: daysAgo(25),
		});
		expect(longAgo.statusSummary).toMatchObject({
			totalAssigned: 2,
			active: 2,
			onBreak: 0,
			dropped: 0,
		});
	});

	it("measures follow-up coverage and assessments for the selected period", async () => {
		const counsellor = new Types.ObjectId();
		const recentlyContacted = await makeStudent(counsellor);
		const contactedLongAgo = await makeStudent(counsellor);

		await StudentActivityModel.create({
			studentId: recentlyContacted._id,
			type: "FOLLOW_UP_RECORDED",
			performedBy: new Types.ObjectId(),
			description: "Called parent",
			createdAt: daysAgo(2),
		});
		await StudentFollowUpSessionModel.create({
			studentId: contactedLongAgo._id,
			performedBy: new Types.ObjectId(),
			studentName: "B",
			inspectionDate: daysAgo(40),
			createdAt: daysAgo(40),
			classroomChecks: {},
			classObservation: {},
			parent: { contacted: false },
			findings: { needsAdditionalAttention: false, result: "SATISFACTORY" },
		});
		// Oral assessment passed 5 days ago (and is still done today).
		await StudentModel.updateOne(
			{ _id: recentlyContacted._id },
			{ oralAssessmentDone: true },
		);
		await StudentActivityModel.create({
			studentId: recentlyContacted._id,
			type: "ASSESSMENT_UPDATED",
			performedBy: new Types.ObjectId(),
			description: "oral assessment marked done",
			createdAt: daysAgo(5),
			oldValue: {
				oralAssessmentDone: false,
				writtenAssessmentDone: false,
				levelAssessmentDone: false,
			},
			newValue: { oralAssessmentDone: true },
		});

		const recent = await CounsellorReportService.build({
			counsellorId: counsellor.toString(),
			from: daysAgo(30),
			to: new Date(),
		});
		expect(recent.followUp).toMatchObject({
			contactedInPeriod: 1,
			notContactedInPeriod: 1,
			quickNotesInPeriod: 1,
		});
		expect(
			recent.followUp.recency.find((r) => r.label === "Within 7 days")?.count,
		).toBe(1);
		expect(
			recent.followUp.recency.find((r) => r.label === "Over 30 days")?.count,
		).toBe(1);
		expect(recent.assessments.oral).toEqual({
			done: 1,
			total: 2,
			completedInPeriod: 1,
		});

		// Window that ended 35 days ago: only the older session falls inside it,
		// the quick note and the oral assessment came later.
		const older = await CounsellorReportService.build({
			counsellorId: counsellor.toString(),
			from: daysAgo(90),
			to: daysAgo(35),
		});
		expect(older.followUp).toMatchObject({
			contactedInPeriod: 1,
			notContactedInPeriod: 1,
			quickNotesInPeriod: 0,
		});
		expect(older.followUp.recency.find((r) => r.label === "Never")?.count).toBe(
			1,
		);
		expect(older.assessments.oral).toEqual({
			done: 0,
			total: 2,
			completedInPeriod: 0,
		});
	});

	it("uses wider buckets for longer ranges", async () => {
		const counsellor = new Types.ObjectId();
		await makeStudent(counsellor);
		const week = await CounsellorReportService.build({
			counsellorId: counsellor.toString(),
			from: daysAgo(90),
			to: new Date(),
		});
		const month = await CounsellorReportService.build({
			counsellorId: counsellor.toString(),
			from: daysAgo(365),
			to: new Date(),
		});
		expect(week.range.bucket).toBe("week");
		expect(month.range.bucket).toBe("month");
	});
});
