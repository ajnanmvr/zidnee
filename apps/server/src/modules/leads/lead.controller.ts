import {
	AssignDemoCounsellorPayloadSchema,
	AssignDemoPayloadSchema,
	ConfirmAdmissionPayloadSchema,
	CreateLeadPayloadSchema,
	DeleteLeadPayloadSchema,
	type Lead,
	type LeadStatus,
	PostponeLeadFollowUpPayloadSchema,
	RedemoLeadPayloadSchema,
	SubmitLeadFormPayloadSchema,
	UpdateLeadPayloadSchema,
} from "@repo/schema";
import type { Request, Response } from "express";
import {
	AuthenticationError,
	AuthorizationError,
	NotFoundError,
	ValidationError,
} from "../../utils/errors.util.js";
import { requireStringValue } from "../rbac/rbac.http.js";
import { getEffectivePermissions } from "../rbac/rbac.service.js";
import { StudentService } from "../students/student.service.js";
import { UserModel } from "../users/user.model.js";
import { LeadService } from "./lead.service.js";

const getLatestDemo = (lead: Lead) => {
	return lead.demos && lead.demos.length > 0
		? lead.demos[lead.demos.length - 1]
		: null;
};

const computeLeadStatus = (lead: Lead): LeadStatus => {
	const latestDemo = getLatestDemo(lead);
	const hasPreviousDemo = (lead.demos?.length ?? 0) > 1;

	// Check if moved to admission/converted (top-level)
	if ((lead as any).studentId) {
		return "CONVERTED";
	}

	// Demo completed
	if (
		latestDemo?.completedAt &&
		latestDemo?.requestedAt &&
		!(lead as any).studentId
	) {
		return "DEMO_COMPLETED";
	}

	// Demo assigned (has mentor and assignedAt, but not completed)
	if (
		latestDemo?.mentorId &&
		latestDemo?.assignedAt &&
		latestDemo?.requestedAt &&
		!latestDemo?.completedAt
	) {
		return "DEMO_ASSIGNED";
	}

	// Demo requested (has requestedAt but not assigned yet)
	if (
		latestDemo?.requestedAt &&
		!latestDemo?.assignedAt &&
		!latestDemo?.completedAt
	) {
		return "DEMO_REQUEST";
	}

	// Demo cancelled (form completed, latest demo has no requestedAt, but there was a previous demo)
	if (lead.formCompleted && !latestDemo?.requestedAt && hasPreviousDemo) {
		return "DEMO_CANCELLED";
	}

	// Form filled (form completed but no demo requested)
	if (lead.formCompleted && !latestDemo?.requestedAt) {
		return "FORM_FILLED";
	}

	// Form sent (form sent but not completed)
	if (lead.formSent && !lead.formCompleted) {
		return "FORM_SENT";
	}

	// Follow up (no form sent)
	return "FOLLOW_UP";
};

const toLeadResponse = (lead: Lead): Record<string, unknown> => {
	const demos =
		lead.demos?.map((demo) => ({
			mentorId: demo.mentorId ?? null,
			requestedAt: demo.requestedAt?.toISOString() ?? null,
			assignedAt: demo.assignedAt?.toISOString() ?? null,
			demoScheduledFor: demo.demoScheduledFor?.toISOString() ?? null,
			completedAt: demo.completedAt?.toISOString() ?? null,
			note: demo.note ?? null,
		})) ?? [];

	return {
		id: lead.id,
		slNo: lead.slNo,
		name: lead.name,
		isOrganic: (lead as any).isOrganic ?? false,
		email: (lead as any).email ?? null,
		phone: lead.phone,
		level: lead.level,
		assignedTo: lead.assignedTo,
		demoRequestAssignedTo: lead.demoRequestAssignedTo,
		createdBy: lead.createdBy,
		formSent: lead.formSent,
		formCompleted: lead.formCompleted,
		nextFollowUpAt:
			lead.nextFollowUpAt?.toISOString() ?? new Date().toISOString(),
		dateOfBirth: lead.dateOfBirth?.toISOString(),
		residingCountry: lead.residingCountry,
		gender: lead.gender,
		primaryWhatsappNumber: lead.primaryWhatsappNumber,
		alternateWhatsappNumber: lead.alternateWhatsappNumber,
		studentInfo: lead.studentInfo,
		preferredLanguage: lead.preferredLanguage,
		preferredSchedule: lead.preferredSchedule,
		preferredDays: lead.preferredDays ?? [],
		preferredPlan: lead.preferredPlan,
		preferredTimeslots: lead.preferredTimeslots ?? [],
		price: lead.price,
		admissionFee: (lead as any).admissionFee,
		hearAboutUs: lead.hearAboutUs,
		demoAvailability: lead.demoAvailability,
		preferredMentorGender: lead.preferredMentorGender,
		courseType: (lead as any).courseType ?? null,
		status: lead.status ?? computeLeadStatus(lead),
		demos,
		admissionRequestedAt:
			(lead as any).admissionRequestedAt?.toISOString() ?? null,
		studentId: (lead as any).studentId ?? null,
		closeReason: (lead as any).closeReason ?? null,
		deletedBy: (lead as any).deletedBy ?? null,
		deletedAt: (lead as any).deletedAt?.toISOString?.() ?? null,
		createdAt: lead.createdAt?.toISOString() ?? null,
		updatedAt: lead.updatedAt?.toISOString() ?? null,
	};
};

export const createLeadController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	if (!req.user) {
		throw new AuthenticationError("User not authenticated");
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
		assignedTo: result.data.assignedTo,
		isOrganic: result.data.isOrganic,
		customNextFollowUpAt: result.data.customNextFollowUpAt,
		createdBy: req.user.userId,
		createdByName: userName,
	});

	res.status(201).json({
		ok: true,
		lead: toLeadResponse(createdLead),
	});
};

export const updateLeadController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	if (!req.user) {
		throw new AuthenticationError("User not authenticated");
	}

	const leadId = requireStringValue(req.params.leadId, "leadId");
	const result = UpdateLeadPayloadSchema.safeParse(req.body);
	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	const updatedLead = await LeadService.update(
		leadId,
		result.data,
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

export const listLeadsController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	if (!req.user) {
		throw new AuthenticationError("User not authenticated");
	}

	const scope = req.query.scope === "mine" ? "mine" : "all";
	const timeFilter = req.query.timeFilter === "today" ? "today" : "all";
	const status =
		typeof req.query.status === "string" ? req.query.status : undefined;
	const limit =
		typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 25;
	const offset =
		typeof req.query.offset === "string" ? parseInt(req.query.offset, 10) : 0;
	const sortBy =
		typeof req.query.sortBy === "string" ? req.query.sortBy : "nextFollowUpAt";
	const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";
	const search =
		typeof req.query.search === "string" && req.query.search.trim()
			? req.query.search.trim()
			: undefined;

	// Enforce permission for scope: if requesting all leads, require LEAD_READ_ALL
	// otherwise require LEAD_READ_MY or LEAD_READ_ALL
	const effectivePermissions = await getEffectivePermissions(req.user.roleIds);
	const hasReadAll = effectivePermissions.some(
		(p) => p.key === "LEAD_READ_ALL",
	);
	const hasReadMy = effectivePermissions.some((p) => p.key === "LEAD_READ_MY");

	if (scope === "all" && !hasReadAll) {
		throw new AuthorizationError("Insufficient permissions to view all leads");
	}

	if (scope === "mine" && !(hasReadMy || hasReadAll)) {
		throw new AuthorizationError("Insufficient permissions to view your leads");
	}

	const { leads, total, page, pageSize } = await LeadService.listLeads({
		createdBy: req.user.userId,
		scope,
		timeFilter,
		status,
		limit,
		offset,
		sortBy,
		sortOrder,
		search,
	});

	res.json({
		ok: true,
		leads: leads.map(toLeadResponse),
		pagination: {
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize),
		},
	});
};

export const listSimilarLeadsController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	if (!req.user) {
		throw new AuthenticationError("User not authenticated");
	}

	const phone = typeof req.query.phone === "string" ? req.query.phone : "";
	const digits = phone.replace(/\D/g, "");

	if (!digits) {
		res.json({ ok: true, leads: [] });
		return;
	}

	const leads = await LeadService.searchByPhone(digits);

	res.json({ ok: true, leads: leads.map((l) => toLeadResponse((l as unknown) as Lead)) });
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

export const listCompletedDemosController = async (
	_req: Request,
	res: Response,
): Promise<void> => {
	const leads = await LeadService.listCompletedDemos();

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
		throw new AuthenticationError("User not authenticated");
	}

	const leadId = requireStringValue(req.params.leadId, "leadId");
	const result = PostponeLeadFollowUpPayloadSchema.safeParse(req.body);
	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	// Postpone may be set to a past date. Client should show a warning if needed.

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
		throw new AuthenticationError("User not authenticated");
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
		throw new AuthenticationError("User not authenticated");
	}

	const leadId = requireStringValue(req.params.leadId, "leadId");
	const result = RedemoLeadPayloadSchema.pick({ note: true }).safeParse(
		req.body,
	);
	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	const updatedLead = await LeadService.markDemoCompleted(
		leadId,
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

export const unmarkDemoCompletedController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	if (!req.user) {
		throw new AuthenticationError("User not authenticated");
	}

	const leadId = requireStringValue(req.params.leadId, "leadId");
	const updatedLead = await LeadService.unmarkDemoCompleted(leadId, req.user.userId);

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
		throw new AuthenticationError("User not authenticated");
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

	const updatedLead = await LeadService.redemo(
		leadId,
		result.data.mentorId,
		req.user.userId,
		result.data.note,
		result.data.counsellorId,
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
		throw new AuthenticationError("User not authenticated");
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

	const student = await StudentService.confirmAdmission(
		leadId,
		result.data.mentorId,
		result.data.batchId,
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
			dateOfBirth: student.dateOfBirth?.toISOString() ?? null,
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
		throw new AuthenticationError("User not authenticated");
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

	await StudentService.startAdmission(
		leadId,
		result.data.mentorId,
		result.data.batchId,
		req.user.userId,
		result.data.note,
	);

	const updatedLead = await LeadService.requestAdmission(
		leadId,
		undefined,
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
		throw new AuthenticationError("User not authenticated");
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

export const generateFormLinkController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	if (!req.user) {
		throw new AuthenticationError("User not authenticated");
	}

	const leadId = requireStringValue(req.params.leadId, "leadId");

	const result = await LeadService.generateFormLink(leadId, req.user.userId);

	if (!result) {
		throw new NotFoundError("Lead");
	}

	res.json(result);
};

export const revokeFormLinkController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	if (!req.user) {
		throw new AuthenticationError("User not authenticated");
	}

	const leadId = requireStringValue(req.params.leadId, "leadId");
	const updatedLead = await LeadService.revokeFormLink(leadId, req.user.userId);

	if (!updatedLead) {
		throw new NotFoundError("Lead");
	}

	res.json({
		ok: true,
		lead: toLeadResponse(updatedLead),
	});
};

export const cancelLeadDemoController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	if (!req.user) {
		throw new AuthenticationError("User not authenticated");
	}

	const leadId = requireStringValue(req.params.leadId, "leadId");
	const updatedLead = await LeadService.cancelDemo(leadId, req.user.userId);

	if (!updatedLead) {
		throw new NotFoundError("Lead");
	}

	res.json({
		ok: true,
		lead: toLeadResponse(updatedLead),
	});
};

export const submitLeadFormController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const leadId = requireStringValue(req.params.leadId, "leadId");
	const parseResult = SubmitLeadFormPayloadSchema.safeParse(req.body);
	if (!parseResult.success) {
		throw new ValidationError(parseResult.error.flatten().fieldErrors);
	}
	const payload = parseResult.data;

	const result = await LeadService.submitLeadForm(leadId, payload.token, {
		name: payload.name,
		email: payload.email,
		dateOfBirth: payload.dateOfBirth,
		residingCountry: payload.residingCountry,
		level: payload.level,
		gender: payload.gender,
		primaryWhatsappNumber: payload.primaryWhatsappNumber,
		alternateWhatsappNumber: payload.alternateWhatsappNumber,
		studentInfo: payload.studentInfo ?? "",
		preferredLanguage: payload.preferredLanguage,
		preferredPlan: payload.preferredPlan,
		preferredSchedule: payload.preferredSchedule,
		preferredDays: payload.preferredDays,
		preferredTimeslots: payload.preferredTimeslots ?? [],
		courseType: payload.courseType,
		hearAboutUs: payload.hearAboutUs,
		demoAvailability: payload.demoAvailability,
		preferredMentorGender: payload.preferredMentorGender,
	});

	if (!result) {
		throw new ValidationError({ token: ["Invalid or expired form token"] });
	}

	res.json({
		ok: result.ok,
	});
};

export const deleteLeadController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	if (!req.user) {
		throw new AuthenticationError("User not authenticated");
	}

	const leadId = requireStringValue(req.params.leadId, "leadId");
	const result = DeleteLeadPayloadSchema.safeParse(req.body);

	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	// Get user name for activity logging
	const user = await UserModel.findById(req.user.userId).lean();
	const userName = user?.name || "Unknown";

	const deleted = await LeadService.delete(
		leadId,
		req.user.userId,
		userName,
		result.data.note,
	);

	if (!deleted) {
		throw new NotFoundError("Lead");
	}

	res.json({
		ok: true,
		message: "Lead deleted successfully",
	});
};

export const validateFormLinkController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const leadId = requireStringValue(req.params.leadId, "leadId");
	const token = req.query.token as string;

	if (!token) {
		throw new ValidationError({ token: ["Token is required"] });
	}

	const result = await LeadService.validateFormLink(leadId, token);

	res.json(result);
};

export const assignDemoCounsellorController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	if (!req.user) {
		throw new AuthenticationError("User not authenticated");
	}

	const leadId = requireStringValue(req.params.leadId, "leadId");
	const result = AssignDemoCounsellorPayloadSchema.safeParse(req.body);
	if (!result.success) {
		throw new ValidationError(result.error.flatten().fieldErrors);
	}

	const updatedLead = await LeadService.assignDemoCounsellor(
		leadId,
		result.data.counsellorId,
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
