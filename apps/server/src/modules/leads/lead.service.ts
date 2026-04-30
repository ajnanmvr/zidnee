import type { Lead } from "@repo/schema";
import { randomBytes } from "crypto";
import { LeadModel, type LeadDocument } from "./lead.model.js";
import { ActivityService } from "./activity.service.js";
import { ZidService } from "../zid/zid.service.js";
import { StudentModel, type StudentDocument } from "../students/student.model.js";
import type { LeadDocumentExt } from "./lead.model.js";

type LeadDemo = NonNullable<Lead["demos"]>[number];

const toDateOrFallback = (value: unknown, fallback: Date): Date => {
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return value;
	}

	if (typeof value === "string") {
		const parsed = new Date(value);
		if (!Number.isNaN(parsed.getTime())) {
			return parsed;
		}
	}

	return fallback;
};

const toObjectIdString = (value: unknown): string | undefined => {
	if (!value) {
		return undefined;
	}

	if (typeof value === "string") {
		return value;
	}

	if (typeof value === "object" && "_id" in value && value._id) {
		return String((value as { _id: { toString(): string } })._id.toString());
	}

	if (typeof value === "object" && "toString" in value) {
		return String((value as { toString(): string }).toString());
	}

	return undefined;
};

const leadFieldPatch = (existingLead: LeadDocument, updates: {
	name?: string;
	phone?: string;
	level?: string;
	assignedTo?: string;
}) => {
	const patch: Record<string, string> = {};
	const oldValue: Record<string, unknown> = {};
	const newValue: Record<string, unknown> = {};

	if (updates.name !== undefined && updates.name !== existingLead.name) {
		patch.name = updates.name;
		oldValue.name = existingLead.name ?? null;
		newValue.name = updates.name;
	}

	if (updates.phone !== undefined && updates.phone !== existingLead.phone) {
		patch.phone = updates.phone;
		oldValue.phone = existingLead.phone;
		newValue.phone = updates.phone;
	}

	if (updates.level !== undefined && updates.level !== existingLead.level) {
		patch.level = updates.level;
		oldValue.level = existingLead.level ?? null;
		newValue.level = updates.level;
	}

	const currentAssignedTo = toObjectIdString(existingLead.assignedTo);
	if (updates.assignedTo !== undefined && updates.assignedTo !== currentAssignedTo) {
		patch.assignedTo = updates.assignedTo;
		oldValue.assignedTo = currentAssignedTo ?? null;
		newValue.assignedTo = updates.assignedTo;
	}

	return { patch, oldValue, newValue };
};

const toDemo = (demo: NonNullable<LeadDocument["demos"]>[number]): LeadDemo => ({
	mentorId: demo.mentorId?.toString(),
	requestedAt: demo.requestedAt,
	assignedAt: demo.assignedAt,
	demoScheduledFor: demo.demoScheduledFor,
	completedAt: demo.completedAt,
	demoRequired: demo.demoRequired,
	lastContactedAt: demo.lastContactedAt,
	nextFollowUpAt: demo.nextFollowUpAt,
	customNextFollowUpAt: demo.customNextFollowUpAt,
	admissionRequestedAt: demo.admissionRequestedAt,
	admissionCounsellorId: demo.admissionCounsellorId?.toString(),
	admissionCompletedAt: demo.admissionCompletedAt,
	studentId: demo.studentId?.toString(),
	note: demo.note,
});

const fromDemo = (demo: LeadDemo): NonNullable<LeadDocument["demos"]>[number] => ({
	mentorId: demo.mentorId,
	requestedAt: demo.requestedAt,
	assignedAt: demo.assignedAt,
	demoScheduledFor: demo.demoScheduledFor,
	completedAt: demo.completedAt,
	demoRequired: demo.demoRequired,
	lastContactedAt: demo.lastContactedAt,
	nextFollowUpAt: demo.nextFollowUpAt,
	customNextFollowUpAt: demo.customNextFollowUpAt,
	admissionRequestedAt: demo.admissionRequestedAt,
	admissionCounsellorId: demo.admissionCounsellorId,
	admissionCompletedAt: demo.admissionCompletedAt,
	studentId: demo.studentId,
	note: demo.note,
});

const getLatestDemo = (lead: LeadDocument): NonNullable<LeadDocument["demos"]>[number] | null => {
	const demos = lead.demos ?? [];
	return demos.length > 0 ? demos[demos.length - 1] ?? null : null;
};

const setLatestDemo = (
	lead: LeadDocument,
	patch: Partial<NonNullable<LeadDocument["demos"]>[number]>,
): NonNullable<LeadDocument["demos"]> => {
	const demos = [...(lead.demos ?? [])];
	if (demos.length === 0) {
		demos.push({ demoRequired: false, ...patch } as NonNullable<LeadDocument["demos"]>[number]);
		return demos;
	}

	const latestDemo = demos[demos.length - 1]!;
	demos[demos.length - 1] = {
		...latestDemo,
		...patch,
		demoRequired: patch.demoRequired ?? latestDemo.demoRequired ?? false,
	};

	return demos;
};

const mapLead = (doc: LeadDocument): Lead => ({
	id: doc._id.toString(),
	name: doc.name,
	phone: doc.phone,
	level: doc.level,
	assignedTo: toObjectIdString(doc.assignedTo),
	createdBy: doc.createdBy.toString(),
	formSent: doc.formSent,
	formCompleted: doc.formCompleted,
	followUpCount: doc.followUpCount,
	nextFollowUpAt: toDateOrFallback(doc.nextFollowUpAt, doc.createdAt ?? new Date()),
	demos: (doc.demos ?? []).map(toDemo),
	createdAt: doc.createdAt,
	updatedAt: doc.updatedAt,
});

export const LeadService = {
	create: async (lead: {
		phone: string;
		name?: string;
		assignedTo?: string;
		customNextFollowUpAt?: Date;
		createdBy: string;
		createdByName?: string;
	}): Promise<Lead> => {
		const now = new Date();
		const effectiveNextFollowUpAt = lead.customNextFollowUpAt ?? now;

		const created = await LeadModel.create({
			phone: lead.phone,
			name: lead.name,
			assignedTo: lead.assignedTo ?? lead.createdBy,
			createdBy: lead.createdBy,
			followUpCount: 0,
			nextFollowUpAt: effectiveNextFollowUpAt,
			demos: [],
			formSent: false,
			formCompleted: false,
		});

		const leadObj = mapLead(created.toObject() as LeadDocument);

		if (lead.createdBy) {
			await ActivityService.logActivity(
				leadObj.id,
				"CREATED",
				lead.createdBy,
				`Created lead with phone: ${lead.phone}`,
				undefined,
				{ phone: lead.phone, name: lead.name },
			);
		}

		return leadObj;
	},

	update: async (
		leadId: string,
		updates: {
			name?: string;
			phone?: string;
			level?: string;
			assignedTo?: string;
		},
		performedBy?: string,
	): Promise<Lead | null> => {
		const existingLead = await LeadModel.findById(leadId).lean<LeadDocument | null>();
		if (!existingLead) {
			return null;
		}

		const { patch, oldValue, newValue } = leadFieldPatch(existingLead, updates);
		if (Object.keys(patch).length === 0) {
			return mapLead(existingLead);
		}

		const updatedLead = await LeadModel.findByIdAndUpdate(
			leadId,
			{ $set: patch },
			{ returnDocument: "after" },
		).lean<LeadDocument | null>();

		if (performedBy && updatedLead) {
			const type = Object.prototype.hasOwnProperty.call(patch, "assignedTo") && Object.keys(patch).length === 1 ? "ASSIGNED" : "UPDATED";
			await ActivityService.logActivity(
				leadId,
				type,
				performedBy,
				type === "ASSIGNED"
					? `Reassigned lead ${existingLead.phone}`
					: `Updated lead ${existingLead.phone}`,
				Object.keys(oldValue).length > 0 ? oldValue : undefined,
				Object.keys(newValue).length > 0 ? newValue : undefined,
			);
		}

		return updatedLead ? mapLead(updatedLead) : null;
	},

	findById: async (leadId: string): Promise<Lead | null> => {
		const lead = await LeadModel.findById(leadId).populate("assignedTo", "name username").lean<LeadDocument | null>();
		return lead ? mapLead(lead) : null;
	},

	listLeads: async (filters: {
		createdBy: string;
		scope: "all" | "mine";
		timeFilter: "all" | "today";
	}): Promise<Lead[]> => {
		const leads = await LeadModel.find()
			.sort({ createdAt: -1 })
			.lean<LeadDocument[]>();

		let filtered = leads;
		if (filters.scope === "mine") {
			filtered = filtered.filter((lead) => toObjectIdString(lead.assignedTo) === filters.createdBy);
		}

		if (filters.timeFilter === "today") {
			const startOfDay = new Date();
			startOfDay.setHours(0, 0, 0, 0);
			const endOfDay = new Date();
			endOfDay.setHours(23, 59, 59, 999);
			filtered = filtered.filter((lead) => {
				const nextFollowUpAt = toDateOrFallback(lead.nextFollowUpAt, lead.createdAt ?? new Date());
				return nextFollowUpAt >= startOfDay && nextFollowUpAt <= endOfDay;
			});
		}

		return filtered
			.filter((lead) => {
				const latestDemo = getLatestDemo(lead);
				return !latestDemo?.studentId;
			})
			.map(mapLead);
	},

	listPendingDemoRequests: async (): Promise<Lead[]> => {
		const leads = await LeadModel.find().sort({ createdAt: -1 }).lean<LeadDocument[]>();
		return leads
			.filter((lead) => {
				const latestDemo = getLatestDemo(lead);
				return Boolean(latestDemo?.requestedAt && !latestDemo?.assignedAt && !latestDemo?.completedAt);
			})
			.map(mapLead);
	},

	listDemoRequests: async (): Promise<Lead[]> => {
		const leads = await LeadModel.find().sort({ createdAt: -1 }).lean<LeadDocument[]>();
		return leads
			.filter((lead) => {
				const latestDemo = getLatestDemo(lead);
				return Boolean(latestDemo?.assignedAt && !latestDemo?.completedAt);
			})
			.map(mapLead);
	},

	listAdmissionLeads: async (): Promise<Lead[]> => {
		const leads = await LeadModel.find().sort({ createdAt: -1 }).lean<LeadDocument[]>();
		return leads
			.filter((lead) => {
				const latestDemo = getLatestDemo(lead);
				return Boolean(latestDemo?.admissionRequestedAt && !latestDemo?.studentId);
			})
			.map(mapLead);
	},

	requestDemo: async (leadId: string, performedBy?: string): Promise<Lead | null> => {
		const existingLead = await LeadModel.findById(leadId).lean<LeadDocument | null>();
		if (!existingLead) return null;

		const now = new Date();
		const demos = [...(existingLead.demos ?? [])];
		demos.push({
			demoRequired: true,
			requestedAt: now,
			nextFollowUpAt: now,
		});

		const updatedLead = await LeadModel.findByIdAndUpdate(
			leadId,
			{
				$set: {
					demos,
					nextFollowUpAt: now,
				},
			},
			{ returnDocument: "after" },
		).lean<LeadDocument | null>();

		if (performedBy && updatedLead) {
			await ActivityService.logActivity(
				leadId,
				"DEMO_REQUESTED",
				performedBy,
				`Requested demo for ${existingLead.phone}`,
				undefined,
				{ requestedAt: now.toISOString() },
			);
		}

		return updatedLead ? mapLead(updatedLead) : null;
	},

	markDemoCompleted: async (leadId: string, performedBy?: string, note?: string): Promise<Lead | null> => {
		const existingLead = await LeadModel.findById(leadId).lean<LeadDocument | null>();
		if (!existingLead) return null;

		const now = new Date();
		const demos = setLatestDemo(existingLead, {
			completedAt: now,
			demoRequired: false,
		});

		const updatedLead = await LeadModel.findByIdAndUpdate(
			leadId,
			{
				$set: {
					demos,
				},
			},
			{ returnDocument: "after" },
		).lean<LeadDocument | null>();

		if (performedBy && updatedLead) {
			await ActivityService.logActivity(
				leadId,
				"DEMO_COMPLETED",
				performedBy,
				`Marked demo complete for ${existingLead.phone}`,
				undefined,
				{ completedAt: now.toISOString() },
				note,
			);
		}

		return updatedLead ? mapLead(updatedLead) : null;
	},

	redemo: async (
		leadId: string,
		mentorId: string | undefined,
		performedBy?: string,
		note?: string,
	): Promise<Lead | null> => {
		const existingLead = await LeadModel.findById(leadId).lean<LeadDocument | null>();
		if (!existingLead) return null;

		const now = new Date();
		const previousMentorId = getLatestDemo(existingLead)?.mentorId?.toString();
		const effectiveMentorId = mentorId ?? previousMentorId;
		const demos = [...(existingLead.demos ?? [])];
		demos.push({
			mentorId: effectiveMentorId,
			requestedAt: now,
			demoRequired: true,
			nextFollowUpAt: now,
		});

		const updatedLead = await LeadModel.findByIdAndUpdate(
			leadId,
			{
				$set: {
					demos,
					nextFollowUpAt: now,
				},
				$unset: {
					studentId: 1,
				},
			},
			{ returnDocument: "after" },
		).lean<LeadDocument | null>();

		if (performedBy && updatedLead) {
			await ActivityService.logActivity(
				leadId,
				"DEMO_REDONE",
				performedBy,
				`Requested redemo for ${existingLead.phone}`,
				{ mentorId: previousMentorId },
				{ mentorId: effectiveMentorId, requestedAt: now.toISOString() },
				note,
			);
		}

		return updatedLead ? mapLead(updatedLead) : null;
	},

	assignDemoMentor: async (
		leadId: string,
		mentorId: string,
		demoScheduledFor: Date,
		performedBy?: string,
	): Promise<Lead | null> => {
		const existingLead = await LeadModel.findById(leadId).lean<LeadDocument | null>();
		if (!existingLead) return null;

		const now = new Date();
		const nextFollowUpAt = new Date(demoScheduledFor.getTime() + 60 * 60 * 1000);
		const demos = setLatestDemo(existingLead, {
			mentorId,
			assignedAt: now,
			demoScheduledFor,
			demoRequired: true,
			nextFollowUpAt,
		});

		const updatedLead = await LeadModel.findByIdAndUpdate(
			leadId,
			{
				$set: {
					demos,
					nextFollowUpAt,
				},
			},
			{ returnDocument: "after" },
		).lean<LeadDocument | null>();

		if (performedBy && updatedLead) {
			await ActivityService.logActivity(
				leadId,
				"DEMO_SCHEDULED",
				performedBy,
				`Scheduled demo for ${existingLead.phone}`,
				{
					mentorId: getLatestDemo(existingLead)?.mentorId?.toString(),
					demoScheduledFor: getLatestDemo(existingLead)?.demoScheduledFor?.toISOString(),
				},
				{
					mentorId,
					assignedAt: now.toISOString(),
					demoScheduledFor: demoScheduledFor.toISOString(),
				},
			);
		}

		return updatedLead ? mapLead(updatedLead) : null;
	},

	requestAdmission: async (
		leadId: string,
		counsellorId: string,
		performedBy?: string,
		note?: string,
	): Promise<Lead | null> => {
		const existingLead = await LeadModel.findById(leadId).lean<LeadDocument | null>();
		if (!existingLead) return null;

		const now = new Date();
		const demos = setLatestDemo(existingLead, {
			admissionRequestedAt: now,
			admissionCounsellorId: counsellorId,
		});

		const updatedLead = await LeadModel.findByIdAndUpdate(
			leadId,
			{
				$set: {
					demos,
				},
			},
			{ returnDocument: "after" },
		).lean<LeadDocument | null>();

		if (performedBy && updatedLead) {
			await ActivityService.logActivity(
				leadId,
				"ADMISSION_REQUESTED",
				performedBy,
				`Requested admission for ${existingLead.phone}`,
				{ admissionCounsellorId: getLatestDemo(existingLead)?.admissionCounsellorId?.toString() },
				{ admissionCounsellorId: counsellorId, admissionRequestedAt: now.toISOString() },
				note,
			);
		}

		return updatedLead ? mapLead(updatedLead) : null;
	},

	postponeFollowUp: async (
		leadId: string,
		customNextFollowUpAt: Date,
		performedBy?: string,
		note?: string,
	): Promise<Lead | null> => {
		const existingLead = await LeadModel.findById(leadId).lean<LeadDocument | null>();
		if (!existingLead) return null;

		const now = new Date();
		const latestDemo = getLatestDemo(existingLead);
		const demos = latestDemo
			? setLatestDemo(existingLead, {
				lastContactedAt: now,
				customNextFollowUpAt,
				nextFollowUpAt: customNextFollowUpAt,
			})
			: existingLead.demos ?? [];

		const updatedLead = await LeadModel.findByIdAndUpdate(
			leadId,
			{
				$set: {
					nextFollowUpAt: customNextFollowUpAt,
					demos,
				},
			},
			{ returnDocument: "after" },
		).lean<LeadDocument | null>();

		if (performedBy && updatedLead) {
			await ActivityService.logActivity(
				leadId,
				"FOLLOW_UP_POSTPONED",
				performedBy,
				`Postponed follow-up to ${customNextFollowUpAt.toISOString()}`,
				{ customNextFollowUpAt: getLatestDemo(existingLead)?.customNextFollowUpAt?.toISOString() },
				{ customNextFollowUpAt: customNextFollowUpAt.toISOString() },
				note,
			);
		}

		return updatedLead ? mapLead(updatedLead) : null;
	},

	generateFormLink: async (leadId: string) => {
		const existingLead = await LeadModel.findById(leadId).lean<LeadDocument | null>();
		if (!existingLead) {
			return null;
		}

		// Generate a secure random token
		const token = randomBytes(32).toString("hex");
		
		// Set expiry to 30 days from now
		const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

		// Get app URL from environment or use default
		const appUrl = process.env.APP_URL || "https://app.example.com";
		const formLink = `${appUrl}/form/${leadId}?token=${token}`;

		// Save token to database
		await LeadModel.findByIdAndUpdate(leadId, {
			formToken: token,
			formTokenExpiresAt: expiresAt,
		});

		return {
			formLink,
			expiresAt: expiresAt.toISOString(),
		};
	},

	submitLeadForm: async (leadId: string, token: string, data: { name: string; phone: string }): Promise<{ studentId: string; zid: string } | null> => {
		const existingLead = await LeadModel.findById(leadId);
		if (!existingLead) {
			return null;
		}

		// Validate token
		const lead = existingLead as LeadDocumentExt;
		if (lead.formToken !== token) {
			return null;
		}

		// Validate token expiry
		if (!lead.formTokenExpiresAt || lead.formTokenExpiresAt < new Date()) {
			return null;
		}

		// Generate ZID
		const zid = await ZidService.generateZid("ZID");

		// Create student
		const student = await StudentModel.create({
			zid,
			leadId: existingLead._id,
			name: data.name,
			phone: data.phone,
			status: "ACTIVE",
			admittedAt: new Date(),
		});

		// Update lead: mark form as completed, clear token

		// Update lead in database
		await LeadModel.findByIdAndUpdate(leadId, {
			formCompleted: true,
			formToken: undefined,
			formTokenExpiresAt: undefined,
		});

		// Log activity
		await ActivityService.logActivity(
			leadId,
			"STUDENT_CREATED",
			existingLead.createdBy.toString(),
			`Form submitted and student created: ${zid}`,
			{},
			{ formCompleted: true, studentId: student._id.toString(), zid },
		);

		return {
			studentId: student._id.toString(),
			zid,
		};
	},

	validateFormLink: async (leadId: string, token: string): Promise<{ isValid: boolean; expiresAt?: string }> => {
		const existingLead = await LeadModel.findById(leadId).lean<LeadDocument | null>();
		if (!existingLead) {
			return { isValid: false };
		}

		const lead = existingLead as LeadDocumentExt;
		if (lead.formToken !== token) {
			return { isValid: false };
		}

		if (!lead.formTokenExpiresAt || lead.formTokenExpiresAt < new Date()) {
			return { isValid: false };
		}

		return {
			isValid: true,
			expiresAt: lead.formTokenExpiresAt.toISOString(),
		};
	},

	delete: async (leadId: string, performedBy?: string, performedByName?: string): Promise<boolean> => {
		const existingLead = await LeadModel.findById(leadId).lean<LeadDocument | null>();
		const result = await LeadModel.findByIdAndDelete(leadId);

		if (performedBy && existingLead) {
			await ActivityService.logActivity(
				leadId,
				"DELETED",
				performedBy,
				`Lead deleted: ${existingLead.phone}`,
				{ phone: existingLead.phone, name: existingLead.name },
			);
		}

		return result !== null;
	},
};
