import type {
	ClassObservationKey,
	ClassroomCheckKey,
	ComplianceStatus,
	InspectionResult,
} from "@repo/schema";
import mongoose, { type Model, Schema, type Types } from "mongoose";

export interface StudentFollowUpSessionDocument {
	_id: Types.ObjectId;
	studentId: Types.ObjectId;
	performedBy: Types.ObjectId;
	studentZid?: string;
	studentName: string;
	level?: string;
	mentorName?: string;
	classPlan?: string;
	inspectionDate: Date;
	classroomChecks: Record<ClassroomCheckKey, ComplianceStatus>;
	classObservation: Record<ClassObservationKey, ComplianceStatus>;
	parent: {
		contacted: boolean;
		satisfaction?: "SATISFIED" | "NEEDS_IMPROVEMENT";
		feedback?: string;
		complaints?: string;
	};
	findings: {
		positiveObservations?: string;
		areasForImprovement?: string;
		needsAdditionalAttention: boolean;
		result: InspectionResult;
		counsellorRemarks?: string;
	};
	createdAt: Date;
}

const studentFollowUpSessionSchema = new Schema<StudentFollowUpSessionDocument>(
	{
		studentId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: "Student",
			index: true,
		},
		performedBy: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: "User",
		},
		studentZid: String,
		studentName: { type: String, required: true },
		level: String,
		mentorName: String,
		classPlan: String,
		inspectionDate: { type: Date, required: true },
		classroomChecks: { type: Schema.Types.Mixed, required: true },
		classObservation: { type: Schema.Types.Mixed, required: true },
		parent: { type: Schema.Types.Mixed, required: true },
		findings: { type: Schema.Types.Mixed, required: true },
	},
	{
		timestamps: { createdAt: true, updatedAt: false },
		versionKey: false,
	},
);

studentFollowUpSessionSchema.index({ studentId: 1, createdAt: -1 });

export const StudentFollowUpSessionModel: Model<StudentFollowUpSessionDocument> =
	mongoose.model(
		"StudentFollowUpSession",
		studentFollowUpSessionSchema,
	) as Model<StudentFollowUpSessionDocument>;
