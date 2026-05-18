import type { User } from "@repo/schema";
import { FOLLOW_UP_PERIOD_MS } from "@repo/schema";
import { UserModel, type UserDocument } from "../users/user.model.js";

const toUser = (doc: UserDocument): User => ({
	id: doc._id.toString(),
	username: doc.username,
	email: doc.email,
	password: doc.password,
	name: doc.name,
	gender: doc.gender,
	mentorId: doc.mentorId,
	counsellorId: doc.counsellorId,
	zids: doc.zids,
	roleIds: doc.roleIds.map((roleId) => roleId.toString()),
	isActive: doc.isActive,
	lastContactedAt: doc.lastContactedAt,
	nextFollowUpAt: doc.nextFollowUpAt,
	customNextFollowUpAt: doc.customNextFollowUpAt,
	createdAt: doc.createdAt,
	updatedAt: doc.updatedAt,
});

const calculateNextFollowUpDate = (
	source?: Date | null,
): Date => {
	const now = new Date();

	return source ?? new Date(Date.now() + FOLLOW_UP_PERIOD_MS.mentor);
};

export const MentorFollowUpService = {
	// Get mentors due for followup
	getMentorsDueForFollowUp: async (): Promise<User[]> => {
		const now = new Date();
		const mentors = await UserModel.find({
			$or: [
				{
					nextFollowUpAt: { $lte: now },
					customNextFollowUpAt: { $exists: false },
				},
				{
					customNextFollowUpAt: { $lte: now },
				},
			],
		}).lean<UserDocument[]>();

		return mentors.map(toUser);
	},

	// Update mentor followup and record contact
	recordMentorFollowUp: async (
		mentorId: string,
		note?: string,
	): Promise<User | null> => {
		const mentor = await UserModel.findById(mentorId).lean<
			UserDocument | null
		>();
		if (!mentor) {
			return null;
		}

		const now = new Date();
		const nextFollowUpAt = calculateNextFollowUpDate();

		const updated = await UserModel.findByIdAndUpdate(
			mentorId,
			{
				$set: {
					lastContactedAt: now,
					nextFollowUpAt,
					customNextFollowUpAt: undefined,
				},
			},
			{ returnDocument: "after" },
		).lean<UserDocument | null>();

		return updated ? toUser(updated) : null;
	},

	// Set custom followup date for mentor
	setCustomFollowUpDate: async (
		mentorId: string,
		customDate: Date,
	): Promise<User | null> => {
		const updated = await UserModel.findByIdAndUpdate(
			mentorId,
			{
				$set: {
					customNextFollowUpAt: customDate,
				},
			},
			{ returnDocument: "after" },
		).lean<UserDocument | null>();

		return updated ? toUser(updated) : null;
	},

	// Clear custom followup date
	clearCustomFollowUpDate: async (mentorId: string): Promise<User | null> => {
		const updated = await UserModel.findByIdAndUpdate(
			mentorId,
			{
				$unset: {
					customNextFollowUpAt: 1,
				},
			},
			{ returnDocument: "after" },
		).lean<UserDocument | null>();

		return updated ? toUser(updated) : null;
	},

	// Get specific mentor with followup info
	getMentorWithFollowUp: async (mentorId: string): Promise<User | null> => {
		const mentor = await UserModel.findById(mentorId).lean<
			UserDocument | null
		>();
		return mentor ? toUser(mentor) : null;
	},
};
