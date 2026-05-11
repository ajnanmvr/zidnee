export const USER_IDENTITY_PREFIXES = {
	mentor: "zim",
	counsellor: "zic",
	sales: "zis",
	admin: "zia",
} as const;

export const USER_IDENTITY_PAD_LENGTH = 3;

export const buildSequentialIdentity = (
	prefix: string,
	existingIds: Array<string | undefined>,
): string => {
	const highest = existingIds.reduce((max, currentId) => {
		if (!currentId || !currentId.startsWith(prefix)) {
			return max;
		}

		const numericPart = Number(currentId.slice(prefix.length));
		if (!Number.isFinite(numericPart)) {
			return max;
		}

		return Math.max(max, numericPart);
	}, 0);

	return `${prefix}${String(highest + 1).padStart(USER_IDENTITY_PAD_LENGTH, "0")}`;
};
