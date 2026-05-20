import { useQuery } from "@tanstack/react-query";
import {
	fetchStudentActivities,
	fetchStudentProcesses,
	fetchStudents,
	fetchStudentProcess,
} from "@/features/students/students.service";

export const studentsQueryKeys = {
	list: (
		token: string,
		options?: {
			status?: string;
			search?: string;
			sortBy?: string;
			sortOrder?: "asc" | "desc";
			page?: number;
			limit?: number;
		},
	) => ["students", token, options ?? {}] as const,
	activities: (token: string, studentId: string) =>
		["students", token, studentId, "activities"] as const,
	processes: (token: string) => ["students", token, "processes"] as const,
		process: (token: string, processId: string) => ["students", token, "processes", processId] as const,
};

export const useStudentsQuery = (
	token: string,
	optionsOrEnabled?:
		| {
				status?: string;
				search?: string;
				sortBy?: string;
				sortOrder?: "asc" | "desc";
				page?: number;
				limit?: number;
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

	return useQuery({
		queryKey: studentsQueryKeys.list(token, options),
		queryFn: () => fetchStudents(token, options),
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

export const useStudentProcessesQuery = (token: string, enabled = true) => {
	return useQuery({
		queryKey: studentsQueryKeys.processes(token),
		queryFn: () => fetchStudentProcesses(token),
		enabled: Boolean(token) && enabled,
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
