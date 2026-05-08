import { requestWithSchema } from "@/api/request";
import { CreateTimeSlotPayloadSchema, TimeSlotResponseEnvelopeSchema, TimeSlotsResponseSchema, MessageResponseSchema } from "@repo/schema";

export const fetchTimeSlots = async (token?: string) => {
	return requestWithSchema("/time-slots", TimeSlotsResponseSchema, "GET", undefined, token);
};

export const fetchPublicTimeSlots = async () => {
	return requestWithSchema("/form/options/time-slots", TimeSlotsResponseSchema, "GET");
};

export const createTimeSlot = async (token: string, payload: { durationMinutes: number; timesPerWeek: number }) => {
	const validated = CreateTimeSlotPayloadSchema.parse(payload);
	return requestWithSchema("/time-slots", TimeSlotResponseEnvelopeSchema, "POST", validated, token);
};

export const updateTimeSlot = async (token: string, id: string, payload: { durationMinutes?: number; timesPerWeek?: number; isActive?: boolean }) => {
	return requestWithSchema(`/time-slots/${id}`, TimeSlotResponseEnvelopeSchema, "PATCH", payload, token);
};

export const deleteTimeSlot = async (token: string, id: string) => {
	return requestWithSchema(`/time-slots/${id}`, MessageResponseSchema, "DELETE", undefined, token);
};