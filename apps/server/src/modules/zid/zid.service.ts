import mongoose, { type Model, Schema } from "mongoose";

interface ZidSequenceDocument {
	_id: string; // prefix, e.g. 'ZID', 'ZIG', 'ZM0'
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

const PAD_LENGTH = 3;

export const ZidService = {
	/**
	 * Atomically returns the next sequential code for `prefix` (e.g. "ZID011").
	 * `seedHighest` runs only the first time this prefix is generated, to seed
	 * the counter from whatever numeric suffix already exists in the data —
	 * so the sequence continues from the last created record instead of
	 * restarting at 1. Every call after that is a single atomic $inc, so
	 * concurrent creations can never be handed the same code.
	 */
	generateZid: async (
		prefix: string,
		seedHighest: () => Promise<number>,
	): Promise<string> => {
		let sequence = await ZidSequenceModel.findOneAndUpdate(
			{ _id: prefix },
			{ $inc: { nextNumber: 1 } },
			{ new: true },
		);

		if (!sequence) {
			const highest = await seedHighest();
			try {
				await ZidSequenceModel.create({ _id: prefix, nextNumber: highest });
			} catch {
				// Another concurrent call already seeded this prefix; ignore and
				// fall through to the atomic increment below.
			}

			sequence = await ZidSequenceModel.findOneAndUpdate(
				{ _id: prefix },
				{ $inc: { nextNumber: 1 } },
				{ new: true, upsert: true },
			);
		}

		if (!sequence) {
			throw new Error(`Failed to generate ZID for prefix ${prefix}`);
		}

		return `${prefix}${String(sequence.nextNumber).padStart(PAD_LENGTH, "0")}`;
	},
};
