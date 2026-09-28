import { ZID_CONSTANTS } from "@repo/schema";
import { Types } from "mongoose";
import { exactZidPattern, ZidService, zidPattern } from "../zid/zid.service.js";
import { UserModel } from "./user.model.js";

export const USER_IDENTITY_PREFIXES = {
	mentor: ZID_CONSTANTS.prefixes.mentor,
	groupMentor: ZID_CONSTANTS.prefixes.groupMentor,
	counsellor: ZID_CONSTANTS.prefixes.counsellor,
	sales: ZID_CONSTANTS.prefixes.sales,
	admin: ZID_CONSTANTS.prefixes.admin,
} as const;

// Every place a user's ZID can live (legacy users only have it in username
// or the top-level mentorId/counsellorId).
const USER_ZID_FIELDS = [
	"zids.mentor",
	"zids.counsellor",
	"zids.sales",
	"zids.admin",
	"mentorId",
	"counsellorId",
	"username",
] as const;

type UserZidLean = {
	zids?: Record<string, string | undefined>;
	mentorId?: string;
	counsellorId?: string;
	username?: string;
};

const userZidOptions = (
	prefix: string,
	field: string,
	excludeUserId?: string,
) => ({
	prefix,
	field,
	findLastId: async () => {
		const pattern = zidPattern(prefix);
		const last = await UserModel.findOne({
			$or: USER_ZID_FIELDS.map((f) => ({ [f]: pattern })),
		})
			.sort({ createdAt: -1, _id: -1 })
			.select({ zids: 1, mentorId: 1, counsellorId: 1, username: 1 })
			.lean<UserZidLean | null>();
		if (!last) return null;
		return [
			last.zids?.mentor,
			last.zids?.counsellor,
			last.zids?.sales,
			last.zids?.admin,
			last.mentorId,
			last.counsellorId,
			last.username,
		].find((value) => value && pattern.test(value));
	},
	exists: async (id: string) => {
		const pattern = exactZidPattern(id);
		return Boolean(
			await UserModel.exists({
				$or: USER_ZID_FIELDS.map((f) => ({ [f]: pattern })),
				...(excludeUserId && Types.ObjectId.isValid(excludeUserId)
					? { _id: { $ne: new Types.ObjectId(excludeUserId) } }
					: {}),
			}),
		);
	},
});

/**
 * ZID for a user role: `manual` if given, else next after the most recently
 * created user holding that prefix. `field` is where the client resends a
 * replacement on conflict (e.g. "zid" or "zids.mentor").
 */
export const resolveUserZid = (options: {
	prefix: string;
	field: string;
	manual?: string;
	excludeUserId?: string;
}) =>
	ZidService.resolve({
		...userZidOptions(options.prefix, options.field, options.excludeUserId),
		manual: options.manual,
	});

export const userZidConflict = (prefix: string, field: string, zid: string) =>
	ZidService.conflict(userZidOptions(prefix, field), zid);

/**
 * Runs a user create/update, turning a duplicate-key race on one of the
 * given ZIDs into a ZID conflict the user can resolve.
 */
export const withUserZidGuard = async <T>(
	fn: () => Promise<T>,
	entries: Array<{ kind: string; prefix: string; field: string; zid: string }>,
): Promise<T> => {
	try {
		return await fn();
	} catch (error) {
		if (ZidService.isDuplicateKeyError(error)) {
			const keyPattern = (error as { keyPattern?: Record<string, unknown> })
				.keyPattern;
			const keyValue = (error as { keyValue?: Record<string, unknown> })
				.keyValue;
			const key = Object.keys(keyPattern ?? {})[0] ?? "";
			const entry = entries.find(
				(e) =>
					key === `zids.${e.kind}` ||
					(key === "mentorId" && e.kind === "mentor") ||
					(key === "username" && keyValue?.username === e.zid),
			);
			if (entry) {
				throw await userZidConflict(entry.prefix, entry.field, entry.zid);
			}
		}
		throw error;
	}
};
