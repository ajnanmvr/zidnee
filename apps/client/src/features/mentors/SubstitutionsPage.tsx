import { useMemo, useState } from "react";
import { format } from "date-fns";
import type { MentorSubstitution } from "@repo/schema";
import {
	useGetAllSubstitutions,
	useDeleteSubstitution,
} from "./mentor-substitution.queries";
import { useUsersQuery } from "../users/users.queries";
import { useSession } from "@/lib/session";

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
	today: {
		bg: "bg-blue-50",
		text: "text-blue-700",
		label: "Today",
	},
	active: {
		bg: "bg-green-50",
		text: "text-green-700",
		label: "Active",
	},
	upcoming: {
		bg: "bg-yellow-50",
		text: "text-yellow-700",
		label: "Upcoming",
	},
	"past-due": {
		bg: "bg-red-50",
		text: "text-red-700",
		label: "Past Due",
	},
};

function getSubstitutionStatus(substitution: MentorSubstitution): string {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);

	const startDate = new Date(substitution.startDate);
	startDate.setHours(0, 0, 0, 0);

	const endDate = new Date(substitution.endDate);
	endDate.setHours(23, 59, 59, 999);

	// Check if today
	if (startDate.getTime() === today.getTime()) {
		return "today";
	}

	// Check if active
	if (now >= startDate && now <= endDate) {
		return "active";
	}

	// Check if past due
	if (endDate < today) {
		return "past-due";
	}

	// Otherwise upcoming
	return "upcoming";
}

export const SubstitutionsPage = () => {
	const { token } = useSession();
	const [statusFilter, setStatusFilter] = useState<string | null>(null);
	const { data: substitutions = [] } = useGetAllSubstitutions(token);
	const { data: usersData } = useUsersQuery(token);
	const mentors = usersData?.users ?? [];
	const deleteSubstitution = useDeleteSubstitution();

	const mentorMap = useMemo(() => {
		return new Map(mentors.map((m: any) => [m.id, m.name]));
	}, [mentors]);

	// Add status to each substitution
	const substitutionsWithStatus = useMemo(() => {
		return substitutions.map((sub: MentorSubstitution) => ({
			...sub,
			status: getSubstitutionStatus(sub),
		}));
	}, [substitutions]);

	// Filter by status
	const filtered = useMemo(() => {
		if (!statusFilter) return substitutionsWithStatus;
		return substitutionsWithStatus.filter((sub: any) => sub.status === statusFilter);
	}, [substitutionsWithStatus, statusFilter]);

	// Group and sort by status and date
	const grouped = useMemo(() => {
		const groups: Record<string, any[]> = {
			today: [],
			active: [],
			upcoming: [],
			"past-due": [],
		};

		filtered.forEach((sub: any) => {
			if (groups[sub.status]) {
				groups[sub.status]!.push(sub);
			}
		});

		// Sort each group by end date
		Object.values(groups).forEach((group: any[]) => {
			group.sort(
				(a: any, b: any) =>
					new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
			);
		});

		return groups;
	}, [filtered]);

	const handleDelete = async (substitutionId: string) => {
		if (confirm("Are you sure you want to delete this substitution?")) {
			await deleteSubstitution.mutateAsync(substitutionId);
		}
	};

	const renderSubstitutionRow = (sub: any) => {
		const colors = STATUS_COLORS[sub.status];
		if (!colors) return null;

		return (
			<div
				key={sub.id}
				className={`${colors.bg} rounded-lg p-4 mb-3 border-l-4 ${colors.text.replace("text", "border")}`}
			>
				<div className="flex justify-between items-start">
					<div className="flex-1">
						<div className="flex items-center gap-3 mb-2">
							<span className={`inline-block px-2 py-1 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
								{colors.label}
							</span>
							<h3 className="font-semibold">
								{mentorMap.get(sub.originalMentorId)} → {mentorMap.get(sub.substituteMentorId)}
							</h3>
						</div>
						<div className="text-sm space-y-1">
							<p>
								<span className="font-medium">Dates:</span>{" "}
								{format(new Date(sub.startDate), "MMM d, yyyy")} to{" "}
								{format(new Date(sub.endDate), "MMM d, yyyy")}
							</p>
							{sub.reason && (
								<p>
									<span className="font-medium">Reason:</span> {sub.reason}
								</p>
							)}
							<p className="text-xs opacity-75">
								Created: {format(new Date(sub.createdAt), "MMM d, yyyy")}
							</p>
						</div>
					</div>
					<button
						onClick={() => handleDelete(sub.id)}
						disabled={deleteSubstitution.isPending}
						className="ml-4 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
					>
						Delete
					</button>
				</div>
			</div>
		);
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Mentor Substitutions</h1>
				<p className="text-gray-600 mt-2">
					Manage and track mentor substitutions
				</p>
			</div>

			{/* Filter buttons */}
			<div className="flex gap-2 flex-wrap">
				<button
					onClick={() => setStatusFilter(null)}
					className={`px-4 py-2 rounded-md transition-colors ${
						statusFilter === null
							? "bg-blue-600 text-white"
							: "bg-gray-200 text-gray-700 hover:bg-gray-300"
					}`}
				>
					All
				</button>
				{Object.entries(STATUS_COLORS).map(([key, colors]) => (
					<button
						key={key}
						onClick={() => setStatusFilter(key)}
						className={`px-4 py-2 rounded-md transition-colors ${
							statusFilter === key
								? `${colors.bg} ${colors.text} border-2 border-current`
								: `bg-gray-200 text-gray-700 hover:bg-gray-300`
						}`}
					>
						{colors.label} ({grouped[key]?.length ?? 0})
					</button>
				))}
			</div>

			{/* Substitutions list */}
			<div className="space-y-8">
				{["today", "active", "upcoming", "past-due"].map((status) => {
					const statusSubs = grouped[status] || [];
					if (statusSubs.length === 0) return null;

					const colors = STATUS_COLORS[status];
					if (!colors) return null;

					return (
						<div key={status}>
							<div className={`${colors.bg} rounded-t-lg px-4 py-2`}>
								<h2 className={`font-semibold ${colors.text}`}>
									{colors.label} ({statusSubs.length})
								</h2>
							</div>
							<div className="bg-white rounded-b-lg p-4 space-y-3">
								{statusSubs.map((sub: any) => renderSubstitutionRow(sub))}
							</div>
						</div>
					);
				})}

				{substitutionsWithStatus.length === 0 && (
					<div className="text-center py-8 text-gray-500">
						No substitutions found
					</div>
				)}
			</div>
		</div>
	);
};
