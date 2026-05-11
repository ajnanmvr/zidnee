import type { Request, Response } from "express";
import { NotFoundError, AuthenticationError } from "../../utils/errors.util.js";
import { requireStringValue } from "../rbac/rbac.http.js";
import { ActivityService } from "./activity.service.js";

const toActivityResponse = (activity: any) => {
	const performedByName = activity.performedBy?.name || "Unknown";

	return {
		id: activity._id.toString(),
		leadId: activity.leadId.toString(),
		type: activity.type,
		performedBy: activity.performedBy?._id?.toString() || "",
		performedByName,
		description: activity.description,
		oldValue: activity.oldValue,
		newValue: activity.newValue,
		note: activity.note,
		createdAt:
			activity.createdAt instanceof Date
				? activity.createdAt.toISOString()
				: activity.createdAt,
	};
};

export const getLeadActivitiesController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const leadId = requireStringValue(req.params.leadId, "leadId");

	const activities = await ActivityService.getLeadActivities(leadId);
	const responses = activities.map((activity) => toActivityResponse(activity));

	res.json({
		ok: true,
		activities: responses,
	});
};

export const deleteLeadActivityController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	if (!req.user) {
		throw new AuthenticationError("User not authenticated");
	}

	const leadId = requireStringValue(req.params.leadId, "leadId");
	const activityId = requireStringValue(req.params.activityId, "activityId");

	const activity = await ActivityService.deleteActivity(activityId);
	if (!activity) {
		throw new NotFoundError("Activity");
	}

	if (activity.leadId.toString() !== leadId) {
		throw new NotFoundError("Activity");
	}

	res.json({ ok: true, message: "Activity deleted" });
};
