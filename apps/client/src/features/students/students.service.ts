import {
	StudentActivitiesResponseSchema,
	StudentFollowUpPayloadSchema,
	StudentProcessesResponseSchema,
	StudentResponseEnvelopeSchema,
	StudentsResponseSchema,
	UpdateStudentAssessmentPayloadSchema,
	UpdateStudentPayloadSchema,
} from "@repo/schema";
import { StudentProcessResponseSchema } from "@repo/schema";
import { requestWithSchema } from "@/api/request";

export const fetchStudents = async (
	token: string,
	options?: {
		status?: string;
		search?: string;
		sortBy?: string;
		sortOrder?: "asc" | "desc";
		page?: number;
		limit?: number;
	},
) => {
	const query = new URLSearchParams();

	if (options?.status) query.set("status", options.status);
	if (options?.search) query.set("search", options.search);
	if (options?.sortBy) query.set("sortBy", options.sortBy);
	if (options?.sortOrder) query.set("sortOrder", options.sortOrder);
	if (options?.page) query.set("page", String(options.page));
	if (options?.limit) query.set("limit", String(options.limit));

	return requestWithSchema(
		`/students${query.toString() ? `?${query.toString()}` : ""}`,
		StudentsResponseSchema,
		"GET",
		undefined,
		token,
	);
};

export const updateStudent = async (
	token: string,
	studentId: string,
	payload: unknown,
) => {
	const validatedPayload = UpdateStudentPayloadSchema.parse(payload);

	return requestWithSchema(
		`/students/${studentId}`,
		StudentResponseEnvelopeSchema,
		"PATCH",
		validatedPayload,
		token,
	);
};

export const fetchStudentActivities = async (
	token: string,
	studentId: string,
) => {
	return requestWithSchema(
		`/students/${studentId}/activities`,
		StudentActivitiesResponseSchema,
		"GET",
		undefined,
		token,
	);
};

export const fetchStudentProcesses = async (token: string) => {
	return requestWithSchema(
		`/students/processes`,
		StudentProcessesResponseSchema,
		"GET",
		undefined,
		token,
	);
};

export const fetchStudentProcess = async (token: string, processId: string) => {
	const validator = {
		safeParse: (raw: unknown) => {
			const candidate = (raw as any)?.process;
			const parsed = StudentProcessResponseSchema.safeParse(candidate);
			if (!parsed.success) return { success: false } as const;
			return { success: true, data: { process: parsed.data } } as const;
		},
	} as const;

	return requestWithSchema(`/students/processes/${processId}`, validator as any, "GET", undefined, token);
};

export const markProcessTaskCompleted = async (
	token: string,
	processId: string,
	taskKey: string,
) => {
	const validator = {
		safeParse: (raw: unknown) => {
			const candidate = (raw as any)?.process;
			const parsed = StudentProcessResponseSchema.safeParse(candidate);
			if (!parsed.success) return { success: false } as const;
			return { success: true, data: { process: parsed.data } } as const;
		},
	} as const;

	return requestWithSchema(
		`/students/processes/${processId}/tasks/${encodeURIComponent(taskKey)}/complete`,
		validator as any,
		"POST",
		undefined,
		token,
	);
};

export const setProcessTaskCompleted = async (
	token: string,
	processId: string,
	taskKey: string,
	completed: boolean,
) => {
	const validator = {
		safeParse: (raw: unknown) => {
			const candidate = (raw as any)?.process;
			const parsed = StudentProcessResponseSchema.safeParse(candidate);
			if (!parsed.success) return { success: false } as const;
			return { success: true, data: { process: parsed.data } } as const;
		},
	} as const;

	return requestWithSchema(
		`/students/processes/${processId}/tasks/${encodeURIComponent(taskKey)}/set`,
		validator as any,
		"POST",
		{ completed },
		token,
	);
};

export const completeStudentProcess = async (token: string, processId: string) => {
	const validator = {
		safeParse: (raw: unknown) => {
			const candidate = (raw as any)?.process;
			const parsed = StudentProcessResponseSchema.safeParse(candidate);
			if (!parsed.success) return { success: false } as const;
			return { success: true, data: { process: parsed.data } } as const;
		},
	} as const;

	return requestWithSchema(
		`/students/processes/${processId}/complete`,
		validator as any,
		"POST",
		undefined,
		token,
	);
};

export const recordStudentFollowUp = async (
	token: string,
	studentId: string,
	payload: { note: string; nextFollowUpAt?: Date },
) => {
	const validatedPayload = StudentFollowUpPayloadSchema.parse(payload);

	return requestWithSchema(
		`/students/${studentId}/follow-up`,
		StudentResponseEnvelopeSchema,
		"PATCH",
		validatedPayload,
		token,
	);
};

export const updateStudentAssessment = async (
	token: string,
	studentId: string,
	payload: {
		assessmentType: "oral" | "written" | "level";
		isDone: boolean;
		note?: string;
	},
) => {
	const validatedPayload =
		UpdateStudentAssessmentPayloadSchema.parse(payload);

	return requestWithSchema(
		`/students/${studentId}/assessments`,
		StudentResponseEnvelopeSchema,
		"PATCH",
		validatedPayload,
		token,
	);
};