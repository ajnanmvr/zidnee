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
		mentorId: student.mentorId,
		counsellorId: student.counsellorId,
		batchId: student.batchId,
		batchType: student.batchType,
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
