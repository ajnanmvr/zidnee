import type { Lead } from "@repo/schema";
import { LeadModel, type LeadDocument } from "./lead.model.js";

const toLead = (doc: LeadDocument): Lead => {
	return {
		id: doc._id.toString(),
		name: doc.name,
		phone: doc.phone,
		level: doc.level,
		status: doc.status,
		assignedTo: doc.assignedTo,
		demoRequired: doc.demoRequired,
		formSent: doc.formSent,
		formCompleted: doc.formCompleted,
		followUpCount: doc.followUpCount,
		lastContactedAt: doc.lastContactedAt,
		nextFollowUpAt: doc.nextFollowUpAt,
		customNextFollowUpAt: doc.customNextFollowUpAt,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	};
};

export const LeadService = {
	create: async (lead: {
		phone: string;
		name?: string;
		customNextFollowUpAt?: Date;
	}): Promise<Lead> => {
		const now = new Date();
		const effectiveNextFollowUpAt = lead.customNextFollowUpAt ?? now;

		const created = await LeadModel.create({
			phone: lead.phone,
			name: lead.name,
			status: "NEW",
			followUpCount: 0,
			lastContactedAt: undefined,
			nextFollowUpAt: effectiveNextFollowUpAt,
			customNextFollowUpAt: lead.customNextFollowUpAt,
			demoRequired: false,
			formSent: false,
			formCompleted: false,
		});

		return toLead(created.toObject() as LeadDocument);
	},

	findById: async (leadId: string): Promise<Lead | null> => {
		const lead = await LeadModel.findById(leadId).lean<LeadDocument | null>();
		return lead ? toLead(lead) : null;
	},

	listDueFollowUps: async (now = new Date()): Promise<Lead[]> => {
		const leads = await LeadModel.find({
			$or: [
				{ nextFollowUpAt: { $lte: now } },
				{ customNextFollowUpAt: { $lte: now } },
			],
		})
			.sort({ customNextFollowUpAt: 1, nextFollowUpAt: 1, createdAt: -1 })
			.lean<LeadDocument[]>();

		return leads.map(toLead);
	},

	postponeFollowUp: async (
		leadId: string,
		customNextFollowUpAt: Date,
	): Promise<Lead | null> => {
		const updatedLead = await LeadModel.findByIdAndUpdate(
			leadId,
			{
				$set: {
					customNextFollowUpAt,
					nextFollowUpAt: customNextFollowUpAt,
					status: "FOLLOW_UP",
				},
			},
			{ returnDocument: "after" },
		).lean<LeadDocument | null>();

		return updatedLead ? toLead(updatedLead) : null;
	},
};
