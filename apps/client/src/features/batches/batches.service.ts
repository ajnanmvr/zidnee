import {
	BatchResponseEnvelopeSchema,
	type CreateBatchPayload,
	CreateBatchPayloadSchema,
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
