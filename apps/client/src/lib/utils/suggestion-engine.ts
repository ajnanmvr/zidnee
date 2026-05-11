/**
 * Suggestion engine for extracting follow-up date suggestions from notes
 */

interface FollowUpSuggestion {
	days: number;
	phrase: string;
	label: string;
}

/**
 * Parse temporal expressions from note text and suggest follow-up dates
 */
export const parseSuggestionsFromNote = (
	note: string,
): FollowUpSuggestion[] => {
	if (!note || typeof note !== "string") {
		return [];
	}

	const suggestions: FollowUpSuggestion[] = [];
	const lowerNote = note.toLowerCase();

	// Define temporal patterns with their corresponding day offsets
	const patterns: Array<{
		regex: RegExp;
		days: number;
		label: string;
	}> = [
		// Tomorrow
		{ regex: /\btomorrow\b/, days: 1, label: "Tomorrow" },
		{ regex: /\bin a day\b/, days: 1, label: "In 1 day" },
		{ regex: /\bnext day\b/, days: 1, label: "Next day" },

		// 2-3 days
		{ regex: /\bin (2|two|3|three) days?\b/, days: 2, label: "In 2-3 days" },
		{
			regex: /\b(in a few|after a few) days?\b/,
			days: 2,
			label: "In a few days",
		},

		// This week / Next week
		{ regex: /\bthis week\b/, days: 3, label: "This week" },
		{ regex: /\bin (4|four|5|five) days?\b/, days: 4, label: "In 4-5 days" },
		{
			regex: /\bnext week\b|\b(in a week|after a week|week later)\b/,
			days: 7,
			label: "Next week",
		},
		{ regex: /\bin (7|seven) days?\b/, days: 7, label: "In 7 days" },

		// 2 weeks
		{
			regex:
				/\bin (10|14|two weeks?|2 weeks?)\b|\b(in two weeks|after two weeks)\b/,
			days: 14,
			label: "In 2 weeks",
		},

		// This month / Next month
		{ regex: /\bthis month\b/, days: 7, label: "This month" },
		{
			regex: /\bnext month\b|\b(in a month|after a month|month later)\b/,
			days: 30,
			label: "Next month",
		},
		{ regex: /\bin (30|31) days?\b/, days: 30, label: "In 30 days" },

		// Later / Follow up
		{ regex: /\bfollow.?up soon\b/, days: 3, label: "Follow up soon" },
		{ regex: /\blater\b/, days: 5, label: "Later" },

		// Date patterns (approximate)
		{
			regex:
				/\b(next|following|upcoming) (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/,
			days: 3,
			label: "Next week day",
		},
	];

	// Check each pattern
	for (const pattern of patterns) {
		if (pattern.regex.test(lowerNote)) {
			// Avoid duplicates - don't add if we already have a suggestion with the same days
			if (!suggestions.some((s) => s.days === pattern.days)) {
				suggestions.push({
					days: pattern.days,
					phrase: pattern.regex.source,
					label: pattern.label,
				});
			}
		}
	}

	// Sort by days ascending
	suggestions.sort((a, b) => a.days - b.days);

	// Return top 3 suggestions
	return suggestions.slice(0, 3);
};

/**
 * Calculate date from days offset
 */
export const calculateFollowUpDate = (days: number): Date => {
	const date = new Date();
	date.setDate(date.getDate() + days);
	// Set to 9 AM for convenience
	date.setHours(9, 0, 0, 0);
	return date;
};

/**
 * Extract and format suggestions for UI display
 */
export const formatSuggestionsForUI = (
	note: string,
): Array<{ label: string; date: Date }> => {
	const suggestions = parseSuggestionsFromNote(note);
	return suggestions.map((s) => ({
		label: s.label,
		date: calculateFollowUpDate(s.days),
	}));
};
