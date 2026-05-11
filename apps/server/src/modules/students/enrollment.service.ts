import type { CreateEnrollmentPayload, Enrollment } from "@repo/schema";
import {
	type EnrollmentDocument,
	EnrollmentModel,
} from "./enrollment.model.js";

const toEnrollment = (doc: EnrollmentDocument): Enrollment => {
	return {
		id: doc._id.toString(),
		studentId: doc.studentId.toString(),
		courseId: doc.courseId?.toString(),
		batchId: doc.batchId?.toString(),
		enrolledAt: doc.enrolledAt,
		status: doc.status,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	};
};

export const EnrollmentService = {
	create: async (payload: CreateEnrollmentPayload): Promise<Enrollment> => {
		const enrollment = await EnrollmentModel.create({
			studentId: payload.studentId,
			courseId: payload.courseId,
			batchId: payload.batchId,
			enrolledAt: new Date(),
		});

		return toEnrollment(enrollment.toObject() as EnrollmentDocument);
	},

	findById: async (id: string): Promise<Enrollment | null> => {
		const enrollment = await EnrollmentModel.findById(
			id,
		).lean<EnrollmentDocument | null>();
		return enrollment ? toEnrollment(enrollment) : null;
	},

	findByStudentId: async (studentId: string): Promise<Enrollment[]> => {
		const enrollments = await EnrollmentModel.find({ studentId }).lean<
			EnrollmentDocument[]
		>();
		return enrollments.map(toEnrollment);
	},

	findByBatchId: async (batchId: string): Promise<Enrollment[]> => {
		const enrollments = await EnrollmentModel.find({ batchId }).lean<
			EnrollmentDocument[]
		>();
		return enrollments.map(toEnrollment);
	},

	findByCourseId: async (courseId: string): Promise<Enrollment[]> => {
		const enrollments = await EnrollmentModel.find({ courseId }).lean<
			EnrollmentDocument[]
		>();
		return enrollments.map(toEnrollment);
	},

	findAll: async (): Promise<Enrollment[]> => {
		const enrollments =
			await EnrollmentModel.find().lean<EnrollmentDocument[]>();
		return enrollments.map(toEnrollment);
	},

	updateStatus: async (
		id: string,
		status: "ACTIVE" | "COMPLETED" | "DROPPED",
	): Promise<Enrollment | null> => {
		const enrollment = await EnrollmentModel.findByIdAndUpdate(
			id,
			{ $set: { status } },
			{ returnDocument: "after" },
		).lean<EnrollmentDocument | null>();

		return enrollment ? toEnrollment(enrollment) : null;
	},

	delete: async (id: string): Promise<boolean> => {
		const result = await EnrollmentModel.findByIdAndDelete(id);
		return result !== null;
	},
};
