import {
	CreateLeadPayloadSchema,
	PostponeLeadFollowUpPayloadSchema,
	type Lead,
} from "@repo/schema";
import type { Request, Response } from "express";
import { NotFoundError, ValidationError } from "../../utils/errors.util.js";
import { requireStringValue } from "../rbac/rbac.http.js";
import { LeadService } from "./lead.service.js";

const toLeadResponse = (lead: Lead) => {
	return {
		id: lead.id,
		name: lead.name,
		phone: lead.phone,
		level: lead.level,
		status: lead.status,
		assignedTo: lead.assignedTo,
		demoRequired: lead.demoRequired,
		formSent: lead.formSent,
		formCompleted: lead.formCompleted,
		followUpCount: lead.followUpCount,
		lastContactedAt: lead.lastContactedAt?.toISOString() ?? null,
		nextFollowUpAt: lead.nextFollowUpAt.toISOString(),
		customNextFollowUpAt: lead.customNextFollowUpAt?.toISOString() ?? null,
	};
};

export const createLeadController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const result = CreateLeadPayloadSchema.safeParse(req.body);
	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	const createdLead = await LeadService.create({
		phone: result.data.phone,
		name: result.data.name,
		customNextFollowUpAt: result.data.customNextFollowUpAt,
	});

	res.status(201).json({
		ok: true,
		lead: toLeadResponse(createdLead),
	});
};

export const listDueLeadFollowUpsController = async (
	_req: Request,
	res: Response,
): Promise<void> => {
	const leads = await LeadService.listDueFollowUps(new Date());

	res.json({
		ok: true,
		leads: leads.map(toLeadResponse),
	});
};

export const postponeLeadFollowUpController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const leadId = requireStringValue(req.params.leadId, "leadId");
	const result = PostponeLeadFollowUpPayloadSchema.safeParse(req.body);
	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	const now = new Date();
	if (result.data.customNextFollowUpAt <= now) {
		throw new ValidationError({
			customNextFollowUpAt: ["Postpone date must be in the future"],
		});
	}

	const updatedLead = await LeadService.postponeFollowUp(
		leadId,
		result.data.customNextFollowUpAt,
	);

	if (!updatedLead) {
		throw new NotFoundError("Lead");
	}

	res.json({
		ok: true,
		lead: toLeadResponse(updatedLead),
	});
};
