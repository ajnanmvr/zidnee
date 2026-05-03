import { requestWithSchema } from "@/api/request";
import { CreateTimeSlotPayloadSchema, TimeSlotResponseEnvelopeSchema, TimeSlotsResponseSchema } from "@repo/schema";

export const fetchTimeSlots = async (token?: string) => {
	return requestWithSchema("/time-slots", TimeSlotsResponseSchema, "GET", undefined, token);
};

export const fetchPublicTimeSlots = async () => {
	return requestWithSchema("/form/options/time-slots", TimeSlotsResponseSchema, "GET");
};

export const createTimeSlot = async (token: string, payload: { label: string }) => {
	const validated = CreateTimeSlotPayloadSchema.parse(payload);
	return requestWithSchema("/time-slots", TimeSlotResponseEnvelopeSchema, "POST", validated, token);
};