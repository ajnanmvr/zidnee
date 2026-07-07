import { ZID_CONSTANTS } from "@repo/schema";

export const USER_IDENTITY_PREFIXES = {
	mentor: ZID_CONSTANTS.prefixes.mentor,
	groupMentor: ZID_CONSTANTS.prefixes.groupMentor,
	counsellor: ZID_CONSTANTS.prefixes.counsellor,
	sales: ZID_CONSTANTS.prefixes.sales,
	admin: ZID_CONSTANTS.prefixes.admin,
} as const;

export const USER_IDENTITY_PAD_LENGTH = 3;

export const buildSequentialIdentity = (
	prefix: string,
	existingIds: Array<string | undefined>,
): string => {
	const normalizedPrefix = prefix.toUpperCase();
	const highest = existingIds.reduce((max, currentId) => {
		if (!currentId || !currentId.toUpperCase().startsWith(normalizedPrefix)) {
			return max;
		}

		const numericPart = Number(currentId.slice(normalizedPrefix.length));
		if (!Number.isFinite(numericPart)) {
			return max;
		}

		return Math.max(max, numericPart);
	}, 0);

	return `${normalizedPrefix}${String(highest + 1).padStart(USER_IDENTITY_PAD_LENGTH, "0")}`;
};
