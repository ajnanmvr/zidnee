import { CoursesResponseSchema } from "@repo/schema";
import { useQuery } from "@tanstack/react-query";
import { requestWithSchema } from "@/api/request";

export const coursesQueryKeys = {
	courses: (token: string) => ["courses", token] as const,
};

export const useCoursesQuery = (token: string) => {
	return useQuery({
		queryKey: coursesQueryKeys.courses(token),
		queryFn: () =>
			requestWithSchema(
				"/courses",
				CoursesResponseSchema,
				"GET",
				undefined,
				token,
			),
		enabled: Boolean(token),
	});
};
