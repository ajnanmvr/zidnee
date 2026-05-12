import { useQuery } from "@tanstack/react-query";
import { fetchStudents } from "@/features/students/students.service";

export const studentsQueryKeys = {
	list: (token: string) => ["students", token] as const,
};

export const useStudentsQuery = (token: string, enabled = true) => {
	return useQuery({
		queryKey: studentsQueryKeys.list(token),
		queryFn: () => fetchStudents(token),
		enabled: Boolean(token) && enabled,
	});
};
