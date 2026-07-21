import { ZID_CONSTANTS } from "@repo/schema";

export const USER_IDENTITY_PREFIXES = {
	mentor: ZID_CONSTANTS.prefixes.mentor,
	groupMentor: ZID_CONSTANTS.prefixes.groupMentor,
	counsellor: ZID_CONSTANTS.prefixes.counsellor,
	sales: ZID_CONSTANTS.prefixes.sales,
	admin: ZID_CONSTANTS.prefixes.admin,
} as const;

export const highestUserSuffix = (
	prefix: string,
	existingIds: Array<string | undefined>,
): number => {
	const normalizedPrefix = prefix.toUpperCase();
	return existingIds.reduce((max, currentId) => {
		if (!currentId || !currentId.toUpperCase().startsWith(normalizedPrefix)) {
			return max;
		}

		const numericPart = Number(currentId.slice(normalizedPrefix.length));
		if (!Number.isFinite(numericPart)) {
			return max;
		}

		return Math.max(max, numericPart);
	}, 0);
};
