import {
	type CreateStudentFollowUpSessionPayload,
	FOLLOW_UP_PERIOD_MS,
	INSPECTION_RESULT_LABELS,
} from "@repo/schema";
import { AppError } from "../../utils/errors.util.js";
import { UserModel } from "../users/user.model.js";
import { type StudentDocument, StudentModel } from "./student.model.js";
import { StudentActivityModel } from "./student-activity.model.js";
import {
	type StudentFollowUpSessionDocument,
	StudentFollowUpSessionModel,
} from "./student-followup-session.model.js";

export type PopulatedFollowUpSession = Omit<
	StudentFollowUpSessionDocument,
	"performedBy"
> & { performedBy: { _id: { toString(): string }; name?: string } | null };

export const StudentFollowUpSessionService = {
	create: async (
		studentId: string,
		performedBy: string,
		payload: CreateStudentFollowUpSessionPayload,
	): Promise<StudentFollowUpSessionDocument> => {
		const student = await StudentModel.findById(
			studentId,
		).lean<StudentDocument | null>();
		if (!student) {
			throw new AppError(404, "Student not found");
		}

		if (
			payload.nextFollowUpAt &&
			payload.nextFollowUpAt.getTime() < Date.now()
		) {
			throw new AppError(400, "Next follow-up date cannot be in the past");
		}

		const mentor = student.mentorId
			? await UserModel.findById(student.mentorId)
					.select("name")
					.lean<{ name?: string } | null>()
			: null;

		const session = await StudentFollowUpSessionModel.create({
			studentId: student._id,
			performedBy,
			studentZid: student.zid,
			studentName: student.name,
			level: student.level,
			mentorName: mentor?.name,
			classPlan: payload.classPlan,
			inspectionDate: payload.inspectionDate ?? new Date(),
			classroomChecks: payload.classroomChecks,
			classObservation: payload.classObservation,
			parent: payload.parent,
			findings: payload.findings,
		});

		const nextFollowUpAt =
			payload.nextFollowUpAt ??
			new Date(Date.now() + FOLLOW_UP_PERIOD_MS.student);

		await StudentModel.findByIdAndUpdate(student._id, {
			$set: { nextFollowUpAt },
			$unset: { customNextFollowUpAt: 1 },
		});

		const resultLabel = INSPECTION_RESULT_LABELS[payload.findings.result];
		await StudentActivityModel.create({
			studentId: student._id,
			type: "FOLLOW_UP_SESSION",
			performedBy,
			description: `Follow-up inspection: ${resultLabel}`,
			note: payload.findings.counsellorRemarks,
			oldValue: {
				nextFollowUpAt: student.nextFollowUpAt?.toISOString() ?? null,
				customNextFollowUpAt:
					student.customNextFollowUpAt?.toISOString() ?? null,
			},
			newValue: {
				sessionId: session._id.toString(),
				result: payload.findings.result,
				nextFollowUpAt: nextFollowUpAt.toISOString(),
				customNextFollowUpAt: null,
			},
		});

		return session.toObject();
	},

	list: async (studentId: string): Promise<PopulatedFollowUpSession[]> => {
		return StudentFollowUpSessionModel.find({ studentId })
			.populate("performedBy", "name")
			.sort({ createdAt: -1 })
			.lean<PopulatedFollowUpSession[]>();
	},

	getById: async (
		studentId: string,
		sessionId: string,
	): Promise<PopulatedFollowUpSession> => {
		const session = await StudentFollowUpSessionModel.findOne({
			_id: sessionId,
			studentId,
		})
			.populate("performedBy", "name")
			.lean<PopulatedFollowUpSession | null>();
		if (!session) {
			throw new AppError(404, "Follow-up session not found");
		}
		return session;
	},
};
