import type { LeadResponse } from "@repo/schema";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { HiCheck, HiClipboard } from "react-icons/hi2";
import { Modal } from "@/components/dashboard-ui";
import { formatRelativeDateTime, getDateLabel } from "@/lib/utils/date";
import { format } from "date-fns";

interface RequirementsModalProps {
	open: boolean;
	lead: LeadResponse | null;
	onClose: () => void;
	onSave?: (updatedLead: Partial<LeadResponse>) => Promise<void>;
}

export const RequirementsModal = ({
	open,
	lead,
	onClose,
	onSave,
}: RequirementsModalProps) => {
	const [isEditing, setIsEditing] = useState(false);
	const [isCopied, setIsCopied] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const {
		control,
		handleSubmit,
		reset,
		formState: { isDirty },
	} = useForm<Partial<LeadResponse>>({
		defaultValues: lead || {},
	});

	const latestDemo =
		lead?.demos && lead.demos.length > 0
			? lead.demos[lead.demos.length - 1]
			: null;

	const formatReadableDateTime = (value?: string | null) => {
		if (!value) {
			return "N/A";
		}

		return formatRelativeDateTime(value);
	};

	const formatReadableGender = (value?: string | null) => {
		if (!value) {
			return "Any";
		}

		return value.charAt(0).toUpperCase() + value.slice(1);
	};

	const formatTimeValue = (value: string) => {
		const [hoursText, minutesText] = value.split(":");
		const hours = Number(hoursText);
		const minutes = Number(minutesText);

		if (Number.isNaN(hours) || Number.isNaN(minutes)) {
			return value;
		}

		const meridiem = hours >= 12 ? "PM" : "AM";
		const hour12 = hours % 12 || 12;
		return `${hour12.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${meridiem}`;
	};

	const formatPlanLabel = () => {
		if (!lead?.preferredPlan) {
			return "N/A";
		}

		return `${lead.preferredPlan.timesPerWeek}/week • ${lead.preferredPlan.durationMinutes} min`;
	};

	const formatTimingLabel = () => {
		if (!lead?.preferredTimeslots?.length) {
			return "N/A";
		}

		return lead.preferredTimeslots
			.map(
				(slot) =>
					`${formatTimeValue(slot.startTime)} - ${formatTimeValue(slot.endTime)}`,
			)
			.join(", ");
	};



	const getLeadAge = () => {
		if (!lead) return null;

		if (lead.dateOfBirth) {
			const dob = new Date(lead.dateOfBirth as unknown as string);
			if (!Number.isNaN(dob.getTime())) {
				return Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
			}
		}

		const legacyAge = (lead as { age?: unknown }).age;
		if (typeof legacyAge === "number" && Number.isFinite(legacyAge)) {
			return Math.floor(legacyAge);
		}
		if (typeof legacyAge === "string" && legacyAge.trim()) {
			const parsed = Number.parseInt(legacyAge, 10);
			if (!Number.isNaN(parsed)) {
				return parsed;
			}
		}

		const agePatterns = [
			/\bage\s*[:\-]?\s*(\d{1,3})\b/i,
			/\b(\d{1,3})\s*(?:y|yrs|year|years)\b/i,
		];
		for (const source of [lead.studentInfo, lead.preferredSchedule]) {
			if (!source) continue;
			for (const pattern of agePatterns) {
				const match = source.match(pattern);
				if (match?.[1]) {
					const parsed = Number.parseInt(match[1], 10);
					if (!Number.isNaN(parsed)) {
						return parsed;
					}
				}
			}
		}

		return null;
	};

	const langAbbrev: Record<string, string> = {
		"Malayalam Only": "Malayalam Only",
		"English Only": "English Only",
		"Malayalam - English Mixed": "Eng-Mlm Mixed",
	};

	const formatDataForWhatsApp = (): string => {
		if (!lead) return "";

		const isGroup = lead.courseType === "GROUP";

		const slNo = lead.slNo ? String(lead.slNo).padStart(2, "0") : null;
		const header = slNo ? `Student Requirements- ${slNo}` : `Student Requirements`;

		const age = getLeadAge();

		const lang = lead.preferredLanguage ? (langAbbrev[lead.preferredLanguage] ?? lead.preferredLanguage) : null;

		const timing = lead.preferredTimeslots?.length
			? formatTimingLabel() + " IST"
			: null;

		const planLine = lead.preferredPlan?.durationMinutes && lead.preferredPlan?.timesPerWeek
			? `${lead.preferredPlan.durationMinutes} minutes class, ${lead.preferredPlan.timesPerWeek} times a week • ${lead.preferredPlan.timesPerWeek * 4} Classes/Month`
			: (lead.preferredSchedule || null);

		const rawDemoTime = latestDemo?.demoScheduledFor ?? lead.demoAvailability ?? null;
		const demoTime = rawDemoTime
			? (() => {
				try { return format(new Date(rawDemoTime), "MMM d, h:mm a"); }
				catch { return String(rawDemoTime); }
			})()
			: null;

		const contact = lead.primaryWhatsappNumber || lead.phone || null;
		const mentorGender = lead.preferredMentorGender ? formatReadableGender(lead.preferredMentorGender) : null;
		const note = latestDemo?.note ?? null;
		const preferredDays = lead.preferredDays?.length ? lead.preferredDays.join(", ") : null;

		if (isGroup) {
			return [
				`📋 ${header} 📋`,
				` `,
				lead.name ? `👉 Name: ${lead.name}` : null,
				lead.level ? `👉 Level : ${lead.level}` : null,
				age != null ? `👉 Age.  : ${age}` : null,
				`👉 Primary No. : ${contact ?? ""}`,
				` `,
				lang ? `📌 Instruction Medium: ${lang}` : null,
				timing ? `🔖 Time: ${timing}` : null,
				note ? `🔖 Note: ${note}` : null,
				` `,
				demoTime ? `🗓️ Demo Time: ${demoTime}` : null,
				` `,
				`_________`,
			].filter(Boolean).join("\n");
		}

		return [
			`📋 *${header}* 📋`,
			` `,
			lead.name ? `👉 *Name:* ${lead.name}` : null,
			lead.level ? `👉 *Level :* ${lead.level}` : null,
			age != null ? `👉 *Age.  :* ${age}` : null,
			`👉 *Primary No.* : ${contact ?? ""}`,
			` `,
			` `,
			mentorGender ? `📌 *Tutor Preference.   :* ${mentorGender}` : null,
			lang ? `📌 *Instruction Medium:* ${lang}` : null,
			planLine ? `📌 *Plan :* ${planLine}` : null,
			` `,
			preferredDays ? `🔖 *Preferred Days:* ${preferredDays}` : null,
			timing ? `🔖 *Time:* ${timing}` : null,
			note ? `🔖 *Note:* ${note}` : null,
			` `,
			demoTime ? `🗓️ *Demo Time:* ${demoTime}` : null,
			` `,
			`___________________________`,
		].filter(Boolean).join("\n");
	};

	const handleCopyToClipboard = async () => {
		try {
			const text = formatDataForWhatsApp();
			await navigator.clipboard.writeText(text);
			setIsCopied(true);
			toast.success("Copied to clipboard! Ready to paste in WhatsApp");
			setTimeout(() => setIsCopied(false), 2000);
		} catch {
			toast.error("Failed to copy to clipboard");
		}
	};

	const onSubmit = handleSubmit(async (data) => {
		if (!onSave) return;
		setIsSaving(true);
		try {
			await onSave(data);
			toast.success("Requirements updated successfully");
			setIsEditing(false);
			reset(data);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to save changes",
			);
		} finally {
			setIsSaving(false);
		}
	});

	if (!lead) return null;

	return (
		<Modal
			open={open}
			title="Student Requirements"
			description={`${lead.name} - Contact: ${lead.phone}`}
			onClose={onClose}
			footer={
				isEditing ? (
					<>
						<button
							type="button"
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
							onClick={() => {
								setIsEditing(false);
								reset(lead);
							}}
						>
							Cancel
						</button>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
							onClick={() => void onSubmit()}
							disabled={!isDirty || isSaving}
						>
							{isSaving ? "Saving..." : "Save Changes"}
						</button>
					</>
				) : (
					<>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
							onClick={handleCopyToClipboard}
						>
							{isCopied ? (
								<>
									<HiCheck className="h-4 w-4" />
									Copied!
								</>
							) : (
								<>
									<HiClipboard className="h-4 w-4" />
									Copy for WhatsApp
								</>
							)}
						</button>
						{onSave && (
							<button
								type="button"
								className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
								onClick={() => setIsEditing(true)}
							>
								Edit
							</button>
						)}
					</>
				)
			}
		>
			<div className="max-h-96 overflow-y-auto space-y-4">
				{isEditing ? (
					<form className="space-y-4">
						{/* Basic Info */}
						<div className="grid grid-cols-2 gap-3">
							<Controller
								name="name"
								control={control}
								render={({ field }) => (
									<div>
										<p className="block text-xs font-semibold text-gray-600 mb-1">
											Student Name
										</p>
										<input
											{...field}
											type="text"
											className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										/>
									</div>
								)}
							/>
						</div>

						{/* Contact & Location */}
						<div className="grid grid-cols-2 gap-3">
							<Controller
								name="primaryWhatsappNumber"
								control={control}
								render={({ field }) => (
									<div>
										<p className="block text-xs font-semibold text-gray-600 mb-1">
											WhatsApp Number
										</p>
										<input
											{...field}
											type="tel"
											className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										/>
									</div>
								)}
							/>
							<Controller
								name="residingCountry"
								control={control}
								render={({ field }) => (
									<div>
										<p className="block text-xs font-semibold text-gray-600 mb-1">
											Country
										</p>
										<input
											{...field}
											type="text"
											className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										/>
									</div>
								)}
							/>
						</div>

						{/* Academic */}
						<div className="grid grid-cols-3 gap-3">
							<Controller
								name="level"
								control={control}
								render={({ field }) => (
									<div>
										<p className="block text-xs font-semibold text-gray-600 mb-1">
											Level
										</p>
										<input
											{...field}
											type="text"
											className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										/>
									</div>
								)}
							/>
							<Controller
								name="preferredLanguage"
								control={control}
								render={({ field }) => (
									<div>
										<p className="block text-xs font-semibold text-gray-600 mb-1">
											Language
										</p>
										<select
											{...field}
											className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										>
											<option value="">Select</option>
											<option value="Malayalam Only">Malayalam Only</option>
											<option value="English Only">English Only</option>
											<option value="Malayalam - English Mixed">
												Malayalam - English Mixed
											</option>
										</select>
									</div>
								)}
							/>
						</div>

						{/* Preferences */}
						<div className="grid grid-cols-2 gap-3">
							<Controller
								name="preferredMentorGender"
								control={control}
								render={({ field }) => (
									<div>
										<p className="block text-xs font-semibold text-gray-600 mb-1">
											Tutor Preference
										</p>
										<select
											{...field}
											className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										>
											<option value="">Any</option>
											<option value="male">Male</option>
											<option value="female">Female</option>
											<option value="both">Both</option>
										</select>
									</div>
								)}
							/>
						</div>

						{/* Availability */}
						<div className="grid grid-cols-2 gap-3">
							<Controller
								name="demoAvailability"
								control={control}
								render={({ field }) => (
									<div>
										<p className="block text-xs font-semibold text-gray-600 mb-1">
											Demo Availability
										</p>
										<input
											{...field}
											type="text"
											className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										/>
									</div>
								)}
							/>
							<Controller
								name="preferredSchedule"
								control={control}
								render={({ field }) => (
									<div>
										<p className="block text-xs font-semibold text-gray-600 mb-1">
											Preferred Schedule
										</p>
										<input
											{...field}
											type="text"
											className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										/>
									</div>
								)}
							/>
						</div>

						{/* Additional Info */}
						<Controller
							name="studentInfo"
							control={control}
							render={({ field }) => (
								<div>
									<p className="block text-xs font-semibold text-gray-600 mb-1">
										Additional Information
									</p>
									<textarea
										{...field}
										rows={3}
										className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									/>
								</div>
							)}
						/>
					</form>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<tbody>
								{lead.name ? (
									<tr className="border-b border-gray-200">
										<td className="px-4 py-3 font-semibold text-gray-600 bg-gray-50 w-1/3">Student</td>
										<td className="px-4 py-3 text-gray-900">{lead.name}</td>
									</tr>
								) : null}
								<tr className="border-b border-gray-200">
									<td className="px-4 py-3 font-semibold text-gray-600 bg-gray-50">Contact</td>
									<td className="px-4 py-3 text-gray-900">{lead.primaryWhatsappNumber || lead.phone}</td>
								</tr>
								{lead.gender ? (
									<tr className="border-b border-gray-200">
										<td className="px-4 py-3 font-semibold text-gray-600 bg-gray-50">Gender</td>
										<td className="px-4 py-3 text-gray-900">
											{lead.gender.charAt(0).toUpperCase() + lead.gender.slice(1)}
										</td>
									</tr>
								) : null}
								{lead.level ? (
									<tr className="border-b border-gray-200">
										<td className="px-4 py-3 font-semibold text-gray-600 bg-gray-50">Level</td>
										<td className="px-4 py-3 text-gray-900">{lead.level}</td>
									</tr>
								) : null}
								{lead.preferredLanguage ? (
									<tr className="border-b border-gray-200">
										<td className="px-4 py-3 font-semibold text-gray-600 bg-gray-50">Language</td>
										<td className="px-4 py-3 text-gray-900">{lead.preferredLanguage}</td>
									</tr>
								) : null}
								{lead.preferredMentorGender ? (
									<tr className="border-b border-gray-200">
										<td className="px-4 py-3 font-semibold text-gray-600 bg-gray-50">Tutor Preference</td>
										<td className="px-4 py-3 text-gray-900">{formatReadableGender(lead.preferredMentorGender)}</td>
									</tr>
								) : null}
								{lead.preferredDays?.length ? (
									<tr className="border-b border-gray-200">
										<td className="px-4 py-3 font-semibold text-gray-600 bg-gray-50">Preferred Days</td>
										<td className="px-4 py-3 text-gray-900">{lead.preferredDays.join(", ")}</td>
									</tr>
								) : null}
								{lead.preferredPlan ? (
									<tr className="border-b border-gray-200">
										<td className="px-4 py-3 font-semibold text-gray-600 bg-gray-50">Plan</td>
										<td className="px-4 py-3 text-gray-900">{formatPlanLabel()}</td>
									</tr>
								) : null}
								{lead.preferredTimeslots?.length ? (
									<tr className="border-b border-gray-200">
										<td className="px-4 py-3 font-semibold text-gray-600 bg-gray-50">Timing</td>
										<td className="px-4 py-3 text-gray-900">{formatTimingLabel()}</td>
									</tr>
								) : null}
								{lead.demoAvailability ? (
									<tr className="border-b border-gray-200">
										<td className="px-4 py-3 font-semibold text-gray-600 bg-gray-50">Demo Availability</td>
										<td className="px-4 py-3 text-gray-900">{formatReadableDateTime(lead.demoAvailability)}</td>
									</tr>
								) : null}
								{lead.preferredSchedule ? (
									<tr className="border-b border-gray-200">
										<td className="px-4 py-3 font-semibold text-gray-600 bg-gray-50">Preferred Schedule</td>
										<td className="px-4 py-3 text-gray-900">{lead.preferredSchedule}</td>
									</tr>
								) : null}
								{latestDemo?.demoScheduledFor && (
									<tr className="border-b border-gray-200">
										<td className="px-4 py-3 font-semibold text-gray-600 bg-gray-50">Demo Scheduled For</td>
										<td className="px-4 py-3 text-gray-900" title={getDateLabel(latestDemo.demoScheduledFor)}>
											{formatRelativeDateTime(latestDemo.demoScheduledFor)}
										</td>
									</tr>
								)}
								{lead.studentInfo && (
									<tr className="border-b border-gray-200">
										<td className="px-4 py-3 font-semibold text-gray-600 bg-gray-50">Additional Info</td>
										<td className="px-4 py-3 text-gray-900">{lead.studentInfo}</td>
									</tr>
								)}
								{latestDemo?.note && (
									<tr>
										<td className="px-4 py-3 font-semibold text-gray-600 bg-gray-50">Demo Note</td>
										<td className="px-4 py-3 text-gray-900">{latestDemo.note}</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</Modal>
	);
};
