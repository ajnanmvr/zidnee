import mongoose, { type Model, Schema, type Types } from "mongoose";
import { ZID_CONSTANTS } from "@repo/schema";

interface ZidSequenceDocument {
	_id: string; // prefix like 'ZID', 'ZIG'
	nextNumber: number;
}

const zidSequenceSchema = new Schema<ZidSequenceDocument>(
	{
		_id: {
			type: String,
			required: true,
		},
		nextNumber: {
			type: Number,
			required: true,
			default: 11,
		},
	},
	{
		timestamps: false,
		versionKey: false,
	},
);

const ZidSequenceModel =
	(mongoose.models.ZidSequence as Model<ZidSequenceDocument> | undefined) ??
	mongoose.model<ZidSequenceDocument>("ZidSequence", zidSequenceSchema);

export const ZidService = {
	generateZid: async (
		prefix: string = ZID_CONSTANTS.prefixes.student,
	): Promise<string> => {
		const sequence = await ZidSequenceModel.findByIdAndUpdate(
			prefix,
			{ $inc: { nextNumber: 1 } },
			{ new: true, upsert: true },
		);

		if (!sequence) {
			throw new Error(`Failed to generate ZID for prefix ${prefix}`);
		}

		// Ensure minimum total length for generated ZID (prefix + number)
		// e.g. prefix 'ZID' (3) -> want minimum 5 chars total -> number should be at least 2 digits
		const minTotalLength = 5;
		let numStr = String(sequence.nextNumber);
		const padNeeded = Math.max(0, minTotalLength - prefix.length - numStr.length);
		if (padNeeded > 0) {
			numStr = numStr.padStart(numStr.length + padNeeded, "0");
		}

		return `${prefix}${numStr}`;
	},
};
