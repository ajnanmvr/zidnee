import {
	RecordMentorFollowUpPayloadSchema,
	UserResponseSchema,
	UsersResponseSchema,
} from "@repo/schema";
import type { Request, Response } from "express";
import { NotFoundError, ValidationError } from "../../utils/errors.util.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import { requireStringValue } from "../rbac/rbac.http.js";
import { MentorActivityService } from "./mentor-activity.service.js";
import { MentorFollowUpService } from "./mentor-followup.service.js";

export const getMentorsDueForFollowUpController = asyncHandler(
	async (req: Request, res: Response): Promise<void> => {
		const mentors = await MentorFollowUpService.getMentorsDueForFollowUp();

		const validated = UsersResponseSchema.safeParse({
			ok: true,
			users: mentors,
		});

		if (!validated.success) {
			throw new ValidationError(validated.error.flatten().fieldErrors);
		}

		res.json(validated.data);
	},
);

export const recordMentorFollowUpController = asyncHandler(
	async (req: Request, res: Response): Promise<void> => {
		const mentorId = requireStringValue(req.params.mentorId, "mentorId");
		const payload = RecordMentorFollowUpPayloadSchema.parse(req.body);

		const mentor = await MentorFollowUpService.recordMentorFollowUp(
			mentorId as string,
			payload.note,
			payload.nextFollowUpAt,
		);

		if (!mentor) {
			throw new NotFoundError("Mentor");
		}

		const performedBy = requireStringValue(req.user?.userId, "userId");
		const performedByName = req.user?.username ?? "Unknown";
		await MentorActivityService.logActivity({
			mentorId,
			type: "FOLLOW_UP_RECORDED",
			performedBy,
			performedByName,
			description: "Recorded a mentor follow-up",
			note: payload.note,
		});

		res.json({
			ok: true,
			user: mentor,
		});
	},
);

export const setMentorCustomFollowUpController = asyncHandler(
	async (req: Request, res: Response): Promise<void> => {
		const mentorId = requireStringValue(req.params.mentorId, "mentorId");
		const { customDate } = req.body;

		if (!customDate) {
			throw new ValidationError({ customDate: ["Custom date is required"] });
		}

		const mentor = await MentorFollowUpService.setCustomFollowUpDate(
			mentorId as string,
			new Date(customDate),
		);

		if (!mentor) {
			throw new NotFoundError("Mentor");
		}

		const performedBy = requireStringValue(req.user?.userId, "userId");
		const performedByName = req.user?.username ?? "Unknown";
		await MentorActivityService.logActivity({
			mentorId,
			type: "FOLLOW_UP_CUSTOM_SET",
			performedBy,
			performedByName,
			description: "Set a custom mentor follow-up date",
			newValue: { customDate: new Date(customDate).toISOString() },
		});

		res.json({
			ok: true,
			user: mentor,
		});
	},
);

export const clearMentorCustomFollowUpController = asyncHandler(
	async (req: Request, res: Response): Promise<void> => {
		const mentorId = requireStringValue(req.params.mentorId, "mentorId");

		const mentor = await MentorFollowUpService.clearCustomFollowUpDate(
			mentorId as string,
		);

		if (!mentor) {
			throw new NotFoundError("Mentor");
		}

		const performedBy = requireStringValue(req.user?.userId, "userId");
		const performedByName = req.user?.username ?? "Unknown";
		await MentorActivityService.logActivity({
			mentorId,
			type: "FOLLOW_UP_CUSTOM_CLEARED",
			performedBy,
			performedByName,
			description: "Cleared the custom mentor follow-up date",
		});

		res.json({
			ok: true,
			user: mentor,
		});
	},
);

export const getMentorFollowUpController = asyncHandler(
	async (req: Request, res: Response): Promise<void> => {
		const mentorId = requireStringValue(req.params.mentorId, "mentorId");

		const mentor = await MentorFollowUpService.getMentorWithFollowUp(
			mentorId as string,
		);

		if (!mentor) {
			throw new NotFoundError("Mentor");
		}

		res.json({
			ok: true,
			user: mentor,
		});
	},
);
