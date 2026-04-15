import { ValidationError } from "@/utils/index.js";

export const requireStringValue = (
	value: unknown,
	fieldName: string
): string => {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new ValidationError({
			[fieldName]: [`${fieldName} is required`],
		});
	}

	return value;
};
