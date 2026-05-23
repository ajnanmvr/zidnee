import type {
	CreateMentorSubstitutionPayload,
	MentorSubstitution,
	MentorSubstitutionStatus,
	UpdateMentorSubstitutionPayload,
} from "@repo/schema";
import { MentorSubstitutionModel } from "./mentor-substitution.model.js";

export class MentorSubstitutionService {
	/**
	 * Create a new mentor substitution
	 */
	static async createSubstitution(
		payload: CreateMentorSubstitutionPayload,
		createdBy: string,
	): Promise<MentorSubstitution> {
		const document = await MentorSubstitutionModel.create({
			...payload,
			createdBy,
		});

		return this.docToEntity(document);
	}

	/**
	 * Get substitution by ID
	 */
	static async getSubstitutionById(
		substitutionId: string,
	): Promise<MentorSubstitution | null> {
		const document = await MentorSubstitutionModel.findById(substitutionId);
		return document ? this.docToEntity(document) : null;
	}

	/**
	 * Get all substitutions for a mentor (as original or substitute)
	 */
	static async getSubstitutionsByMentorId(
		mentorId: string,
	): Promise<MentorSubstitution[]> {
		const documents = await MentorSubstitutionModel.find({
			$or: [{ originalMentorId: mentorId }, { substituteMentorId: mentorId }],
		});

		return documents.map((doc) => this.docToEntity(doc));
	}

	/**
	 * Get substitutions where mentor is the original (being substituted)
	 */
	static async getSubstitutionsAsOriginal(
		mentorId: string,
	): Promise<MentorSubstitution[]> {
		const documents = await MentorSubstitutionModel.find({
			originalMentorId: mentorId,
		}).sort({ endDate: -1 });

		return documents.map((doc) => this.docToEntity(doc));
	}

	/**
	 * Get substitutions where mentor is the substitute
	 */
	static async getSubstitutionsAsSubstitute(
		mentorId: string,
	): Promise<MentorSubstitution[]> {
		const documents = await MentorSubstitutionModel.find({
			substituteMentorId: mentorId,
		}).sort({ endDate: -1 });

		return documents.map((doc) => this.docToEntity(doc));
	}

	/**
	 * Get all active substitutions (sorted by end date)
	 */
	static async getAllSubstitutions(): Promise<MentorSubstitution[]> {
		const documents = await MentorSubstitutionModel.find({}).sort({
			endDate: -1,
		});

		return documents.map((doc) => this.docToEntity(doc));
	}

	/**
	 * Get substitutions grouped by status
	 */
	static async getSubstitutionsByStatus(
		status: MentorSubstitutionStatus,
	): Promise<MentorSubstitution[]> {
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		let query: Record<string, unknown> = {};

		switch (status) {
			case "today":
				query = {
					startDate: { $gte: today, $lt: tomorrow },
				};
				break;

			case "upcoming":
				query = {
					startDate: { $gte: tomorrow },
				};
				break;

			case "past-due":
				query = {
					endDate: { $lt: today },
				};
				break;

			case "active":
				query = {
					startDate: { $lte: now },
					endDate: { $gte: now },
				};
				break;
		}

		const documents = await MentorSubstitutionModel.find(query).sort({
			endDate: -1,
		});

		return documents.map((doc) => this.docToEntity(doc));
	}

	/**
	 * Update a substitution (primarily for early end date)
	 */
	static async updateSubstitution(
		substitutionId: string,
		payload: UpdateMentorSubstitutionPayload,
	): Promise<MentorSubstitution | null> {
		const document = await MentorSubstitutionModel.findByIdAndUpdate(
			substitutionId,
			payload,
			{ new: true },
		);

		return document ? this.docToEntity(document) : null;
	}

	/**
	 * Delete a substitution
	 */
	static async deleteSubstitution(substitutionId: string): Promise<boolean> {
		const result = await MentorSubstitutionModel.findByIdAndDelete(
			substitutionId,
		);

		return !!result;
	}

	/**
	 * Get active substitutions for a date range
	 */
	static async getActiveSubstitutions(
		date: Date = new Date(),
	): Promise<MentorSubstitution[]> {
		const documents = await MentorSubstitutionModel.find({
			startDate: { $lte: date },
			endDate: { $gte: date },
		}).sort({ endDate: 1 });

		return documents.map((doc) => this.docToEntity(doc));
	}

	/**
	 * Get substitution status for display
	 */
	static getSubstitutionStatus(
		substitution: MentorSubstitution,
	): MentorSubstitutionStatus {
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		const startDate = new Date(substitution.startDate);
		startDate.setHours(0, 0, 0, 0);

		const endDate = new Date(substitution.endDate);
		endDate.setHours(23, 59, 59, 999);

		// Check if today
		if (startDate.getTime() === today.getTime()) {
			return "today";
		}

		// Check if active
		if (now >= startDate && now <= endDate) {
			return "active";
		}

		// Check if past due
		if (endDate < today) {
			return "past-due";
		}

		// Otherwise upcoming
		return "upcoming";
	}

	/**
	 * Convert MongoDB document to entity
	 */
	private static docToEntity(doc: any): MentorSubstitution {
		return {
			id: doc._id.toString(),
			originalMentorId: doc.originalMentorId,
			substituteMentorId: doc.substituteMentorId,
			startDate: doc.startDate,
			endDate: doc.endDate,
			reason: doc.reason,
			createdBy: doc.createdBy,
			createdAt: doc.createdAt,
			updatedAt: doc.updatedAt,
		};
	}
}
