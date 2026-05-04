import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { useParams, useSearchParams } from "react-router-dom";
import { requestWithSchema } from "@/api/request";
import { TimeSlotsResponseSchema } from "@repo/schema";

type PublicFormValues = {
	studentName: string;
	dateOfBirth: string;
	residingCountry: string;
	standardApplyingFor: string;
	gender: "" | "male" | "female";
	primaryWhatsappNumber: string;
	alternateWhatsappNumber: string;
	studentInfo: string;
	preferredLanguage: "" | "Malayalam Only" | "English Only" | "Malayalam - English Mixed";
	preferredDays: string[];
	preferredTimeslots: string[];
	startClassWhen: string;
	hearAboutUs: string;
	demoAvailability: string;
	preferredMentorGender: "" | "male" | "female" | "both";
};

type FormOptions = {
	countries: string[];
	standards: string[];
	days: string[];
	timeslots: string[];
};

type ValidateFormLinkResponse = {
	isValid: boolean;
	prefill?: Partial<PublicFormValues>;
};

// Default form options (fallback in case preload fails)
const DEFAULT_FORM_OPTIONS: FormOptions = {
	countries: ["Bahrain", "India", "Kuwait", "Oman", "Qatar", "Saudi Arabia", "United Arab Emirates", "Other"],
	standards: ["1", "2", "3", "4", "5", "6", "7", "7+"],
	days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
	timeslots: [],
};

// Get API base URL from environment or config
const getApiBaseUrl = (): string => {
	const envUrl = import.meta.env.VITE_API_BASE_URL;
	if (envUrl) {
		// Remove /api suffix if present to get the base URL
		return envUrl.replace(/\/api\/?$/, "");
	}
	return "http://localhost:3001";
};

const toInputDate = (value?: string): string => {
	if (!value) {
		return "";
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "";
	}

	return date.toISOString().slice(0, 10);
};

const validateFormLink = async (leadId: string, token: string): Promise<ValidateFormLinkResponse> => {
	try {
		const baseUrl = getApiBaseUrl();
		const response = await fetch(`${baseUrl}/form/${leadId}/validate?token=${encodeURIComponent(token)}`);
		if (!response.ok) {
			return { isValid: false };
		}

		const payload = await response.json() as ValidateFormLinkResponse;
		return payload;
	} catch (error) {
		console.error("Form validation error:", error);
		return { isValid: false };
	}
};

const preloadFormOptions = async (): Promise<FormOptions> => {
	// For now, return default options
	// In the future, this could fetch from an API endpoint
	try {
		// Could implement this to fetch from a /form/options endpoint
		return DEFAULT_FORM_OPTIONS;
	} catch {
		return DEFAULT_FORM_OPTIONS;
	}
};

const PublicFormPage = () => {
	const { leadId } = useParams<{ leadId: string }>();
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isValidating, setIsValidating] = useState(true);
	const [isValid, setIsValid] = useState(false);
	const [submittedZid, setSubmittedZid] = useState<string | null>(null);
	const [formOptions, setFormOptions] = useState<FormOptions>(DEFAULT_FORM_OPTIONS);

	const {
		register,
		handleSubmit,
		reset,
		setValue,
		watch,
		formState: { errors },
	} = useForm<PublicFormValues>({
		defaultValues: {
			studentName: "",
			dateOfBirth: "",
			residingCountry: "",
			standardApplyingFor: "",
			gender: "",
			primaryWhatsappNumber: "",
			alternateWhatsappNumber: "",
			studentInfo: "",
			preferredLanguage: "",
			preferredDays: [],
			preferredTimeslots: [],
			startClassWhen: "",
			hearAboutUs: "",
			demoAvailability: "",
			preferredMentorGender: "",
		},
	});

	// Preload form options on mount
	useEffect(() => {
		const loadFormOptions = async () => {
			try {
				const [options, timeSlotsResponse] = await Promise.all([
					preloadFormOptions(),
					requestWithSchema("/form/options/time-slots", TimeSlotsResponseSchema),
				]);
				setFormOptions({
					...options,
					timeslots: timeSlotsResponse.timeSlots.map((timeSlot) => timeSlot.label),
				});
			} catch (error) {
				console.error("Failed to preload form options:", error);
				// Keep default options on error
			}
		};

		void loadFormOptions();
	}, []);

	// Validate form link on mount
	useEffect(() => {
		const runValidation = async () => {
			if (!leadId || !token) {
				toast.error("Invalid form link");
				setIsValid(false);
				setIsValidating(false);
				return;
			}

			try {
				const result = await validateFormLink(leadId, token);
				setIsValid(result.isValid);

				if (result.isValid && result.prefill) {
					const prefill = result.prefill;
					reset((currentValues) => ({
						...currentValues,
						...prefill,
						dateOfBirth: toInputDate(prefill.dateOfBirth),
						preferredDays: prefill.preferredDays ?? currentValues.preferredDays,
						preferredTimeslots: prefill.preferredTimeslots ?? currentValues.preferredTimeslots,
						residingCountry: prefill.residingCountry ?? currentValues.residingCountry,
						standardApplyingFor: prefill.standardApplyingFor ?? currentValues.standardApplyingFor,
						gender: prefill.gender ?? currentValues.gender,
						preferredLanguage: prefill.preferredLanguage ?? currentValues.preferredLanguage,
						startClassWhen: prefill.startClassWhen ?? currentValues.startClassWhen,
						demoAvailability: prefill.demoAvailability ?? currentValues.demoAvailability,
						preferredMentorGender: prefill.preferredMentorGender ?? currentValues.preferredMentorGender,
					}));
				}

				if (!result.isValid) {
					toast.error("Form link has expired or is invalid");
				}
			} catch (error) {
				console.error("Validation error:", error);
				toast.error("Unable to validate form link");
				setIsValid(false);
			} finally {
				setIsValidating(false);
			}
		};

		void runValidation();
	}, [leadId, token, reset]);

	const onSubmit = async (data: PublicFormValues) => {
		if (!leadId || !token) {
			toast.error("Invalid form link");
			return;
		}

		setIsSubmitting(true);

		try {
			const baseUrl = getApiBaseUrl();
			const response = await fetch(`${baseUrl}/form/${leadId}/submit`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					...data,
					token,
					preferredDays: data.preferredDays,
					preferredTimeslots: data.preferredTimeslots,
					alternateWhatsappNumber: data.alternateWhatsappNumber || undefined,
				}),
			});

			if (!response.ok) {
				const error = await response.json().catch(() => null) as { message?: string } | null;
				toast.error(error?.message || "Failed to submit form");
				return;
			}

			const result = await response.json() as { zid?: string };
			setSubmittedZid(result.zid ?? null);
			toast.success("Form submitted successfully!");
			setIsValid(false);
		} catch (error) {
			console.error("Form submission error:", error);
			toast.error(error instanceof Error ? error.message : "Failed to submit form");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isValidating) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
				<div className="text-center">
					<div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
					<p className="mt-4 text-gray-600">Loading form...</p>
				</div>
			</div>
		);
	}

	if (!isValid) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
				<div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
					<h1 className="text-xl font-bold text-slate-900">
						{submittedZid ? "Form submitted" : "Form Not Available"}
					</h1>
					<p className="mt-2 text-sm text-slate-600">
						{submittedZid
							? `Submitted successfully. Your ZID is ${submittedZid}. You can now proceed with your enrollment.`
							: "This form link has been revoked, expired, or already submitted. Please contact support to request a new link."}
					</p>
					{submittedZid ? null : (
						<a
							href="https://wa.me/918281842824"
							target="_blank"
							rel="noopener noreferrer"
							className="mt-4 inline-block rounded-2xl bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700"
						>
							Contact Support
						</a>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-100 px-4 py-10">
			<div className="mx-auto max-w-4xl">
				<div className="rounded-4xl border border-white/60 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] sm:p-8">
					<div className="mb-8 flex flex-col items-center gap-4 text-center">
						<img src="/logo.png" alt="Zidnee" className="h-12 w-auto" />
						<div>
							<h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome to Zidnee</h1>
							<p className="mt-2 text-slate-600">Please fill out this form to get started</p>
						</div>
					</div>

					<form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 md:grid-cols-2">
						<div className="md:col-span-2">
							<label className="mb-2 block text-sm font-semibold text-slate-700">Name of Student</label>
							<input {...register("studentName", { required: "Student name is required" })} placeholder="Enter student name" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
							{errors.studentName?.message ? <p className="mt-1 text-xs text-red-600">{errors.studentName.message}</p> : null}
						</div>

						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">Date of birth</label>
							<input type="date" {...register("dateOfBirth", { required: "Date of birth is required" })} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
							{errors.dateOfBirth?.message ? <p className="mt-1 text-xs text-red-600">{errors.dateOfBirth.message}</p> : null}
						</div>

						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">Residing Country</label>
							<select {...register("residingCountry", { required: "Residing country is required" })} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15">
								<option value="">Select country</option>
								{formOptions.countries.map((country) => <option key={country} value={country}>{country}</option>)}
							</select>
							{errors.residingCountry?.message ? <p className="mt-1 text-xs text-red-600">{errors.residingCountry.message}</p> : null}
						</div>

						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">Standard applying for</label>
							<select {...register("standardApplyingFor", { required: "Standard is required" })} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15">
								<option value="">Select standard</option>
								{formOptions.standards.map((standard) => <option key={standard} value={standard}>{standard}</option>)}
							</select>
							{errors.standardApplyingFor?.message ? <p className="mt-1 text-xs text-red-600">{errors.standardApplyingFor.message}</p> : null}
						</div>

						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">Gender</label>
							<select {...register("gender", { required: "Gender is required" })} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15">
								<option value="">Select gender</option>
								<option value="male">Male</option>
								<option value="female">Female</option>
							</select>
							{errors.gender?.message ? <p className="mt-1 text-xs text-red-600">{errors.gender.message}</p> : null}
						</div>

						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">Primary WhatsApp Number (with Country Code)</label>
							<input {...register("primaryWhatsappNumber", { required: "Primary WhatsApp number is required" })} placeholder="+919876543210" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15" />
							{errors.primaryWhatsappNumber?.message ? <p className="mt-1 text-xs text-red-600">{errors.primaryWhatsappNumber.message}</p> : null}
						</div>

						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">Alternate WhatsApp Number (with Country Code)</label>
							<input {...register("alternateWhatsappNumber")} placeholder="Optional" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15" />
						</div>

						<div className="md:col-span-2">
							<label className="mb-2 block text-sm font-semibold text-slate-700">Info about the student</label>
							<textarea {...register("studentInfo", { required: "Please share a little about the student" })} rows={4} placeholder="Tell us a little about the student's learning needs" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15" />
							{errors.studentInfo?.message ? <p className="mt-1 text-xs text-red-600">{errors.studentInfo.message}</p> : null}
						</div>

						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">Preferred language for teaching</label>
							<select {...register("preferredLanguage", { required: "Preferred language is required" })} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15">
								<option value="">Select language</option>
								<option value="Malayalam Only">Malayalam Only</option>
								<option value="English Only">English Only</option>
								<option value="Malayalam - English Mixed">Malayalam - English Mixed</option>
							</select>
						</div>

						<div className="md:col-span-2">
							<label className="mb-2 block text-sm font-semibold text-slate-700">Preferred day schedule</label>
								<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
									{formOptions.days.map((day) => (
										<label key={day} className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
											<input type="checkbox" value={day} {...register("preferredDays", { required: true })} />
											{day}
										</label>
									))}
								</div>
						</div>

						<div className="md:col-span-2">
							<label className="mb-2 block text-sm font-semibold text-slate-700">Preferred timeslots (IST) for classes from admin</label>
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								{formOptions.timeslots.map((timeslot) => (
									<label key={timeslot} className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
										<input
											type="radio"
											name="preferredTimeslot"
											value={timeslot}
											checked={watch("preferredTimeslots")?.[0] === timeslot}
											onChange={() => setValue("preferredTimeslots", [timeslot])}
										/>
										{timeslot}
									</label>
								))}
							</div>
						</div>

						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">When can we start the class?</label>
							<input type="datetime-local" {...register("startClassWhen", { required: "Start time is required" })} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15" />
							{errors.startClassWhen?.message ? <p className="mt-1 text-xs text-red-600">{errors.startClassWhen.message}</p> : null}
						</div>

						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">Could you tell how did you hear about us?</label>
							<input {...register("hearAboutUs", { required: "This field is required" })} placeholder="Facebook, WhatsApp, friend, etc." className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
							{errors.hearAboutUs?.message ? <p className="mt-1 text-xs text-red-600">{errors.hearAboutUs.message}</p> : null}
						</div>

						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">When can we give a demo?</label>
							<input type="datetime-local" {...register("demoAvailability", { required: "Demo time is required" })} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15" />
							{errors.demoAvailability?.message ? <p className="mt-1 text-xs text-red-600">{errors.demoAvailability.message}</p> : null}
						</div>

						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">Preferred gender of the mentor</label>
							<select {...register("preferredMentorGender", { required: "Preferred mentor gender is required" })} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15">
								<option value="">Select preferred mentor gender</option>
								<option value="male">Male</option>
								<option value="female">Female</option>
								<option value="both">Both are okay for me</option>
							</select>
							{errors.preferredMentorGender?.message ? <p className="mt-1 text-xs text-red-600">{errors.preferredMentorGender.message}</p> : null}
						</div>

						<div className="md:col-span-2 pt-2">
							<button type="submit" disabled={isSubmitting} className="w-full rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1a5d4a] disabled:cursor-not-allowed disabled:opacity-50">
								{isSubmitting ? "Submitting..." : "Submit"}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
};

export default PublicFormPage;
