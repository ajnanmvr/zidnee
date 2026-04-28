import type { Lead } from "@repo/schema";
import { LeadModel, type LeadDocument } from "./lead.model.js";
import { ActivityService } from "./activity.service.js";

const toLead = (doc: LeadDocument): Lead => {
	return {
		id: doc._id.toString(),
		name: doc.name,
		phone: doc.phone,
		level: doc.level,
		assignedTo: doc.assignedTo,
		createdBy: doc.createdBy.toString(),
		demoRequired: doc.demoRequired,
		formSent: doc.formSent,
		formCompleted: doc.formCompleted,
		followUpCount: doc.followUpCount,
		lastContactedAt: doc.lastContactedAt,
		nextFollowUpAt: doc.nextFollowUpAt,
		customNextFollowUpAt: doc.customNextFollowUpAt,
		demoRequestedAt: doc.demoRequestedAt,
		demoMentorId: doc.demoMentorId?.toString(),
		demoAssignedAt: doc.demoAssignedAt,
		demoScheduledFor: doc.demoScheduledFor,
		demoCompletedAt: doc.demoCompletedAt,
		admissionRequestedAt: doc.admissionRequestedAt,
		admissionCounsellorId: doc.admissionCounsellorId?.toString(),
		admissionCompletedAt: doc.admissionCompletedAt,
		studentId: doc.studentId?.toString(),
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	};
};

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
			lastContactedAt: undefined,
			nextFollowUpAt: effectiveNextFollowUpAt,
			customNextFollowUpAt: lead.customNextFollowUpAt,
			demoRequired: false,
			demoRequestedAt: undefined,
			demoMentorId: undefined,
			demoAssignedAt: undefined,
			demoScheduledFor: undefined,
			demoCompletedAt: undefined,
			admissionRequestedAt: undefined,
			admissionCounsellorId: undefined,
			admissionCompletedAt: undefined,
			studentId: undefined,
			formSent: false,
			formCompleted: false,
		});

		const leadObj = toLead(created.toObject() as LeadDocument);

		// Log activity if user info provided
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
		return lead ? toLead(lead) : null;
	},

	listLeads: async (filters: {
		createdBy: string;
		scope: "all" | "mine";
		timeFilter: "all" | "today";
	}): Promise<Lead[]> => {
		const query: Record<string, unknown> = {
			demoRequired: { $ne: true },
			admissionRequestedAt: { $exists: false },
			studentId: { $exists: false },
		};

		if (filters.scope === "mine") {
			query.createdBy = filters.createdBy;
		}

		if (filters.timeFilter === "today") {
			const startOfDay = new Date();
			startOfDay.setHours(0, 0, 0, 0);
			const endOfDay = new Date();
			endOfDay.setHours(23, 59, 59, 999);

			query.$or = [
				{ customNextFollowUpAt: { $gte: startOfDay, $lte: endOfDay } },
				{ nextFollowUpAt: { $gte: startOfDay, $lte: endOfDay } },
			];
		}

		const leads = await LeadModel.find(query)
			.sort({ customNextFollowUpAt: 1, nextFollowUpAt: 1, createdAt: -1 })
			.lean<LeadDocument[]>();

		return leads.map(toLead);
	},

	listPendingDemoRequests: async (): Promise<Lead[]> => {
		const leads = await LeadModel.find({
			demoRequired: true,
			demoAssignedAt: { $exists: false },
			studentId: { $exists: false },
		})
			.sort({ demoRequestedAt: -1, createdAt: -1 })
			.lean<LeadDocument[]>();

		return leads.map(toLead);
	},

	listDemoRequests: async (): Promise<Lead[]> => {
		const leads = await LeadModel.find({
			demoRequired: true,
			demoAssignedAt: { $exists: true },
			studentId: { $exists: false },
		})
			.sort({ demoScheduledFor: 1, demoRequestedAt: -1, createdAt: -1 })
			.lean<LeadDocument[]>();

		return leads.map(toLead);
	},

	listAdmissionLeads: async (): Promise<Lead[]> => {
		const leads = await LeadModel.find({
			admissionRequestedAt: { $exists: true },
			studentId: { $exists: false },
		})
			.sort({ admissionRequestedAt: -1, createdAt: -1 })
			.lean<LeadDocument[]>();

		return leads.map(toLead);
	},

	requestDemo: async (leadId: string, performedBy?: string): Promise<Lead | null> => {
		const existingLead = await LeadModel.findById(leadId).lean<LeadDocument | null>();
		if (!existingLead) return null;

		const now = new Date();
		const updatedLead = await LeadModel.findByIdAndUpdate(
			leadId,
			{
				$set: {
					demoRequired: true,
					demoRequestedAt: now,
					demoMentorId: undefined,
					demoAssignedAt: undefined,
					demoScheduledFor: undefined,
				},
			},
			{ returnDocument: "after" },
		).lean<LeadDocument | null>();

		if (performedBy && updatedLead) {
			await ActivityService.logActivity(
				leadId,
				"DEMO_SCHEDULED",
				performedBy,
				`Requested demo for ${existingLead.phone}`,
				{ demoRequired: false },
				{ demoRequired: true, demoRequestedAt: now.toISOString() },
			);
		}

		return updatedLead ? toLead(updatedLead) : null;
	},

	markDemoCompleted: async (leadId: string, performedBy?: string, note?: string): Promise<Lead | null> => {
		const existingLead = await LeadModel.findById(leadId).lean<LeadDocument | null>();
		if (!existingLead) return null;

		const now = new Date();
		const updatedLead = await LeadModel.findByIdAndUpdate(
			leadId,
			{
				$set: {
					demoRequired: false,
					demoCompletedAt: now,
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
				{ demoRequired: true },
				{ demoRequired: false, demoCompletedAt: now.toISOString() },
				note,
			);
		}

		return updatedLead ? toLead(updatedLead) : null;
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
		const updatedLead = await LeadModel.findByIdAndUpdate(
			leadId,
			{
				$set: {
					demoRequired: true,
					demoRequestedAt: now,
					demoMentorId: mentorId,
					demoAssignedAt: now,
					demoScheduledFor: undefined,
					demoCompletedAt: undefined,
				},
				$unset: {
					admissionRequestedAt: 1,
					admissionCounsellorId: 1,
					admissionCompletedAt: 1,
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
				{ demoMentorId: existingLead.demoMentorId?.toString() },
				{ demoMentorId: mentorId, demoRequestedAt: now.toISOString() },
				note,
			);
		}

		return updatedLead ? toLead(updatedLead) : null;
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
		const updatedLead = await LeadModel.findByIdAndUpdate(
			leadId,
			{
				$set: {
					demoMentorId: mentorId,
					demoAssignedAt: now,
					demoScheduledFor,
					nextFollowUpAt,
					customNextFollowUpAt: nextFollowUpAt,
				},
			},
			{ returnDocument: "after" },
		).lean<LeadDocument | null>();

		if (performedBy && updatedLead) {
			await ActivityService.logActivity(
				leadId,
				"ASSIGNED",
				performedBy,
				`Assigned demo mentor`,
				{
					demoMentorId: existingLead.demoMentorId?.toString(),
					demoScheduledFor: existingLead.demoScheduledFor?.toISOString(),
					customNextFollowUpAt: existingLead.customNextFollowUpAt?.toISOString(),
				},
				{
					demoMentorId: mentorId,
					demoAssignedAt: now.toISOString(),
					demoScheduledFor: demoScheduledFor.toISOString(),
					customNextFollowUpAt: nextFollowUpAt.toISOString(),
				},
			);
		}

		return updatedLead ? toLead(updatedLead) : null;
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
		const updatedLead = await LeadModel.findByIdAndUpdate(
			leadId,
			{
				$set: {
					admissionRequestedAt: now,
					admissionCounsellorId: counsellorId,
				},
			},
			{ returnDocument: "after" },
		).lean<LeadDocument | null>();

		if (performedBy && updatedLead) {
			await ActivityService.logActivity(
				leadId,
				"ADMISSION_CONFIRMED",
				performedBy,
				`Moved lead to admission for ${existingLead.phone}`,
				{ admissionCounsellorId: existingLead.admissionCounsellorId?.toString() },
				{ admissionCounsellorId: counsellorId, admissionRequestedAt: now.toISOString() },
				note,
			);
		}

		return updatedLead ? toLead(updatedLead) : null;
	},

	postponeFollowUp: async (
		leadId: string,
		customNextFollowUpAt: Date,
		performedBy?: string,
		note?: string,
	): Promise<Lead | null> => {
		const existingLead = await LeadModel.findById(leadId).lean<LeadDocument | null>();
		if (!existingLead) return null;

		const updatedLead = await LeadModel.findByIdAndUpdate(
			leadId,
			{
				$set: {
					customNextFollowUpAt,
					nextFollowUpAt: customNextFollowUpAt,
				},
			},
			{ returnDocument: "after" },
		).lean<LeadDocument | null>();

		// Log activity if user info provided
		if (performedBy && updatedLead) {
			await ActivityService.logActivity(
				leadId,
				"FOLLOW_UP_POSTPONED",
				performedBy,
				`Postponed follow-up to ${customNextFollowUpAt.toISOString()}`,
				{ customNextFollowUpAt: existingLead.customNextFollowUpAt?.toISOString() },
				{ customNextFollowUpAt: customNextFollowUpAt.toISOString() },
				note,
			);
		}

		return updatedLead ? toLead(updatedLead) : null;
	},

	delete: async (leadId: string, performedBy?: string, performedByName?: string): Promise<boolean> => {
		const existingLead = await LeadModel.findById(leadId).lean<LeadDocument | null>();
		const result = await LeadModel.findByIdAndDelete(leadId);

		// Log activity if user info provided
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
