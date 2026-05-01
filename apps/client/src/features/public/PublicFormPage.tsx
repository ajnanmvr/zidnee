import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { useParams, useSearchParams } from "react-router-dom";

type PublicFormValues = {
	studentName: string;
	dateOfBirth: string;
	residingCountry: string;
	standardApplyingFor: string;
	gender: "male" | "female";
	primaryWhatsappNumber: string;
	alternateWhatsappNumber: string;
	studentInfo: string;
	preferredLanguage: "Malayalam Only" | "English Only" | "Malayalam - English Mixed";
	preferredSchedule: string;
	preferredDays: string[];
	preferredTimeslots: string[];
	startClassWhen: string;
	hearAboutUs: string;
	demoAvailability: string;
	preferredMentorGender: "male" | "female" | "both";
};

const countries = ["India", "UAE", "Saudi Arabia", "Qatar", "Oman", "Kuwait", "Bahrain", "Other"];
const standards = ["1", "2", "3", "4", "5", "6", "7", "7+"];
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const timeslots = ["Morning", "Afternoon", "Evening", "Night"];
const schedules = ["Weekday Morning", "Weekday Evening", "Weekend Morning", "Weekend Evening", "Flexible"];

const validateFormLink = async (leadId: string, token: string) => {
	const response = await fetch(`/form/${leadId}/validate?token=${encodeURIComponent(token)}`);
	return response.ok;
};

const PublicFormPage = () => {
	const { leadId } = useParams<{ leadId: string }>();
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isValidating, setIsValidating] = useState(true);
	const [isValid, setIsValid] = useState(false);
	const [submittedZid, setSubmittedZid] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<PublicFormValues>({
		defaultValues: {
			studentName: "",
			dateOfBirth: "",
			residingCountry: "India",
			standardApplyingFor: "1",
			gender: "male",
			primaryWhatsappNumber: "",
			alternateWhatsappNumber: "",
			studentInfo: "",
			preferredLanguage: "Malayalam Only",
			preferredSchedule: "Weekday Morning",
			preferredDays: [],
			preferredTimeslots: [],
			startClassWhen: "Immediately",
			hearAboutUs: "",
			demoAvailability: "As soon as possible",
			preferredMentorGender: "both",
		},
	});

	useEffect(() => {
		const runValidation = async () => {
			if (!leadId || !token) {
				toast.error("Invalid form link");
				setIsValid(false);
				setIsValidating(false);
				return;
			}

			try {
				const valid = await validateFormLink(leadId, token);
				setIsValid(valid);
				if (!valid) {
					toast.error("Form link has expired or is invalid");
				}
			} catch {
				toast.error("Unable to validate form link");
				setIsValid(false);
			} finally {
				setIsValidating(false);
			}
		};

		void runValidation();
	}, [leadId, token]);

	const onSubmit = async (data: PublicFormValues) => {
		if (!leadId || !token) {
			toast.error("Invalid form link");
			return;
		}

		setIsSubmitting(true);

		try {
			const response = await fetch(`/form/${leadId}/submit`, {
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
							? `Submitted successfully. Your ZID is ${submittedZid}.`
							: "This form link has already been used or is invalid. Please contact support for a new link."}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-100 px-4 py-10">
			<div className="mx-auto max-w-4xl">
				<div className="rounded-4xl border border-white/60 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] sm:p-8">
					<div className="mb-8">
						<h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome</h1>
						<p className="mt-2 text-slate-600">Please fill out this form to get started</p>
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
							<select {...register("residingCountry")} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
								{countries.map((country) => <option key={country} value={country}>{country}</option>)}
							</select>
						</div>

						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">Standard applying for</label>
							<select {...register("standardApplyingFor")} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
								{standards.map((standard) => <option key={standard} value={standard}>{standard}</option>)}
							</select>
						</div>

						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">Gender</label>
							<select {...register("gender")} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
								<option value="male">Male</option>
								<option value="female">Female</option>
							</select>
						</div>

						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">Primary WhatsApp Number (with Country Code)</label>
							<input {...register("primaryWhatsappNumber", { required: "Primary WhatsApp number is required" })} placeholder="+919876543210" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
							{errors.primaryWhatsappNumber?.message ? <p className="mt-1 text-xs text-red-600">{errors.primaryWhatsappNumber.message}</p> : null}
						</div>

						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">Alternate WhatsApp Number (with Country Code)</label>
							<input {...register("alternateWhatsappNumber")} placeholder="Optional" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
						</div>

						<div className="md:col-span-2">
							<label className="mb-2 block text-sm font-semibold text-slate-700">Info about the student</label>
							<textarea {...register("studentInfo", { required: "Please share a little about the student" })} rows={4} placeholder="Tell us a little about the student's learning needs" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
							{errors.studentInfo?.message ? <p className="mt-1 text-xs text-red-600">{errors.studentInfo.message}</p> : null}
						</div>

						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">Preferred language for teaching</label>
							<select {...register("preferredLanguage")} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
								<option value="Malayalam Only">Malayalam Only</option>
								<option value="English Only">English Only</option>
								<option value="Malayalam - English Mixed">Malayalam - English Mixed</option>
							</select>
						</div>

						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">Select your preferred schedule</label>
							<select {...register("preferredSchedule")} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
								{schedules.map((schedule) => <option key={schedule} value={schedule}>{schedule}</option>)}
							</select>
						</div>

						<div className="md:col-span-2">
							<label className="mb-2 block text-sm font-semibold text-slate-700">Preferred day schedule</label>
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
								{days.map((day) => (
									<label key={day} className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
										<input type="checkbox" value={day} {...register("preferredDays", { required: true })} />
										{day}
									</label>
								))}
							</div>
						</div>

						<div className="md:col-span-2">
							<label className="mb-2 block text-sm font-semibold text-slate-700">Preferred timeslots (IST) for classes</label>
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
								{timeslots.map((timeslot) => (
									<label key={timeslot} className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
										<input type="checkbox" value={timeslot} {...register("preferredTimeslots", { required: true })} />
										{timeslot}
									</label>
								))}
							</div>
						</div>

						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">When can we start the class?</label>
							<select {...register("startClassWhen")} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
								<option value="Immediately">Immediately</option>
								<option value="Within a week">Within a week</option>
								<option value="Within a month">Within a month</option>
								<option value="Later">Later</option>
							</select>
						</div>

						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">Could you tell how did you hear about us?</label>
							<input {...register("hearAboutUs", { required: "This field is required" })} placeholder="Facebook, WhatsApp, friend, etc." className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
							{errors.hearAboutUs?.message ? <p className="mt-1 text-xs text-red-600">{errors.hearAboutUs.message}</p> : null}
						</div>

						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">When can we give a demo?</label>
							<select {...register("demoAvailability")} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
								<option value="As soon as possible">As soon as possible</option>
								<option value="Weekday morning">Weekday morning</option>
								<option value="Weekday evening">Weekday evening</option>
								<option value="Weekend">Weekend</option>
							</select>
						</div>

						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">Preferred gender of the mentor</label>
							<select {...register("preferredMentorGender")} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
								<option value="male">Male</option>
								<option value="female">Female</option>
								<option value="both">Both are okay for me</option>
							</select>
						</div>

						<div className="md:col-span-2 pt-2">
							<button type="submit" disabled={isSubmitting} className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
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
