export const STUDENT_IDENTITY_PREFIX = "ZID";

export const highestStudentSuffix = (
	existingIds: Array<string | undefined>,
	prefix: string = STUDENT_IDENTITY_PREFIX,
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
