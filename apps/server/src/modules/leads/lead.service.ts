import type {
	Lead,
	LeadFormData,
	LeadStatus,
	UpdateLeadPayload,
} from "@repo/schema";
import { FOLLOW_UP_PERIOD_MS } from "@repo/schema";
import { randomBytes } from "crypto";
import { Types } from "mongoose";
import { env } from "process";
import { ConflictError, ValidationError } from "../../utils/errors.util.js";
import {
	type StudentDocument,
	StudentModel,
} from "../students/student.model.js";
import { ZidService } from "../zid/zid.service.js";
import { ActivityService } from "./activity.service.js";
import type { LeadDocumentExt } from "./lead.model.js";
import { type LeadDocument, LeadModel } from "./lead.model.js";
import { generateLeadSerialNumber } from "./lead-sequence.model.js";

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
	if (value === null || value === undefined) {
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

const leadFieldPatch = (
	existingLead: LeadDocument,
	updates: UpdateLeadPayload,
) => {
	const patch: Record<string, unknown> = {};
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

	if (updates.status !== undefined && updates.status !== existingLead.status) {
		patch.status = updates.status;
		oldValue.status = existingLead.status ?? null;
		newValue.status = updates.status;
	}

	const currentAssignedTo = toObjectIdString(existingLead.assignedTo);
	if (
		updates.assignedTo !== undefined &&
		updates.assignedTo !== currentAssignedTo
	) {
		patch.assignedTo = updates.assignedTo;
		oldValue.assignedTo = currentAssignedTo ?? null;
		newValue.assignedTo = updates.assignedTo;
	}

	const currentDemoRequestAssignedTo = toObjectIdString(
		existingLead.demoRequestAssignedTo,
	);
	if (
		updates.demoRequestAssignedTo !== undefined &&
		updates.demoRequestAssignedTo !== currentDemoRequestAssignedTo
	) {
		patch.demoRequestAssignedTo = updates.demoRequestAssignedTo;
		oldValue.demoRequestAssignedTo = currentDemoRequestAssignedTo ?? null;
		newValue.demoRequestAssignedTo = updates.demoRequestAssignedTo;
	}

	if (updates.gender !== undefined && updates.gender !== existingLead.gender) {
		patch.gender = updates.gender;
		oldValue.gender = existingLead.gender ?? null;
		newValue.gender = updates.gender;
	}

	if (
		updates.dateOfBirth !== undefined &&
		updates.dateOfBirth?.getTime() !== existingLead.dateOfBirth?.getTime()
	) {
		patch.dateOfBirth = updates.dateOfBirth;
		oldValue.dateOfBirth = existingLead.dateOfBirth ?? null;
		newValue.dateOfBirth = updates.dateOfBirth;
	}

	if (
		updates.residingCountry !== undefined &&
		updates.residingCountry !== existingLead.residingCountry
	) {
		patch.residingCountry = updates.residingCountry;
		oldValue.residingCountry = existingLead.residingCountry ?? null;
		newValue.residingCountry = updates.residingCountry;
	}

	if (updates.email !== undefined && updates.email !== existingLead.email) {
		patch.email = updates.email;
		oldValue.email = existingLead.email ?? null;
		newValue.email = updates.email;
	}

	if (
		updates.courseType !== undefined &&
		updates.courseType !== existingLead.courseType
	) {
		patch.courseType = updates.courseType;
		oldValue.courseType = existingLead.courseType ?? null;
		newValue.courseType = updates.courseType;
	}

	if (
		updates.primaryWhatsappNumber !== undefined &&
		updates.primaryWhatsappNumber !== existingLead.primaryWhatsappNumber
	) {
		patch.primaryWhatsappNumber = updates.primaryWhatsappNumber;
		oldValue.primaryWhatsappNumber = existingLead.primaryWhatsappNumber ?? null;
		newValue.primaryWhatsappNumber = updates.primaryWhatsappNumber;
	}

	if (
		updates.alternateWhatsappNumber !== undefined &&
		updates.alternateWhatsappNumber !== existingLead.alternateWhatsappNumber
	) {
		patch.alternateWhatsappNumber = updates.alternateWhatsappNumber;
		oldValue.alternateWhatsappNumber =
			existingLead.alternateWhatsappNumber ?? null;
		newValue.alternateWhatsappNumber = updates.alternateWhatsappNumber;
	}

	if (
		updates.studentInfo !== undefined &&
		updates.studentInfo !== existingLead.studentInfo
	) {
		patch.studentInfo = updates.studentInfo;
		oldValue.studentInfo = existingLead.studentInfo ?? null;
		newValue.studentInfo = updates.studentInfo;
	}

	if (
		updates.preferredLanguage !== undefined &&
		updates.preferredLanguage !== existingLead.preferredLanguage
	) {
		patch.preferredLanguage = updates.preferredLanguage;
		oldValue.preferredLanguage = existingLead.preferredLanguage ?? null;
		newValue.preferredLanguage = updates.preferredLanguage;
	}

	if (
		updates.preferredSchedule !== undefined &&
		updates.preferredSchedule !== existingLead.preferredSchedule
	) {
		patch.preferredSchedule = updates.preferredSchedule;
		oldValue.preferredSchedule = existingLead.preferredSchedule ?? null;
		newValue.preferredSchedule = updates.preferredSchedule;
	}

	if (
		updates.preferredDays !== undefined &&
		JSON.stringify(updates.preferredDays) !==
			JSON.stringify(existingLead.preferredDays ?? [])
	) {
		patch.preferredDays = updates.preferredDays;
		oldValue.preferredDays = existingLead.preferredDays ?? null;
		newValue.preferredDays = updates.preferredDays;
	}

	if (
		updates.preferredPlan !== undefined &&
		JSON.stringify(updates.preferredPlan) !==
			JSON.stringify(existingLead.preferredPlan ?? null)
	) {
		patch.preferredPlan = updates.preferredPlan;
		oldValue.preferredPlan = existingLead.preferredPlan ?? null;
		newValue.preferredPlan = updates.preferredPlan;
	}

	if (
		updates.preferredTimeslots !== undefined &&
		JSON.stringify(updates.preferredTimeslots) !==
			JSON.stringify(existingLead.preferredTimeslots ?? [])
	) {
		patch.preferredTimeslots = updates.preferredTimeslots;
		oldValue.preferredTimeslots = existingLead.preferredTimeslots ?? [];
		newValue.preferredTimeslots = updates.preferredTimeslots;
	}

	if (updates.price !== undefined && updates.price !== existingLead.price) {
		patch.price = updates.price;
		oldValue.price = existingLead.price ?? null;
		newValue.price = updates.price;
	}

	if (
		updates.hearAboutUs !== undefined &&
		updates.hearAboutUs !== existingLead.hearAboutUs
	) {
		patch.hearAboutUs = updates.hearAboutUs;
		oldValue.hearAboutUs = existingLead.hearAboutUs ?? null;
		newValue.hearAboutUs = updates.hearAboutUs;
	}

	if (
		updates.demoAvailability !== undefined &&
		updates.demoAvailability !== existingLead.demoAvailability
	) {
		patch.demoAvailability = updates.demoAvailability;
		oldValue.demoAvailability = existingLead.demoAvailability ?? null;
		newValue.demoAvailability = updates.demoAvailability;
	}

	if (
		updates.preferredMentorGender !== undefined &&
		updates.preferredMentorGender !== existingLead.preferredMentorGender
	) {
		patch.preferredMentorGender = updates.preferredMentorGender;
		oldValue.preferredMentorGender = existingLead.preferredMentorGender ?? null;
		newValue.preferredMentorGender = updates.preferredMentorGender;
	}

	if (
		updates.isOrganic !== undefined &&
		updates.isOrganic !== existingLead.isOrganic
	) {
		patch.isOrganic = updates.isOrganic;
		oldValue.isOrganic = existingLead.isOrganic ?? false;
		newValue.isOrganic = updates.isOrganic;
	}

	return { patch, oldValue, newValue };
};

const toDemo = (demo: NonNullable<LeadDocument["demos"]>[number]): any => ({
	mentorId: demo.mentorId?.toString(),
	requestedAt: demo.requestedAt,
	assignedAt: demo.assignedAt,
	demoScheduledFor: demo.demoScheduledFor,
	completedAt: demo.completedAt,
	note: demo.note,
});

const fromDemo = (demo: any): NonNullable<LeadDocument["demos"]>[number] => ({
	mentorId: demo.mentorId,
	requestedAt: demo.requestedAt,
	assignedAt: demo.assignedAt,
	demoScheduledFor: demo.demoScheduledFor,
	completedAt: demo.completedAt,
	note: demo.note,
});

const getLatestDemo = (
	lead: LeadDocument,
): NonNullable<LeadDocument["demos"]>[number] | null => {
	const demos = lead.demos ?? [];
	return demos.length > 0 ? (demos[demos.length - 1] ?? null) : null;
};

const computeLeadStatus = (lead: LeadDocument): LeadStatus => {
	const latestDemo = getLatestDemo(lead);
	const hasPreviousDemo = (lead.demos?.length ?? 0) > 1;

	// Check if moved to admission/converted (top-level studentId)
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

const setLatestDemo = (
	lead: LeadDocument,
	patch: Partial<NonNullable<LeadDocument["demos"]>[number]>,
): NonNullable<LeadDocument["demos"]> => {
	const demos = [...(lead.demos ?? [])];
	if (demos.length === 0) {
		demos.push({ ...(patch as any) } as NonNullable<
			LeadDocument["demos"]
		>[number]);
		return demos;
	}

	const latestDemo = demos[demos.length - 1]!;
	demos[demos.length - 1] = {
		...latestDemo,
		...latestDemo,
		...patch,
	};

	return demos;
};

const mapLead = (doc: LeadDocument): Lead => ({
	id: doc._id.toString(),
	name: doc.name,
	phone: doc.phone,
	isOrganic: doc.isOrganic ?? false,
	slNo: doc.slNo,
	level: doc.level,
	assignedTo: toObjectIdString(doc.assignedTo),
	demoRequestAssignedTo: toObjectIdString(doc.demoRequestAssignedTo),
	createdBy: doc.createdBy.toString(),
	formSent: doc.formSent,
	formCompleted: doc.formCompleted,
	dateOfBirth: doc.dateOfBirth,
	residingCountry: doc.residingCountry,
	email: doc.email,
	gender: doc.gender,
	primaryWhatsappNumber: doc.primaryWhatsappNumber,
	alternateWhatsappNumber: doc.alternateWhatsappNumber,
	studentInfo: doc.studentInfo,
	preferredLanguage: doc.preferredLanguage,
	preferredSchedule: doc.preferredSchedule,
	preferredDays: doc.preferredDays ?? [],
	preferredPlan: doc.preferredPlan,
	preferredTimeslots: doc.preferredTimeslots ?? [],
	price: doc.price,
	hearAboutUs: doc.hearAboutUs,
	demoAvailability: doc.demoAvailability,
	preferredMentorGender: doc.preferredMentorGender,
	courseType: doc.courseType,
	nextFollowUpAt: toDateOrFallback(
		doc.nextFollowUpAt,
		doc.createdAt ?? new Date(),
	),
	status: doc.status ?? computeLeadStatus(doc),
	demos: (doc.demos ?? []).map(toDemo),
	createdAt: doc.createdAt,
	updatedAt: doc.updatedAt,
	closeReason: undefined,
	deletedBy: undefined,
	deletedAt: undefined,
});

export const LeadService = {
	/**
	 * Search leads by phone digits. Normalizes stored phones and filters
	 * by substring match. Returns up to 10 results.
	 */
	searchByPhone: async (digits: string): Promise<Lead[]> => {
		if (!digits) return [];
		const all = await LeadModel.find().lean<LeadDocument[]>();
		const normalize = (p: unknown) =>
			(typeof p === "string" ? p.replace(/\D/g, "") : "");
		const results = all
			.filter((doc) => normalize(doc.phone).includes(digits))
			.slice(0, 10)
			.map(mapLead);
		return results;
	},
	create: async (lead: {
		phone: string;
		name?: string;
		assignedTo?: string;
		isOrganic?: boolean;
		customNextFollowUpAt?: Date;
		createdBy: string;
		createdByName?: string;
	}): Promise<Lead> => {
		const now = new Date();
		const effectiveNextFollowUpAt = lead.customNextFollowUpAt ?? now;
		const slNo = await generateLeadSerialNumber();

		const created = await LeadModel.create({
			slNo,
			phone: lead.phone,
			name: lead.name,
			isOrganic: lead.isOrganic ?? false,
			assignedTo: lead.assignedTo
				? new Types.ObjectId(lead.assignedTo)
				: new Types.ObjectId(lead.createdBy),
			createdBy: lead.createdBy,
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
		updates: UpdateLeadPayload,
		performedBy?: string,
	): Promise<Lead | null> => {
		const existingLead = await LeadModel.findById(
			leadId,
		).lean<LeadDocument | null>();
		if (!existingLead) {
			return null;
		}

		const effectiveUpdates: UpdateLeadPayload = updates;

		const { patch, oldValue, newValue } = leadFieldPatch(
			existingLead,
			effectiveUpdates,
		);
		if (Object.keys(patch).length === 0) {
			return mapLead(existingLead);
		}

		const updatedLead = await LeadModel.findByIdAndUpdate(
			leadId,
			{ $set: patch },
			{ returnDocument: "after" },
		).lean<LeadDocument | null>();

		if (performedBy && updatedLead) {
			const type =
				Object.hasOwn(patch, "assignedTo") && Object.keys(patch).length === 1
					? "ASSIGNED"
					: Object.hasOwn(patch, "status") && Object.keys(patch).length === 1
						? "STATUS_CHANGED"
						: "UPDATED";
			await ActivityService.logActivity(
				leadId,
				type,
				performedBy,
				type === "ASSIGNED"
					? `Reassigned lead ${existingLead.phone}`
					: type === "STATUS_CHANGED"
						? `Changed lead stage for ${existingLead.phone}`
						: `Updated lead ${existingLead.phone}`,
				Object.keys(oldValue).length > 0 ? oldValue : undefined,
				Object.keys(newValue).length > 0 ? newValue : undefined,
			);
		}

		return updatedLead ? mapLead(updatedLead) : null;
	},

	findById: async (leadId: string): Promise<Lead | null> => {
		const lead = await LeadModel.findById(leadId)
			.populate("assignedTo", "name username")
			.lean<LeadDocument | null>();
		return lead ? mapLead(lead) : null;
	},

	listLeads: async (filters: {
		createdBy: string;
		scope: "all" | "mine";
		timeFilter: "all" | "today";
		status?: string;
		limit?: number;
		offset?: number;
		sortBy?: string;
		sortOrder?: "asc" | "desc";
		search?: string;
	}): Promise<{
		leads: Lead[];
		total: number;
		page: number;
		pageSize: number;
	}> => {
		const limit = filters.limit ?? 25;
		const offset = filters.offset ?? 0;
		const page = Math.floor(offset / limit) + 1;
		const sortBy = filters.sortBy ?? "nextFollowUpAt";
		const sortOrder = filters.sortOrder === "asc" ? 1 : -1;

		const leads = await LeadModel.find()
			.sort({ [sortBy]: sortOrder })
			.lean<LeadDocument[]>();

		let filtered = leads;
		if (filters.scope === "mine") {
			filtered = filtered.filter(
				(lead) => toObjectIdString(lead.assignedTo) === filters.createdBy,
			);
		}

		if (filters.timeFilter === "today") {
			const startOfDay = new Date();
			startOfDay.setHours(0, 0, 0, 0);
			const endOfDay = new Date();
			endOfDay.setHours(23, 59, 59, 999);
			filtered = filtered.filter((lead) => {
				const nextFollowUpAt = toDateOrFallback(
					lead.nextFollowUpAt,
					lead.createdAt ?? new Date(),
				);
				return nextFollowUpAt >= startOfDay && nextFollowUpAt <= endOfDay;
			});
		}

		if (filters.status) {
			filtered = filtered.filter((lead) => lead.status === filters.status);
		} else {
			// When no explicit status filter is applied (the "All" tab),
			// exclude closed/deleted leads — those are surfaced via separate views.
			filtered = filtered.filter((lead) => lead.status !== "CLOSED");
		}

		if (filters.search) {
			const q = filters.search.toLowerCase();
			filtered = filtered.filter(
				(lead) =>
					lead.name?.toLowerCase().includes(q) ||
					lead.phone?.includes(filters.search!) ||
					(lead as any).email?.toLowerCase().includes(q),
			);
		}

		const total = filtered.filter((lead) => {
			return !(lead as any).studentId;
		}).length;

		const paginatedLeads = filtered
			.filter((lead) => !(lead as any).studentId)
			.slice(offset, offset + limit)
			.map(mapLead);

		// Attach close reason from latest DELETED activity for closed leads
		const paginatedWithReasons = await Promise.all(
			paginatedLeads.map(async (lead) => {
				if (lead.status !== "CLOSED") return lead;
				try {
					const activities = await ActivityService.getLeadActivities(lead.id);
					const deleted = activities.find((a) => a.type === "DELETED");
					if (deleted) {
						lead.closeReason =
							deleted.note ?? (deleted.newValue as any)?.reason ?? undefined;
						lead.deletedBy = (deleted as any)?.performedByName ?? undefined;
						lead.deletedAt = (deleted as any)?.createdAt ?? undefined;
					}
				} catch (err) {
					// ignore activity lookup errors and return lead without reason
				}
				return lead;
			}),
		);

		return {
			leads: paginatedWithReasons,
			total,
			page,
			pageSize: limit,
		};
	},

	listPendingDemoRequests: async (): Promise<Lead[]> => {
		const leads = await LeadModel.find()
			.sort({ createdAt: -1 })
			.lean<LeadDocument[]>();
		return leads.filter((lead) => lead.status === "DEMO_REQUEST").map(mapLead);
	},

	listDemoRequests: async (): Promise<Lead[]> => {
		const leads = await LeadModel.find()
			.sort({ createdAt: -1 })
			.lean<LeadDocument[]>();
		return leads.filter((lead) => lead.status === "DEMO_ASSIGNED").map(mapLead);
	},

	listCompletedDemos: async (): Promise<Lead[]> => {
		const leads = await LeadModel.find({ status: "DEMO_COMPLETED" })
			.sort({ updatedAt: -1 })
			.lean<LeadDocument[]>();
		return leads.map(mapLead);
	},

	listAdmissionLeads: async (): Promise<Lead[]> => {
		const leads = await LeadModel.find()
			.sort({ createdAt: -1 })
			.lean<LeadDocument[]>();
		return leads
			.filter((lead) => {
				return Boolean(
					(lead as any).admissionRequestedAt && !(lead as any).studentId,
				);
			})
			.map(mapLead);
	},

	requestDemo: async (
		leadId: string,
		performedBy?: string,
	): Promise<Lead | null> => {
		const existingLead = await LeadModel.findById(
			leadId,
		).lean<LeadDocument | null>();
		if (!existingLead) return null;
		if (!existingLead.formCompleted) {
			throw new ConflictError("Form must be filled before requesting a demo");
		}

		const latestDemo = getLatestDemo(existingLead);
		if (latestDemo?.requestedAt && !latestDemo?.completedAt) {
			throw new ConflictError(
				"Cannot request a new demo while a demo is already pending",
			);
		}

		const now = new Date();
		const demos = [...(existingLead.demos ?? [])];
		demos.push({
			requestedAt: now,
		});

		const updatedLead = await LeadModel.findByIdAndUpdate(
			leadId,
			{
				$set: {
					demos,
					nextFollowUpAt: now,
					status: "DEMO_REQUEST",
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

	markDemoCompleted: async (
		leadId: string,
		performedBy?: string,
		note?: string,
	): Promise<Lead | null> => {
		const existingLead = await LeadModel.findById(
			leadId,
		).lean<LeadDocument | null>();
		if (!existingLead) return null;

		const now = new Date();
		const demos = setLatestDemo(existingLead, {
			completedAt: now,
		});

		const updatedLead = await LeadModel.findByIdAndUpdate(
			leadId,
			{
				$set: {
					demos,
					status: "DEMO_COMPLETED",
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

	unmarkDemoCompleted: async (
		leadId: string,
		performedBy?: string,
	): Promise<Lead | null> => {
		const existingLead = await LeadModel.findById(leadId).lean<LeadDocument | null>();
		if (!existingLead) return null;

		const demos = [...(existingLead.demos ?? [])];
		if (demos.length === 0) return null;
		const latestDemo = demos[demos.length - 1]!;
		if (!latestDemo.completedAt) return mapLead(existingLead);

		const { completedAt: _removed, ...demoWithoutCompleted } = latestDemo as any;
		demos[demos.length - 1] = demoWithoutCompleted;

		const revertedStatus =
			latestDemo.mentorId && latestDemo.assignedAt ? "DEMO_ASSIGNED" : "DEMO_REQUEST";

		const updatedLead = await LeadModel.findByIdAndUpdate(
			leadId,
			{ $set: { demos, status: revertedStatus } },
			{ returnDocument: "after" },
		).lean<LeadDocument | null>();

		if (performedBy && updatedLead) {
			await ActivityService.logActivity(
				leadId,
				"DEMO_REVERTED",
				performedBy,
				`Reverted demo completion for ${existingLead.phone}`,
			);
		}

		return updatedLead ? mapLead(updatedLead) : null;
	},

	redemo: async (
		leadId: string,
		mentorId: string | undefined,
		performedBy?: string,
		note?: string,
		counsellorId?: string,
	): Promise<Lead | null> => {
		const existingLead = await LeadModel.findById(
			leadId,
		).lean<LeadDocument | null>();
		if (!existingLead) return null;

		const now = new Date();
		const previousMentorId = getLatestDemo(existingLead)?.mentorId?.toString();
		const effectiveMentorId = mentorId ?? previousMentorId;
		const effectiveNote = note?.trim() || undefined;
		const demos = [...(existingLead.demos ?? [])];
		demos.push({
			mentorId: effectiveMentorId,
			requestedAt: now,
			note: effectiveNote,
		});

		const updatedLead = await LeadModel.findByIdAndUpdate(
			leadId,
			{
				$set: {
					demos,
					nextFollowUpAt: now,
					status: "DEMO_REQUEST",
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
				{
					mentorId: effectiveMentorId,
					requestedAt: now.toISOString(),
					counsellorId,
				},
				effectiveNote,
			);
		}

		return updatedLead ? mapLead(updatedLead) : null;
	},

	assignDemoCounsellor: async (
		leadId: string,
		counsellorId: string,
		performedBy?: string,
	): Promise<Lead | null> => {
		const existingLead = await LeadModel.findById(
			leadId,
		).lean<LeadDocument | null>();
		if (!existingLead) return null;

		// Counsellor assignment removed from demo subdocument. No-op update.
		if (performedBy) {
			await ActivityService.logActivity(
				leadId,
				"DEMO_COUNSELLOR_ASSIGNED",
				performedBy,
				`Assigned counsellor to demo for ${existingLead.phone}`,
				undefined,
				{ counsellorId },
			);
		}

		return mapLead(existingLead);
	},

	assignDemoMentor: async (
		leadId: string,
		mentorId: string,
		demoScheduledFor: Date,
		performedBy?: string,
	): Promise<Lead | null> => {
		const existingLead = await LeadModel.findById(
			leadId,
		).lean<LeadDocument | null>();
		if (!existingLead) return null;

		const now = new Date();
		const demos = setLatestDemo(existingLead, {
			mentorId,
			assignedAt: now,
			demoScheduledFor,
		});

		const nextFollowUpAt = existingLead.nextFollowUpAt ?? new Date();

		const updatedLead = await LeadModel.findByIdAndUpdate(
			leadId,
			{
				$set: {
					demos,
					status: "DEMO_ASSIGNED",
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
					demoScheduledFor:
						getLatestDemo(existingLead)?.demoScheduledFor?.toISOString(),
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
		counsellorId?: string,
		performedBy?: string,
		note?: string,
	): Promise<Lead | null> => {
		const existingLead = await LeadModel.findById(
			leadId,
		).lean<LeadDocument | null>();
		if (!existingLead) return null;

		const now = new Date();

		const updatedLead = await LeadModel.findByIdAndUpdate(
			leadId,
			{
				$set: {
					admissionRequestedAt: now,
					status: "CONVERTED",
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
				undefined,
				{ admissionRequestedAt: now.toISOString() },
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
		const existingLead = await LeadModel.findById(
			leadId,
		).lean<LeadDocument | null>();
		if (!existingLead) return null;

		const now = new Date();
		const latestDemo = getLatestDemo(existingLead);
		// Update only top-level nextFollowUpAt; demo-level contact fields removed.
		const demos = existingLead.demos ?? [];

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
				undefined,
				{ customNextFollowUpAt: customNextFollowUpAt.toISOString() },
				note,
			);
		}

		return updatedLead ? mapLead(updatedLead) : null;
	},

	generateFormLink: async (leadId: string, performedBy?: string) => {
		const existingLead = await LeadModel.findById(
			leadId,
		).lean<LeadDocumentExt | null>();
		if (!existingLead) {
			return null;
		}

		const appUrl = env.APP_URL;
		if (existingLead.formSent && existingLead.formToken) {
			return {
				formLink: `${appUrl}/form/${leadId}?token=${existingLead.formToken}`,
			};
		}

		if (!existingLead.courseType) {
			throw new ValidationError({
				courseType: [
					"Set course type (GROUP or INDIVIDUAL) before sending form",
				],
			});
		}

		// Generate a secure random token
		const token = randomBytes(32).toString("hex");

		// Get app URL from environment or use default
		const formLink = `${appUrl}/form/${leadId}?token=${token}`;
		const nextFollowUpAt = new Date(Date.now() + FOLLOW_UP_PERIOD_MS.lead);

		// Save token to database
		await LeadModel.findByIdAndUpdate(leadId, {
			formToken: token,
			formSent: true,
			status: "FORM_SENT",
			nextFollowUpAt,
			formTokenExpiresAt: undefined,
		});

		if (performedBy) {
			await ActivityService.logActivity(
				leadId,
				"FORM_SENT",
				performedBy,
				"Form link generated and sent",
				{
					formSent: existingLead.formSent ?? false,
					nextFollowUpAt: existingLead.nextFollowUpAt?.toISOString(),
				},
				{ formSent: true, nextFollowUpAt: nextFollowUpAt.toISOString() },
			);
		}

		return {
			formLink,
		};
	},

	revokeFormLink: async (
		leadId: string,
		performedBy?: string,
	): Promise<Lead | null> => {
		const existingLead = await LeadModel.findById(
			leadId,
		).lean<LeadDocument | null>();
		if (!existingLead) {
			return null;
		}

		const updatedLead = await LeadModel.findByIdAndUpdate(
			leadId,
			{
				$set: {
					formSent: false,
					formToken: undefined,
					formTokenExpiresAt: undefined,
				},
			},
			{ returnDocument: "after" },
		).lean<LeadDocument | null>();

		if (performedBy && updatedLead) {
			await ActivityService.logActivity(
				leadId,
				"FORM_REVOKED",
				performedBy,
				"Form access revoked",
				{ formSent: existingLead.formSent ?? false },
				{ formSent: false },
			);
		}

		return updatedLead ? mapLead(updatedLead) : null;
	},

	cancelDemo: async (
		leadId: string,
		performedBy?: string,
	): Promise<Lead | null> => {
		const existingLead = await LeadModel.findById(
			leadId,
		).lean<LeadDocument | null>();
		if (!existingLead) {
			return null;
		}

		const demos = [...(existingLead.demos ?? [])];
		if (demos.length === 0) {
			return mapLead(existingLead);
		}

		const latestDemo = demos[demos.length - 1];
		if (
			latestDemo?.completedAt ||
			(existingLead as any).admissionRequestedAt ||
			(existingLead as any).studentId
		) {
			return mapLead(existingLead);
		}

		demos.pop();

		const updatedLead = await LeadModel.findByIdAndUpdate(
			leadId,
			{
				$set: {
					demos,
					status: computeLeadStatus({ ...existingLead, demos }),
				},
			},
			{ returnDocument: "after" },
		).lean<LeadDocument | null>();

		if (performedBy && updatedLead) {
			await ActivityService.logActivity(
				leadId,
				"DEMO_CANCELLED",
				performedBy,
				`Cancelled demo workflow for ${existingLead.phone}`,
				{ requestedAt: latestDemo?.requestedAt?.toISOString() },
				undefined,
			);
		}

		return updatedLead ? mapLead(updatedLead) : null;
	},

	submitLeadForm: async (
		leadId: string,
		token: string,
		data: LeadFormData,
	): Promise<{ ok: boolean } | null> => {
		const existingLead = await LeadModel.findById(leadId);
		if (!existingLead) {
			return null;
		}

		// Validate token
		const lead = existingLead as LeadDocumentExt;
		if (!lead.formSent || !lead.formToken || lead.formToken !== token) {
			return null;
		}

		// Update lead: mark form as completed, fill in form data, clear token
		// ZID will be generated later during admission confirmation
		const preferredPlan = data.preferredPlan;
		const preferredTimeslots = data.preferredTimeslots ?? [];

		const updatedLead = await LeadModel.findByIdAndUpdate(
			leadId,
			{
				$set: {
					formCompleted: true,
					status: "FORM_FILLED",
					// keep `formSent` as true to indicate a form was sent historically
					formSent: true,
					name: data.name,
					dateOfBirth: data.dateOfBirth,
					residingCountry: data.residingCountry,
					level: data.level,
					gender: data.gender,
					primaryWhatsappNumber: data.primaryWhatsappNumber,
					alternateWhatsappNumber: data.alternateWhatsappNumber,
					studentInfo: data.studentInfo,
					preferredLanguage: data.preferredLanguage,
					preferredSchedule: data.preferredSchedule,
					preferredDays: data.preferredDays,
					preferredPlan,
					preferredTimeslots,
					price: data.price,
					hearAboutUs: data.hearAboutUs,
					demoAvailability: data.demoAvailability,
					preferredMentorGender: data.preferredMentorGender,
					email: (data as any).email,
					courseType: (data as any).courseType,
				},
				$unset: {
					formToken: "",
					formTokenExpiresAt: "",
				},
			},
			{ returnDocument: "after" },
		);

		if (!updatedLead) {
			return null;
		}

		// Log activity
		await ActivityService.logActivity(
			leadId,
			"FORM_SUBMITTED",
			existingLead.createdBy.toString(),
			`Form submitted for ${existingLead.phone}`,
			{},
			{ formCompleted: true, name: data.name },
		);

		return {
			ok: true,
		};
	},

	validateFormLink: async (
		leadId: string,
		token: string,
	): Promise<{
		isValid: boolean;
		expiresAt?: string;
		prefill?: {
			courseType?: "GROUP" | "INDIVIDUAL";
			name?: string;
			dateOfBirth?: string;
			residingCountry?: string;
			level?: string;
			gender?: "male" | "female";
			primaryWhatsappNumber?: string;
			alternateWhatsappNumber?: string;
			studentInfo?: string;
			preferredLanguage?:
				| "Malayalam Only"
				| "English Only"
				| "Malayalam - English Mixed";
			preferredSchedule?: string;
			preferredDays?: string[];
			preferredPlan?: {
				timesPerWeek: number;
				durationMinutes: number;
			};
			preferredTimeslots?: {
				startTime: string;
				endTime: string;
			}[];
			hearAboutUs?: string;
			demoAvailability?: string;
			preferredMentorGender?: "male" | "female" | "both";
		};
	}> => {
		const existingLead = await LeadModel.findById(
			leadId,
		).lean<LeadDocument | null>();
		if (!existingLead) {
			return { isValid: false };
		}

		const lead = existingLead as LeadDocumentExt;
		// If form already completed, token should be considered expired
		if (lead.formCompleted) {
			return { isValid: false };
		}

		if (!lead.formSent || !lead.formToken || lead.formToken !== token) {
			return { isValid: false };
		}

		const prefill = {
			courseType: existingLead.courseType,
			name: existingLead.name,
			dateOfBirth: existingLead.dateOfBirth?.toISOString(),
			residingCountry: existingLead.residingCountry,
			level: existingLead.level,
			gender: existingLead.gender,
			primaryWhatsappNumber:
				existingLead.primaryWhatsappNumber ?? existingLead.phone,
			alternateWhatsappNumber: existingLead.alternateWhatsappNumber,
			studentInfo: existingLead.studentInfo,
			preferredLanguage: existingLead.preferredLanguage,
			preferredSchedule: existingLead.preferredSchedule,
			preferredDays: existingLead.preferredDays,
			preferredPlan: existingLead.preferredPlan,
			preferredTimeslots: existingLead.preferredTimeslots,
			price: existingLead.price,
			hearAboutUs: existingLead.hearAboutUs,
			demoAvailability: existingLead.demoAvailability,
			preferredMentorGender: existingLead.preferredMentorGender,
		};

		return {
			isValid: true,
			prefill,
		};
	},

	delete: async (
		leadId: string,
		performedBy?: string,
		performedByName?: string,
		note?: string,
	): Promise<boolean> => {
		const existingLead = await LeadModel.findById(
			leadId,
		).lean<LeadDocument | null>();
		const result = await LeadModel.findByIdAndUpdate(
			leadId,
			{
				$set: {
					status: "CLOSED",
					formSent: false,
					formCompleted: false,
					formToken: undefined,
					formTokenExpiresAt: undefined,
				},
				// A closed lead no longer needs a follow-up reminder.
				$unset: { nextFollowUpAt: 1 },
			},
			{ returnDocument: "after" },
		);

		if (performedBy && existingLead) {
			await ActivityService.logActivity(
				leadId,
				"DELETED",
				performedBy,
				note
					? `Lead deleted: ${existingLead.phone}`
					: `Lead deleted: ${existingLead.phone}`,
				{ phone: existingLead.phone, name: existingLead.name },
				note ? { reason: note } : undefined,
				note,
			);
		}

		return result !== null;
	},
};
