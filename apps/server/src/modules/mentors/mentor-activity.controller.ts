import { MentorActivitiesResponseSchema } from "@repo/schema";
import type { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import { requireStringValue } from "../rbac/rbac.http.js";
import { MentorActivityService } from "./mentor-activity.service.js";

export const getMentorActivitiesController = asyncHandler(
	async (req: Request, res: Response): Promise<void> => {
		const mentorId = requireStringValue(req.params.mentorId, "mentorId");
		const activities = await MentorActivityService.getMentorActivities(
			mentorId,
		);

		res.json(
			MentorActivitiesResponseSchema.parse({
				ok: true,
				activities: activities.map((activity) => ({
					id: activity.id,
					mentorId: activity.mentorId,
					type: activity.type,
					performedBy: activity.performedBy,
					performedByName: activity.performedByName,
					description: activity.description,
					note: activity.note,
					oldValue: activity.oldValue,
					newValue: activity.newValue,
					createdAt:
						activity.createdAt instanceof Date
							? activity.createdAt.toISOString()
							: activity.createdAt,
				})),
			}),
		);
	},
);