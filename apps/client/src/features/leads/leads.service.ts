import {
	CreateLeadPayloadSchema,
	LeadResponseEnvelopeSchema,
	LeadsResponseSchema,
	PostponeLeadFollowUpPayloadSchema,
} from "@repo/schema";
import { requestWithSchema } from "@/api/request";

export const fetchDueLeadFollowUps = async (token: string) => {
	return requestWithSchema(
		"/leads/follow-ups/due",
		LeadsResponseSchema,
		"GET",
		undefined,
		token,
	);
};

export const createLead = async (
	token: string,
	payload: unknown,
) => {
	const parsedPayload = CreateLeadPayloadSchema.parse(payload);
	return requestWithSchema(
		"/leads",
		LeadResponseEnvelopeSchema,
		"POST",
		parsedPayload,
		token,
	);
};

export const postponeLeadFollowUp = async (
	token: string,
	leadId: string,
	payload: unknown,
) => {
	const parsedPayload = PostponeLeadFollowUpPayloadSchema.parse(payload);
	return requestWithSchema(
		`/leads/${leadId}/follow-up/postpone`,
		LeadResponseEnvelopeSchema,
		"PATCH",
		parsedPayload,
		token,
	);
};
