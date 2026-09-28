import { ZID_CONSTANTS } from "@repo/schema";
import { ZidConflictError } from "../../utils/errors.util.js";

const DEFAULT_PAD_LENGTH = 3;
const MAX_SUGGESTION_ATTEMPTS = 1000;

const escapeRegex = (value: string) =>
	value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Matches `<prefix><digits>` (case-insensitive), capturing the digits. */
export const zidPattern = (prefix: string) =>
	new RegExp(`^${escapeRegex(prefix)}(\\d+)$`, "i");

/** Matches exactly `id` (case-insensitive). */
export const exactZidPattern = (id: string) =>
	new RegExp(`^${escapeRegex(id)}$`, "i");

export type ZidResolveOptions = {
	prefix: string;
	/** Request-body path the client should resend a replacement in. */
	field: string;
	/** ID typed by the user; used as-is (uppercased) instead of generating. */
	manual?: string | null;
	/** The ID of the most recently created record with this prefix. */
	findLastId: () => Promise<string | null | undefined>;
	/** Whether `id` is already taken by any record. */
	exists: (id: string) => Promise<boolean>;
};

export const ZidService = {
	/**
	 * The ID after `lastId`: same prefix, number + 1, keeping the digit width
	 * of `lastId` (e.g. ZID045 → ZID046). With no previous ID, starts at
	 * ZID_CONSTANTS.startNumber.
	 */
	nextAfter: (prefix: string, lastId?: string | null): string => {
		const match = lastId?.match(zidPattern(prefix));
		if (!match?.[1]) {
			return `${prefix}${String(ZID_CONSTANTS.startNumber).padStart(DEFAULT_PAD_LENGTH, "0")}`;
		}
		const digits = match[1];
		return `${prefix}${String(Number(digits) + 1).padStart(digits.length, "0")}`;
	},

	/**
	 * Returns the ID to use for a new record: the manual one if given,
	 * otherwise the one after the last created record. Throws
	 * ZidConflictError (with a free suggestion) if that ID is already taken,
	 * so the user can type a replacement.
	 */
	resolve: async (options: ZidResolveOptions): Promise<string> => {
		const manual = options.manual?.trim().toUpperCase();
		const candidate =
			manual ||
			ZidService.nextAfter(options.prefix, await options.findLastId());

		if (await options.exists(candidate)) {
			throw await ZidService.conflict(options, candidate);
		}

		return candidate;
	},

	/** Builds a ZidConflictError for `takenId`, with the next free ID as suggestion. */
	conflict: async (
		options: Pick<ZidResolveOptions, "prefix" | "field" | "exists">,
		takenId: string,
	): Promise<ZidConflictError> => {
		let suggestion = ZidService.nextAfter(
			options.prefix,
			zidPattern(options.prefix).test(takenId) ? takenId : null,
		);
		for (
			let attempt = 0;
			attempt < MAX_SUGGESTION_ATTEMPTS && (await options.exists(suggestion));
			attempt++
		) {
			suggestion = ZidService.nextAfter(options.prefix, suggestion);
		}
		return new ZidConflictError(
			takenId,
			suggestion,
			options.prefix,
			options.field,
		);
	},

	/** Mongo duplicate-key error (a concurrent create took the same ID). */
	isDuplicateKeyError: (error: unknown): boolean =>
		typeof error === "object" &&
		error !== null &&
		(error as { code?: unknown }).code === 11000,
};
