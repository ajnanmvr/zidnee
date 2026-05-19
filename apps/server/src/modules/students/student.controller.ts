import {
	StudentFollowUpPayloadSchema,
	StudentsResponseSchema,
	UpdateStudentAssessmentPayloadSchema,
 	UpdateStudentPayloadSchema,
} from "@repo/schema";
import type { Request, Response } from "express";
import { requireStringValue } from "../rbac/rbac.http.js";
import { StudentService } from "./student.service.js";
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
