export const STUDENT_IDENTITY_PREFIX = "ZID";
export const STUDENT_IDENTITY_PAD_LENGTH = 3;

export const buildStudentIdentity = (
	existingIds: Array<string | undefined>,
): string => {
	const highest = existingIds.reduce((max, currentId) => {
		if (!currentId || !currentId.startsWith(STUDENT_IDENTITY_PREFIX)) {
			return max;
		}

		const numericPart = Number(currentId.slice(STUDENT_IDENTITY_PREFIX.length));
		if (!Number.isFinite(numericPart)) {
			return max;
		}

		return Math.max(max, numericPart);
	}, 0);

	return `${STUDENT_IDENTITY_PREFIX}${String(highest + 1).padStart(STUDENT_IDENTITY_PAD_LENGTH, "0")}`;
};
