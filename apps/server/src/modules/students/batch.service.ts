import type {
	Batch,
	CreateBatchPayload,
	UpdateBatchPayload,
} from "@repo/schema";
import { Types } from "mongoose";
import { type BatchDocument, BatchModel } from "./batch.model.js";
import { BatchIdentityService } from "./batch.identity.js";
import { UserModel } from "../users/user.model.js";

const toBatch = (doc: BatchDocument): Batch => {
	return {
		id: doc._id.toString(),
		groupId: doc.groupId,
		name: doc.name,
		type: doc.type,
		level: doc.level,
		mentorId: doc.mentorId.toString(),
		counsellorId: doc.counsellorId?.toString(),
		oralAssessmentDone: doc.oralAssessmentDone ?? false,
		writtenAssessmentDone: doc.writtenAssessmentDone ?? false,
		levelAssessmentDone: doc.levelAssessmentDone ?? false,
		description: doc.description,
		isActive: doc.isActive,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	};
};

export const BatchService = {
	create: async (payload: CreateBatchPayload): Promise<Batch> => {
		const groupId =
			payload.type === "GROUP"
				? await BatchIdentityService.generateGroupId()
				: undefined;
		const batch = await BatchModel.create({
			groupId,
			name: payload.name?.trim() || undefined,
			type: payload.type,
			level: payload.level,
			mentorId: payload.mentorId,
			counsellorId: payload.counsellorId,
			oralAssessmentDone: payload.oralAssessmentDone ?? false,
			writtenAssessmentDone: payload.writtenAssessmentDone ?? false,
			levelAssessmentDone: payload.levelAssessmentDone ?? false,
			description: payload.description,
		});

		return toBatch(batch.toObject() as BatchDocument);
	},

	findById: async (id: string): Promise<Batch | null> => {
		const batch = await BatchModel.findById(id).lean<BatchDocument | null>();
		return batch ? toBatch(batch) : null;
	},

	findAll: async (filters?: { scope?: "mine" | "all"; userId?: string }): Promise<Batch[]> => {
		const query: Record<string, unknown> = {};
		if (filters?.scope === "mine" && filters.userId && Types.ObjectId.isValid(filters.userId)) {
			const mentorIds = await UserModel.find({
				counsellorId: filters.userId,
			} as any).distinct("_id");

			query.$or = [
				{ counsellorId: new Types.ObjectId(filters.userId) },
				{ mentorId: { $in: mentorIds } },
			];
		}
		const batches = await BatchModel.find(query).lean<BatchDocument[]>();
		return batches.map(toBatch);
	},

	findByMentorId: async (mentorId: string): Promise<Batch[]> => {
		const batches = await BatchModel.find({ mentorId }).lean<BatchDocument[]>();
		return batches.map(toBatch);
	},

	update: async (
		id: string,
		payload: UpdateBatchPayload,
	): Promise<Batch | null> => {
		if (payload.groupId !== undefined) {
			const trimmed = payload.groupId.trim().toUpperCase();
			const conflict = await BatchModel.findOne({ groupId: trimmed, _id: { $ne: new Types.ObjectId(id) } }).lean();
			if (conflict) {
				throw new Error(`Group ID ${trimmed} is already in use`);
			}
			payload = { ...payload, groupId: trimmed };
		}

		const $set: Record<string, unknown> = {
			name: payload.name?.trim() || undefined,
			type: payload.type,
			level: payload.level,
			mentorId: payload.mentorId,
			counsellorId: payload.counsellorId,
			oralAssessmentDone: payload.oralAssessmentDone,
			writtenAssessmentDone: payload.writtenAssessmentDone,
			levelAssessmentDone: payload.levelAssessmentDone,
			description: payload.description,
			isActive: payload.isActive,
		};
		if (payload.groupId !== undefined) {
			$set.groupId = payload.groupId;
		}

		const batch = await BatchModel.findByIdAndUpdate(
			id,
			{ $set },
			{ returnDocument: "after" },
		).lean<BatchDocument | null>();

		return batch ? toBatch(batch) : null;
	},

	delete: async (id: string): Promise<boolean> => {
		const result = await BatchModel.findByIdAndDelete(id);
		return result !== null;
	},
};
