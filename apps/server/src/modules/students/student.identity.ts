export const STUDENT_IDENTITY_PREFIX = "zid";
export const STUDENT_IDENTITY_PAD_LENGTH = 3;

export const buildStudentIdentity = (
	existingIds: Array<string | undefined>,
 	prefix: string = STUDENT_IDENTITY_PREFIX,
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

	return `${prefix}${String(highest + 1).padStart(STUDENT_IDENTITY_PAD_LENGTH, "0")}`;
};
