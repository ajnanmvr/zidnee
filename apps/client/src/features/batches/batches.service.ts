import {
	BatchResponseEnvelopeSchema,
	type CreateBatchPayload,
	CreateBatchPayloadSchema,
 	UpdateBatchPayloadSchema,
} from "@repo/schema";
import { requestWithSchema } from "@/api/request";

export const createBatch = async (
	token: string,
	payload: CreateBatchPayload,
) => {
	const validated = CreateBatchPayloadSchema.parse(payload);
	return requestWithSchema(
		"/batches",
		BatchResponseEnvelopeSchema,
		"POST",
		validated,
		token,
	);
};

export const updateBatch = async (
 	token: string,
 	batchId: string,
 	payload: unknown,
) => {
 	const validated = UpdateBatchPayloadSchema.parse(payload);
 	return requestWithSchema(
 		`/batches/${batchId}`,
 		BatchResponseEnvelopeSchema,
 		"PATCH",
 		validated,
 		token,
 	);
};
