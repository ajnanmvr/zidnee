import type { ActivityType } from "@repo/schema";
import {
	type LeadActivityDocument,
	LeadActivityModel,
} from "./activity.model.js";

export class ActivityService {
	static async logActivity(
		leadId: string,
		type: ActivityType,
		performedBy: string,
		description: string,
		oldValue?: Record<string, unknown>,
		newValue?: Record<string, unknown>,
		note?: string,
	): Promise<LeadActivityDocument> {
		const activity = new LeadActivityModel({
			leadId,
			type,
			performedBy,
			description,
			oldValue,
			newValue,
			note,
		});

		return activity.save();
	}

	static async getLeadActivities(
		leadId: string,
	): Promise<LeadActivityDocument[]> {
		return LeadActivityModel.find({ leadId })
			.populate("performedBy", "name")
			.sort({ createdAt: -1 })
			.exec();
	}

	static async deleteActivity(
		activityId: string,
	): Promise<LeadActivityDocument | null> {
		const deleted = await LeadActivityModel.findByIdAndDelete(
			activityId,
		).lean<LeadActivityDocument | null>();
		return deleted;
	}

	static async toActivity(doc: LeadActivityDocument) {
		const performedByName = (doc.performedBy as any)?.name || "Unknown";

		return {
			id: doc._id.toString(),
			leadId: doc.leadId.toString(),
			type: doc.type,
			performedBy: (doc.performedBy as any)?._id?.toString() || "",
			performedByName,
			description: doc.description,
			oldValue: doc.oldValue,
			newValue: doc.newValue,
			note: doc.note,
			createdAt: doc.createdAt,
		};
	}
}
