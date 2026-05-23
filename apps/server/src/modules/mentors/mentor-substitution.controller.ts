import {
	CreateMentorSubstitutionPayloadSchema,
	MentorSubstitutionStatusSchema,
	UpdateMentorSubstitutionPayloadSchema,
} from "@repo/schema";
import type { Request, Response } from "express";
import { NotFoundError, ValidationError, ConflictError } from "../../utils/errors.util.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import { requireStringValue } from "../rbac/rbac.http.js";
import { MentorSubstitutionService } from "./mentor-substitution.service.js";

export const createMentorSubstitutionController = asyncHandler(
	async (req: Request, res: Response): Promise<void> => {
		const createdBy = requireStringValue(req.user?.userId, "userId");
		const result = CreateMentorSubstitutionPayloadSchema.safeParse(req.body);

		if (!result.success) {
			throw new ValidationError(result.error.flatten().fieldErrors);
		}

		if (result.data.originalMentorId === result.data.substituteMentorId) {
			throw new ConflictError(
				"Original and substitute mentors cannot be the same",
			);
		}

		if (new Date(result.data.endDate) <= new Date(result.data.startDate)) {
			throw new ValidationError({
				endDate: ["End date must be after start date"],
			});
		}

		const substitution = await MentorSubstitutionService.createSubstitution(
			result.data,
			createdBy,
		);

		res.status(201).json({
			ok: true,
			substitution,
		});
	},
);

export const getMentorSubstitutionController = asyncHandler(
	async (req: Request, res: Response): Promise<void> => {
		const substitutionId = requireStringValue(
			req.params.substitutionId,
			"substitutionId",
		);

		const substitution = await MentorSubstitutionService.getSubstitutionById(
			substitutionId,
		);

		if (!substitution) {
			throw new NotFoundError("Substitution");
		}

		res.json({
			ok: true,
			substitution,
		});
	},
);

export const getMentorSubstitutionsController = asyncHandler(
	async (req: Request, res: Response): Promise<void> => {
		const mentorId = requireStringValue(req.params.mentorId, "mentorId");

		const substitutions =
			await MentorSubstitutionService.getSubstitutionsByMentorId(mentorId);

		res.json({
			ok: true,
			substitutions,
		});
	},
);

export const getMentorSubstitutionsAsOriginalController = asyncHandler(
	async (req: Request, res: Response): Promise<void> => {
		const mentorId = requireStringValue(req.params.mentorId, "mentorId");

		const substitutions =
			await MentorSubstitutionService.getSubstitutionsAsOriginal(mentorId);

		res.json({
			ok: true,
			substitutions,
		});
	},
);

export const getMentorSubstitutionsAsSubstituteController = asyncHandler(
	async (req: Request, res: Response): Promise<void> => {
		const mentorId = requireStringValue(req.params.mentorId, "mentorId");

		const substitutions =
			await MentorSubstitutionService.getSubstitutionsAsSubstitute(mentorId);

		res.json({
			ok: true,
			substitutions,
		});
	},
);

export const getAllSubstitutionsController = asyncHandler(
	async (req: Request, res: Response): Promise<void> => {
		const substitutions =
			await MentorSubstitutionService.getAllSubstitutions();

		res.json({
			ok: true,
			substitutions,
		});
	},
);

export const getSubstitutionsByStatusController = asyncHandler(
	async (req: Request, res: Response): Promise<void> => {
		const result = MentorSubstitutionStatusSchema.safeParse(req.query.status);

		if (!result.success) {
			throw new ValidationError({ status: ["Invalid status"] });
		}

		const substitutions =
			await MentorSubstitutionService.getSubstitutionsByStatus(result.data);

		res.json({
			ok: true,
			substitutions,
		});
	},
);

export const updateMentorSubstitutionController = asyncHandler(
	async (req: Request, res: Response): Promise<void> => {
		const substitutionId = requireStringValue(
			req.params.substitutionId,
			"substitutionId",
		);
		const result = UpdateMentorSubstitutionPayloadSchema.safeParse(req.body);

		if (!result.success) {
			throw new ValidationError(result.error.flatten().fieldErrors);
		}

		const substitution =
			await MentorSubstitutionService.updateSubstitution(
				substitutionId,
				result.data,
			);

		if (!substitution) {
			throw new NotFoundError("Substitution");
		}

		res.json({
			ok: true,
			substitution,
		});
	},
);

export const deleteMentorSubstitutionController = asyncHandler(
	async (req: Request, res: Response): Promise<void> => {
		const substitutionId = requireStringValue(
			req.params.substitutionId,
			"substitutionId",
		);

		const deleted =
			await MentorSubstitutionService.deleteSubstitution(substitutionId);

		if (!deleted) {
			throw new NotFoundError("Substitution");
		}

		res.json({
			ok: true,
			message: "Substitution deleted successfully",
		});
	},
);
