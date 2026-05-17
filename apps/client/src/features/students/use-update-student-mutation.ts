import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateStudent } from "./students.service";
import { useSession } from "@/lib/session";

export const useUpdateStudentMutation = () => {
 	const { token } = useSession();
 	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ studentId, payload }: { studentId: string; payload: unknown }) => {
			if (!token) throw new Error("Missing session token");
			return updateStudent(token, studentId, payload);
		},
 		onSuccess: async () => {
 			if (!token) return;
 			await queryClient.invalidateQueries({ queryKey: ["students", token] });
 		},
 	});
};

export default useUpdateStudentMutation;
