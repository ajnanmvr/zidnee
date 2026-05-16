import mongoose, { type Model, Schema } from "mongoose";

interface BatchSequenceDocument {
	_id: string;
	nextNumber: number;
}

const batchSequenceSchema = new Schema<BatchSequenceDocument>(
	{
		_id: {
			type: String,
			required: true,
		},
		nextNumber: {
			type: Number,
			required: true,
			default: 0,
		},
	},
	{
		timestamps: false,
		versionKey: false,
	},
);

const BatchSequenceModel =
	(mongoose.models.BatchSequence as Model<BatchSequenceDocument> | undefined) ??
	mongoose.model<BatchSequenceDocument>("BatchSequence", batchSequenceSchema);

export const BatchIdentityService = {
	generateGroupId: async (): Promise<string> => {
		const sequence = await BatchSequenceModel.findByIdAndUpdate(
			"zg",
			{ $inc: { nextNumber: 1 } },
			{ new: true, upsert: true },
		);

		if (!sequence) {
			throw new Error("Failed to generate group ID");
		}

		return `zg${String(sequence.nextNumber).padStart(3, "0")}`;
	},
};