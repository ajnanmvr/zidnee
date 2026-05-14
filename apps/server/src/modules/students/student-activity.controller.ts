import { StudentActivitiesResponseSchema } from "@repo/schema";
import type { Request, Response } from "express";
import { requireStringValue } from "../rbac/rbac.http.js";
import { type StudentActivityDocument } from "./student-activity.model.js";
import { StudentService } from "./student.service.js";

const toActivityResponse = (activity: StudentActivityDocument) => {
	const performedByName = (activity.performedBy as any)?.name || "Unknown";

	return {
		id: activity._id.toString(),
		studentId: activity.studentId.toString(),
		type: activity.type,
		performedBy: (activity.performedBy as any)?._id?.toString() || "",
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

export const getStudentActivitiesController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const studentId = requireStringValue(req.params.studentId, "studentId");
	const activities = await StudentService.getStudentActivities(studentId);
	res.json(
		StudentActivitiesResponseSchema.parse({
			ok: true,
			activities: activities.map(toActivityResponse),
		}),
	);
};