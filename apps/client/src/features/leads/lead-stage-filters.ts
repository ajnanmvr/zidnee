import type { LeadResponse } from "@repo/schema";

export type LeadStageId =
	| "all"
	| "followUp"
	| "formSent"
	| "formFilled"
	| "demoRequest"
	| "demoAssigned"
	| "demoCompleted";

export type LeadStageDefinition = {
	id: LeadStageId;
	label: string;
	description: string;
};

export const leadStageDefinitions: LeadStageDefinition[] = [
	{ id: "all", label: "All Leads", description: "Not converted or closed" },
	{ id: "followUp", label: "Follow Up", description: "No form sent" },
	{
		id: "formSent",
		label: "Form Sent",
		description: "Form sent but not completed",
	},
	{ id: "formFilled", label: "Form Filled", description: "Form completed" },
	{ id: "demoRequest", label: "Demo Request", description: "Demo requested" },
	{
		id: "demoAssigned",
		label: "Demo Scheduled",
		description: "Demo scheduled with mentor",
	},
	{
		id: "demoCompleted",
		label: "Demo Completed",
		description: "Demo completed",
	},
];

export const getLeadStagePredicate = (
	stage: LeadStageId,
	_currentUserId?: string | null,
) => {
	return (lead: LeadResponse) => {
		const status = lead.status;

		switch (stage) {
			case "all":
				return status !== "CONVERTED" && status !== "CLOSED";
			case "followUp":
				return status === "FOLLOW_UP";
			case "formSent":
				return status === "FORM_SENT";
			case "formFilled":
				return status === "FORM_FILLED";
			case "demoRequest":
				return status === "DEMO_REQUEST";
			case "demoAssigned":
				return status === "DEMO_ASSIGNED";
			case "demoCompleted":
				return status === "DEMO_COMPLETED";
			default:
				return false;
		}
	};
};

export const getLeadStageCounts = (
	leads: LeadResponse[],
	_currentUserId?: string | null,
) => {
	return leadStageDefinitions.reduce<Record<LeadStageId, number>>(
		(accumulator, stage) => {
			const predicate = getLeadStagePredicate(stage.id, _currentUserId);
			accumulator[stage.id] = leads.filter(predicate).length;
			return accumulator;
		},
		{
			all: 0,
			followUp: 0,
			formSent: 0,
			formFilled: 0,
			demoRequest: 0,
			demoAssigned: 0,
			demoCompleted: 0,
		},
	);
};
