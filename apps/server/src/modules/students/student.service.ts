import type { Student } from "@repo/schema";
import { ActivityService } from "../leads/activity.service.js";
import { type LeadDocument, LeadModel } from "../leads/lead.model.js";
import { buildStudentIdentity } from "./student.identity.js";
import { type StudentDocument, StudentModel } from "./student.model.js";

const getLatestLeadDemo = (lead: LeadDocument) => {
	const demos = lead.demos ?? [];
	return demos.length > 0 ? (demos[demos.length - 1] ?? null) : null;
};

const toStudent = (doc: StudentDocument): Student => {
	return {
		id: doc._id.toString(),
		zid: doc.zid,
		leadId: doc.leadId.toString(),
		name: doc.name,
		phone: doc.phone,
		email: doc.email,
		courseType: doc.courseType,
		level: doc.level,
		admittedBy: doc.admittedBy.toString(),
		dateOfBirth: doc.dateOfBirth,
		residingCountry: doc.residingCountry,
		gender: doc.gender,
		primaryWhatsappNumber: doc.primaryWhatsappNumber,
		alternateWhatsappNumber: doc.alternateWhatsappNumber,
		studentInfo: doc.studentInfo,
		preferredLanguage: doc.preferredLanguage,
		preferredSchedule: doc.preferredSchedule,
		preferredDays: doc.preferredDays ?? [],
		timeslot: doc.timeslot,
		price: doc.price,
		startClassWhen: doc.startClassWhen,
		hearAboutUs: doc.hearAboutUs,
		mentorId: doc.mentorId?.toString(),
		batchId: doc.batchId?.toString(),
		status: doc.status,
		admittedAt: doc.admittedAt,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	};
};

const nextStudentZid = async (): Promise<string> => {
	const students =
		await StudentModel.find().lean<Array<Pick<StudentDocument, "zid">>>();
	return buildStudentIdentity(students.map((student) => student.zid));
};

export const StudentService = {
	listStudents: async (): Promise<Student[]> => {
		const students = await StudentModel.find()
			.sort({ admittedAt: -1 })
			.lean<StudentDocument[]>();
		return students.map(toStudent);
	},

	findByLeadId: async (leadId: string): Promise<Student | null> => {
		const student = await StudentModel.findOne({
			leadId,
		}).lean<StudentDocument | null>();
		return student ? toStudent(student) : null;
	},

	startAdmission: async (
		leadId: string,
		mentorId?: string,
		batchId?: string,
		performedBy?: string,
		note?: string,
	): Promise<Student | null> => {
		const existingLead = await LeadModel.findById(
			leadId,
		).lean<LeadDocument | null>();
		if (!existingLead) {
			return null;
		}

		const existingStudent = await StudentModel.findOne({
			leadId,
		}).lean<StudentDocument | null>();
		if (existingStudent) {
			return toStudent(existingStudent);
		}

		const latestDemo = getLatestLeadDemo(existingLead);
		const resolvedMentorId = mentorId ?? latestDemo?.mentorId?.toString();

		if (!existingLead.email) {
			throw new Error("Lead email is required before admission");
		}

		if (!performedBy) {
			throw new Error("admittedBy user is required");
		}

		const zid = await nextStudentZid();
		const admittedAt = new Date();
		const createdStudent = await StudentModel.create({
			zid,
			leadId: existingLead._id,
			name: existingLead.name,
			phone: existingLead.phone,
			email: existingLead.email,
			courseType: existingLead.courseType,
			level: existingLead.level,
			admittedBy: performedBy,
			dateOfBirth: existingLead.dateOfBirth,
			residingCountry: existingLead.residingCountry,
			gender: existingLead.gender,
			primaryWhatsappNumber: existingLead.primaryWhatsappNumber,
			alternateWhatsappNumber: existingLead.alternateWhatsappNumber,
			studentInfo: existingLead.studentInfo,
			preferredLanguage: existingLead.preferredLanguage,
			preferredSchedule: existingLead.preferredSchedule,
			preferredDays: existingLead.preferredDays ?? [],
			timeslot: existingLead.preferredTimeslots?.[0]
				? {
					classesPerWeek: existingLead.preferredTimeslots[0].timesPerWeek,
					durationMinutes:
						existingLead.preferredTimeslots[0].durationMinutes,
				}
				: undefined,
			price: existingLead.price,
			startClassWhen: existingLead.startClassWhen,
			hearAboutUs: existingLead.hearAboutUs,
			mentorId: resolvedMentorId,
			batchId,
			status: "ADMISSION_PROCESS",
			admittedAt,
		});

		await LeadModel.findByIdAndUpdate(leadId, {
			$set: {
				admissionRequestedAt: admittedAt,
				studentId: createdStudent._id.toString(),
			},
		});

		if (performedBy) {
			await ActivityService.logActivity(
				leadId,
				"STUDENT_CREATED",
				performedBy,
				`Admission started with ZID: ${zid}`,
				undefined,
				{
					zid,
					studentId: createdStudent._id.toString(),
					status: "ADMISSION_PROCESS",
				},
				note,
			);
		}

		return toStudent(createdStudent.toObject() as StudentDocument);
	},

	confirmAdmission: async (
		leadId: string,
		mentorId?: string,
		batchId?: string,
		performedBy?: string,
		note?: string,
	): Promise<Student | null> => {
		const existingLead = await LeadModel.findById(
			leadId,
		).lean<LeadDocument | null>();
		if (!existingLead) {
			return null;
		}

		const existingStudent = await StudentModel.findOne({
			leadId,
		}).lean<StudentDocument | null>();
		if (existingStudent) {
			const updatedExisting = await StudentModel.findByIdAndUpdate(
				existingStudent._id,
				{
					$set: {
						status: "STUDENT",
						mentorId: mentorId ?? existingStudent.mentorId,
						batchId: batchId ?? existingStudent.batchId,
					},
				},
				{ returnDocument: "after" },
			).lean<StudentDocument | null>();

			if (!updatedExisting) {
				return null;
			}

			await LeadModel.findByIdAndUpdate(leadId, {
				$set: {
					studentId: updatedExisting._id.toString(),
				},
			});

			return toStudent(updatedExisting);
		}

		const latestDemo = getLatestLeadDemo(existingLead);
		const resolvedMentorId = mentorId ?? latestDemo?.mentorId?.toString();

		if (!existingLead.email) {
			throw new Error("Lead email is required before admission");
		}

		if (!performedBy) {
			throw new Error("admittedBy user is required");
		}

		const zid = await nextStudentZid();
		const admittedAt = new Date();
		const createdStudent = await StudentModel.create({
			zid,
			leadId: existingLead._id,
			name: existingLead.name,
			phone: existingLead.phone,
			email: existingLead.email,
			courseType: existingLead.courseType,
			level: existingLead.level,
			admittedBy: performedBy,
			dateOfBirth: existingLead.dateOfBirth,
			residingCountry: existingLead.residingCountry,
			gender: existingLead.gender,
			primaryWhatsappNumber: existingLead.primaryWhatsappNumber,
			alternateWhatsappNumber: existingLead.alternateWhatsappNumber,
			studentInfo: existingLead.studentInfo,
			preferredLanguage: existingLead.preferredLanguage,
			preferredSchedule: existingLead.preferredSchedule,
			preferredDays: existingLead.preferredDays ?? [],
			timeslot: existingLead.preferredTimeslots?.[0]
				? {
					classesPerWeek: existingLead.preferredTimeslots[0].timesPerWeek,
					durationMinutes:
						existingLead.preferredTimeslots[0].durationMinutes,
				}
				: undefined,
			price: existingLead.price,
			startClassWhen: existingLead.startClassWhen,
			hearAboutUs: existingLead.hearAboutUs,
			mentorId: resolvedMentorId,
			batchId,
			status: "STUDENT",
			admittedAt,
		});

		// Move admission info to top-level lead fields
		await LeadModel.findByIdAndUpdate(leadId, {
			$set: {
				formSent: true,
				formCompleted: true,
				admissionRequestedAt: admittedAt,
				studentId: createdStudent._id.toString(),
			},
		});

		if (performedBy) {
			await ActivityService.logActivity(
				leadId,
				"ADMISSION_CONFIRMED",
				performedBy,
				`Confirmed admission for ${existingLead.phone}`,
				undefined,
				{
					studentId: createdStudent._id.toString(),
					mentorId: resolvedMentorId,
					batchId,
				},
				note,
			);

			await ActivityService.logActivity(
				leadId,
				"STUDENT_CREATED",
				performedBy,
				`Student created with ZID: ${zid}`,
				undefined,
				{
					zid,
					studentId: createdStudent._id.toString(),
				},
				note,
			);
		}

		return toStudent(createdStudent.toObject() as StudentDocument);
	},
};
