import { useQuery } from "@tanstack/react-query";
import { fetchStudents } from "@/features/students/students.service";
import { studentQueryKeys } from "@/features/students/student-stage-filters";

export const studentsQueryKeys = {
	list: (token: string) => ["students", token] as const,
};

export const useStudentsQuery = (token: string, enabled = true) => {
	return useQuery({
		queryKey: studentQueryKeys.list(token),
		queryFn: () => fetchStudents(token),
		enabled: Boolean(token) && enabled,
	});
};
