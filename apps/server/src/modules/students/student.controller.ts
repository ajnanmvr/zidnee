import { StudentsResponseSchema } from "@repo/schema";
import type { Request, Response } from "express";
import { StudentService } from "./student.service.js";

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
		studentInfo: student.studentInfo,
		preferredLanguage: student.preferredLanguage,
		preferredSchedule: student.preferredSchedule,
		preferredDays: student.preferredDays,
		timeslot: student.timeslot,
		price: student.price,
		startClassWhen: student.startClassWhen,
		hearAboutUs: student.hearAboutUs,
		mentorId: student.mentorId,
		batchId: student.batchId,
		status: student.status,
		admittedAt: student.admittedAt.toISOString(),
		createdAt: student.createdAt?.toISOString() ?? null,
		updatedAt: student.updatedAt?.toISOString() ?? null,
	};
};

export const listStudentsController = async (
	_req: Request,
	res: Response,
): Promise<void> => {
	const students = await StudentService.listStudents();
	res.json(
		StudentsResponseSchema.parse({
			ok: true,
			students: students.map(toStudentResponse),
		}),
	);
};
