import type { Lead } from "@repo/schema";
import { LeadModel, type LeadDocument } from "./lead.model.js";
import { ActivityService } from "./activity.service.js";

type LeadDemo = NonNullable<Lead["demos"]>[number];

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
	assignedTo: doc.assignedTo,
	createdBy: doc.createdBy.toString(),
	formSent: doc.formSent,
	formCompleted: doc.formCompleted,
	followUpCount: doc.followUpCount,
	nextFollowUpAt: doc.nextFollowUpAt,
	demos: (doc.demos ?? []).map(toDemo),
	createdAt: doc.createdAt,
	updatedAt: doc.updatedAt,
});

export const LeadService = {
	create: async (lead: {
		phone: string;
		name?: string;
		customNextFollowUpAt?: Date;
		createdBy: string;
		createdByName?: string;
	}): Promise<Lead> => {
		const now = new Date();
		const effectiveNextFollowUpAt = lead.customNextFollowUpAt ?? now;

		const created = await LeadModel.create({
			phone: lead.phone,
			name: lead.name,
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

	findById: async (leadId: string): Promise<Lead | null> => {
		const lead = await LeadModel.findById(leadId).lean<LeadDocument | null>();
		return lead ? mapLead(lead) : null;
	},

	listLeads: async (filters: {
		createdBy: string;
		scope: "all" | "mine";
		timeFilter: "all" | "today";
	}): Promise<Lead[]> => {
		const leads = await LeadModel.find()
			.sort({ nextFollowUpAt: 1, createdAt: -1 })
			.lean<LeadDocument[]>();

		let filtered = leads;
		if (filters.scope === "mine") {
			filtered = filtered.filter((lead) => lead.createdBy.toString() === filters.createdBy);
		}

		if (filters.timeFilter === "today") {
			const startOfDay = new Date();
			startOfDay.setHours(0, 0, 0, 0);
			const endOfDay = new Date();
			endOfDay.setHours(23, 59, 59, 999);
			filtered = filtered.filter((lead) => lead.nextFollowUpAt >= startOfDay && lead.nextFollowUpAt <= endOfDay);
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
		mentorId: string,
		performedBy?: string,
		note?: string,
	): Promise<Lead | null> => {
		const existingLead = await LeadModel.findById(leadId).lean<LeadDocument | null>();
		if (!existingLead) return null;

		const now = new Date();
		const demos = [...(existingLead.demos ?? [])];
		demos.push({
			mentorId,
			requestedAt: now,
			assignedAt: now,
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
				{ mentorId: getLatestDemo(existingLead)?.mentorId?.toString() },
				{ mentorId, requestedAt: now.toISOString() },
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
		const demos = setLatestDemo(existingLead, {
			lastContactedAt: now,
			customNextFollowUpAt,
			nextFollowUpAt: customNextFollowUpAt,
		});

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
