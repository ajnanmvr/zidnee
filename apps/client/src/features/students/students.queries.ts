import { useQuery } from "@tanstack/react-query";
import {
	fetchStudentActivities,
	fetchStudentProcessHistory,
	fetchStudentProcesses,
	fetchStudents,
	fetchStudentProcess,
	deleteStudentProcess,
} from "@/features/students/students.service";
import { useHasPermission, usePermissionMap } from "@/lib/hooks/use-has-permission";

export const studentsQueryKeys = {
	list: (
		token: string,
		options?: {
			status?: string;
			courseType?: string;
			search?: string;
			sortBy?: string;
			sortOrder?: "asc" | "desc";
			page?: number;
			limit?: number;
		},
	) => ["students", token, options ?? {}] as const,
	activities: (token: string, studentId: string) =>
		["students", token, studentId, "activities"] as const,
	processes: (token: string, archived = false) =>
		["students", token, "processes", archived ? "history" : "active"] as const,
		process: (token: string, processId: string) => ["students", token, "processes", processId] as const,
};

export const useStudentsQuery = (
	token: string,
	optionsOrEnabled?:
		| {
				status?: string;
				courseType?: string;
				search?: string;
				sortBy?: string;
				sortOrder?: "asc" | "desc";
				page?: number;
				limit?: number;
				scope?: "mine" | "all";
				/** Powers the "Converted Leads" mine/all scope; bypasses the mentor/batch-counsellor based `scope` filter. */
				admittedBy?: "me" | "all";
		  }
		| boolean,
	enabled = true,
) => {
	const options =
		typeof optionsOrEnabled === "boolean" ? undefined : optionsOrEnabled;
	const queryEnabled =
		typeof optionsOrEnabled === "boolean"
			? optionsOrEnabled && enabled
			: enabled;
	const permMap = usePermissionMap();
	const canReadAll = Boolean(permMap["STUDENT_READ_ALL"] || permMap["STUDENT_POSTER_DOWNLOAD"]);
	const scope = options?.admittedBy
		? "all"
		: options?.scope === "all" && !canReadAll
			? "mine"
			: options?.scope;

	return useQuery({
		queryKey: studentsQueryKeys.list(token, options),
		queryFn: () => fetchStudents(token, { ...options, scope }),
		enabled: Boolean(token) && queryEnabled,
	});
};

export const useStudentActivitiesQuery = (
	token: string,
	studentId?: string,
	enabled = true,
) => {
	return useQuery({
		queryKey: studentsQueryKeys.activities(token, studentId ?? ""),
		queryFn: () => fetchStudentActivities(token, studentId ?? ""),
		enabled: Boolean(token) && Boolean(studentId) && enabled,
	});
};

export const useStudentProcessesQuery = (
	token: string,
	optionsOrEnabled?: { scope?: "mine" | "all" } | boolean,
	enabled = true,
) => {
	const options = typeof optionsOrEnabled === "boolean" ? undefined : optionsOrEnabled;
	const queryEnabled =
		typeof optionsOrEnabled === "boolean" ? optionsOrEnabled && enabled : enabled;
	const canReadAll = useHasPermission("STUDENT_PROCESS_READ_ALL");
	const scope = options?.scope === "all" && !canReadAll ? "mine" : options?.scope;
	return useQuery({
		queryKey: [...studentsQueryKeys.processes(token, false), scope ?? "all"],
		queryFn: () => fetchStudentProcesses(token, { scope: scope ?? "all" }),
		enabled: Boolean(token) && queryEnabled,
	});
};

export const useStudentProcessHistoryQuery = (
	token: string,
	optionsOrEnabled?: { scope?: "mine" | "all" } | boolean,
	enabled = true,
) => {
	const options = typeof optionsOrEnabled === "boolean" ? undefined : optionsOrEnabled;
	const queryEnabled =
		typeof optionsOrEnabled === "boolean" ? optionsOrEnabled && enabled : enabled;
	const canReadAll = useHasPermission("STUDENT_PROCESS_HISTORY_READ_ALL");
	const scope = options?.scope === "all" && !canReadAll ? "mine" : options?.scope;
	return useQuery({
		queryKey: [...studentsQueryKeys.processes(token, true), scope ?? "all"],
		queryFn: () => fetchStudentProcessHistory(token, { scope: scope ?? "all" }),
		enabled: Boolean(token) && queryEnabled,
	});
};

export const useStudentProcessQuery = (
	token: string,
	processId?: string,
	enabled = true,
) => {
	return useQuery({
		queryKey: studentsQueryKeys.process(token, processId ?? ""),
		queryFn: () => fetchStudentProcess(token, processId ?? ""),
		enabled: Boolean(token) && Boolean(processId) && enabled,
	});
};

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completeStudentProcess, markProcessTaskCompleted } from "@/features/students/students.service";
import { useSession } from "@/lib/session";

export const useMarkTaskCompletedMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ processId, taskKey }: { processId: string; taskKey: string }) => {
			if (!token) throw new Error("Missing session token");
			return markProcessTaskCompleted(token, processId, taskKey);
		},
		onSuccess: async (data, variables) => {
			if (!token) return;
			queryClient.setQueryData(
				studentsQueryKeys.process(token, variables.processId),
				data,
			);
			await queryClient.invalidateQueries({ queryKey: studentsQueryKeys.process(token, variables.processId) });
			await queryClient.invalidateQueries({ queryKey: studentsQueryKeys.processes(token) });
		},
	});
};

import { setProcessTaskCompleted } from "@/features/students/students.service";

export const useSetTaskCompletedMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ processId, taskKey, completed }: { processId: string; taskKey: string; completed: boolean }) => {
			if (!token) throw new Error("Missing session token");
			return setProcessTaskCompleted(token, processId, taskKey, completed);
		},
		onSuccess: async (data, variables) => {
			if (!token) return;
			queryClient.setQueryData(
				studentsQueryKeys.process(token, variables.processId),
				data,
			);
			await queryClient.invalidateQueries({ queryKey: studentsQueryKeys.process(token, variables.processId) });
			await queryClient.invalidateQueries({ queryKey: studentsQueryKeys.processes(token) });
		},
	});
};

export const useCompleteProcessMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ processId }: { processId: string }) => {
			if (!token) throw new Error("Missing session token");
			return completeStudentProcess(token, processId);
		},
		onSuccess: async (_data, variables) => {
			if (!token) return;
			queryClient.removeQueries({ queryKey: studentsQueryKeys.process(token, variables.processId) });
			await queryClient.invalidateQueries({ queryKey: studentsQueryKeys.processes(token) });
			await queryClient.invalidateQueries({ queryKey: studentsQueryKeys.processes(token, true) });
			await queryClient.invalidateQueries({ queryKey: studentsQueryKeys.list(token) });
		},
	});
};

export const useDeleteProcessMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ processId }: { processId: string }) => {
			if (!token) throw new Error("Missing session token");
			return deleteStudentProcess(token, processId);
		},
		onSuccess: async (_data, variables) => {
			if (!token) return;
			queryClient.removeQueries({ queryKey: studentsQueryKeys.process(token, variables.processId) });
			await queryClient.invalidateQueries({ queryKey: studentsQueryKeys.processes(token) });
			await queryClient.invalidateQueries({ queryKey: studentsQueryKeys.list(token) });
		},
	});
};
