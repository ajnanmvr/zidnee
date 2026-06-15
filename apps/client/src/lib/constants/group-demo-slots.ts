export type TimeSlot = {
	startTime: string;
	endTime: string;
};

/** The four fixed group-class time slots offered on the public form and used for scheduling group demos. */
export const GROUP_DEMO_TIME_SLOTS: TimeSlot[] = [
	{ startTime: "06:00", endTime: "08:00" },
	{ startTime: "16:00", endTime: "18:00" },
	{ startTime: "18:00", endTime: "20:00" },
	{ startTime: "20:00", endTime: "22:00" },
];

const formatTimeOfDay = (value: string): string => {
	const [hoursText, minutesText] = value.split(":");
	const hours = Number(hoursText);
	const minutes = Number(minutesText);

	if (Number.isNaN(hours) || Number.isNaN(minutes)) {
		return value;
	}

	const meridiem = hours >= 12 ? "PM" : "AM";
	const hour12 = hours % 12 || 12;
	return `${hour12}:${minutes.toString().padStart(2, "0")} ${meridiem}`;
};

export const formatTimeSlotLabel = (slot: TimeSlot): string =>
	`${formatTimeOfDay(slot.startTime)} - ${formatTimeOfDay(slot.endTime)}`;
