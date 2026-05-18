import type { MentorActivity, MentorActivityType } from "@repo/schema";
import { MentorActivityModel, type MentorActivityDocument } from "./mentor-activity.model.js";

const toMentorActivity = (doc: MentorActivityDocument): MentorActivity => ({
	id: doc._id.toString(),
	mentorId: doc.mentorId.toString(),
	type: doc.type,
	performedBy: doc.performedBy.toString(),
	performedByName: doc.performedByName,
	description: doc.description,
	note: doc.note,
	oldValue: doc.oldValue,
	newValue: doc.newValue,
	createdAt: doc.createdAt,
});

export const MentorActivityService = {
	logActivity: async (params: {
		mentorId: string;
		type: MentorActivityType;
		performedBy: string;
		performedByName: string;
		description: string;
		note?: string;
		oldValue?: Record<string, unknown>;
		newValue?: Record<string, unknown>;
	}): Promise<MentorActivity> => {
		const activity = await MentorActivityModel.create({
			mentorId: params.mentorId,
			type: params.type,
			performedBy: params.performedBy,
			performedByName: params.performedByName,
			description: params.description,
			note: params.note,
			oldValue: params.oldValue,
			newValue: params.newValue,
		});

		return toMentorActivity(activity.toObject() as MentorActivityDocument);
	},

	getMentorActivities: async (mentorId: string): Promise<MentorActivity[]> => {
		const activities = await MentorActivityModel.find({ mentorId })
			.sort({ createdAt: -1 })
			.lean<MentorActivityDocument[]>();

		return activities.map(toMentorActivity);
	},
};