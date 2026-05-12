import mongoose, { type Model, Schema } from "mongoose";

interface LeadSequenceDocument {
	_id: string;
	nextNumber: number;
}

const leadSequenceSchema = new Schema<LeadSequenceDocument>(
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

const LeadSequenceModel =
	(mongoose.models.LeadSequence as Model<LeadSequenceDocument> | undefined) ??
	mongoose.model<LeadSequenceDocument>("LeadSequence", leadSequenceSchema);

export const generateLeadSerialNumber = async (): Promise<number> => {
	const sequence = await LeadSequenceModel.findByIdAndUpdate(
		"LEAD",
		{ $inc: { nextNumber: 1 } },
		{ new: true, upsert: true },
	);

	if (!sequence) {
		throw new Error("Failed to generate lead serial number");
	}

	return sequence.nextNumber;
};
