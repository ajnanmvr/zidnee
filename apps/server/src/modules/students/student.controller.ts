import {
	StudentFollowUpPayloadSchema,
	MessageResponseSchema,
	StudentsResponseSchema,
	StudentProcessesResponseSchema,
	StudentProcessResponseSchema,
    StudentProcessEnvelopeSchema,
	UpdateStudentAssessmentPayloadSchema,
 	UpdateStudentPayloadSchema,
} from "@repo/schema";
import type { Request, Response } from "express";
import { requireStringValue } from "../rbac/rbac.http.js";
import { AuthorizationError, NotFoundError } from "../../utils/errors.util.js";
import { getEffectivePermissions } from "../rbac/rbac.service.js";
import { StudentService, type StudentProcessListItem } from "./student.service.js";
import { uploadBuffer } from "../../lib/s3.js";

const trimProcessTaskLabel = (label: string) => {
	return label.length > 150 ? label.slice(0, 150) : label;
};

const toStudentResponse = (
	student: Awaited<ReturnType<typeof StudentService.listStudents>>["students"][number],
) => {
	return {
		id: student.id,
		zid: student.zid,
		leadId: student.leadId,
		name: student.name,
		phone: student.phone,
		email: student.email,
		courseType: student.courseType,
		level: student.level,
		admittedBy: student.admittedBy,
		dateOfBirth: student.dateOfBirth?.toISOString() ?? null,
		residingCountry: student.residingCountry,
		gender: student.gender,
		primaryWhatsappNumber: student.primaryWhatsappNumber,
		alternateWhatsappNumber: student.alternateWhatsappNumber,
		profilePic: student.profilePic,
		studentInfo: student.studentInfo,
		preferredLanguage: student.preferredLanguage,
		preferredSchedule: student.preferredSchedule,
		preferredDays: student.preferredDays,
		timeslot: student.timeslot,
		price: student.price,
		admissionFee: student.admissionFee ?? undefined,
		hearAboutUs: student.hearAboutUs,
		mentorId: student.mentorId,
		batchId: student.batchId,
		processId: student.processId,
		processLabel: student.processLabel,
		inactiveFrom: student.inactiveFrom?.toISOString() ?? null,
		inactiveUntil: student.inactiveUntil?.toISOString() ?? null,
		dropReason: student.dropReason ?? null,
		dropTemporary: student.dropTemporary ?? null,
		oralAssessmentDone: student.oralAssessmentDone,
		writtenAssessmentDone: student.writtenAssessmentDone,
		levelAssessmentDone: student.levelAssessmentDone,
		nextFollowUpAt: student.nextFollowUpAt?.toISOString() ?? null,
		customNextFollowUpAt: student.customNextFollowUpAt?.toISOString() ?? null,
		status: student.status,
		admittedAt: student.admittedAt.toISOString(),
		classStartConfirmedAt: student.classStartConfirmedAt?.toISOString() ?? null,
		classStarted: student.classStarted ?? false,
		createdAt: student.createdAt?.toISOString() ?? null,
		updatedAt: student.updatedAt?.toISOString() ?? null,
	};
};

const toStudentProcessResponse = (process: StudentProcessListItem) => {
	return {
		id: process.id.toString(),
		studentId: process.studentId.toString(),
		status: process.status,
		label: process.label,
		archivedAt: process.archivedAt?.toISOString() ?? null,
		tasks: process.tasks.map((task) => ({
			key: task.key,
			label: trimProcessTaskLabel(task.label),
			completed: task.completed,
			completedAt: task.completedAt?.toISOString() ?? null,
			actionType: (task as any).actionType ?? undefined,
			whatsappMessage: (task as any).whatsappMessage ?? undefined,
		})),
		student: {
			id: process.student.id.toString(),
			leadId: process.student.leadId?.toString(),
			zid: process.student.zid,
			name: process.student.name ?? null,
			phone: process.student.phone,
			primaryWhatsappNumber: process.student.primaryWhatsappNumber,
			email: process.student.email,
			status: process.student.status,
			courseType: process.student.courseType,
			level: process.student.level,
			mentorId: process.student.mentorId?.toString(),
			batchId: process.student.batchId?.toString(),
		},
		createdAt: process.createdAt.toISOString(),
		updatedAt: process.updatedAt.toISOString(),
	};
};

export const getStudentByIdController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const studentId = requireStringValue(req.params.studentId, "studentId");
	const student = await StudentService.findById(studentId);
	if (!student) {
		throw new NotFoundError("Student");
	}
	res.json(
		StudentsResponseSchema.parse({
			ok: true,
			students: [toStudentResponse(student)],
		}),
	);
};

export const listStudentsController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const effectivePermissions = await getEffectivePermissions(req.user?.roleIds ?? []);
	const hasPermission = (key: string) => effectivePermissions.some((p) => p.key === key);
	const requestedScope = req.query.scope === "mine" ? "mine" : "all";
	const canReadAll = hasPermission("STUDENT_READ_ALL") || hasPermission("STUDENT_POSTER_DOWNLOAD");

	// "admittedBy=me" powers the "Converted Leads" view: it lists students
	// converted by the current user, gated by lead-read permissions rather
	// than the broader STUDENT_READ_ALL permission. It bypasses the
	// mentor/batch-counsellor based `scope` filter entirely.
	const admittedByMe = req.query.admittedBy === "me";
	const admittedByAll = req.query.admittedBy === "all";
	const isConvertedLeadsView = admittedByMe || admittedByAll;
	const canReadConvertedLeads =
		hasPermission("LEAD_READ_MY") ||
		hasPermission("LEAD_READ_ALL") ||
		hasPermission("LEADS_CONVERTED_READ");

	if (isConvertedLeadsView) {
		if (!canReadConvertedLeads) {
			throw new AuthorizationError("Insufficient permissions to view converted leads");
		}
	} else if (requestedScope === "all" && !canReadAll) {
		throw new AuthorizationError("Insufficient permissions to view all students");
	}

	// Course-type-scoped permissions narrow the result set: if a role has
	// only one of the group/individual permissions for the active scope, the
	// listing is restricted to that course type. Having both (or neither)
	// leaves the listing unrestricted.
	const groupKey = requestedScope === "mine" ? "STUDENT_READ_MY_GROUP" : "STUDENT_READ_ALL_GROUP";
	const individualKey = requestedScope === "mine" ? "STUDENT_READ_MY_INDIVIDUAL" : "STUDENT_READ_ALL_INDIVIDUAL";
	const canReadGroup = hasPermission(groupKey);
	const canReadIndividual = hasPermission(individualKey);
	const allowedCourseTypes =
		canReadGroup !== canReadIndividual
			? [canReadGroup ? "GROUP" : "INDIVIDUAL"]
			: undefined;

	const page = typeof req.query.page === "string" ? parseInt(req.query.page, 10) : 1;
	const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 25;

	const result = await StudentService.listStudents({
		status: typeof req.query.status === "string" ? req.query.status : undefined,
		courseType: typeof req.query.courseType === "string" ? req.query.courseType : undefined,
		allowedCourseTypes,
		search: typeof req.query.search === "string" ? req.query.search : undefined,
		sortBy: typeof req.query.sortBy === "string" ? req.query.sortBy : undefined,
		sortOrder: req.query.sortOrder === "desc" ? "desc" : "asc",
		page,
		limit,
		scope: isConvertedLeadsView ? "all" : requestedScope,
		userId: typeof req.user?.userId === "string" ? req.user.userId : undefined,
		admittedBy: admittedByMe && typeof req.user?.userId === "string" ? req.user.userId : undefined,
	});
	res.json(
		StudentsResponseSchema.parse({
			ok: true,
			students: result.students.map(toStudentResponse),
			pagination: {
				total: result.total,
				page,
				limit,
				totalPages: Math.max(1, Math.ceil(result.total / limit)),
			},
		}),
	);
};

export const listStudentProcessesController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const effectivePermissions = await getEffectivePermissions(req.user?.roleIds ?? []);
	const requestedScope = req.query.scope === "mine" ? "mine" : "all";
	if (
		requestedScope === "all" &&
		!effectivePermissions.some((permission) => permission.key === "STUDENT_PROCESS_READ_ALL")
	) {
		throw new AuthorizationError("Insufficient permissions to view all student processes");
	}

	const processes = await StudentService.listStudentProcesses({
		scope: requestedScope,
		userId: typeof req.user?.userId === "string" ? req.user.userId : undefined,
	});
	res.json(
		StudentProcessesResponseSchema.parse({
			ok: true,
			processes: processes.map(toStudentProcessResponse),
		}),
	);
};

export const listStudentProcessHistoryController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const effectivePermissions = await getEffectivePermissions(req.user?.roleIds ?? []);
	const requestedScope = req.query.scope === "mine" ? "mine" : "all";
	if (
		requestedScope === "all" &&
		!effectivePermissions.some((permission) => permission.key === "STUDENT_PROCESS_HISTORY_READ_ALL")
	) {
		throw new AuthorizationError("Insufficient permissions to view all process history");
	}

	const processes = await StudentService.listStudentProcessHistory({
		scope: requestedScope,
		userId: typeof req.user?.userId === "string" ? req.user.userId : undefined,
	});
	res.json(
		StudentProcessesResponseSchema.parse({
			ok: true,
			processes: processes.map(toStudentProcessResponse),
		}),
	);
};

export const getStudentProcessController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const processId = requireStringValue(req.params.processId, "processId");
	const process = await StudentService.getStudentProcessById(processId);
	if (!process) {
		res.status(404).json({ ok: false, error: "Process not found" });
		return;
	}

	// reuse response mapping used for list
	const mapped = {
		archivedAt: process.archivedAt?.toISOString() ?? null,
		id: process.id.toString(),
		studentId: process.studentId.toString(),
		status: process.status,
		label: process.label,
		tasks: process.tasks.map((task) => ({
			key: task.key,
			label: trimProcessTaskLabel(task.label),
			completed: task.completed,
			completedAt: task.completedAt?.toISOString() ?? null,
			actionType: (task as any).actionType ?? undefined,
			whatsappMessage: (task as any).whatsappMessage ?? undefined,
		})),
		student: {
			id: process.student.id.toString(),
			leadId: process.student.leadId?.toString(),
			zid: process.student.zid,
			name: process.student.name ?? null,
			phone: process.student.phone,
			primaryWhatsappNumber: process.student.primaryWhatsappNumber,
			email: process.student.email,
			status: process.student.status,
			courseType: process.student.courseType,
			level: process.student.level,
			mentorId: process.student.mentorId?.toString(),
			batchId: process.student.batchId?.toString(),
		},
		createdAt: process.createdAt.toISOString(),
		updatedAt: process.updatedAt.toISOString(),
	};

	// validate the single-process shape before returning
	const validated = StudentProcessResponseSchema.parse(mapped as any);
	res.json({ ok: true, process: validated });
};

export const markStudentProcessTaskController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const processId = requireStringValue(req.params.processId, "processId");
	const taskKey = requireStringValue(req.params.taskKey, "taskKey");

	const updated = await StudentService.markProcessTaskCompleted(processId, taskKey);
	if (!updated) {
		res.status(404).json({ ok: false, error: "Process or task not found" });
		return;
	}

	const mapped = {
		id: updated.id.toString(),
		archivedAt: updated.archivedAt?.toISOString() ?? null,
		studentId: updated.studentId.toString(),
		status: updated.status,
		label: updated.label,
		tasks: updated.tasks.map((task) => ({
			key: task.key,
			label: trimProcessTaskLabel(task.label),
			completed: task.completed,
			completedAt: task.completedAt?.toISOString() ?? null,
			actionType: (task as any).actionType ?? undefined,
			whatsappMessage: (task as any).whatsappMessage ?? undefined,
		})),
		student: {
			id: updated.student.id.toString(),
			leadId: updated.student.leadId?.toString(),
			zid: updated.student.zid,
			name: updated.student.name ?? null,
			phone: updated.student.phone,
			primaryWhatsappNumber: updated.student.primaryWhatsappNumber,
			email: updated.student.email,
			status: updated.student.status,
			courseType: updated.student.courseType,
			level: updated.student.level,
			mentorId: updated.student.mentorId?.toString(),
			batchId: updated.student.batchId?.toString(),
		},
		createdAt: updated.createdAt.toISOString(),
		updatedAt: updated.updatedAt.toISOString(),
	};

	const validated = StudentProcessEnvelopeSchema.parse({ ok: true, process: mapped });
	res.json({ ok: true, process: validated.process });
};

export const setStudentProcessTaskCompletionController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const processId = requireStringValue(req.params.processId, "processId");
	const taskKey = requireStringValue(req.params.taskKey, "taskKey");
	const completed = typeof req.body?.completed === "boolean" ? req.body.completed : undefined;

	if (completed === undefined) {
		res.status(400).json({ ok: false, error: "Missing 'completed' boolean in request body" });
		return;
	}

	const updated = await StudentService.setProcessTaskCompletion(processId, taskKey, completed);
	if (!updated) {
		res.status(404).json({ ok: false, error: "Process or task not found" });
		return;
	}

	const mapped = {
		id: updated.id.toString(),
		studentId: updated.studentId.toString(),
		status: updated.status,
		label: updated.label,
		archivedAt: updated.archivedAt?.toISOString() ?? null,
		tasks: updated.tasks.map((task) => ({
			key: task.key,
			label: trimProcessTaskLabel(task.label),
			completed: task.completed,
			completedAt: task.completedAt?.toISOString() ?? null,
			actionType: (task as any).actionType ?? undefined,
			whatsappMessage: (task as any).whatsappMessage ?? undefined,
		})),
		student: {
			id: updated.student.id.toString(),
			leadId: updated.student.leadId?.toString(),
			zid: updated.student.zid,
			name: updated.student.name ?? null,
			phone: updated.student.phone,
			primaryWhatsappNumber: updated.student.primaryWhatsappNumber,
			email: updated.student.email,
			status: updated.student.status,
			courseType: updated.student.courseType,
			level: updated.student.level,
			mentorId: updated.student.mentorId?.toString(),
			batchId: updated.student.batchId?.toString(),
		},
		createdAt: updated.createdAt.toISOString(),
		updatedAt: updated.updatedAt.toISOString(),
	};

	const validated = StudentProcessEnvelopeSchema.parse({ ok: true, process: mapped });
	res.json({ ok: true, process: validated.process });
};

export const completeStudentProcessController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const processId = requireStringValue(req.params.processId, "processId");
	const performedBy = requireStringValue(req.user?.userId, "userId");
	const completed = await StudentService.completeStudentProcess(processId, performedBy);

	if (!completed) {
		res.status(404).json({ ok: false, error: "Process not found" });
		return;
	}

	res.json(MessageResponseSchema.parse({ ok: true, message: "Process moved to history" }));
};

export const deleteStudentProcessController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const processId = requireStringValue(req.params.processId, "processId");
	const performedBy = requireStringValue(req.user?.userId, "userId");
	const deleted = await StudentService.deleteStudentProcess(processId, performedBy);

	if (!deleted) {
		res.status(404).json({ ok: false, error: "Process not found" });
		return;
	}

	res.json(MessageResponseSchema.parse({ ok: true, message: "Process deleted" }));
};

export const recordStudentFollowUpController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const studentId = requireStringValue(req.params.studentId, "studentId");
	const payload = StudentFollowUpPayloadSchema.parse(req.body);
	const performedBy = requireStringValue(req.user?.userId, "userId");
	const student = await StudentService.recordFollowUp(
		studentId,
		performedBy,
		payload.note,
		payload.nextFollowUpAt,
	);

	res.json({
		ok: true,
		student: student ? toStudentResponse(student) : null,
	});
};

export const updateStudentAssessmentController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const studentId = requireStringValue(req.params.studentId, "studentId");
	const payload = UpdateStudentAssessmentPayloadSchema.parse(req.body);
	const performedBy = requireStringValue(req.user?.userId, "userId");
	const student = await StudentService.updateAssessment(
		studentId,
		payload.assessmentType,
		payload.isDone,
		performedBy,
		payload.note,
	);

	res.json({
		ok: true,
		student: student ? toStudentResponse(student) : null,
	});
};

export const updateStudentController = async (
	req: Request,
	res: Response,
): Promise<void> => {
 	const studentId = requireStringValue(req.params.studentId, "studentId");
 	const payload = UpdateStudentPayloadSchema.parse(req.body);
	const student = await StudentService.update(
		studentId,
		payload,
		req.user?.userId,
	);

 	res.json({
 		ok: true,
 		student: student ? toStudentResponse(student) : null,
 	});
};

export const uploadStudentProfilePicController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const studentId = requireStringValue(req.params.studentId, "studentId");
	// multer places the file on req.file
	const file = (req as any).file as Express.Multer.File | undefined;

	if (!file || !file.buffer) {
		res.status(400).json({ ok: false, error: "No file provided" });
		return;
	}
	// store profile images under a dedicated public prefix
	const timestamp = Date.now();
	const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
	const key = `profile-images/students/${studentId}/${timestamp}_${safeName}`;

	const url = await uploadBuffer(file.buffer, key, file.mimetype);

	const student = await StudentService.update(studentId, { profilePic: url });

	res.json({ ok: true, student: student ? toStudentResponse(student) : null });
};
