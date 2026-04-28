import {
	AssignDemoPayloadSchema,
	CreateLeadPayloadSchema,
	RedemoLeadPayloadSchema,
	PostponeLeadFollowUpPayloadSchema,
	type Lead,
	ConfirmAdmissionPayloadSchema,
} from "@repo/schema";
import type { Request, Response } from "express";
import { NotFoundError, ValidationError } from "../../utils/errors.util.js";
import { requireStringValue } from "../rbac/rbac.http.js";
import { LeadService } from "./lead.service.js";
import { UserModel } from "../users/user.model.js";
import { RoleService } from "../rbac/rbac.service.js";
import { StudentService } from "../students/student.service.js";

const toLeadResponse = (lead: Lead) => {
	return {
		id: lead.id,
		name: lead.name,
		phone: lead.phone,
		level: lead.level,
		assignedTo: lead.assignedTo,
		createdBy: lead.createdBy,
		demoRequired: lead.demoRequired,
		formSent: lead.formSent,
		formCompleted: lead.formCompleted,
		followUpCount: lead.followUpCount,
		lastContactedAt: lead.lastContactedAt?.toISOString() ?? null,
		nextFollowUpAt: lead.nextFollowUpAt.toISOString(),
		customNextFollowUpAt: lead.customNextFollowUpAt?.toISOString() ?? null,
		demoRequestedAt: lead.demoRequestedAt?.toISOString() ?? null,
		demoMentorId: lead.demoMentorId,
		demoAssignedAt: lead.demoAssignedAt?.toISOString() ?? null,
		demoScheduledFor: lead.demoScheduledFor?.toISOString() ?? null,
		demoCompletedAt: lead.demoCompletedAt?.toISOString() ?? null,
		admissionRequestedAt: lead.admissionRequestedAt?.toISOString() ?? null,
		admissionCounsellorId: lead.admissionCounsellorId,
		admissionCompletedAt: lead.admissionCompletedAt?.toISOString() ?? null,
		studentId: lead.studentId,
	};
};

export const createLeadController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	if (!req.user) {
		throw new Error("User not authenticated");
	}

	const result = CreateLeadPayloadSchema.safeParse(req.body);
	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	// Get user name for activity logging
	const user = await UserModel.findById(req.user.userId).lean();
	const userName = user?.name || "Unknown";

	const createdLead = await LeadService.create({
		phone: result.data.phone,
		name: result.data.name,
		customNextFollowUpAt: result.data.customNextFollowUpAt,
		createdBy: req.user.userId,
		createdByName: userName,
	});

	res.status(201).json({
		ok: true,
		lead: toLeadResponse(createdLead),
	});
};

export const listLeadsController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	if (!req.user) {
		throw new Error("User not authenticated");
	}

	const scope = req.query.scope === "mine" ? "mine" : "all";
	const timeFilter = req.query.timeFilter === "today" ? "today" : "all";

	const leads = await LeadService.listLeads({
		createdBy: req.user.userId,
		scope,
		timeFilter,
	});

	res.json({
		ok: true,
		leads: leads.map(toLeadResponse),
	});
};

export const listPendingDemoRequestsController = async (
	_req: Request,
	res: Response,
): Promise<void> => {
	const leads = await LeadService.listPendingDemoRequests();

	res.json({
		ok: true,
		leads: leads.map(toLeadResponse),
	});
};

export const listDemoRequestsController = async (
	_req: Request,
	res: Response,
): Promise<void> => {
	const leads = await LeadService.listDemoRequests();

	res.json({
		ok: true,
		leads: leads.map(toLeadResponse),
	});
};

export const listAdmissionLeadsController = async (
	_req: Request,
	res: Response,
): Promise<void> => {
	const leads = await LeadService.listAdmissionLeads();

	res.json({
		ok: true,
		leads: leads.map(toLeadResponse),
	});
};

export const getLeadByIdController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const leadId = requireStringValue(req.params.leadId, "leadId");

	const lead = await LeadService.findById(leadId);

	if (!lead) {
		throw new NotFoundError("Lead");
	}

	res.json({
		ok: true,
		lead: toLeadResponse(lead),
	});
};

export const postponeLeadFollowUpController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	if (!req.user) {
		throw new Error("User not authenticated");
	}

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

	// User ID is passed for activity logging (name will be populated from User doc)
	const updatedLead = await LeadService.postponeFollowUp(
		leadId,
		result.data.customNextFollowUpAt,
		req.user.userId,
		result.data.note,
	);

	if (!updatedLead) {
		throw new NotFoundError("Lead");
	}

	res.json({
		ok: true,
		lead: toLeadResponse(updatedLead),
	});
};

export const requestLeadDemoController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	if (!req.user) {
		throw new Error("User not authenticated");
	}

	const leadId = requireStringValue(req.params.leadId, "leadId");
	const updatedLead = await LeadService.requestDemo(leadId, req.user.userId);

	if (!updatedLead) {
		throw new NotFoundError("Lead");
	}

	res.json({
		ok: true,
		lead: toLeadResponse(updatedLead),
	});
};

export const markDemoCompletedController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	if (!req.user) {
		throw new Error("User not authenticated");
	}

	const leadId = requireStringValue(req.params.leadId, "leadId");
	const result = RedemoLeadPayloadSchema.pick({ note: true }).safeParse(req.body);
	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	const updatedLead = await LeadService.markDemoCompleted(leadId, req.user.userId, result.data.note);

	if (!updatedLead) {
		throw new NotFoundError("Lead");
	}

	res.json({
		ok: true,
		lead: toLeadResponse(updatedLead),
	});
};

export const redemoLeadController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	if (!req.user) {
		throw new Error("User not authenticated");
	}

	const leadId = requireStringValue(req.params.leadId, "leadId");
	const result = RedemoLeadPayloadSchema.safeParse(req.body);
	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	const lead = await LeadService.findById(leadId);
	if (!lead) {
		throw new NotFoundError("Lead");
	}

	if (lead.demoMentorId === result.data.mentorId) {
		throw new ValidationError({
			mentorId: ["Select a different mentor for redemo"],
		});
	}

	const updatedLead = await LeadService.redemo(
		leadId,
		result.data.mentorId,
		req.user.userId,
		result.data.note,
	);

	if (!updatedLead) {
		throw new NotFoundError("Lead");
	}

	res.json({
		ok: true,
		lead: toLeadResponse(updatedLead),
	});
};

export const confirmAdmissionController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	if (!req.user) {
		throw new Error("User not authenticated");
	}

	const leadId = requireStringValue(req.params.leadId, "leadId");
	const result = ConfirmAdmissionPayloadSchema.safeParse(req.body);
	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	const lead = await LeadService.findById(leadId);
	if (!lead) {
		throw new NotFoundError("Lead");
	}

	let counsellorId = result.data.counsellorId;
	if (!counsellorId && lead.demoMentorId) {
		const mentor = await UserModel.findById(lead.demoMentorId).lean();
		counsellorId = mentor?.counsellorId;
	}

	if (!counsellorId) {
		throw new ValidationError({
			counsellorId: ["Select a counsellor for admission"],
		});
	}

	const student = await StudentService.confirmAdmission(
		leadId,
		counsellorId,
		req.user.userId,
		result.data.note,
	);

	if (!student) {
		throw new NotFoundError("Student");
	}

	res.status(201).json({
		ok: true,
		student: {
			...student,
			admittedAt: student.admittedAt.toISOString(),
			createdAt: student.createdAt?.toISOString() ?? null,
			updatedAt: student.updatedAt?.toISOString() ?? null,
		},
	});
};

export const requestAdmissionController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	if (!req.user) {
		throw new Error("User not authenticated");
	}

	const leadId = requireStringValue(req.params.leadId, "leadId");
	const result = ConfirmAdmissionPayloadSchema.safeParse(req.body);
	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	const lead = await LeadService.findById(leadId);
	if (!lead) {
		throw new NotFoundError("Lead");
	}

	let counsellorId = result.data.counsellorId;
	if (!counsellorId && lead.demoMentorId) {
		const mentor = await UserModel.findById(lead.demoMentorId).lean();
		counsellorId = mentor?.counsellorId;
	}

	if (!counsellorId) {
		throw new ValidationError({
			counsellorId: ["Select a counsellor for admission"],
		});
	}

	const updatedLead = await LeadService.requestAdmission(
		leadId,
		counsellorId,
		req.user.userId,
		result.data.note,
	);

	if (!updatedLead) {
		throw new NotFoundError("Lead");
	}

	res.json({
		ok: true,
		lead: toLeadResponse(updatedLead),
	});
};

export const assignDemoMentorController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	if (!req.user) {
		throw new Error("User not authenticated");
	}

	const leadId = requireStringValue(req.params.leadId, "leadId");
	const result = AssignDemoPayloadSchema.safeParse(req.body);
	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	if (result.data.demoScheduledFor <= new Date()) {
		throw new ValidationError({
			demoScheduledFor: ["Demo time must be in the future"],
		});
	}

	const updatedLead = await LeadService.assignDemoMentor(
		leadId,
		result.data.mentorId,
		result.data.demoScheduledFor,
		req.user.userId,
	);

	if (!updatedLead) {
		throw new NotFoundError("Lead");
	}

	res.json({
		ok: true,
		lead: toLeadResponse(updatedLead),
	});
};

export const deleteLeadController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	if (!req.user) {
		throw new Error("User not authenticated");
	}

	const leadId = requireStringValue(req.params.leadId, "leadId");

	// Get user name for activity logging
	const user = await UserModel.findById(req.user.userId).lean();
	const userName = user?.name || "Unknown";

	const deleted = await LeadService.delete(leadId, req.user.userId, userName);

	if (!deleted) {
		throw new NotFoundError("Lead");
	}

	res.json({
		ok: true,
		message: "Lead deleted successfully",
	});
};
