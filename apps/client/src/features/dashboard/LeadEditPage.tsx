import { UpdateLeadPayloadSchema } from "@repo/schema";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { HiArrowLeft, HiPencilSquare } from "react-icons/hi2";
import type { IconType } from "react-icons/lib";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "@/api/request";
import { Field, Panel, SelectField } from "@/components/dashboard-ui";
import { useLeadDetailQuery } from "@/features/leads/leads.queries";
import { useUpdateLeadMutation } from "@/features/leads/use-lead-mutations";
// users query removed: assigned-to editing disabled
import { useSession } from "@/lib/session";

type LeadEditFormState = {
	name: string;
	phone: string;
	email: string;
	level: string;
	gender: string;
	dateOfBirth: string;
	residingCountry: string;
	courseType: string;
	primaryWhatsappNumber: string;
	alternateWhatsappNumber: string;
	studentInfo: string;
	preferredLanguage: string;
	preferredSchedule: string;
	preferredDays: string[];
	startClassWhen: string;
	hearAboutUs: string;
	demoAvailability: string;
	preferredMentorGender: string;
};

const DetailCard = ({
	title,
	icon: Icon,
	children,
}: {
	title: string;
	icon: IconType;
	children: React.ReactNode;
}) => (
	<section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
		<div className="mb-4 flex items-center gap-2">
			<Icon className="h-5 w-5 text-blue-600" />
			<h2 className="text-lg font-bold text-gray-900">{title}</h2>
		</div>
		{children}
	</section>
);

export const LeadEditPage = () => {
	const navigate = useNavigate();
	const { token } = useSession();
	const { leadId } = useParams<{ leadId: string }>();
	const leadQuery = useLeadDetailQuery(token, leadId ?? "");
	const updateMutation = useUpdateLeadMutation();
	const [banner, setBanner] = useState("");

	const { control, formState, handleSubmit, reset, setError } =
		useForm<LeadEditFormState>({
			defaultValues: {
				name: "",
				phone: "",
				email: "",
				level: "",
				gender: "",
				dateOfBirth: "",
				residingCountry: "",
				courseType: "",
				primaryWhatsappNumber: "",
				alternateWhatsappNumber: "",
				studentInfo: "",
				preferredLanguage: "",
				preferredSchedule: "",
				preferredDays: [],
				startClassWhen: "",
				hearAboutUs: "",
				demoAvailability: "",
				preferredMentorGender: "",
			},
		});

	const lead = leadQuery.data?.lead ?? null;
	// assignedTo editing removed

	useEffect(() => {
		if (!lead) {
			return;
		}

		reset({
			name: lead.name ?? "",
			phone: lead.phone ?? "",
			email: lead.email ?? "",
			level: lead.level ?? "",
			gender: lead.gender ?? "",
			dateOfBirth: lead.dateOfBirth
				? format(new Date(lead.dateOfBirth), "yyyy-MM-dd")
				: "",
			residingCountry: lead.residingCountry ?? "",
			courseType: lead.courseType ?? "",
			primaryWhatsappNumber: lead.primaryWhatsappNumber ?? "",
			alternateWhatsappNumber: lead.alternateWhatsappNumber ?? "",
			studentInfo: lead.studentInfo ?? "",
			preferredLanguage: lead.preferredLanguage ?? "",
			preferredSchedule: lead.preferredSchedule ?? "",
			preferredDays: lead.preferredDays ?? [],
			startClassWhen: lead.startClassWhen ?? "",
			hearAboutUs: lead.hearAboutUs ?? "",
			demoAvailability: lead.demoAvailability
				? format(new Date(lead.demoAvailability), "yyyy-MM-dd'T'HH:mm")
				: "",
			preferredMentorGender: lead.preferredMentorGender ?? "",
		});
	}, [lead, reset]);

	const onSubmit = handleSubmit(async (payload) => {
		if (!lead) {
			return;
		}

		setBanner("");

		// Convert date strings back to ISO format for the backend
		const updates: Record<string, unknown> = {
			name: payload.name || undefined,
			phone: payload.phone || undefined,
			email: payload.email || undefined,
			level: payload.level || undefined,
			gender: payload.gender || undefined,
			dateOfBirth: payload.dateOfBirth
				? new Date(payload.dateOfBirth)
				: undefined,
			residingCountry: payload.residingCountry || undefined,
			courseType: payload.courseType || undefined,
			primaryWhatsappNumber: payload.primaryWhatsappNumber || undefined,
			alternateWhatsappNumber: payload.alternateWhatsappNumber || undefined,
			studentInfo: payload.studentInfo || undefined,
			preferredLanguage: payload.preferredLanguage || undefined,
			preferredSchedule: payload.preferredSchedule || undefined,
			preferredDays: payload.preferredDays?.length
				? payload.preferredDays
				: undefined,
			startClassWhen: payload.startClassWhen || undefined,
			hearAboutUs: payload.hearAboutUs || undefined,
			demoAvailability: payload.demoAvailability || undefined,
			preferredMentorGender: payload.preferredMentorGender || undefined,
		};

		const validation = UpdateLeadPayloadSchema.safeParse(updates);

		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			Object.entries(errors).forEach(([field, messages]) => {
				if (messages?.[0]) {
					setError(field as keyof LeadEditFormState, {
						type: "manual",
						message: messages[0],
					});
				}
			});
			return;
		}

		try {
			await updateMutation.mutateAsync({
				leadId: lead.id,
				payload: validation.data,
			});
			navigate(`/leads/${lead.id}`);
		} catch (error) {
			if (error instanceof ApiError) {
				const serverErrors = error.payload.errors ?? {};
				Object.entries(serverErrors).forEach(([field, messages]) => {
					if (Array.isArray(messages) && messages[0]) {
						setError(field as keyof LeadEditFormState, {
							type: "server",
							message: messages[0],
						});
					}
				});
				setBanner(error.payload.message ?? "Unable to update lead");
				return;
			}

			setBanner(
				error instanceof Error ? error.message : "Unable to update lead",
			);
		}
	});

	if (!leadId) {
		return (
			<Panel title="Edit Lead" description="Lead not found">
				<p className="text-sm text-gray-600">Lead not found.</p>
			</Panel>
		);
	}

	if (leadQuery.isLoading) {
		return (
			<Panel title="Edit Lead" description="Loading lead details">
				<p className="text-sm text-gray-600">Loading lead details...</p>
			</Panel>
		);
	}

	if (!lead) {
		return (
			<Panel title="Edit Lead" description="Lead not found">
				<p className="text-sm text-gray-600">Lead not found.</p>
			</Panel>
		);
	}

	return (
		<Panel
			title="Edit Lead"
			description="Update the lead details and ownership from one page."
			action={
				<Link
					to={`/leads/${lead.id}`}
					className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
				>
					<HiArrowLeft className="h-4 w-4" aria-hidden="true" />
					Back to lead
				</Link>
			}
		>
			<form className="w-full" onSubmit={onSubmit}>
				<DetailCard title="Editable fields" icon={HiPencilSquare}>
					<div className="grid gap-4 md:grid-cols-2">
						<div className="md:col-span-2">
							<Controller
								name="name"
								control={control}
								render={({ field, fieldState }) => (
									<Field
										label="Name"
										value={field.value}
										onChange={field.onChange}
										placeholder="Lead name"
										error={fieldState.error?.message}
									/>
								)}
							/>
						</div>

						<Controller
							name="phone"
							control={control}
							render={({ field, fieldState }) => (
								<Field
									label="Phone"
									value={field.value}
									onChange={field.onChange}
									placeholder="Phone number"
									error={fieldState.error?.message}
								/>
							)}
						/>

						<Controller
							name="email"
							control={control}
							render={({ field, fieldState }) => (
								<Field
									label="Email"
									type="email"
									value={field.value}
									onChange={field.onChange}
									placeholder="student@example.com"
									error={fieldState.error?.message}
								/>
							)}
						/>

						<Controller
							name="level"
							control={control}
							render={({ field, fieldState }) => (
								<Field
									label="Level"
									value={field.value}
									onChange={field.onChange}
									placeholder="Lead level"
									error={fieldState.error?.message}
								/>
							)}
						/>

						<Controller
							name="gender"
							control={control}
							render={({ field, fieldState }) => (
								<SelectField
									label="Gender"
									value={field.value}
									onChange={field.onChange}
									placeholder="Select gender"
									options={[
										{ value: "male", label: "Male" },
										{ value: "female", label: "Female" },
									]}
									error={fieldState.error?.message}
								/>
							)}
						/>

						<Controller
							name="dateOfBirth"
							control={control}
							render={({ field, fieldState }) => (
								<Field
									label="Date of Birth"
									type="date"
									value={field.value}
									onChange={field.onChange}
									error={fieldState.error?.message}
								/>
							)}
						/>

						<Controller
							name="residingCountry"
							control={control}
							render={({ field, fieldState }) => (
								<Field
									label="Residing Country"
									value={field.value}
									onChange={field.onChange}
									placeholder="Country"
									error={fieldState.error?.message}
								/>
							)}
						/>

						<Controller
							name="courseType"
							control={control}
							render={({ field, fieldState }) => (
								<SelectField
									label="Course Type"
									value={field.value}
									onChange={field.onChange}
									placeholder="Select course type"
									options={[
										{ value: "INDIVIDUAL", label: "Individual" },
										{ value: "GROUP", label: "Group" },
									]}
									error={fieldState.error?.message}
								/>
							)}
						/>

						<Controller
							name="primaryWhatsappNumber"
							control={control}
							render={({ field, fieldState }) => (
								<Field
									label="Primary WhatsApp"
									value={field.value}
									onChange={field.onChange}
									placeholder="WhatsApp number"
									error={fieldState.error?.message}
								/>
							)}
						/>

						<Controller
							name="alternateWhatsappNumber"
							control={control}
							render={({ field, fieldState }) => (
								<Field
									label="Alternate WhatsApp"
									value={field.value}
									onChange={field.onChange}
									placeholder="Alternate number (optional)"
									error={fieldState.error?.message}
								/>
							)}
						/>

						<Controller
							name="preferredLanguage"
							control={control}
							render={({ field, fieldState }) => (
								<SelectField
									label="Preferred Language"
									value={field.value}
									onChange={field.onChange}
									placeholder="Select language"
									options={[
										{ value: "Malayalam Only", label: "Malayalam Only" },
										{ value: "English Only", label: "English Only" },
										{
											value: "Malayalam - English Mixed",
											label: "Malayalam - English Mixed",
										},
									]}
									error={fieldState.error?.message}
								/>
							)}
						/>

						<Controller
							name="preferredSchedule"
							control={control}
							render={({ field, fieldState }) => (
								<Field
									label="Preferred Schedule"
									value={field.value}
									onChange={field.onChange}
									placeholder="e.g., 03:53 PM - 04:23 PM IST"
									error={fieldState.error?.message}
								/>
							)}
						/>

						<Controller
							name="startClassWhen"
							control={control}
							render={({ field, fieldState }) => (
								<Field
									label="Start Class When"
									type="date"
									value={field.value}
									onChange={field.onChange}
									error={fieldState.error?.message}
								/>
							)}
						/>

						<Controller
							name="hearAboutUs"
							control={control}
							render={({ field, fieldState }) => (
								<Field
									label="Hear About Us"
									value={field.value}
									onChange={field.onChange}
									placeholder="e.g., Instagram, Google, etc."
									error={fieldState.error?.message}
								/>
							)}
						/>

						<Controller
							name="demoAvailability"
							control={control}
							render={({ field, fieldState }) => (
								<Field
									label="Demo Availability"
									type="datetime-local"
									value={field.value}
									onChange={field.onChange}
									error={fieldState.error?.message}
								/>
							)}
						/>

						<Controller
							name="preferredMentorGender"
							control={control}
							render={({ field, fieldState }) => (
								<SelectField
									label="Preferred Mentor Gender"
									value={field.value}
									onChange={field.onChange}
									placeholder="Select preference"
									options={[
										{ value: "male", label: "Male" },
										{ value: "female", label: "Female" },
										{ value: "both", label: "Both" },
									]}
									error={fieldState.error?.message}
								/>
							)}
						/>

						<div className="md:col-span-2">
							<Controller
								name="studentInfo"
								control={control}
								render={({ field, fieldState }) => (
									<div>
										<p className="mb-1 block text-sm font-semibold text-gray-700">
											Student Info
										</p>
										<textarea
											value={field.value}
											onChange={field.onChange}
											placeholder="Additional student information"
											className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
											rows={3}
										/>
										{fieldState.error?.message && (
											<p className="mt-1 text-xs text-red-600">
												{fieldState.error.message}
											</p>
										)}
									</div>
								)}
							/>
						</div>

						<div className="md:col-span-2">
							<p className="mb-2 block text-sm font-semibold text-gray-700">
								Preferred Days
							</p>
							<Controller
								name="preferredDays"
								control={control}
								render={({ field, fieldState }) => (
									<div className="space-y-2">
										<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
											{[
												"Monday",
												"Tuesday",
												"Wednesday",
												"Thursday",
												"Friday",
												"Saturday",
												"Sunday",
											].map((day) => (
												<label key={day} className="flex items-center gap-2">
													<input
														type="checkbox"
														checked={field.value?.includes(day) ?? false}
														onChange={(e) => {
															const currentDays = field.value ?? [];
															if (e.target.checked) {
																field.onChange([...currentDays, day]);
															} else {
																field.onChange(
																	currentDays.filter((d) => d !== day),
																);
															}
														}}
														className="rounded border-gray-300"
													/>
													<span className="text-sm text-gray-700">{day}</span>
												</label>
											))}
										</div>
										{fieldState.error?.message && (
											<p className="text-xs text-red-600">
												{fieldState.error.message}
											</p>
										)}
									</div>
								)}
							/>
						</div>
					</div>
				</DetailCard>

				{banner ? (
					<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
						{banner}
					</div>
				) : null}

				<div className="flex flex-wrap items-center justify-end gap-3">
					<Link
						to={`/leads/${lead.id}`}
						className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
					>
						<HiArrowLeft className="h-4 w-4" aria-hidden="true" />
						Cancel
					</Link>
					<button
						type="submit"
						disabled={formState.isSubmitting}
						className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{formState.isSubmitting ? "Saving..." : "Save changes"}
					</button>
				</div>
			</form>
		</Panel>
	);
};
