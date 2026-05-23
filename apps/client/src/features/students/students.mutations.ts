import { useMutation, useQueryClient } from "@tanstack/react-query";
import { studentsQueryKeys } from "@/features/students/students.queries";
import {
	recordStudentFollowUp,
	updateStudentAssessment,
} from "@/features/students/students.service";
import { useSession } from "@/lib/session";

export const useRecordStudentFollowUpMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			studentId,
			note,
			nextFollowUpAt,
		}: {
			studentId: string;
			note: string;
			nextFollowUpAt?: Date;
		}) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return recordStudentFollowUp(token, studentId, {
				note,
				nextFollowUpAt,
			});
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

export const useUpdateStudentAssessmentMutation = () => {
	const { token } = useSession();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			studentId,
			assessmentType,
			isDone,
			note,
		}: {
			studentId: string;
			assessmentType: "oral" | "written" | "level";
			isDone: boolean;
			note?: string;
		}) => {
			if (!token) {
				throw new Error("Missing session token");
			}

			return updateStudentAssessment(token, studentId, {
				assessmentType,
				isDone,
				note,
			});
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
