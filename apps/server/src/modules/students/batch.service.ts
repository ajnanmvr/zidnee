import type { Batch, CreateBatchPayload, UpdateBatchPayload } from "@repo/schema";
import { BatchModel, type BatchDocument } from "./batch.model.js";

const toBatch = (doc: BatchDocument): Batch => {
	return {
		id: doc._id.toString(),
		name: doc.name,
		type: doc.type,
		level: doc.level,
		mentorId: doc.mentorId.toString(),
		description: doc.description,
		isActive: doc.isActive,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	};
};

export const BatchService = {
	create: async (payload: CreateBatchPayload): Promise<Batch> => {
		const batch = await BatchModel.create({
			name: payload.name,
			type: payload.type,
			level: payload.level,
			mentorId: payload.mentorId,
			description: payload.description,
		});

		return toBatch(batch.toObject() as BatchDocument);
	},

	findById: async (id: string): Promise<Batch | null> => {
		const batch = await BatchModel.findById(id).lean<BatchDocument | null>();
		return batch ? toBatch(batch) : null;
	},

	findAll: async (): Promise<Batch[]> => {
		const batches = await BatchModel.find().lean<BatchDocument[]>();
		return batches.map(toBatch);
	},

	findByMentorId: async (mentorId: string): Promise<Batch[]> => {
		const batches = await BatchModel.find({ mentorId }).lean<BatchDocument[]>();
		return batches.map(toBatch);
	},

	update: async (id: string, payload: UpdateBatchPayload): Promise<Batch | null> => {
		const batch = await BatchModel.findByIdAndUpdate(
			id,
			{
				$set: {
					name: payload.name,
					type: payload.type,
					level: payload.level,
					mentorId: payload.mentorId,
					description: payload.description,
					isActive: payload.isActive,
				},
			},
			{ returnDocument: "after" },
		).lean<BatchDocument | null>();

		return batch ? toBatch(batch) : null;
	},

	delete: async (id: string): Promise<boolean> => {
		const result = await BatchModel.findByIdAndDelete(id);
		return result !== null;
	},
};
