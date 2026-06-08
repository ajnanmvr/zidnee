import type { Student } from "@repo/schema";
import { FOLLOW_UP_PERIOD_MS, ZID_CONSTANTS } from "@repo/schema";
import { Types } from "mongoose";
import { AppError } from "../../utils/errors.util.js";
import { ReminderService } from "../reminders/reminder.service.js";
import { ActivityService } from "../leads/activity.service.js";
import { type LeadDocument, LeadModel } from "../leads/lead.model.js";
import { BatchModel } from "./batch.model.js";
import { UserModel } from "../users/user.model.js";
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

const normalizeStudentStatus = (status: unknown): Student["status"] => {
	if (status === "BREAK" || status === "DROPPED") {
		return status;
	}

	return "STUDENT";
};

const hasProfileFieldChange = (payload: Record<string, unknown>) => {
	return [
		"name",
		"phone",
		"email",
		"courseType",
		"level",
		"dateOfBirth",
		"residingCountry",
		"gender",
		"primaryWhatsappNumber",
		"alternateWhatsappNumber",
		"studentInfo",
		"preferredLanguage",
		"preferredSchedule",
		"preferredDays",
		"timeslot",
		"price",
		"hearAboutUs",
		"profilePic",
	].some((key) => payload[key] !== undefined);
};

type StudentListFilters = {
	status?: string;
	courseType?: string;
	/**
	 * When set, restricts results to students whose courseType is one of
	 * these values, regardless of the `courseType` filter above. Used to
	 * enforce course-type-scoped read permissions (e.g. a role that can
	 * only read group-course students).
	 */
	allowedCourseTypes?: string[];
	search?: string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
	page?: number;
	limit?: number;
	scope?: "mine" | "all";
	userId?: string;
	/**
	 * When set, restricts results to students admitted (converted from a lead)
	 * by this specific user. Used for "my converted leads" views, independent
	 * of the mentor/batch-counsellor based `scope` filter.
	 */
	admittedBy?: string;
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
	archivedAt?: Date | null;
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
		profilePic?: string | null;
		classStartConfirmedAt?: Date | null;
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

const buildMineStudentProcessMatch = async (userId: string) => {
	if (!Types.ObjectId.isValid(userId)) {
		return null;
	}

	const mentorIds = await UserModel.find({
		counsellorId: userId,
	} as any).distinct("_id");

	const counsellorObjectId = new Types.ObjectId(userId);

	if (mentorIds.length === 0) {
		return { "batch.counsellorId": counsellorObjectId };
	}

	return {
		$or: [
			{ "student.mentorId": { $in: mentorIds } },
			{ "batch.counsellorId": counsellorObjectId },
		],
	};
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
		inactiveFrom: doc.inactiveFrom,
		inactiveUntil: doc.inactiveUntil,
	dropReason: doc.dropReason,
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

	// Do not create or maintain a student process for BREAK status. Remove any
	// existing linked process and clear the student's process fields.
	if (student.status === "BREAK") {
		await StudentProcessModel.findOneAndDelete({ studentId: student._id }).exec();
		await StudentModel.findByIdAndUpdate(
			student._id,
			{ $unset: { processId: 1, processLabel: 1 } },
			{ returnDocument: "after" },
		).exec();
		return student;
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
		if (filters.scope === "mine" && filters.userId && Types.ObjectId.isValid(filters.userId)) {
			const mentorIds = await UserModel.find({
				counsellorId: filters.userId,
			} as any).distinct("_id");

			const batchIds = await BatchModel.find({
				counsellorId: new Types.ObjectId(filters.userId),
			} as any).distinct("_id");

			query.$or = [
				{ mentorId: { $in: mentorIds } },
				{ batchId: { $in: batchIds } },
			];
		}

		if (filters.status) {
			query.status = filters.status;
		}

		if (filters.courseType) {
			query.courseType = filters.courseType;
		}

		if (filters.admittedBy && Types.ObjectId.isValid(filters.admittedBy)) {
			query.admittedBy = new Types.ObjectId(filters.admittedBy);
		}

		if (filters.allowedCourseTypes && filters.allowedCourseTypes.length > 0) {
			if (typeof query.courseType === "string") {
				if (!filters.allowedCourseTypes.includes(query.courseType)) {
					query.courseType = { $in: [] };
				}
			} else {
				query.courseType = { $in: filters.allowedCourseTypes };
			}
		}

		if (filters.search?.trim()) {
			const search = filters.search.trim();
			const searchOr = [
				{ name: { $regex: search, $options: "i" } },
				{ phone: { $regex: search, $options: "i" } },
				{ email: { $regex: search, $options: "i" } },
				{ zid: { $regex: search, $options: "i" } },
				{ processLabel: { $regex: search, $options: "i" } },
			];

			if (Array.isArray(query.$or)) {
				query.$and = [{ $or: query.$or }, { $or: searchOr }];
				delete query.$or;
			} else {
				query.$or = searchOr;
			}
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

	listStudentProcesses: async (filters: { scope?: "mine" | "all"; userId?: string } = {}): Promise<StudentProcessListItem[]> => {
		const mineMatch =
			filters.scope === "mine" && filters.userId
				? await buildMineStudentProcessMatch(filters.userId)
				: null;
		const raw = await StudentProcessModel.aggregate<unknown>([
			{
				$match: {
					$or: [{ archivedAt: null }, { archivedAt: { $exists: false } }],
				},
			},
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
				$lookup: {
					from: BatchModel.collection.name,
					localField: "student.batchId",
					foreignField: "_id",
					as: "batch",
				},
			},
			{
				$unwind: {
					path: "$batch",
					preserveNullAndEmptyArrays: true,
				},
			},
			...(mineMatch ? [{ $match: mineMatch }] : []),
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
			status: normalizeStudentStatus(p.student?.status ?? p.status),
			label: p.label,
			tasks: p.tasks ?? [],
			archivedAt: p.archivedAt ?? null,
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

	listStudentProcessHistory: async (filters: { scope?: "mine" | "all"; userId?: string } = {}): Promise<StudentProcessListItem[]> => {
		const mineMatch =
			filters.scope === "mine" && filters.userId
				? await buildMineStudentProcessMatch(filters.userId)
				: null;
		const raw = await StudentProcessModel.aggregate<unknown>([
			{
				$match: {
					archivedAt: { $ne: null },
				},
			},
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
				$lookup: {
					from: BatchModel.collection.name,
					localField: "student.batchId",
					foreignField: "_id",
					as: "batch",
				},
			},
			{
				$unwind: {
					path: "$batch",
					preserveNullAndEmptyArrays: true,
				},
			},
			...(mineMatch ? [{ $match: mineMatch }] : []),
			{
				$sort: {
					archivedAt: -1,
				},
			},
		]);

		return (raw as any[]).map((p) => ({
			id: p._id,
			studentId: p.studentId,
			status: normalizeStudentStatus(p.student?.status ?? p.status),
			label: p.label,
			tasks: p.tasks ?? [],
			archivedAt: p.archivedAt ?? null,
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
			status: normalizeStudentStatus(p.student?.status ?? p.status),
			label: p.label,
			tasks: p.tasks ?? [],
			archivedAt: p.archivedAt ?? null,
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
				profilePic: p.student?.profilePic ?? null,
				classStartConfirmedAt: p.student?.classStartConfirmedAt ?? null,
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

	setProcessTaskCompletion: async (processId: string, taskKey: string, completed: boolean) => {
		const objectId = Types.ObjectId.isValid(processId)
			? new Types.ObjectId(processId)
			: null;
		if (!objectId) return null;

		await StudentProcessModel.findOneAndUpdate(
			{ _id: objectId },
			{
				$set: {
					"tasks.$[t].completed": completed,
					"tasks.$[t].completedAt": completed ? new Date() : null,
				},
			},
			{ arrayFilters: [{ "t.key": taskKey }], new: true },
		).exec();

		return await StudentService.getStudentProcessById(processId);
	},

	completeStudentProcess: async (processId: string, performedBy: string): Promise<boolean> => {
		const objectId = Types.ObjectId.isValid(processId)
			? new Types.ObjectId(processId)
			: null;
		if (!objectId) return false;

		const existingProcess = await StudentProcessModel.findById(objectId).lean<StudentProcessDocument | null>();
		if (!existingProcess) {
			return false;
		}

		const hasIncompleteTasks = (existingProcess.tasks ?? []).some((task) => !task.completed);
		if (hasIncompleteTasks) {
			throw new AppError(400, "Complete all tasks before marking the process as completed");
		}

		await StudentModel.findByIdAndUpdate(
			existingProcess.studentId,
			{
				$unset: {
					processId: 1,
					processLabel: 1,
				},
			},
			{ returnDocument: "after" },
		).exec();

		await StudentProcessModel.findByIdAndUpdate(
			objectId,
			{
				$set: {
					archivedAt: new Date(),
				},
			},
			{ new: true },
		).exec();

		const student = await StudentModel.findById(existingProcess.studentId).lean<StudentDocument | null>();
		if (student) {
			await logStudentActivity({
				studentId: student._id.toString(),
				type: "PROCESS_UPDATED",
				performedBy,
				description: "Process completed",
				oldValue: {
					processId: student.processId?.toString() ?? null,
					processLabel: student.processLabel ?? null,
				},
				newValue: {
					processId: null,
					processLabel: null,
				},
			});
		}

		return true;
	},

	deleteStudentProcess: async (processId: string, performedBy: string): Promise<boolean> => {
		const objectId = Types.ObjectId.isValid(processId)
			? new Types.ObjectId(processId)
			: null;
		if (!objectId) return false;

		const existingProcess = await StudentProcessModel.findById(objectId).lean<StudentProcessDocument | null>();
		if (!existingProcess) {
			return false;
		}

		const student = await StudentModel.findById(existingProcess.studentId).lean<StudentDocument | null>();
		if (student && student.status !== "DROPPED") {
			throw new AppError(400, "Only processes for dropped students can be deleted");
		}

		await StudentProcessModel.findByIdAndDelete(objectId).exec();

		if (student && student.processId?.toString() === existingProcess._id.toString()) {
			await StudentModel.findByIdAndUpdate(
				student._id,
				{ $unset: { processId: 1, processLabel: 1 } },
				{ returnDocument: "after" },
			).exec();
		}

		if (student) {
			await logStudentActivity({
				studentId: student._id.toString(),
				type: "PROCESS_UPDATED",
				performedBy,
				description: "Process deleted (dropped student)",
				oldValue: {
					processId: existingProcess._id.toString(),
					processLabel: existingProcess.label,
				},
				newValue: {
					processId: null,
					processLabel: null,
				},
			});
		}

		return true;
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
		if (nextFollowUpAtOverride && nextFollowUpAt.getTime() < Date.now()) {
			throw new AppError(400, "Next follow-up date cannot be in the past");
		}
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
			getAdmissionProcessTemplate(existingLead.courseType, createdStudent._id.toString()),
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

			// Mark the lead as converted instead of deleting it — keeps the lead
			// record and its activity history intact for the Converted Leads view.
			// Clear its follow-up since a converted lead no longer needs one.
			await LeadModel.findByIdAndUpdate(leadId, {
				$set: {
					status: "CONVERTED",
					studentId: updatedExisting._id.toString(),
				},
				$unset: { nextFollowUpAt: 1 },
			});

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

		// Move admission info to top-level lead fields and mark the lead as
		// converted instead of deleting it — keeps the lead record and its
		// activity history intact for the Converted Leads view. Clear its
		// follow-up since a converted lead no longer needs one.
		await LeadModel.findByIdAndUpdate(leadId, {
			$set: {
				formSent: true,
				formCompleted: true,
				admissionRequestedAt: admittedAt,
				studentId: createdStudent._id.toString(),
				status: "CONVERTED",
			},
			$unset: { nextFollowUpAt: 1 },
		});

		const syncedStudent = await syncStudentProcess(
			createdStudent._id.toString(),
			getAdmissionProcessTemplate(existingLead.courseType, createdStudent._id.toString()),
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

		return toStudent(
			(syncedStudent ?? createdStudent.toObject()) as StudentDocument,
		);
	},

	update: async (
		studentId: string,
		payload: Partial<{
			mentorId?: string;
			batchId?: string | null;
			profilePic?: string | null;
			name?: string;
			phone?: string;
			email?: string;
			courseType?: Student["courseType"];
			level?: string;
			dateOfBirth?: Date | null;
			residingCountry?: string;
			gender?: Student["gender"];
			primaryWhatsappNumber?: string;
			alternateWhatsappNumber?: string;
			studentInfo?: string;
			preferredLanguage?: Student["preferredLanguage"];
			preferredSchedule?: string;
			preferredDays?: string[];
			timeslot?: Student["timeslot"] | null;
			price?: number | null;
			hearAboutUs?: string;
			status?: Student["status"];
			inactiveFrom?: Date | null;
			inactiveUntil?: Date | null;
			dropReason?: string;
			dropTemporary?: boolean;
		}>,
		performedBy?: string,
	): Promise<Student | null> => {
		const student = await StudentModel.findById(studentId).lean<StudentDocument | null>();
		if (!student) {
			throw new AppError(404, "Student not found");
		}

		const $set: Record<string, unknown> = {
			mentorId: payload.mentorId ?? student.mentorId,
		};
		const $unset: Record<string, 1> = {};

		if (payload.name !== undefined) {
			$set.name = payload.name;
		}

		if (payload.phone !== undefined) {
			$set.phone = payload.phone;
		}

		if (payload.email !== undefined) {
			$set.email = payload.email;
		}

		if (payload.courseType !== undefined) {
			$set.courseType = payload.courseType;
		}

		if (payload.level !== undefined) {
			$set.level = payload.level;
		}

		if (payload.dateOfBirth !== undefined) {
			if (payload.dateOfBirth === null) {
				$unset.dateOfBirth = 1;
			} else {
				$set.dateOfBirth = payload.dateOfBirth;
			}
		}

		if (payload.residingCountry !== undefined) {
			$set.residingCountry = payload.residingCountry;
		}

		if (payload.gender !== undefined) {
			$set.gender = payload.gender;
		}

		if (payload.primaryWhatsappNumber !== undefined) {
			$set.primaryWhatsappNumber = payload.primaryWhatsappNumber;
		}

		if (payload.alternateWhatsappNumber !== undefined) {
			$set.alternateWhatsappNumber = payload.alternateWhatsappNumber;
		}

		if (payload.studentInfo !== undefined) {
			$set.studentInfo = payload.studentInfo;
		}

		if (payload.preferredLanguage !== undefined) {
			$set.preferredLanguage = payload.preferredLanguage;
		}

		if (payload.preferredSchedule !== undefined) {
			$set.preferredSchedule = payload.preferredSchedule;
		}

		if (payload.preferredDays !== undefined) {
			$set.preferredDays = payload.preferredDays;
		}

		if (payload.timeslot !== undefined) {
			if (payload.timeslot === null) {
				$unset.timeslot = 1;
			} else {
				$set.timeslot = payload.timeslot;
			}
		}

		if (payload.price !== undefined) {
			if (payload.price === null) {
				$unset.price = 1;
			} else {
				$set.price = payload.price;
			}
		}

		if (payload.hearAboutUs !== undefined) {
			$set.hearAboutUs = payload.hearAboutUs;
		}

		const effectiveStatus = payload.status ?? student.status;

		if (payload.status !== undefined) {
			$set.status = payload.status;
			if (payload.status === "STUDENT") {
				$unset.inactiveFrom = 1;
				$unset.inactiveUntil = 1;
				$unset.dropReason = 1;
				$unset.dropTemporary = 1;
			} else if (payload.status === "BREAK") {
				$unset.dropReason = 1;
				$unset.dropTemporary = 1;
			} else if (payload.status === "DROPPED") {
				$unset.inactiveFrom = 1;
				$unset.inactiveUntil = 1;
				$unset.nextFollowUpAt = 1;
				$unset.customNextFollowUpAt = 1;
			}
		}

		if (effectiveStatus === "BREAK") {
			if (payload.inactiveFrom !== undefined) {
				if (payload.inactiveFrom === null) {
					$unset.inactiveFrom = 1;
				} else {
					$set.inactiveFrom = payload.inactiveFrom;
				}
			}

			if (payload.inactiveUntil !== undefined) {
				if (payload.inactiveUntil === null) {
					$unset.inactiveUntil = 1;
				} else {
					$set.inactiveUntil = payload.inactiveUntil;
				}
			}

			if (payload.inactiveUntil !== undefined && payload.inactiveUntil !== null) {
				$set.nextFollowUpAt = payload.inactiveUntil;
				$unset.customNextFollowUpAt = 1;
			}
		} else if (effectiveStatus === "DROPPED" && payload.dropReason !== undefined) {
			if (payload.dropReason.trim()) {
				$set.dropReason = payload.dropReason.trim();
			} else {
				$unset.dropReason = 1;
			}
			$unset.nextFollowUpAt = 1;
			$unset.customNextFollowUpAt = 1;
		}

		if (effectiveStatus === "DROPPED" && payload.dropTemporary !== undefined) {
			if (payload.dropTemporary) {
				$set.dropTemporary = true;
			} else {
				$unset.dropTemporary = 1;
			}
		}

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

		const actorId = performedBy ?? student.admittedBy.toString();
		const breakReminderId = student.breakReminderId?.toString();
		const breakEndDate = updatedStudent.inactiveUntil ?? payload.inactiveUntil ?? student.inactiveUntil;

		if (updatedStudent.status === "BREAK" && breakEndDate) {
			const reminderNote = `Break ends for ${updatedStudent.name ?? updatedStudent.zid}`;
			if (breakReminderId) {
				const reminder = await ReminderService.updateReminder(breakReminderId, {
					date: breakEndDate,
					note: reminderNote,
					isDone: false,
				}).catch(() => null);

				if (!reminder) {
					const createdReminder = await ReminderService.createReminder(
						updatedStudent._id.toString(),
						"student",
						actorId,
						{ date: breakEndDate, note: reminderNote },
					);
					await StudentModel.findByIdAndUpdate(updatedStudent._id, {
						$set: { breakReminderId: createdReminder.id },
					});
				}
			} else {
				const createdReminder = await ReminderService.createReminder(
					updatedStudent._id.toString(),
					"student",
					actorId,
					{ date: breakEndDate, note: reminderNote },
				);
				await StudentModel.findByIdAndUpdate(updatedStudent._id, {
					$set: { breakReminderId: createdReminder.id },
				});
			}
		} else if ((updatedStudent.status === "STUDENT" || updatedStudent.status === "DROPPED") && breakReminderId) {
			await ReminderService.updateReminder(breakReminderId, {
				isDone: true,
			}).catch(() => undefined);
			await StudentModel.findByIdAndUpdate(updatedStudent._id, {
				$unset: { breakReminderId: 1 },
			});
		}

		await logStudentActivity({
			studentId: student._id.toString(),
			type:
				payload.status !== undefined
					? "STATUS_CHANGED"
					: payload.batchId !== undefined || payload.mentorId !== undefined
						? "PROCESS_UPDATED"
						: "UPDATED",
			performedBy: performedBy ?? student.admittedBy.toString(),
			description:
				payload.status === "BREAK"
					? "Student put on break"
					: payload.status === "DROPPED"
						? "Student dropped"
						: payload.status === "STUDENT"
							? "Student marked active"
							: payload.batchId !== undefined || payload.mentorId !== undefined
								? "Admission process updated"
								: hasProfileFieldChange(payload as unknown as Record<string, unknown>)
									? "Profile updated"
									: "Student updated",
			oldValue: {
				name: student.name ?? null,
				phone: student.phone,
				email: student.email,
				mentorId: student.mentorId?.toString(),
				batchId: student.batchId?.toString(),
				profilePic: student.profilePic ?? null,
			},
			newValue: {
				name: updatedStudent.name ?? null,
				phone: updatedStudent.phone,
				email: updatedStudent.email,
				mentorId: updatedStudent.mentorId?.toString(),
				batchId: updatedStudent.batchId?.toString(),
				profilePic: updatedStudent.profilePic ?? null,
			},
		});

		const synced = await syncStudentProcess(updatedStudent._id.toString());
		return toStudent((synced ?? updatedStudent) as StudentDocument);
	},
};
