import type { LeadResponse, TimeSlotResponse } from "@repo/schema";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { HiCheck, HiClipboard } from "react-icons/hi2";
import { Modal } from "@/components/dashboard-ui";
import { formatRelativeDateTime, getDateLabel } from "@/lib/utils/date";

interface RequirementsModalProps {
	open: boolean;
	lead: LeadResponse | null;
	timeSlots?: TimeSlotResponse[];
	onClose: () => void;
	onSave?: (updatedLead: Partial<LeadResponse>) => Promise<void>;
}

export const RequirementsModal = ({
	open,
	lead,
	timeSlots,
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

	const formatTimeslotLabel = (
		timeslot:
			| { label: string; timesPerWeek: number; durationMinutes: number }
			| string,
	) => {
		if (typeof timeslot === "string") {
			const matchedTimeSlot = timeSlots?.find((slot) => slot.id === timeslot);
			return matchedTimeSlot?.label ?? timeslot;
		}

		return `${timeslot.label} • ${timeslot.timesPerWeek}/week • ${timeslot.durationMinutes} min`;
	};

	const formatPlanLabel = () => {
		if (!lead?.preferredTimeslots?.length) {
			return "N/A";
		}

		return lead.preferredTimeslots
			.map((timeslot) => formatTimeslotLabel(timeslot))
			.join(", ");
	};

	const formatTimingLabel = () => {
		if (!lead?.preferredTimeslots?.length) {
			return "N/A";
		}

		return lead.preferredTimeslots
			.map((timeslot) =>
				typeof timeslot === "string"
					? timeSlots?.find((slot) => slot.id === timeslot)?.label ?? timeslot
					: timeslot.label,
			)
			.join(", ");
	};

	const formatAttemptLabel = (attemptNumber: number) => {
		if (attemptNumber <= 0) {
			return "N/A";
		}

		const remainder = attemptNumber % 10;
		const tens = attemptNumber % 100;
		const suffix =
			remainder === 1 && tens !== 11
				? "st"
				: remainder === 2 && tens !== 12
					? "nd"
					: remainder === 3 && tens !== 13
						? "rd"
						: "th";

		return `${attemptNumber}${suffix} attempt`;
	};

	const formatDataForWhatsApp = (): string => {
		if (!lead) return "";

		const preferredDays = lead.preferredDays?.length
			? lead.preferredDays.join(", ")
			: "N/A";
		const attemptLabel = formatAttemptLabel(lead.demos?.length ?? 0);
		const plan = lead.preferredSchedule || "N/A";
		const timing = formatTimingLabel();
		const classStarting = lead.startClassWhen || "N/A";
		const demoTime = latestDemo?.demoScheduledFor || lead.demoAvailability || "N/A";

		const lines = [
			`📋 *Student Requirements*`,
			` `,
			`*Name:* ${lead.name || "N/A"}`,
			`*Tutor Preference:* ${formatReadableGender(lead.preferredMentorGender)}`,
			`*Preferred Days:* ${preferredDays}`,
			`*Plan:* ${plan}`,
			`*Timing:* ${timing}`,
			`*Class starting:* ${classStarting}`,
			`*Demo Time:* ${demoTime}`,
			`*Attempt:* ${attemptLabel}`,
			latestDemo?.note ? `💬 *Note:* ${latestDemo.note}` : null,
		]
			.filter(Boolean)
			.join("\n");

		return lines;
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
							<Controller
								name="startClassWhen"
								control={control}
								render={({ field }) => (
									<div>
										<p className="block text-xs font-semibold text-gray-600 mb-1">
											Start Class When
										</p>
										<input
											{...field}
											type="text"
											placeholder="ASAP / Specific date"
											className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										/>
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
					<div className="space-y-4">
						<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
										Student
									</p>
									<h4 className="mt-1 text-lg font-semibold text-slate-900">
										{lead.name || "N/A"}
									</h4>
									<p className="mt-1 text-sm text-slate-600">
										{lead.primaryWhatsappNumber || lead.phone}
									</p>
								</div>
								<div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200">
									{lead.gender
										? lead.gender.charAt(0).toUpperCase() + lead.gender.slice(1)
										: "Gender N/A"}
								</div>
							</div>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
								<h4 className="font-semibold text-slate-900 mb-3">
									Learning Plan
								</h4>
								<div className="grid gap-3 text-sm">
									<div className="flex items-start justify-between gap-3">
										<span className="text-slate-600">Level</span>
										<span className="font-semibold text-slate-900 text-right">
											{lead.level || "N/A"}
										</span>
									</div>
									<div className="flex items-start justify-between gap-3">
										<span className="text-slate-600">Language</span>
										<span className="font-semibold text-slate-900 text-right">
											{lead.preferredLanguage || "N/A"}
										</span>
									</div>
									<div className="flex items-start justify-between gap-3">
										<span className="text-slate-600">Tutor Preference</span>
										<span className="font-semibold text-slate-900 text-right">
											{formatReadableGender(lead.preferredMentorGender)}
										</span>
									</div>
								</div>
							</div>

							<div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
								<h4 className="font-semibold text-slate-900 mb-3">Schedule</h4>
								<div className="grid gap-3 text-sm">
									<div className="flex items-start justify-between gap-3">
										<span className="text-slate-600">Preferred Days</span>
										<span className="font-semibold text-slate-900 text-right">
											{lead.preferredDays?.length
												? lead.preferredDays.join(", ")
												: "N/A"}
										</span>
									</div>
									<div className="flex items-start justify-between gap-3">
										<span className="text-slate-600">Plans</span>
										<span className="font-semibold text-slate-900 text-right">
											{formatPlanLabel()}
										</span>
									</div>
									<div className="flex items-start justify-between gap-3">
										<span className="text-slate-600">Start Class</span>
										<span className="font-semibold text-slate-900 text-right">
											{lead.startClassWhen || "N/A"}
										</span>
									</div>
								</div>
							</div>
						</div>

						<div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
							<h4 className="font-semibold text-slate-900 mb-3">
								Demo Details
							</h4>
							<div className="grid gap-3 md:grid-cols-2 text-sm">
								<div className="flex items-start justify-between gap-3">
									<span className="text-slate-600">Demo Availability</span>
									<span className="font-semibold text-slate-900 text-right">
										{formatReadableDateTime(lead.demoAvailability)}
									</span>
								</div>
								<div className="flex items-start justify-between gap-3">
									<span className="text-slate-600">Preferred Schedule</span>
									<span className="font-semibold text-slate-900 text-right">
										{lead.preferredSchedule || "N/A"}
									</span>
								</div>
								{latestDemo?.demoScheduledFor && (
									<div className="md:col-span-2 flex items-start justify-between gap-3">
										<span className="text-slate-600">Demo Scheduled For</span>
										<span
											className="font-semibold text-slate-900 text-right"
											title={getDateLabel(latestDemo.demoScheduledFor)}
										>
											{formatRelativeDateTime(latestDemo.demoScheduledFor)}
										</span>
									</div>
								)}
							</div>
						</div>

						{/* Additional Info */}
						{lead.studentInfo && (
							<div className="rounded-lg bg-green-50 p-4 border border-green-200">
								<h4 className="font-semibold text-gray-900 mb-2">
									Additional Information
								</h4>
								<p className="text-sm text-gray-700">{lead.studentInfo}</p>
							</div>
						)}

						{/* Demo Note */}
						{latestDemo?.note && (
							<div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
								<h4 className="font-semibold text-gray-900 mb-2">Demo Note</h4>
								<p className="text-sm text-gray-700">{latestDemo.note}</p>
							</div>
						)}
					</div>
				)}
			</div>
		</Modal>
	);
};
