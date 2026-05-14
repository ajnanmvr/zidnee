export type StudentStageId = "all" | "active" | "break" | "dropped";

export interface StudentStageDefinition {
	id: StudentStageId;
	label: string;
	description: string;
	statusFilter: string[] | null; // null = all statuses
}

export const studentStageDefinitions: StudentStageDefinition[] = [
	{
		id: "all",
		label: "All Students",
		description: "All enrolled students",
		statusFilter: null,
	},
	{
		id: "active",
		label: "Active Students",
		description: "Currently enrolled",
		statusFilter: ["STUDENT"],
	},
	{
		id: "break",
		label: "On Break",
		description: "Temporarily inactive",
		statusFilter: ["BREAK"],
	},
	{
		id: "dropped",
		label: "Dropped",
		description: "Course completed or discontinued",
		statusFilter: ["DROPPED"],
	},
];

/**
 * Convert stage ID to backend status filter
 */
export const getStudentStatusFilterByStage = (
	stageId: StudentStageId,
): string[] | null => {
	const stage = studentStageDefinitions.find((s) => s.id === stageId);
	return stage?.statusFilter ?? null;
};

/**
 * Get counts by stage
 */
export type StudentStageCounts = Record<StudentStageId, number>;

export const getStudentStageCounts = (
	students: Array<{ status: string }>,
): StudentStageCounts => {
	const counts: StudentStageCounts = {
		all: students.length,
		active: 0,
		break: 0,
		dropped: 0,
	};

	students.forEach((student) => {
		switch (student.status) {
			case "STUDENT":
				counts.active += 1;
				break;
			case "BREAK":
				counts.break += 1;
				break;
			case "DROPPED":
				counts.dropped += 1;
				break;
		}
	});

	return counts;
};

export const studentQueryKeys = {
	list: (token: string, stage?: StudentStageId) => [
		"students",
		"list",
		token,
		stage,
	],
	detail: (token: string, studentId: string) => [
		"students",
		"detail",
		token,
		studentId,
	],
	activities: (token: string, studentId: string) => [
		"students",
		"activities",
		token,
		studentId,
	],
} as const;
