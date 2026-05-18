export const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const FOLLOW_UP_PERIOD_DAYS = {
	lead: 1,
	student: 14,
	mentor: 14,
} as const;

export const FOLLOW_UP_PERIOD_MS = {
	lead: FOLLOW_UP_PERIOD_DAYS.lead * DAY_IN_MS,
	student: FOLLOW_UP_PERIOD_DAYS.student * DAY_IN_MS,
	mentor: FOLLOW_UP_PERIOD_DAYS.mentor * DAY_IN_MS,
} as const;

export const REMINDER_DEFAULT_DAYS = 14;

export const ZID_CONSTANTS = {
	startNumber: 11,
	prefixes: {
		student: "ZID",
		groupStudent: "ZIG",
		mentor: "ZM0",
		counsellor: "ZIC",
		sales: "ZIS",
		admin: "ZIA",
	},
} as const;

export const AUTH_CONSTANTS = {
	emailDomain: "gmail.com",
} as const;