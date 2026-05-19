import type { Student } from "@repo/schema";
import { FOLLOW_UP_PERIOD_MS, ZID_CONSTANTS } from "@repo/schema";
import { Types } from "mongoose";
import { AppError } from "../../utils/errors.util.js";
import { LeadActivityModel } from "../leads/activity.model.js";
import { ActivityService } from "../leads/activity.service.js";
import { type LeadDocument, LeadModel } from "../leads/lead.model.js";
import { buildStudentIdentity } from "./student.identity.js";
import { type StudentDocument, StudentModel } from "./student.model.js";
import { deleteObjectFromUrl } from "../../lib/s3.js";
import {
	type StudentActivityDocument,
	StudentActivityModel,
} from "./student-activity.model.js";
import {
	getStudentProcessTemplate,
	getAdmissionProcessTemplate,
	type StudentProcessDocument,
	type StudentProcessTaskDocument,
	StudentProcessModel,
} from "./student-process.model.js";

const resolveStudentZidPrefix = (courseType?: LeadDocument["courseType"]): string => {
	return courseType === "GROUP"
		? ZID_CONSTANTS.prefixes.groupStudent
		: ZID_CONSTANTS.prefixes.student;
};

type StudentListFilters = {
	status?: string;
	search?: string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
	page?: number;
	limit?: number;
};

export type StudentProcessListItem = {
	id: Types.ObjectId;
	studentId: Types.ObjectId;
	status: Student["status"];
	label: string;
	tasks: Array<{
		key: string;
		label: string;
		completed: boolean;
		completedAt?: Date | null;
	}>;
	createdAt: Date;
	updatedAt: Date;
	student: {
		id: Types.ObjectId;
		leadId?: Types.ObjectId;
		zid: string;
		name?: string;
		phone: string;
		primaryWhatsappNumber?: string;
		email: string;
		status: Student["status"];
		courseType?: Student["courseType"];
		level?: string;
		mentorId?: Types.ObjectId;
		batchId?: Types.ObjectId;
	};
};

const getDefaultStudentFollowUpAt = (source?: Date | null): Date => {
	return source ?? new Date(Date.now() + FOLLOW_UP_PERIOD_MS.student);
};

const getStudentSort = (
	sortBy?: string,
	sortOrder: "asc" | "desc" = "asc",
): Array<[string, 1 | -1]> => {
	const allowed = new Set([
		"nextFollowUpAt",
		"admittedAt",
		"createdAt",
		"name",
		"zid",
	]);
	const effectiveSortBy = allowed.has(sortBy ?? "")
		? sortBy!
		: "nextFollowUpAt";
	return [[effectiveSortBy, sortOrder === "asc" ? 1 : -1]];
};

const getLatestLeadDemo = (lead: LeadDocument) => {
	const demos = lead.demos ?? [];
	return demos.length > 0 ? (demos[demos.length - 1] ?? null) : null;
};

const assessmentFieldByType = {
	oral: "oralAssessmentDone",
	written: "writtenAssessmentDone",
	level: "levelAssessmentDone",
} as const;

type AssessmentType = keyof typeof assessmentFieldByType;

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
		profilePic: doc.profilePic,
		studentInfo: doc.studentInfo,
		preferredLanguage: doc.preferredLanguage,
		preferredSchedule: doc.preferredSchedule,
		preferredDays: doc.preferredDays ?? [],
		timeslot: doc.timeslot,
		price: doc.price,
		hearAboutUs: doc.hearAboutUs,
		mentorId: doc.mentorId?.toString(),
		batchId: doc.batchId?.toString(),
		processId: doc.processId?.toString(),
		processLabel: doc.processLabel,
		oralAssessmentDone: doc.oralAssessmentDone ?? false,
		writtenAssessmentDone: doc.writtenAssessmentDone ?? false,
		levelAssessmentDone: doc.levelAssessmentDone ?? false,
		nextFollowUpAt: doc.nextFollowUpAt,
		customNextFollowUpAt: doc.customNextFollowUpAt,
		status: doc.status,
		admittedAt: doc.admittedAt,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	};
};

const nextStudentZid = async (prefix: string): Promise<string> => {
	const students =
		await StudentModel.find().lean<Array<Pick<StudentDocument, "zid">>>();
	return buildStudentIdentity(
		students.map((student) => student.zid),
		prefix,
	);
};

const logStudentActivity = async (params: {
	studentId: string;
	type:
		| "CREATED"
		| "UPDATED"
		| "ASSESSMENT_UPDATED"
		| "FOLLOW_UP_POSTPONED"
		| "FOLLOW_UP_RECORDED"
		| "STATUS_CHANGED"
		| "PROCESS_LINKED"
		| "PROCESS_UPDATED"
		| "DELETED";
	performedBy: string;
	description: string;
	oldValue?: Record<string, unknown>;
	newValue?: Record<string, unknown>;
	note?: string;
}) => {
	return StudentActivityModel.create({
		studentId: params.studentId,
		type: params.type,
		performedBy: params.performedBy,
		description: params.description,
		oldValue: params.oldValue,
		newValue: params.newValue,
		note: params.note,
	});
};

const syncStudentProcess = async (
	studentId: string,
	explicitTemplate?: { label: string; tasks: StudentProcessTaskDocument[] },
): Promise<StudentDocument | null> => {
	const student = await StudentModel.findById(
		studentId,
	).lean<StudentDocument | null>();
	if (!student) {
		return null;
	}

	const template = explicitTemplate ?? getStudentProcessTemplate(student.status);
	const process = await StudentProcessModel.findOneAndUpdate(
		{ studentId: student._id },
		{
			$set: {
				status: student.status,
				label: template.label,
				tasks: template.tasks,
			},
			$setOnInsert: {
				studentId: student._id,
			},
		},
		{ new: true, upsert: true },
	).lean<StudentProcessDocument | null>();

	if (!process) {
		return student;
	}

	const updatedStudent = await StudentModel.findByIdAndUpdate(
		student._id,
		{
			$set: {
				processId: process._id,
				processLabel: process.label,
			},
		},
		{ returnDocument: "after" },
	).lean<StudentDocument | null>();

	return updatedStudent ?? student;
};

export const StudentService = {
	listStudents: async (
		filters: StudentListFilters = {},
	): Promise<Student[]> => {
		const query: Record<string, unknown> = {};

		if (filters.status) {
			query.status = filters.status;
		}

		if (filters.search?.trim()) {
			const search = filters.search.trim();
			query.$or = [
				{ name: { $regex: search, $options: "i" } },
				{ phone: { $regex: search, $options: "i" } },
				{ email: { $regex: search, $options: "i" } },
				{ zid: { $regex: search, $options: "i" } },
				{ processLabel: { $regex: search, $options: "i" } },
			];
		}

		const students = await StudentModel.find(query)
			.sort(getStudentSort(filters.sortBy, filters.sortOrder))
			.skip(
				filters.page && filters.limit ? (filters.page - 1) * filters.limit : 0,
			)
			.limit(filters.limit && filters.limit > 0 ? filters.limit : 0)
			.lean<StudentDocument[]>();
		return students.map(toStudent);
	},

	listStudentProcesses: async (): Promise<StudentProcessListItem[]> => {
		const raw = await StudentProcessModel.aggregate<unknown>([
			{
				$lookup: {
					from: StudentModel.collection.name,
					localField: "studentId",
					foreignField: "_id",
					as: "student",
				},
			},
			{
				$unwind: "$student",
			},
			{
				$sort: {
					updatedAt: -1,
				},
			},
		])
		// Normalize aggregation result: map MongoDB's `_id` fields to `id` so
		// controller code can safely call `.toString()` on expected fields.
		const processes = (raw as any[]).map((p) => ({
			id: p._id,
			studentId: p.studentId,
			status: p.status,
			label: p.label,
			tasks: p.tasks ?? [],
			createdAt: p.createdAt,
			updatedAt: p.updatedAt,
			student: {
				id: p.student?._id,
				leadId: p.student?.leadId,
				zid: p.student?.zid,
				name: p.student?.name,
				phone: p.student?.phone,
				primaryWhatsappNumber: p.student?.primaryWhatsappNumber,
				email: p.student?.email,
				status: p.student?.status,
				courseType: p.student?.courseType,
				level: p.student?.level,
				mentorId: p.student?.mentorId,
				batchId: p.student?.batchId,
			},
		} as StudentProcessListItem));

		return processes;
	},

	getStudentProcessById: async (processId: string): Promise<StudentProcessListItem | null> => {
		const objectId = Types.ObjectId.isValid(processId)
			? new Types.ObjectId(processId)
			: null;
		if (!objectId) return null;

		const raw = await StudentProcessModel.aggregate<unknown>([
			{ $match: { _id: objectId } },
			{
				$lookup: {
					from: StudentModel.collection.name,
					localField: "studentId",
					foreignField: "_id",
					as: "student",
				},
			},
			{ $unwind: "$student" },
		]);

		if (!raw || (raw as any[]).length === 0) return null;

		const p = (raw as any[])[0];
		return {
			id: p._id,
			studentId: p.studentId,
			status: p.status,
			label: p.label,
			tasks: p.tasks ?? [],
			createdAt: p.createdAt,
			updatedAt: p.updatedAt,
			student: {
				id: p.student?._id,
				leadId: p.student?.leadId,
				zid: p.student?.zid,
				name: p.student?.name,
				phone: p.student?.phone,
				primaryWhatsappNumber: p.student?.primaryWhatsappNumber,
				email: p.student?.email,
				status: p.student?.status,
				courseType: p.student?.courseType,
				level: p.student?.level,
				mentorId: p.student?.mentorId,
				batchId: p.student?.batchId,
			},
		};
	},

	markProcessTaskCompleted: async (processId: string, taskKey: string) => {
		const objectId = Types.ObjectId.isValid(processId)
			? new Types.ObjectId(processId)
			: null;
		if (!objectId) return null;

		// Update the matching task in-place
		await StudentProcessModel.findOneAndUpdate(
			{ _id: objectId },
			{
				$set: {
					"tasks.$[t].completed": true,
					"tasks.$[t].completedAt": new Date(),
				},
			},
			{ arrayFilters: [{ "t.key": taskKey }], new: true },
		).exec();

		// return the updated mapped process
		return await StudentService.getStudentProcessById(processId);
	},

	findByLeadId: async (leadId: string): Promise<Student | null> => {
		const student = await StudentModel.findOne({
			leadId,
		}).lean<StudentDocument | null>();
		return student ? toStudent(student) : null;
	},

	getStudentActivities: async (
		studentId: string,
	): Promise<StudentActivityDocument[]> => {
		return StudentActivityModel.find({ studentId })
			.populate("performedBy", "name")
			.sort({ createdAt: -1 })
			.exec();
	},

	updateAssessment: async (
		studentId: string,
		assessmentType: AssessmentType,
		isDone: boolean,
		performedBy: string,
		note?: string,
	): Promise<Student | null> => {
		const student = await StudentModel.findById(
			studentId,
		).lean<StudentDocument | null>();
		if (!student) {
			throw new AppError(404, "Student not found");
		}

		const fieldName = assessmentFieldByType[assessmentType];
		const oldValue = {
			oralAssessmentDone: student.oralAssessmentDone ?? false,
			writtenAssessmentDone: student.writtenAssessmentDone ?? false,
			levelAssessmentDone: student.levelAssessmentDone ?? false,
		};
		const updatedStudent = await StudentModel.findByIdAndUpdate(
			student._id,
			{
				$set: {
					[fieldName]: isDone,
				},
			},
			{ returnDocument: "after" },
		).lean<StudentDocument | null>();

		if (!updatedStudent) {
			return null;
		}

		await logStudentActivity({
			studentId: student._id.toString(),
			type: "ASSESSMENT_UPDATED",
			performedBy,
			description: `${assessmentType} assessment marked ${isDone ? "done" : "undone"}`,
			note,
			oldValue,
			newValue: {
				[fieldName]: isDone,
			},
		});

		return toStudent(updatedStudent);
	},


	recordFollowUp: async (
		studentId: string,
		performedBy: string,
		note: string,
		nextFollowUpAtOverride?: Date,
	): Promise<Student | null> => {
		const student = await StudentModel.findById(
			studentId,
		).lean<StudentDocument | null>();
		if (!student) {
			throw new AppError(404, "Student not found");
		}

		const nextFollowUpAt = getDefaultStudentFollowUpAt(
			nextFollowUpAtOverride,
		);
		const updatedStudent = await StudentModel.findByIdAndUpdate(
			student._id,
			{
				$set: {
					nextFollowUpAt,
				},
				$unset: {
					customNextFollowUpAt: 1,
				},
			},
			{ returnDocument: "after" },
		).lean<StudentDocument | null>();

		if (!updatedStudent) {
			return null;
		}

		await logStudentActivity({
			studentId: student._id.toString(),
			type: "FOLLOW_UP_RECORDED",
			performedBy,
			description: note,
			note,
			oldValue: {
				nextFollowUpAt: student.nextFollowUpAt?.toISOString() ?? null,
				customNextFollowUpAt:
					student.customNextFollowUpAt?.toISOString() ?? null,
			},
			newValue: {
				nextFollowUpAt: nextFollowUpAt.toISOString(),
				customNextFollowUpAt: null,
			},
		});

		return toStudent(updatedStudent);
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
			const syncedStudent = await syncStudentProcess(
				existingStudent._id.toString(),
			);
			await logStudentActivity({
				studentId: existingStudent._id.toString(),
				type: "UPDATED",
				performedBy: performedBy ?? existingLead.createdBy.toString(),
				description:
					"Student already exists and was revisited during admission",
			});
			return toStudent((syncedStudent ?? existingStudent) as StudentDocument);
		}

		const latestDemo = getLatestLeadDemo(existingLead);
		const resolvedMentorId = mentorId ?? latestDemo?.mentorId?.toString();

		if (!existingLead.email) {
			throw new Error("Lead email is required before admission");
		}

		if (!performedBy) {
			throw new Error("admittedBy user is required");
		}

		const zid = await nextStudentZid(resolveStudentZidPrefix(existingLead.courseType));
		const admittedAt = new Date();
		const nextFollowUpAt = getDefaultStudentFollowUpAt(
			existingLead.nextFollowUpAt,
		);
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
			timeslot: existingLead.preferredPlan
				? {
						classesPerWeek: existingLead.preferredPlan.timesPerWeek,
						durationMinutes: existingLead.preferredPlan.durationMinutes,
					}
				: undefined,
			price: existingLead.price,
			mentorId: resolvedMentorId,

			nextFollowUpAt,
			admittedAt,
		});

		await LeadModel.findByIdAndUpdate(leadId, {
			$set: {
				admissionRequestedAt: admittedAt,
				studentId: createdStudent._id.toString(),
			},
		});

		const syncedStudent = await syncStudentProcess(
			createdStudent._id.toString(),
			getAdmissionProcessTemplate(existingLead.courseType),
		);

		await logStudentActivity({
			studentId: createdStudent._id.toString(),
			type: "CREATED",
			performedBy,
			description: `Admission started with ZID: ${zid}`,
			newValue: {
				status: "STUDENT",
				nextFollowUpAt: nextFollowUpAt.toISOString(),
			},
			note,
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
					status: "STUDENT",
				},
				note,
			);
		}

		return toStudent(
			(syncedStudent ?? createdStudent.toObject()) as StudentDocument,
		);
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

			const syncedStudent = await syncStudentProcess(
				updatedExisting._id.toString(),
			);
			await logStudentActivity({
				studentId: updatedExisting._id.toString(),
				type: "STATUS_CHANGED",
				performedBy: performedBy ?? existingLead.createdBy.toString(),
				description: "Student confirmed from admission workflow",
				oldValue: { status: existingStudent.status },
				newValue: { status: "STUDENT" },
				note,
			});

			// Delete all activities for this lead
			await LeadActivityModel.deleteMany({ leadId });

			// Delete the lead
			await LeadModel.findByIdAndDelete(leadId);

			return toStudent((syncedStudent ?? updatedExisting) as StudentDocument);
		}

		const latestDemo = getLatestLeadDemo(existingLead);
		const resolvedMentorId = mentorId ?? latestDemo?.mentorId?.toString();

		if (!existingLead.email) {
			throw new Error("Lead email is required before admission");
		}

		if (!performedBy) {
			throw new Error("admittedBy user is required");
		}

		const zid = await nextStudentZid(resolveStudentZidPrefix(existingLead.courseType));
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
			timeslot: existingLead.preferredPlan
				? {
						classesPerWeek: existingLead.preferredPlan.timesPerWeek,
						durationMinutes: existingLead.preferredPlan.durationMinutes,
					}
				: undefined,
			price: existingLead.price,
			mentorId: resolvedMentorId,

			nextFollowUpAt: getDefaultStudentFollowUpAt(existingLead.nextFollowUpAt),
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

		const syncedStudent = await syncStudentProcess(
			createdStudent._id.toString(),
			getAdmissionProcessTemplate(existingLead.courseType),
		);

		await logStudentActivity({
			studentId: createdStudent._id.toString(),
			type: "CREATED",
			performedBy,
			description: `Student created with ZID: ${zid}`,
			newValue: { status: "STUDENT" },
			note,
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

		// Delete all activities for this lead
		await LeadActivityModel.deleteMany({ leadId });

		// Delete the lead
		await LeadModel.findByIdAndDelete(leadId);

		return toStudent(
			(syncedStudent ?? createdStudent.toObject()) as StudentDocument,
		);
	},

	update: async (
		studentId: string,
		payload: Partial<{
			batchId?: string | null;
			mentorId?: string;
			profilePic?: string | null;
		}>,
	): Promise<Student | null> => {
		const student = await StudentModel.findById(studentId).lean<StudentDocument | null>();
		if (!student) {
			throw new AppError(404, "Student not found");
		}

		const $set: Record<string, unknown> = {
			mentorId: payload.mentorId ?? student.mentorId,
		};
		const $unset: Record<string, 1> = {};

		if (payload.batchId === null) {
			$unset.batchId = 1;
		} else if (payload.batchId !== undefined) {
			$set.batchId = payload.batchId;
		}

		if (payload.profilePic !== undefined) {
			if (payload.profilePic === null) {
				$unset.profilePic = 1;
			} else {
				$set.profilePic = payload.profilePic;
			}
		}

		const updatedStudent = await StudentModel.findByIdAndUpdate(
			student._id,
			{
				$set,
				...(Object.keys($unset).length > 0 ? { $unset } : {}),
			},
			{ returnDocument: "after" },
		).lean<StudentDocument | null>();

		// If profile picture changed/removed, delete the old S3 object if it was hosted on our bucket
		if (payload.profilePic !== undefined) {
			const oldPic = student.profilePic;
			const newPic = updatedStudent?.profilePic ?? null;
			if (oldPic && oldPic !== newPic) {
				await deleteObjectFromUrl(oldPic).catch(() => undefined);
			}
		}

		if (!updatedStudent) return null;

		await logStudentActivity({
			studentId: student._id.toString(),
			type: "UPDATED",
			performedBy: student.admittedBy.toString(),
			description: "Student updated",
			oldValue: {
				mentorId: student.mentorId?.toString(),
				batchId: student.batchId?.toString(),
				profilePic: student.profilePic ?? null,
			},
			newValue: {
				mentorId: updatedStudent.mentorId?.toString(),
				batchId: updatedStudent.batchId?.toString(),
				profilePic: updatedStudent.profilePic ?? null,
			},
		});

		const synced = await syncStudentProcess(updatedStudent._id.toString());
		return toStudent((synced ?? updatedStudent) as StudentDocument);
	},
};
