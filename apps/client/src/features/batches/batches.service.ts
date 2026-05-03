import { requestWithSchema } from "@/api/request";
import { BatchResponseEnvelopeSchema, CreateBatchPayloadSchema, type CreateBatchPayload } from "@repo/schema";

export const createBatch = async (token: string, payload: CreateBatchPayload) => {
	const validated = CreateBatchPayloadSchema.parse(payload);
	return requestWithSchema("/batches", BatchResponseEnvelopeSchema, "POST", validated, token);
};
