import { useMutation, useQueryClient } from "@tanstack/react-query";
import { studentsQueryKeys } from "@/features/students/students.queries";
import { recordStudentFollowUp } from "@/features/students/students.service";
import { useSession } from "@/lib/session";

export const useRecordStudentFollowUpMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ studentId, note }: { studentId: string; note: string }) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return recordStudentFollowUp(token, studentId, { note });
		},
		onSuccess: async (_data, variables) => {
			if (!token) {
				return;
			}

			await queryClient.invalidateQueries({
				queryKey: studentsQueryKeys.list(token),
			});
			await queryClient.invalidateQueries({
				queryKey: studentsQueryKeys.activities(token, variables.studentId),
			});
		},
	});
};