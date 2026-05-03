import { useMutation, useQueryClient } from "@tanstack/react-query";
import { coursesQueryKeys } from "@/features/courses/courses.queries";
import { createCourse } from "@/features/courses/courses.service";
import type { CreateCourseForm } from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

export const useCreateCourseMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: CreateCourseForm) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return createCourse(token, payload);
		},
		onSuccess: async () => {
			if (!token) {
				return;
			}

			await queryClient.invalidateQueries({
				queryKey: coursesQueryKeys.courses(token),
			});
		},
	});
};