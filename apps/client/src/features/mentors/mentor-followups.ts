import { useMemo } from "react";
import { useMentorActivitiesQuery } from "./mentor-activity.queries";

type RawActivity = {
  id: string;
  type: string;
  note?: string;
  createdAt: string;
  newValue?: Record<string, unknown>;
};

export type MentorFollowup = {
  id: string;
  type: "FOLLOW_UP_RECORDED" | "FOLLOW_UP_CUSTOM_SET" | "FOLLOW_UP_CUSTOM_CLEARED";
  note?: string;
  createdAt: Date;
  nextFollowUpAt?: Date | undefined;
};

export const extractMentorFollowups = (activities: RawActivity[] = []): MentorFollowup[] => {
  const followupTypes = new Set(["FOLLOW_UP_RECORDED", "FOLLOW_UP_CUSTOM_SET", "FOLLOW_UP_CUSTOM_CLEARED"]);

  return activities
    .filter((a) => followupTypes.has(a.type))
    .map((a) => {
      const next = (() => {
        const v = a.newValue?.["nextFollowUpAt"] ?? a.newValue?.["nextFollowUpAt"];
        if (!v) return undefined;
        try {
          return new Date(String(v));
        } catch {
          return undefined;
        }
      })();

      return {
        id: a.id,
        type: a.type as MentorFollowup["type"],
        note: a.note,
        createdAt: new Date(a.createdAt),
        nextFollowUpAt: next,
      } as MentorFollowup;
    })
    .sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime());
};

export const useMentorFollowups = (token: string, mentorId?: string) => {
  const activitiesQuery = useMentorActivitiesQuery(token, mentorId);

  const followups = useMemo(() => {
    if (!activitiesQuery.data?.activities) return undefined;
    return extractMentorFollowups(activitiesQuery.data.activities as RawActivity[]);
  }, [activitiesQuery.data]);

  return {
    ...activitiesQuery,
    followups,
  };
};

export default useMentorFollowups;
