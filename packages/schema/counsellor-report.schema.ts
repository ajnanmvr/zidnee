import { z } from "zod";
import { ObjectIdStringSchema } from "./rbac.schema.js";

export const CounsellorReportQuerySchema = z.object({
	/** Omit to aggregate across every counsellor. */
	counsellorId: ObjectIdStringSchema.optional(),
	from: z.coerce.date().optional(),
	to: z.coerce.date().optional(),
});

export type CounsellorReportQuery = z.infer<typeof CounsellorReportQuerySchema>;

const CountSchema = z.object({ label: z.string(), count: z.number() });

export const ReportEventTypeSchema = z.enum(["BREAK", "DROP", "RESTART"]);
export type ReportEventType = z.infer<typeof ReportEventTypeSchema>;

const ComplianceCountsSchema = z.object({
	COMPLIANT: z.number(),
	PARTIAL: z.number(),
	NON_COMPLIANT: z.number(),
});

const AssessmentStatSchema = z.object({
	done: z.number(),
	total: z.number(),
	completedInPeriod: z.number(),
});

export const CounsellorReportSchema = z.object({
	range: z.object({
		from: z.string().datetime(),
		to: z.string().datetime(),
		bucket: z.enum(["day", "week", "month"]),
	}),
	counsellor: z.object({ id: z.string(), name: z.string() }).nullable(),

	/** Section 1 of the report template: Student Status Report. */
	statusSummary: z.object({
		totalAssigned: z.number(),
		active: z.number(),
		onBreak: z.number(),
		dropped: z.number(),
		restartedFromBreak: z.number(),
		restartedFromDrop: z.number(),
		newAdmissions: z.number(),
		breaksStarted: z.number(),
		dropsInPeriod: z.number(),
		sessionsInPeriod: z.number(),
	}),
	/** Same period-based metrics for the equally long period before `from`. */
	previous: z.object({
		newAdmissions: z.number(),
		breaksStarted: z.number(),
		dropsInPeriod: z.number(),
		restarts: z.number(),
		sessionsInPeriod: z.number(),
	}),

	/** Section 2 of the report template: Break & Drop details. */
	events: z.array(
		z.object({
			studentId: z.string(),
			zid: z.string(),
			name: z.string(),
			type: ReportEventTypeSchema,
			currentStatus: z.string(),
			reason: z.string().optional(),
			temporary: z.boolean().optional(),
			breakFrom: z.string().optional(),
			breakUntil: z.string().optional(),
			at: z.string().datetime(),
			mentorName: z.string().optional(),
			counsellorName: z.string().optional(),
			courseType: z.string().optional(),
			level: z.string().optional(),
		}),
	),

	trend: z.array(
		z.object({
			start: z.string().datetime(),
			admissions: z.number(),
			breaks: z.number(),
			drops: z.number(),
			restarts: z.number(),
			sessions: z.number(),
		}),
	),

	distributions: z.object({
		byStatus: z.array(CountSchema),
		byCourseType: z.array(CountSchema),
		byLevel: z.array(CountSchema),
		byMentor: z.array(CountSchema),
		dropReasons: z.array(CountSchema),
	}),

	followUp: z.object({
		dueNow: z.number(),
		upcoming7d: z.number(),
		notScheduled: z.number(),
		/** Active students (at period end) with at least one follow-up in the period. */
		contactedInPeriod: z.number(),
		notContactedInPeriod: z.number(),
		quickNotesInPeriod: z.number(),
		/** Active students by time since last contact. */
		recency: z.array(CountSchema),
		sessionsInPeriod: z.number(),
		resultBreakdown: z.array(CountSchema),
		needsAttention: z.number(),
		parentContacted: z.number(),
		parentSatisfied: z.number(),
		parentNeedsImprovement: z.number(),
		classroomChecks: z.record(z.string(), ComplianceCountsSchema),
		classObservation: z.record(z.string(), ComplianceCountsSchema),
	}),

	assessments: z.object({
		oral: AssessmentStatSchema,
		written: AssessmentStatSchema,
		level: AssessmentStatSchema,
	}),

	/** Per-counsellor comparison; only populated when no counsellor is selected. */
	counsellors: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			assigned: z.number(),
			active: z.number(),
			onBreak: z.number(),
			dropped: z.number(),
			sessions: z.number(),
			overdue: z.number(),
		}),
	),
});

export type CounsellorReport = z.infer<typeof CounsellorReportSchema>;

export const CounsellorReportResponseSchema = z.object({
	ok: z.boolean(),
	report: CounsellorReportSchema,
});
