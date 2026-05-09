import {
	AssignDemoPayloadSchema,
	ConfirmAdmissionPayloadSchema,
	CreateLeadPayloadSchema,
	GenerateFormLinkResponseSchema,
	LeadActivitiesResponseSchema,
	LeadResponseEnvelopeSchema,
	LeadsResponseSchema,
	MessageResponseSchema,
	PostponeLeadFollowUpPayloadSchema,
	RedemoLeadPayloadSchema,
	UpdateLeadPayloadSchema,
	StudentResponseEnvelopeSchema,
} from "@repo/schema";
import { requestWithSchema } from "@/api/request";

export const fetchDueLeadFollowUps = async (
	token: string,
	options?: {
		scope?: "all" | "mine";
		timeFilter?: "all" | "today";
		status?: string;
		page?: number;
	},
) => {
	const scope = options?.scope ?? "all";
	const timeFilter = options?.timeFilter ?? "all";
	const status = options?.status ?? "";
	const page = options?.page ?? 1;
	const limit = 25;
	const offset = (page - 1) * limit;
	
	let query = `?scope=${scope}&timeFilter=${timeFilter}&limit=${limit}&offset=${offset}`;
	if (status) {
		query += `&status=${status}`;
	}
	
	return requestWithSchema(
		`/leads${query}`,
		LeadsResponseSchema,
		"GET",
		undefined,
		token,
	);
};

export const fetchDemoRequests = async (token: string) => {
	return requestWithSchema(
		"/leads/demo-requests",
		LeadsResponseSchema,
		"GET",
		undefined,
		token,
	);
};

export const fetchPendingDemoRequests = async (token: string) => {
	return requestWithSchema(
		"/leads/for-demo",
		LeadsResponseSchema,
		"GET",
		undefined,
		token,
	);
};

export const fetchAdmissionLeads = async (token: string) => {
	return requestWithSchema(
		"/leads/admissions",
		LeadsResponseSchema,
		"GET",
		undefined,
		token,
	);
};

export const createLead = async (token: string, payload: unknown) => {
	const parsedPayload = CreateLeadPayloadSchema.parse(payload);
	return requestWithSchema(
		"/leads",
		LeadResponseEnvelopeSchema,
		"POST",
		parsedPayload,
		token,
	);
};

export const updateLead = async (
	token: string,
	leadId: string,
	payload: unknown,
) => {
	const parsedPayload = UpdateLeadPayloadSchema.parse(payload);
	return requestWithSchema(
		`/leads/${leadId}`,
		LeadResponseEnvelopeSchema,
		"PATCH",
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

export const requestLeadDemo = async (token: string, leadId: string) => {
	return requestWithSchema(
		`/leads/${leadId}/demo/request`,
		LeadResponseEnvelopeSchema,
		"PATCH",
		undefined,
		token,
	);
};

export const cancelLeadDemo = async (token: string, leadId: string) => {
	return requestWithSchema(
		`/leads/${leadId}/demo/cancel`,
		LeadResponseEnvelopeSchema,
		"PATCH",
		undefined,
		token,
	);
};

export const assignDemoMentor = async (
	token: string,
	leadId: string,
	payload: unknown,
) => {
	const parsedPayload = AssignDemoPayloadSchema.parse(payload);
	return requestWithSchema(
		`/leads/${leadId}/demo/assign`,
		LeadResponseEnvelopeSchema,
		"PATCH",
		parsedPayload,
		token,
	);
};

export const markDemoCompleted = async (
	token: string,
	leadId: string,
	payload?: unknown,
) => {
	return requestWithSchema(
		`/leads/${leadId}/demo/complete`,
		LeadResponseEnvelopeSchema,
		"PATCH",
		payload ?? {},
		token,
	);
};

export const requestRedemo = async (
	token: string,
	leadId: string,
	payload: unknown,
) => {
	const parsedPayload = RedemoLeadPayloadSchema.parse(payload);
	return requestWithSchema(
		`/leads/${leadId}/demo/redemo`,
		LeadResponseEnvelopeSchema,
		"PATCH",
		parsedPayload,
		token,
	);
};

export const confirmAdmission = async (
	token: string,
	leadId: string,
	payload: unknown,
) => {
	const parsedPayload = ConfirmAdmissionPayloadSchema.parse(payload);
	return requestWithSchema(
		`/leads/${leadId}/admission/confirm`,
		StudentResponseEnvelopeSchema,
		"PATCH",
		parsedPayload,
		token,
	);
};

export const requestAdmission = async (
	token: string,
	leadId: string,
	payload: unknown,
) => {
	const parsedPayload = ConfirmAdmissionPayloadSchema.parse(payload);
	return requestWithSchema(
		`/leads/${leadId}/admission/request`,
		LeadResponseEnvelopeSchema,
		"PATCH",
		parsedPayload,
		token,
	);
};

export const deleteLead = async (token: string, leadId: string, payload: { note: string }) => {
	return requestWithSchema(
		`/leads/${leadId}`,
		MessageResponseSchema,
		"DELETE",
		payload,
		token,
	);
};

export const generateFormLink = async (token: string, leadId: string) => {
	return requestWithSchema(
		`/leads/${leadId}/form-link`,
		GenerateFormLinkResponseSchema,
		"POST",
		undefined,
		token,
	);
};

export const revokeFormLink = async (token: string, leadId: string) => {
	return requestWithSchema(
		`/leads/${leadId}/form/revoke`,
		LeadResponseEnvelopeSchema,
		"PATCH",
		undefined,
		token,
	);
};

export const fetchLeadActivities = async (token: string, leadId: string) => {
	return requestWithSchema(
		`/leads/${leadId}/activities`,
		LeadActivitiesResponseSchema,
		"GET",
		undefined,
		token,
	);
};

export const deleteLeadActivity = async (
	token: string,
	leadId: string,
	activityId: string,
) => {
	return requestWithSchema(
		`/leads/${leadId}/activities/${activityId}`,
		MessageResponseSchema,
		"DELETE",
		undefined,
		token,
	);
};

export const fetchLeadById = async (token: string, leadId: string) => {
	return requestWithSchema(
		`/leads/${leadId}`,
		LeadResponseEnvelopeSchema,
		"GET",
		undefined,
		token,
	);
};
