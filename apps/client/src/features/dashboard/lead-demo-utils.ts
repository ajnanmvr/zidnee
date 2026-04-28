import type { LeadResponse } from "@repo/schema";

export const getLatestLeadDemo = (lead: LeadResponse) => {
	return lead.demos.length > 0 ? lead.demos[lead.demos.length - 1] : null;
};
