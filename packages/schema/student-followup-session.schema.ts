import { z } from "zod";
import { ObjectIdStringSchema } from "./rbac.schema.js";

export const ComplianceStatusSchema = z.enum([
	"COMPLIANT",
	"PARTIAL",
	"NON_COMPLIANT",
]);
export type ComplianceStatus = z.infer<typeof ComplianceStatusSchema>;

export const COMPLIANCE_STATUS_LABELS: Record<ComplianceStatus, string> = {
	COMPLIANT: "Compliant",
	PARTIAL: "Partially Compliant",
	NON_COMPLIANT: "Non-Compliant",
};

/** Section 2: classroom group inspection points. */
export const CLASSROOM_CHECK_ITEMS = [
	{
		key: "groupSetup",
		label:
			"Correct group name / group description / attendance format / pinned meet link",
	},
	{ key: "dailyClassUpdates", label: "Daily class updates" },
	{ key: "activitiesAndInfo", label: "Activities and extra information" },
	{ key: "quranRecordings", label: "Quran recitation voice recordings" },
	{
		key: "practicalDemonstration",
		label:
			"Practical demonstration (sunnah & fard prayers, wudhu / daily sunnah, dhikr, moral duties)",
	},
	{ key: "arabicWritingReading", label: "Arabic writing and reading" },
	{ key: "assessmentStatus", label: "Zidnee's assessment status" },
	{ key: "mentorFeedback", label: "Mentor corrections and feedback" },
] as const;

/** Section 3: class observation points. */
export const CLASS_OBSERVATION_ITEMS = [
	{ key: "mentorPunctuality", label: "Mentor punctuality" },
	{ key: "teachingQuality", label: "Teaching quality" },
	{ key: "studentInteraction", label: "Student interaction" },
	{ key: "syllabusProgress", label: "Syllabus progress" },
	{ key: "parentsCommitments", label: "Parents' commitments" },
	{ key: "overallClassQuality", label: "Overall class quality" },
] as const;

export type ClassroomCheckKey = (typeof CLASSROOM_CHECK_ITEMS)[number]["key"];
export type ClassObservationKey =
	(typeof CLASS_OBSERVATION_ITEMS)[number]["key"];

const keyedStatusSchema = <K extends string>(keys: readonly K[]) =>
	z.object(
		Object.fromEntries(keys.map((k) => [k, ComplianceStatusSchema])) as Record<
			K,
			typeof ComplianceStatusSchema
		>,
	);

export const ClassroomChecksSchema = keyedStatusSchema(
	CLASSROOM_CHECK_ITEMS.map((i) => i.key),
);
export const ClassObservationSchema = keyedStatusSchema(
	CLASS_OBSERVATION_ITEMS.map((i) => i.key),
);

export const ParentSatisfactionSchema = z.enum([
	"SATISFIED",
	"NEEDS_IMPROVEMENT",
]);

export const InspectionResultSchema = z.enum([
	"SATISFACTORY",
	"NEEDS_IMPROVEMENT",
	"URGENT_ATTENTION",
]);
export type InspectionResult = z.infer<typeof InspectionResultSchema>;

export const INSPECTION_RESULT_LABELS: Record<InspectionResult, string> = {
	SATISFACTORY: "Satisfactory",
	NEEDS_IMPROVEMENT: "Needs improvement",
	URGENT_ATTENTION: "Urgent attention required",
};

const optionalText = (max: number) => z.string().trim().max(max).optional();

export const CreateStudentFollowUpSessionPayloadSchema = z.object({
	classPlan: optionalText(255),
	inspectionDate: z.coerce.date().optional(),
	classroomChecks: ClassroomChecksSchema,
	classObservation: ClassObservationSchema,
	parent: z.object({
		contacted: z.boolean(),
		satisfaction: ParentSatisfactionSchema.optional(),
		feedback: optionalText(2000),
		complaints: optionalText(2000),
	}),
	findings: z.object({
		positiveObservations: optionalText(2000),
		areasForImprovement: optionalText(2000),
		needsAdditionalAttention: z.boolean(),
		result: InspectionResultSchema,
		counsellorRemarks: optionalText(2000),
	}),
	nextFollowUpAt: z.coerce.date().optional(),
});

export type CreateStudentFollowUpSessionPayload = z.infer<
	typeof CreateStudentFollowUpSessionPayloadSchema
>;

export const StudentFollowUpSessionSchema = z.object({
	id: ObjectIdStringSchema,
	studentId: z.string(),
	// Snapshot of student details at inspection time
	studentZid: z.string().optional(),
	studentName: z.string(),
	level: z.string().optional(),
	mentorName: z.string().optional(),
	classPlan: z.string().optional(),
	inspectionDate: z.string().datetime(),
	classroomChecks: ClassroomChecksSchema,
	classObservation: ClassObservationSchema,
	parent: z.object({
		contacted: z.boolean(),
		satisfaction: ParentSatisfactionSchema.optional(),
		feedback: z.string().optional(),
		complaints: z.string().optional(),
	}),
	findings: z.object({
		positiveObservations: z.string().optional(),
		areasForImprovement: z.string().optional(),
		needsAdditionalAttention: z.boolean(),
		result: InspectionResultSchema,
		counsellorRemarks: z.string().optional(),
	}),
	performedBy: z.string(),
	performedByName: z.string(),
	createdAt: z.string().datetime(),
});

export type StudentFollowUpSession = z.infer<
	typeof StudentFollowUpSessionSchema
>;

export const StudentFollowUpSessionsResponseSchema = z.object({
	ok: z.boolean(),
	sessions: z.array(StudentFollowUpSessionSchema),
});

export const StudentFollowUpSessionResponseSchema = z.object({
	ok: z.boolean(),
	session: StudentFollowUpSessionSchema,
});
