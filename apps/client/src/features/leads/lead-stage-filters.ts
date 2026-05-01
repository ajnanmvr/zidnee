import type { LeadResponse } from "@repo/schema";
import { getLatestLeadDemo } from "@/features/dashboard/lead-demo-utils";

export type LeadStageId =
	| "all"
	| "followUp"
	| "formSent"
	| "formFilled"
	| "demoRequest"
	| "demoAssigned"
	| "demoCompleted"
	| "finalStage";

export type LeadStageDefinition = {
	id: LeadStageId;
	label: string;
	description: string;
};

const hasMovedToAdmission = (lead: LeadResponse) => {
	const latestDemo = getLatestLeadDemo(lead);
	return Boolean(latestDemo?.admissionRequestedAt || latestDemo?.admissionCompletedAt || latestDemo?.studentId);
};

const isAssignedToCurrentUser = (lead: LeadResponse, currentUserId?: string | null) => {
	if (!currentUserId) {
		return false;
	}

	return lead.assignedTo === currentUserId;
};

export const leadStageDefinitions: LeadStageDefinition[] = [
	{ id: "all", label: "All Leads", description: "Not moved to admission or dropped" },
	{ id: "followUp", label: "Follow Up", description: "Assigned to me, no demo or form actions yet" },
	{ id: "formSent", label: "Form Sent", description: "Assigned to me, sent but not completed" },
	{ id: "formFilled", label: "Form Filled", description: "Assigned to me, sent and completed" },
	{ id: "demoRequest", label: "Demo Request", description: "Requested but not completed" },
	{ id: "demoAssigned", label: "Demo Scheduled", description: "Scheduled, mentor assigned, not completed" },
	{ id: "demoCompleted", label: "Demo Completed", description: "Requested and completed" },
	{ id: "finalStage", label: "Final Stage Leads", description: "Ready-stage leads assigned to me" },
];

export const getLeadStagePredicate = (
	stage: LeadStageId,
	currentUserId?: string | null,
) => {
	return (lead: LeadResponse) => {
		const latestDemo = getLatestLeadDemo(lead);

		switch (stage) {
			case "all":
				return !hasMovedToAdmission(lead);
			case "followUp":
				return isAssignedToCurrentUser(lead, currentUserId) && !lead.formSent && !lead.formCompleted && !Boolean(latestDemo?.requestedAt) && !hasMovedToAdmission(lead);
			case "formSent":
				return isAssignedToCurrentUser(lead, currentUserId) && lead.formSent && !lead.formCompleted && !hasMovedToAdmission(lead);
			case "formFilled":
				return isAssignedToCurrentUser(lead, currentUserId) && lead.formSent && lead.formCompleted && !hasMovedToAdmission(lead);
			case "demoRequest":
				return isAssignedToCurrentUser(lead, currentUserId) && Boolean(latestDemo?.requestedAt) && !latestDemo?.completedAt && !hasMovedToAdmission(lead);
			case "demoAssigned":
				return isAssignedToCurrentUser(lead, currentUserId) && Boolean(latestDemo?.requestedAt) && Boolean(latestDemo?.mentorId) && Boolean(latestDemo?.assignedAt) && !latestDemo?.completedAt && !hasMovedToAdmission(lead);
			case "demoCompleted":
				return isAssignedToCurrentUser(lead, currentUserId) && Boolean(latestDemo?.requestedAt) && Boolean(latestDemo?.completedAt) && !hasMovedToAdmission(lead);
			case "finalStage":
				return isAssignedToCurrentUser(lead, currentUserId) && !hasMovedToAdmission(lead) && ((lead.formSent && lead.formCompleted) || Boolean(latestDemo?.completedAt));
			default:
				return false;
		}
	};
};

export const getLeadStageCounts = (leads: LeadResponse[], currentUserId?: string | null) => {
	return leadStageDefinitions.reduce<Record<LeadStageId, number>>((accumulator, stage) => {
		const predicate = getLeadStagePredicate(stage.id, currentUserId);
		accumulator[stage.id] = leads.filter(predicate).length;
		return accumulator;
	}, {
		all: 0,
		followUp: 0,
		formSent: 0,
		formFilled: 0,
		demoRequest: 0,
		demoAssigned: 0,
		demoCompleted: 0,
		finalStage: 0,
	});
};
