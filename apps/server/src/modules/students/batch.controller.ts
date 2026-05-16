import {
	BatchResponseEnvelopeSchema,
	BatchesResponseSchema,
	CreateBatchPayloadSchema,
} from "@repo/schema";
import type { Request, Response } from "express";
import { ValidationError } from "../../utils/errors.util.js";
import { BatchService } from "./batch.service.js";

const toBatchResponse = (batch: Awaited<ReturnType<typeof BatchService.create>>) => {
	return {
		id: batch.id,
		groupId: batch.groupId ?? undefined,
		name: batch.name,
		type: batch.type,
		level: batch.level,
		mentorId: batch.mentorId,
		description: batch.description,
		isActive: batch.isActive,
		createdAt: batch.createdAt?.toISOString() ?? null,
		updatedAt: batch.updatedAt?.toISOString() ?? null,
	};
};

export const listBatchesController = async (
	_req: Request,
	res: Response,
): Promise<void> => {
	const batches = await BatchService.findAll();
	res.json(
		BatchesResponseSchema.parse({
			ok: true,
			batches: batches.map(toBatchResponse),
		}),
	);
};

export const createBatchController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const result = CreateBatchPayloadSchema.safeParse(req.body);
	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	const batch = await BatchService.create(result.data);

	res.status(201).json(
		BatchResponseEnvelopeSchema.parse({
			ok: true,
			batch: toBatchResponse(batch),
		}),
	);
};