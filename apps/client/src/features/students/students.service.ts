import {
	StudentActivitiesResponseSchema,
	StudentFollowUpPayloadSchema,
	MessageResponseSchema,
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
		courseType?: string;
		search?: string;
		sortBy?: string;
		sortOrder?: "asc" | "desc";
		page?: number;
		limit?: number;
		scope?: "mine" | "all";
		/** Powers the "Converted Leads" mine/all scope: "me" restricts to leads converted by the current user, "all" lists every converted lead (gated by lead-read permissions, bypassing STUDENT_READ_ALL). */
		admittedBy?: "me" | "all";
	},
) => {
	const query = new URLSearchParams();

	if (options?.status) query.set("status", options.status);
	if (options?.courseType) query.set("courseType", options.courseType);
	if (options?.search) query.set("search", options.search);
	if (options?.sortBy) query.set("sortBy", options.sortBy);
	if (options?.sortOrder) query.set("sortOrder", options.sortOrder);
	if (options?.page) query.set("page", String(options.page));
	if (options?.limit) query.set("limit", String(options.limit));
	if (options?.scope) query.set("scope", options.scope);
	if (options?.admittedBy) query.set("admittedBy", options.admittedBy);

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

export const fetchStudentProcesses = async (
	token: string,
	options?: { archived?: boolean; scope?: "mine" | "all" },
) => {
	const query = new URLSearchParams();

	if (options?.archived) {
		query.set("archived", "true");
	}
	if (options?.scope) {
		query.set("scope", options.scope);
	}

	return requestWithSchema(
		`/students/processes${query.toString() ? `?${query.toString()}` : ""}`,
		StudentProcessesResponseSchema,
		"GET",
		undefined,
		token,
	);
};

export const fetchStudentProcessHistory = async (
	token: string,
	options?: { scope?: "mine" | "all" },
) => {
	const query = new URLSearchParams();
	if (options?.scope) {
		query.set("scope", options.scope);
	}
	return requestWithSchema(
		`/students/process-history${query.toString() ? `?${query.toString()}` : ""}`,
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
	return requestWithSchema(
		`/students/processes/${processId}/complete`,
		MessageResponseSchema,
		"POST",
		undefined,
		token,
	);
};

export const deleteStudentProcess = async (token: string, processId: string) => {
	return requestWithSchema(
		`/students/processes/${processId}`,
		MessageResponseSchema,
		"DELETE",
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