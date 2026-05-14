import { useQuery } from "@tanstack/react-query";
import {
	fetchStudentActivities,
	fetchStudents,
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
	activities: (token: string, studentId: string) => ["students", token, studentId, "activities"] as const,
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
		typeof optionsOrEnabled === "boolean" ? optionsOrEnabled && enabled : enabled;

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
