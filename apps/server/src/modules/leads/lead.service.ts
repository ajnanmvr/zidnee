import type {
	Lead,
	LeadFormData,
	LeadStatus,
	UpdateLeadPayload,
} from "@repo/schema";
import { randomBytes } from "crypto";
import { Types } from "mongoose";
import { ConflictError } from "../../utils/errors.util.js";
import {
	type StudentDocument,
	StudentModel,
} from "../students/student.model.js";
import { TimeSlotModel } from "../timeslots/timeslot.model.js";
import { ZidService } from "../zid/zid.service.js";
import { ActivityService } from "./activity.service.js";
import { generateLeadSerialNumber } from "./lead-sequence.model.js";
import type { LeadDocumentExt } from "./lead.model.js";
import { type LeadDocument, LeadModel } from "./lead.model.js";
import { env } from "process";

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
		updates.preferredTimeslots !== undefined &&
		JSON.stringify(updates.preferredTimeslots) !==
		JSON.stringify(existingLead.preferredTimeslots ?? [])
	) {
		patch.preferredTimeslots = updates.preferredTimeslots;
		oldValue.preferredTimeslots = existingLead.preferredTimeslots ?? null;
		newValue.preferredTimeslots = updates.preferredTimeslots;
	}

	if (updates.price !== undefined && updates.price !== existingLead.price) {
		patch.price = updates.price;
		oldValue.price = existingLead.price ?? null;
		newValue.price = updates.price;
	}

	if (
		updates.startClassWhen !== undefined &&
		updates.startClassWhen !== existingLead.startClassWhen
	) {
		patch.startClassWhen = updates.startClassWhen;
		oldValue.startClassWhen = existingLead.startClassWhen ?? null;
		newValue.startClassWhen = updates.startClassWhen;
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

	return { patch, oldValue, newValue };
};

const toDemo = (
	demo: NonNullable<LeadDocument["demos"]>[number],
): LeadDemo => ({
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

const fromDemo = (
	demo: LeadDemo,
): NonNullable<LeadDocument["demos"]>[number] => ({
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

const getLatestDemo = (
	lead: LeadDocument,
): NonNullable<LeadDocument["demos"]>[number] | null => {
	const demos = lead.demos ?? [];
	return demos.length > 0 ? (demos[demos.length - 1] ?? null) : null;
};

const computeLeadStatus = (lead: LeadDocument): LeadStatus => {
	const latestDemo = getLatestDemo(lead);
	const hasPreviousDemo = (lead.demos?.length ?? 0) > 1;

	// Check if moved to admission/converted
	if (latestDemo?.studentId) {
		return "CONVERTED";
	}

	if (latestDemo?.admissionCompletedAt) {
		return "CONVERTED";
	}

	// Demo completed
	if (
		latestDemo?.completedAt &&
		latestDemo?.requestedAt &&
		!latestDemo?.studentId
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
		demos.push({ demoRequired: false, ...patch } as NonNullable<
			LeadDocument["demos"]
		>[number]);
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
	preferredTimeslots: doc.preferredTimeslots ?? [],
	price: doc.price,
	startClassWhen: doc.startClassWhen,
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
		const slNo = await generateLeadSerialNumber();

		const created = await LeadModel.create({
			slNo,
			phone: lead.phone,
			name: lead.name,
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

		let effectiveUpdates: UpdateLeadPayload = updates;
		if (updates.preferredTimeslots !== undefined) {
			const items = updates.preferredTimeslots as unknown[];
			const needsFetch = items.some(
				(it) =>
					typeof it === "string" ||
					(it && (it as any).id) ||
					(it && (it as any)._id),
			);
			if (needsFetch) {
				const ids = items
					.map((it) =>
						typeof it === "string"
							? it
							: it && ((it as any).id ?? (it as any)._id),
					)
					.filter(Boolean)
					.map(String);

				const timeslots = await TimeSlotModel.find({ _id: { $in: ids } })
					.lean()
					.exec();
				const map = new Map(timeslots.map((t) => [t._id.toString(), t]));
				const normalized = items.map((it) => {
					if (typeof it === "string") {
						const ts = map.get(it);
						return ts
							? {
								label: ts.label,
								durationMinutes: ts.durationMinutes,
								timesPerWeek: ts.timesPerWeek,
							}
							: { label: it };
					}
					if (it && (it as any).id) {
						const id = String((it as any).id);
						const ts = map.get(id);
						return ts
							? {
								label: ts.label,
								durationMinutes: ts.durationMinutes,
								timesPerWeek: ts.timesPerWeek,
							}
							: { label: (it as any).label ?? id };
					}
					if (it && (it as any)._id) {
						const id = String((it as any)._id);
						const ts = map.get(id);
						return ts
							? {
								label: ts.label,
								durationMinutes: ts.durationMinutes,
								timesPerWeek: ts.timesPerWeek,
							}
							: { label: (it as any).label ?? id };
					}
					// already a snapshot
					return it as any;
				});

				effectiveUpdates = { ...updates, preferredTimeslots: normalized };
			}
		}

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
					: "UPDATED";
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
		}

		const total = filtered.filter((lead) => {
			const latestDemo = getLatestDemo(lead);
			return !latestDemo?.studentId;
		}).length;

		const paginatedLeads = filtered
			.filter((lead) => {
				const latestDemo = getLatestDemo(lead);
				return !latestDemo?.studentId;
			})
			.slice(offset, offset + limit)
			.map(mapLead);

		return {
			leads: paginatedLeads,
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

	listAdmissionLeads: async (): Promise<Lead[]> => {
		const leads = await LeadModel.find()
			.sort({ createdAt: -1 })
			.lean<LeadDocument[]>();
		return leads
			.filter((lead) => {
				const latestDemo = getLatestDemo(lead);
				return Boolean(
					latestDemo?.admissionRequestedAt && !latestDemo?.studentId,
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
			demoRequired: false,
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
		const demos = [...(existingLead.demos ?? [])];
		demos.push({
			mentorId: effectiveMentorId,
			counsellorId,
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
				note,
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

		const demos = setLatestDemo(existingLead, {
			counsellorId,
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
				"DEMO_COUNSELLOR_ASSIGNED",
				performedBy,
				`Assigned counsellor to demo for ${existingLead.phone}`,
				undefined,
				{ counsellorId },
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
		const existingLead = await LeadModel.findById(
			leadId,
		).lean<LeadDocument | null>();
		if (!existingLead) return null;

		const now = new Date();
		const nextFollowUpAt = new Date(
			demoScheduledFor.getTime() + 60 * 60 * 1000,
		);
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
		counsellorId: string,
		performedBy?: string,
		note?: string,
	): Promise<Lead | null> => {
		const existingLead = await LeadModel.findById(
			leadId,
		).lean<LeadDocument | null>();
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
				{
					admissionCounsellorId:
						getLatestDemo(existingLead)?.admissionCounsellorId?.toString(),
				},
				{
					admissionCounsellorId: counsellorId,
					admissionRequestedAt: now.toISOString(),
				},
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
		const demos = latestDemo
			? setLatestDemo(existingLead, {
				lastContactedAt: now,
				customNextFollowUpAt,
				nextFollowUpAt: customNextFollowUpAt,
			})
			: (existingLead.demos ?? []);

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
				{
					customNextFollowUpAt:
						getLatestDemo(existingLead)?.customNextFollowUpAt?.toISOString(),
				},
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

		const appUrl = env.APP_URL
		if (existingLead.formSent && existingLead.formToken) {
			return {
				formLink: `${appUrl}/form/${leadId}?token=${existingLead.formToken}`,
			};
		}

		// Generate a secure random token
		const token = randomBytes(32).toString("hex");

		// Get app URL from environment or use default
		const formLink = `${appUrl}/form/${leadId}?token=${token}`;
		const nextFollowUpAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

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
			latestDemo?.admissionRequestedAt ||
			latestDemo?.admissionCompletedAt ||
			latestDemo?.studentId
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
		let preferredTimeslots = data.preferredTimeslots;
		if (
			Array.isArray(data.preferredTimeslots) &&
			data.preferredTimeslots.length > 0
		) {
			const items = data.preferredTimeslots as unknown[];
			const needsFetch = items.some(
				(it) =>
					typeof it === "string" ||
					(it && (it as any).id) ||
					(it && (it as any)._id),
			);
			if (needsFetch) {
				const ids = items
					.map((it) =>
						typeof it === "string"
							? it
							: it && ((it as any).id ?? (it as any)._id),
					)
					.filter(Boolean)
					.map(String);

				const timeslots = await TimeSlotModel.find({ _id: { $in: ids } })
					.lean()
					.exec();
				const map = new Map(timeslots.map((t) => [t._id.toString(), t]));
				preferredTimeslots = items.map((it) => {
					if (typeof it === "string") {
						const ts = map.get(it);
						return ts
							? {
								label: ts.label,
								durationMinutes: ts.durationMinutes,
								timesPerWeek: ts.timesPerWeek,
							}
							: { label: it };
					}
					if (it && (it as any).id) {
						const id = String((it as any).id);
						const ts = map.get(id);
						return ts
							? {
								label: ts.label,
								durationMinutes: ts.durationMinutes,
								timesPerWeek: ts.timesPerWeek,
							}
							: { label: (it as any).label ?? id };
					}
					if (it && (it as any)._id) {
						const id = String((it as any)._id);
						const ts = map.get(id);
						return ts
							? {
								label: ts.label,
								durationMinutes: ts.durationMinutes,
								timesPerWeek: ts.timesPerWeek,
							}
							: { label: (it as any).label ?? id };
					}
					return it as any;
				});
			}
		}

		const updatedLead = await LeadModel.findByIdAndUpdate(
			leadId,
			{
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
				preferredTimeslots,
				price: data.price,
				startClassWhen: data.startClassWhen,
				hearAboutUs: data.hearAboutUs,
				demoAvailability: data.demoAvailability,
				preferredMentorGender: data.preferredMentorGender,
				email: (data as any).email,
				courseType: (data as any).courseType,
				formToken: undefined,
				formTokenExpiresAt: new Date(),
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
			preferredTimeslots?: {
				label: string;
				timesPerWeek: number;
				durationMinutes: number;
			}[];
			startClassWhen?: string;
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
			preferredTimeslots: existingLead.preferredTimeslots,
			price: existingLead.price,
			startClassWhen: existingLead.startClassWhen,
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
		const result = await LeadModel.findByIdAndDelete(leadId);

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
