import {
	CreateStudentFollowUpSessionPayloadSchema,
	StudentFollowUpSessionResponseSchema,
	StudentFollowUpSessionsResponseSchema,
} from "@repo/schema";
import type { Request, Response } from "express";
import { ValidationError } from "../../utils/errors.util.js";
import { requireStringValue } from "../rbac/rbac.http.js";
import {
	type PopulatedFollowUpSession,
	StudentFollowUpSessionService,
} from "./student-followup-session.service.js";

const toSessionResponse = (session: PopulatedFollowUpSession) => ({
	id: session._id.toString(),
	studentId: session.studentId.toString(),
	studentZid: session.studentZid,
	studentName: session.studentName,
	level: session.level,
	mentorName: session.mentorName,
	classPlan: session.classPlan,
	inspectionDate: session.inspectionDate.toISOString(),
	classroomChecks: session.classroomChecks,
	classObservation: session.classObservation,
	parent: session.parent,
	findings: session.findings,
	performedBy: session.performedBy?._id.toString() ?? "",
	performedByName: session.performedBy?.name ?? "Unknown",
	createdAt: session.createdAt.toISOString(),
});

export const createStudentFollowUpSessionController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const studentId = requireStringValue(req.params.studentId, "studentId");
	const performedBy = requireStringValue(req.user?.userId, "userId");
	const parsed = CreateStudentFollowUpSessionPayloadSchema.safeParse(req.body);
	if (!parsed.success) {
		throw new ValidationError(parsed.error.flatten().fieldErrors);
	}

	const created = await StudentFollowUpSessionService.create(
		studentId,
		performedBy,
		parsed.data,
	);
	const session = await StudentFollowUpSessionService.getById(
		studentId,
		created._id.toString(),
	);

	res.status(201).json(
		StudentFollowUpSessionResponseSchema.parse({
			ok: true,
			session: toSessionResponse(session),
		}),
	);
};

export const listStudentFollowUpSessionsController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const studentId = requireStringValue(req.params.studentId, "studentId");
	const sessions = await StudentFollowUpSessionService.list(studentId);
	res.json(
		StudentFollowUpSessionsResponseSchema.parse({
			ok: true,
			sessions: sessions.map(toSessionResponse),
		}),
	);
};

export const getStudentFollowUpSessionController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const studentId = requireStringValue(req.params.studentId, "studentId");
	const sessionId = requireStringValue(req.params.sessionId, "sessionId");
	const session = await StudentFollowUpSessionService.getById(
		studentId,
		sessionId,
	);
	res.json(
		StudentFollowUpSessionResponseSchema.parse({
			ok: true,
			session: toSessionResponse(session),
		}),
	);
};
