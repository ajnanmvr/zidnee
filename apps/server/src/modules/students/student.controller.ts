import {
	StudentFollowUpPayloadSchema,
	StudentsResponseSchema,
	StudentProcessesResponseSchema,
	StudentProcessResponseSchema,
    StudentProcessEnvelopeSchema,
	UpdateStudentAssessmentPayloadSchema,
 	UpdateStudentPayloadSchema,
} from "@repo/schema";
import type { Request, Response } from "express";
import { requireStringValue } from "../rbac/rbac.http.js";
import { StudentService, type StudentProcessListItem } from "./student.service.js";
import { uploadBuffer } from "../../lib/s3.js";

const toStudentResponse = (
	student: Awaited<ReturnType<typeof StudentService.listStudents>>[number],
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
		hearAboutUs: student.hearAboutUs,
		mentorId: student.mentorId,
		batchId: student.batchId,
		processId: student.processId,
		processLabel: student.processLabel,
		oralAssessmentDone: student.oralAssessmentDone,
		writtenAssessmentDone: student.writtenAssessmentDone,
		levelAssessmentDone: student.levelAssessmentDone,
		nextFollowUpAt: student.nextFollowUpAt?.toISOString() ?? null,
		customNextFollowUpAt: student.customNextFollowUpAt?.toISOString() ?? null,
		status: student.status,
		admittedAt: student.admittedAt.toISOString(),
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
		tasks: process.tasks.map((task) => ({
			key: task.key,
			label: task.label,
			completed: task.completed,
			completedAt: task.completedAt?.toISOString() ?? null,
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

export const listStudentsController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const students = await StudentService.listStudents({
		status: typeof req.query.status === "string" ? req.query.status : undefined,
		search: typeof req.query.search === "string" ? req.query.search : undefined,
		sortBy: typeof req.query.sortBy === "string" ? req.query.sortBy : undefined,
		sortOrder: req.query.sortOrder === "desc" ? "desc" : "asc",
		page:
			typeof req.query.page === "string"
				? parseInt(req.query.page, 10)
				: undefined,
		limit:
			typeof req.query.limit === "string"
				? parseInt(req.query.limit, 10)
				: undefined,
	});
	res.json(
		StudentsResponseSchema.parse({
			ok: true,
			students: students.map(toStudentResponse),
		}),
	);
};

export const listStudentProcessesController = async (
	_req: Request,
	res: Response,
): Promise<void> => {
	const processes = await StudentService.listStudentProcesses();
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
		id: process.id.toString(),
		studentId: process.studentId.toString(),
		status: process.status,
		label: process.label,
		tasks: process.tasks.map((task) => ({
			key: task.key,
			label: task.label,
			completed: task.completed,
			completedAt: task.completedAt?.toISOString() ?? null,
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
		studentId: updated.studentId.toString(),
		status: updated.status,
		label: updated.label,
		tasks: updated.tasks.map((task) => ({
			key: task.key,
			label: task.label,
			completed: task.completed,
			completedAt: task.completedAt?.toISOString() ?? null,
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

	const validated = StudentProcessEnvelopeSchema.parse({ process: mapped });
	res.json(validated);
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
 	const student = await StudentService.update(studentId, payload);

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
