import type { StudentResponse, StudentsResponse, UpdateStudentPayload } from "@repo/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { studentsQueryKeys } from "./students.queries";
import { updateStudent } from "./students.service";
import { useSession } from "@/lib/session";

export const useUpdateStudentMutation = () => {
 	const { token } = useSession();
 	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			studentId,
			payload,
		}: {
			studentId: string;
			payload: UpdateStudentPayload;
		}) => {
			if (!token) throw new Error("Missing session token");
			return updateStudent(token, studentId, payload);
		},
		onSuccess: async (data, variables) => {
			if (!token) return;

			const updatedStudent = data.student as StudentResponse;
			const cachedLists = queryClient.getQueriesData<StudentsResponse>({
				queryKey: studentsQueryKeys.list(token),
			});

			for (const [queryKey, cachedData] of cachedLists) {
				if (!cachedData) continue;

				queryClient.setQueryData<StudentsResponse>(queryKey, {
					...cachedData,
					students: cachedData.students.map((student) =>
						student.id === variables.studentId ? updatedStudent : student,
					),
				});
			}

			await queryClient.invalidateQueries({ queryKey: ["students", token] });
		},
	});
};

export default useUpdateStudentMutation;
