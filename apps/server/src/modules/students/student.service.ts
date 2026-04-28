import type { Student } from "@repo/schema";
import { LeadModel, type LeadDocument } from "../leads/lead.model.js";
import { ActivityService } from "../leads/activity.service.js";
import { UserModel } from "../users/user.model.js";
import { buildStudentIdentity } from "./student.identity.js";
import { StudentModel, type StudentDocument } from "./student.model.js";

const getLatestLeadDemo = (lead: LeadDocument) => {
	const demos = lead.demos ?? [];
	return demos.length > 0 ? demos[demos.length - 1] ?? null : null;
};

const setLatestLeadDemo = (
	lead: LeadDocument,
	patch: Record<string, unknown>,
) => {
	const demos = [...(lead.demos ?? [])];
	if (demos.length === 0) {
		demos.push(patch as NonNullable<LeadDocument["demos"]>[number]);
		return demos;
	}

	demos[demos.length - 1] = {
		...demos[demos.length - 1],
		...patch,
	} as NonNullable<LeadDocument["demos"]>[number];

	return demos;
};

const toStudent = (doc: StudentDocument): Student => {
	return {
		id: doc._id.toString(),
		zid: doc.zid,
		leadId: doc.leadId.toString(),
		name: doc.name,
		phone: doc.phone,
		mentorId: doc.mentorId?.toString(),
		counsellorId: doc.counsellorId?.toString(),
		status: doc.status,
		admittedAt: doc.admittedAt,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	};
};

const nextStudentZid = async (): Promise<string> => {
	const students = await StudentModel.find().lean<Array<Pick<StudentDocument, "zid">>>();
	return buildStudentIdentity(students.map((student) => student.zid));
};

export const StudentService = {
	listStudents: async (): Promise<Student[]> => {
		const students = await StudentModel.find().sort({ admittedAt: -1 }).lean<StudentDocument[]>();
		return students.map(toStudent);
	},

	findByLeadId: async (leadId: string): Promise<Student | null> => {
		const student = await StudentModel.findOne({ leadId }).lean<StudentDocument | null>();
		return student ? toStudent(student) : null;
	},

	confirmAdmission: async (leadId: string, counsellorId?: string, performedBy?: string, note?: string): Promise<Student | null> => {
		const existingLead = await LeadModel.findById(leadId).lean<LeadDocument | null>();
		if (!existingLead) {
			return null;
		}

		const existingStudent = await StudentModel.findOne({ leadId }).lean<StudentDocument | null>();
		if (existingStudent) {
			return toStudent(existingStudent);
		}

		const latestDemo = getLatestLeadDemo(existingLead);
		let resolvedCounsellorId = counsellorId;
		if (!resolvedCounsellorId && latestDemo?.mentorId) {
			const mentor = await UserModel.findById(latestDemo.mentorId).lean();
			resolvedCounsellorId = mentor?.counsellorId?.toString();
		}

		const zid = await nextStudentZid();
		const admittedAt = new Date();
		const createdStudent = await StudentModel.create({
			zid,
			leadId: existingLead._id,
			name: existingLead.name ?? existingLead.phone,
			phone: existingLead.phone,
			mentorId: latestDemo?.mentorId,
			counsellorId: resolvedCounsellorId,
			status: "ACTIVE",
			admittedAt,
		});

		const updatedDemos = setLatestLeadDemo(existingLead, {
			admissionRequestedAt: admittedAt,
			admissionCounsellorId: resolvedCounsellorId,
			admissionCompletedAt: admittedAt,
			studentId: createdStudent._id.toString(),
		});

		await LeadModel.findByIdAndUpdate(leadId, {
			$set: {
				formSent: true,
				formCompleted: true,
				demos: updatedDemos,
			},
		});

		if (performedBy) {
			await ActivityService.logActivity(
				leadId,
				"ADMISSION_CONFIRMED",
				performedBy,
				`Confirmed admission for ${existingLead.phone}`,
				{ studentId: latestDemo?.studentId },
				{
					studentId: createdStudent._id.toString(),
					counsellorId: resolvedCounsellorId,
				},
				note,
			);
		}

		return toStudent(createdStudent.toObject() as StudentDocument);
	},
};