import { useQuery } from "@tanstack/react-query";
import { MentorActivitiesResponseSchema } from "@repo/schema";
import { requestWithSchema } from "@/api/request";

export const mentorActivityQueryKeys = {
	all: ["mentor-activities"] as const,
	mentorActivities: (mentorId: string) =>
		[...mentorActivityQueryKeys.all, mentorId] as const,
};

export const useMentorActivitiesQuery = (token: string, mentorId?: string) => {
	return useQuery({
		queryKey: mentorActivityQueryKeys.mentorActivities(mentorId ?? ""),
		queryFn: async () => {
			return requestWithSchema(
				`/mentors/${mentorId}/activities`,
				MentorActivitiesResponseSchema,
				"GET",
				undefined,
				token,
			);
		},
		enabled: !!token && !!mentorId,
	});
};