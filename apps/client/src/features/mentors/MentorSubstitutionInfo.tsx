import { useMemo } from "react";
import { format } from "date-fns";
import {
	useGetMentorAsOriginal,
	useGetMentorAsSubstitute,
} from "./mentor-substitution.queries";
import { useMentorsQuery } from "../users/users.queries";
import { useSession } from "@/lib/session";

interface MentorSubstitutionInfoProps {
	mentorId: string;
}

export const MentorSubstitutionInfo = ({
	mentorId,
}: MentorSubstitutionInfoProps) => {
	const { token } = useSession();
	const { data: usersData } = useMentorsQuery(token);
	const mentors = usersData?.users ?? [];

	const { data: asOriginal = [] } = useGetMentorAsOriginal(token, mentorId);
	const { data: asSubstitute = [] } = useGetMentorAsSubstitute(token, mentorId);

	const mentorMap = useMemo(() => {
		return new Map(mentors.map((m: any) => [m.id, m.name]));
	}, [mentors]);

	// Find active substitutions
	const activeSubstitutions = useMemo(() => {
		const now = new Date();
		return [...asOriginal, ...asSubstitute].filter((sub: any) => {
			const startDate = new Date(sub.startDate);
			const endDate = new Date(sub.endDate);
			return now >= startDate && now <= endDate;
		});
	}, [asOriginal, asSubstitute]);

	// Find upcoming substitutions
	const upcomingSubstitutions = useMemo(() => {
		const now = new Date();
		return [...asOriginal, ...asSubstitute].filter((sub: any) => {
			const startDate = new Date(sub.startDate);
			return now < startDate;
		});
	}, [asOriginal, asSubstitute]);

	if (activeSubstitutions.length === 0 && upcomingSubstitutions.length === 0) {
		return null;
	}

	const totalSubstitutions = activeSubstitutions.length + upcomingSubstitutions.length;

	return (
		<div className="grid gap-4">
			<div className="flex flex-wrap items-center gap-2">
				<span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
					{activeSubstitutions.length} active
				</span>
				<span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
					{upcomingSubstitutions.length} upcoming
				</span>
				<span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
					{totalSubstitutions} total
				</span>
			</div>

			<div className="grid gap-3 md:grid-cols-2">
				{activeSubstitutions.map((sub: any) => (
					<div
						key={sub.id}
						className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm"
					>
						<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
							Active substitution
						</p>
						<p className="mt-2 text-sm font-semibold text-emerald-950">
							{sub.originalMentorId === mentorId
								? `Substituted by ${mentorMap.get(sub.substituteMentorId) ?? "Mentor"}`
								: `Substitutes for ${mentorMap.get(sub.originalMentorId) ?? "Mentor"}`}
						</p>
						<p className="mt-1 text-xs text-emerald-800">
							{format(new Date(sub.startDate), "MMM d, yyyy")} - {format(new Date(sub.endDate), "MMM d, yyyy")}
						</p>
					</div>
				))}

				{upcomingSubstitutions.map((sub: any) => (
					<div
						key={sub.id}
						className="rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm"
					>
						<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700">
							Upcoming substitution
						</p>
						<p className="mt-2 text-sm font-semibold text-amber-950">
							{sub.originalMentorId === mentorId
								? `Will be substituted by ${mentorMap.get(sub.substituteMentorId) ?? "Mentor"}`
								: `Will substitute for ${mentorMap.get(sub.originalMentorId) ?? "Mentor"}`}
						</p>
						<p className="mt-1 text-xs text-amber-800">
							Starts {format(new Date(sub.startDate), "MMM d, yyyy")}
						</p>
					</div>
				))}
			</div>
		</div>
	);
};
