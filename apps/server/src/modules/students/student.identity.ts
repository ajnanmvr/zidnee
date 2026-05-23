export const STUDENT_IDENTITY_PREFIX = "ZID";
export const STUDENT_IDENTITY_PAD_LENGTH = 3;

export const buildStudentIdentity = (
	existingIds: Array<string | undefined>,
	prefix: string = STUDENT_IDENTITY_PREFIX,
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

	return `${normalizedPrefix}${String(highest + 1).padStart(STUDENT_IDENTITY_PAD_LENGTH, "0")}`;
};
