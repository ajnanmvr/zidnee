import { TimeSlotsResponseSchema } from "@repo/schema";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useParams, useSearchParams } from "react-router-dom";
import { requestWithSchema } from "@/api/request";

type StepId = 1 | 2 | 3;

type PublicFormValues = {
	name: string;
	dateOfBirth: string;
	residingCountry: string;
	level: string;
	gender: "" | "male" | "female";
	primaryCountryCode: string;
	primaryWhatsappNumber: string;
	alternateCountryCode?: string;
	alternateWhatsappNumber?: string;
	studentInfo: string;
	preferredLanguage:
	| ""
	| "Malayalam Only"
	| "English Only"
	| "Malayalam - English Mixed";
	preferredDays: string[];
	preferredSchedule: string;
	preferredTimeslots: Array<{
		label: string;
		timesPerWeek: number;
		durationMinutes: number;
	}>;
	preferredStartTime: string; // hh:mm
	startClassWhen: string;
	hearAboutUs: string;
	demoAvailability: string;
	preferredMentorGender: "" | "male" | "female" | "both";
};

type TimeSlotOption = {
	id: string;
	label: string;
	durationMinutes: number;
	timesPerWeek: number;
};

type PhoneCode = {
	code: string; // e.g. +91
	name: string; // country name
};

type FormOptions = {
	countries: string[];
	standards: string[];
	days: string[];
	timeslots: TimeSlotOption[];
	phoneCodes: PhoneCode[];
};

type ValidateFormLinkResponse = {
	isValid: boolean;
	prefill?: Partial<PublicFormValues>;
};

// Default form options (fallback in case preload fails)
const DEFAULT_FORM_OPTIONS: FormOptions = {
	countries: [
		"Afghanistan",
		"Albania",
		"Algeria",
		"Andorra",
		"Angola",
		"Antigua and Barbuda",
		"Argentina",
		"Armenia",
		"Australia",
		"Austria",
		"Azerbaijan",
		"Bahamas",
		"Bahrain",
		"Bangladesh",
		"Barbados",
		"Belarus",
		"Belgium",
		"Belize",
		"Benin",
		"Bhutan",
		"Bolivia",
		"Bosnia and Herzegovina",
		"Botswana",
		"Brazil",
		"Brunei",
		"Bulgaria",
		"Burkina Faso",
		"Burundi",
		"Cabo Verde",
		"Cambodia",
		"Cameroon",
		"Canada",
		"Central African Republic",
		"Chad",
		"Chile",
		"China",
		"Colombia",
		"Comoros",
		"Costa Rica",
		"Cote d'Ivoire",
		"Croatia",
		"Cuba",
		"Cyprus",
		"Czech Republic",
		"Democratic Republic of the Congo",
		"Denmark",
		"Djibouti",
		"Dominica",
		"Dominican Republic",
		"Ecuador",
		"Egypt",
		"El Salvador",
		"Equatorial Guinea",
		"Eritrea",
		"Estonia",
		"Eswatini",
		"Ethiopia",
		"Fiji",
		"Finland",
		"France",
		"Gabon",
		"Gambia",
		"Georgia",
		"Germany",
		"Ghana",
		"Greece",
		"Grenada",
		"Guatemala",
		"Guinea",
		"Guinea-Bissau",
		"Guyana",
		"Haiti",
		"Honduras",
		"Hungary",
		"Iceland",
		"India",
		"Indonesia",
		"Iran",
		"Iraq",
		"Ireland",
		"Israel",
		"Italy",
		"Jamaica",
		"Japan",
		"Jordan",
		"Kazakhstan",
		"Kenya",
		"Kiribati",
		"Kosovo",
		"Kuwait",
		"Kyrgyzstan",
		"Laos",
		"Latvia",
		"Lebanon",
		"Lesotho",
		"Liberia",
		"Libya",
		"Liechtenstein",
		"Lithuania",
		"Luxembourg",
		"Madagascar",
		"Malawi",
		"Malaysia",
		"Maldives",
		"Mali",
		"Malta",
		"Marshall Islands",
		"Mauritania",
		"Mauritius",
		"Mexico",
		"Micronesia",
		"Moldova",
		"Monaco",
		"Mongolia",
		"Montenegro",
		"Morocco",
		"Mozambique",
		"Myanmar",
		"Namibia",
		"Nauru",
		"Nepal",
		"Netherlands",
		"New Zealand",
		"Nicaragua",
		"Niger",
		"Nigeria",
		"North Korea",
		"North Macedonia",
		"Norway",
		"Oman",
		"Pakistan",
		"Palau",
		"Panama",
		"Papua New Guinea",
		"Paraguay",
		"Peru",
		"Philippines",
		"Poland",
		"Portugal",
		"Qatar",
		"Republic of the Congo",
		"Romania",
		"Russia",
		"Rwanda",
		"Saint Kitts and Nevis",
		"Saint Lucia",
		"Saint Vincent and the Grenadines",
		"Samoa",
		"San Marino",
		"Sao Tome and Principe",
		"Saudi Arabia",
		"Senegal",
		"Serbia",
		"Seychelles",
		"Sierra Leone",
		"Singapore",
		"Slovakia",
		"Slovenia",
		"Solomon Islands",
		"Somalia",
		"South Africa",
		"South Korea",
		"South Sudan",
		"Spain",
		"Sri Lanka",
		"Sudan",
		"Suriname",
		"Sweden",
		"Switzerland",
		"Syria",
		"Taiwan",
		"Tajikistan",
		"Tanzania",
		"Thailand",
		"Timor-Leste",
		"Togo",
		"Tonga",
		"Trinidad and Tobago",
		"Tunisia",
		"Turkey",
		"Turkmenistan",
		"Tuvalu",
		"Uganda",
		"Ukraine",
		"United Arab Emirates",
		"United Kingdom",
		"United States",
		"Uruguay",
		"Uzbekistan",
		"Vanuatu",
		"Vatican City",
		"Venezuela",
		"Vietnam",
		"Yemen",
		"Zambia",
		"Zimbabwe",
		"Other",
	],
	standards: ["1", "2", "3", "4", "5", "6", "7", "7+"],
	days: [
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday",
		"Saturday",
		"Sunday",
	],
	timeslots: [],
	phoneCodes: [
		{ code: "+91", name: "India" },
		{ code: "+973", name: "Bahrain" },
		{ code: "+971", name: "United Arab Emirates" },
	],
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

const to12HourFormat = (time24: string): string => {
	if (!time24) return "";
	const [hours, minutes] = time24.split(":");
	const hour = Number(hours);
	const minute = Number(minutes);
	if (Number.isNaN(hour) || Number.isNaN(minute)) return "";

	const meridiem = hour >= 12 ? "PM" : "AM";
	const hour12 = hour % 12 || 12;
	return `${hour12.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")} ${meridiem}`;
};

const extractErrorMessage = (payload: unknown): string | null => {
	if (!payload) return null;
	if (typeof payload === "string") return payload;
	if (payload instanceof Error) return payload.message;
	try {
		const obj = payload as any;
		// Common shapes: { message: string } | { error: string } | { errors: [{ message }] } | Zod-like { issues: [{ message }] }
		if (typeof obj.message === "string") return obj.message;
		if (typeof obj.error === "string") return obj.error;
		if (Array.isArray(obj.errors) && obj.errors.length > 0) {
			const first = obj.errors[0];
			if (first && typeof first.message === "string") return first.message;
			if (typeof obj.errors[0] === "string") return obj.errors[0];
		}
		if (Array.isArray(obj.issues) && obj.issues.length > 0) {
			const first = obj.issues[0];
			if (first && typeof first.message === "string") return first.message;
		}
		// Fallback: try to stringify simple object values and return the first string found
		for (const k of Object.keys(obj)) {
			const v = obj[k];
			if (typeof v === "string" && v) return v;
			if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string")
				return v[0];
		}
	} catch (e) {
		// ignore
	}
	return null;
};

const validateFormLink = async (
	leadId: string,
	token: string,
): Promise<ValidateFormLinkResponse> => {
	try {
		const baseUrl = getApiBaseUrl();
		const response = await fetch(
			`${baseUrl}/form/${leadId}/validate?token=${encodeURIComponent(token)}`,
		);
		if (!response.ok) {
			return { isValid: false };
		}

		const payload = (await response.json()) as ValidateFormLinkResponse;
		return payload;
	} catch (error) {
		console.error("Form validation error:", error);
		return { isValid: false };
	}
};

const preloadFormOptions = async (): Promise<FormOptions> => {
	// Fetch countries and phone codes from Rest Countries API
	try {
		const res = await fetch("https://restcountries.com/v3.1/all");
		if (!res.ok) return DEFAULT_FORM_OPTIONS;
		const data = await res.json();

		const countriesSet = new Set<string>();
		const phoneMap = new Map<string, string>();

		for (const c of data) {
			const name = c?.name?.common;
			if (name) countriesSet.add(name);

			const idd = c?.idd;
			if (idd && idd.root) {
				const root: string = idd.root; // e.g. "+91"
				const suffixes: string[] = Array.isArray(idd.suffixes)
					? idd.suffixes
					: [];
				const suffix = suffixes.length > 0 ? suffixes[0] : "";
				// normalize: if suffix is empty string, code is root
				const code = suffix ? `${root}${suffix}` : root;
				// keep first seen country name for code
				if (!phoneMap.has(code) && name) phoneMap.set(code, name);
			}
		}

		const countries = Array.from(countriesSet).sort((a, b) =>
			a.localeCompare(b),
		);
		const phoneCodes = Array.from(phoneMap.entries()).map(([code, name]) => ({
			code,
			name,
		}));
		phoneCodes.sort((a, b) => a.code.localeCompare(b.code));

		return {
			...DEFAULT_FORM_OPTIONS,
			countries,
			phoneCodes,
		};
	} catch (e) {
		console.error("Failed to fetch countries from public API:", e);
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
	const [isFormSubmitted, setIsFormSubmitted] = useState(false);
	const [formOptions, setFormOptions] =
		useState<FormOptions>(DEFAULT_FORM_OPTIONS);
	const [currentStep, setCurrentStep] = useState<StepId>(1);

	const {
		register,
		handleSubmit,
		reset,
		setValue,
		watch,
		trigger,
		formState: { errors },
	} = useForm<PublicFormValues>({
		defaultValues: {
			name: "",
			dateOfBirth: "",
			residingCountry: "",
			level: "",
			gender: "",
			primaryCountryCode: "+91",
			primaryWhatsappNumber: "",
			alternateCountryCode: undefined,
			alternateWhatsappNumber: undefined,
			studentInfo: "",
			preferredSchedule: "",
			preferredStartTime: "",
			preferredLanguage: "",
			preferredDays: [],
			preferredTimeslots: [],
			startClassWhen: "",
			hearAboutUs: "",
			demoAvailability: "",
			preferredMentorGender: "",
		},
	});

	const selectedTimeslotSnapshot = watch("preferredTimeslots")?.[0];
	const selectedTimeslot = useMemo(() => {
		if (!selectedTimeslotSnapshot) {
			return undefined;
		}

		return formOptions.timeslots.find(
			(timeslot) =>
				timeslot.label === selectedTimeslotSnapshot.label &&
				timeslot.timesPerWeek === selectedTimeslotSnapshot.timesPerWeek &&
				timeslot.durationMinutes === selectedTimeslotSnapshot.durationMinutes,
		);
	}, [formOptions.timeslots, selectedTimeslotSnapshot]);
	const selectedStartTime = watch("preferredStartTime");
	const preferredScheduleText = useMemo(() => {
		if (!selectedStartTime || !selectedTimeslot) {
			return "";
		}

		const start = to12HourFormat(selectedStartTime);
		const [hoursText, minutesText] = selectedStartTime.split(":");
		const hours = Number(hoursText);
		const minutes = Number(minutesText);
		if (Number.isNaN(hours) || Number.isNaN(minutes)) {
			return "";
		}

		const startDate = new Date();
		startDate.setHours(hours, minutes, 0, 0);
		const endDate = new Date(
			startDate.getTime() + selectedTimeslot.durationMinutes * 60000,
		);
		const end = `${endDate.getHours().toString().padStart(2, "0")}:${endDate.getMinutes().toString().padStart(2, "0")}`;

		return `${start} - ${to12HourFormat(end)} IST`;
	}, [selectedStartTime, selectedTimeslot]);
	const calculatedEndTime = useMemo(() => {
		if (!selectedTimeslot || !selectedStartTime) {
			return "";
		}

		const [hoursText, minutesText] = selectedStartTime.split(":");
		const hours = Number(hoursText);
		const minutes = Number(minutesText);
		if (Number.isNaN(hours) || Number.isNaN(minutes)) {
			return "";
		}

		const start = new Date();
		start.setHours(hours, minutes, 0, 0);
		const end = new Date(
			start.getTime() + selectedTimeslot.durationMinutes * 60000,
		);
		return `${end.getHours().toString().padStart(2, "0")}:${end.getMinutes().toString().padStart(2, "0")}`;
	}, [selectedStartTime, selectedTimeslot]);

	const dob = watch("dateOfBirth");
	const calculatedAge = useMemo(() => {
		if (!dob) return null;
		const birthDate = new Date(dob);
		const today = new Date();
		let age = today.getFullYear() - birthDate.getFullYear();
		const monthDiff = today.getMonth() - birthDate.getMonth();
		if (
			monthDiff < 0 ||
			(monthDiff === 0 && today.getDate() < birthDate.getDate())
		) {
			age--;
		}
		return age >= 0 ? age : null;
	}, [dob]);

	const stepMeta = [
		{
			id: 1 as StepId,
			title: "Student basics",
			description: "Who is joining Zidnee?",
		},
		{
			id: 2 as StepId,
			title: "Learning plan",
			description: "How should classes be arranged?",
		},
		{
			id: 3 as StepId,
			title: "Review & submit",
			description: "Check everything before sending",
		},
	];

	const stepButtonLabel = currentStep === 3 ? "Submit application" : "Continue";

	const validateCurrentStep = async () => {
		if (currentStep === 1) {
			return trigger([
				"name",
				"dateOfBirth",
				"residingCountry",
				"level",
				"gender",
				"primaryWhatsappNumber",
			]);
		}

		if (currentStep === 2) {
			return trigger([
				"preferredLanguage",
				"preferredTimeslots",
				"preferredDays",
				"startClassWhen",
				"preferredStartTime",
				"hearAboutUs",
				"demoAvailability",
				"preferredMentorGender",
			]);
		}

		return true;
	};

	const goNext = async () => {
		const isStepValid = await validateCurrentStep();
		if (!isStepValid) {
			toast.error("Please complete this section before continuing.");
			return;
		}

		setCurrentStep((step) => (step === 3 ? step : ((step + 1) as StepId)));
		if (typeof window !== "undefined" && document.scrollingElement) {
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	};

	const goBack = () => {
		setCurrentStep((step) => (step === 1 ? step : ((step - 1) as StepId)));
	};

	// Preload form options on mount
	useEffect(() => {
		if (preferredScheduleText) {
			setValue("preferredSchedule", preferredScheduleText, {
				shouldDirty: true,
				shouldValidate: false,
			});
		}
	}, [preferredScheduleText, setValue]);

	useEffect(() => {
		const loadFormOptions = async () => {
			try {
				console.log("Starting to load form options...");
				const timeSlotsResponse = await requestWithSchema(
					"/form/options/time-slots",
					TimeSlotsResponseSchema,
				);
				console.log("Timeslots response:", timeSlotsResponse);

				// Fetch dynamic form options (countries + phone codes) from Rest Countries API
				let options = await preloadFormOptions();
				try {
					const rcRes = await fetch(
						"https://restcountries.com/v3.1/all?fields=name,idd",
					);
					if (rcRes.ok) {
						const rcData = await rcRes.json();
						const countriesSet = new Set<string>();
						const phoneCodesMap = new Map<string, string>();
						for (const c of rcData) {
							const name = c?.name?.common;
							if (name) countriesSet.add(name);
							const idd = c?.idd;
							if (idd && idd.root) {
								const root = idd.root;
								const suffixes = Array.isArray(idd.suffixes)
									? idd.suffixes
									: [""];
								for (const s of suffixes) {
									const code = s ? `${root}${s}` : root;
									if (code) phoneCodesMap.set(code, name || code);
								}
							}
						}
						const countries = Array.from(countriesSet).sort((a, b) =>
							a.localeCompare(b),
						);
						const phoneCodes = Array.from(phoneCodesMap.entries()).map(
							([code, name]) => ({ code, name }),
						);
						phoneCodes.sort((a, b) => a.code.localeCompare(b.code));
						options = {
							...options,
							countries,
							phoneCodes,
						};
					} else {
						console.warn(
							"Rest Countries API returned non-OK status",
							rcRes.status,
						);
					}
				} catch (e) {
					console.error("Failed to fetch Rest Countries data:", e);
				}

				const mapped = timeSlotsResponse.timeSlots.map((ts) => ({
					id: ts.id,
					label: ts.label,
					durationMinutes: ts.durationMinutes,
					timesPerWeek: ts.timesPerWeek,
				}));
				console.log("Mapped timeslots:", mapped);
				setFormOptions({
					...options,
					timeslots: mapped,
				});
			} catch (error) {
				console.error("Failed to preload form options:", error);
				if (error instanceof Error) {
					console.error("Error message:", error.message);
					console.error("Error stack:", error.stack);
				}
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
						preferredTimeslots:
							prefill.preferredTimeslots ?? currentValues.preferredTimeslots,
						preferredSchedule:
							prefill.preferredSchedule ?? currentValues.preferredSchedule,
						residingCountry:
							prefill.residingCountry ?? currentValues.residingCountry,
						level: prefill.level ?? currentValues.level,
						gender: prefill.gender ?? currentValues.gender,
						preferredLanguage:
							prefill.preferredLanguage ?? currentValues.preferredLanguage,
						startClassWhen:
							prefill.startClassWhen ?? currentValues.startClassWhen,
						demoAvailability:
							prefill.demoAvailability ?? currentValues.demoAvailability,
						preferredMentorGender:
							prefill.preferredMentorGender ??
							currentValues.preferredMentorGender,
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
			const primaryFull = `${data.primaryCountryCode ?? ""}${data.primaryWhatsappNumber}`;
			const alternateFull = data.alternateWhatsappNumber
				? `${data.alternateCountryCode ?? ""}${data.alternateWhatsappNumber}`
				: undefined;
			const selectedTimeslot = formOptions.timeslots.find(
				(timeslot) =>
					timeslot.label === selectedTimeslotSnapshot?.label &&
					timeslot.timesPerWeek === selectedTimeslotSnapshot?.timesPerWeek &&
					timeslot.durationMinutes ===
					selectedTimeslotSnapshot?.durationMinutes,
			);
			const payload = {
				name: data.name,
				dateOfBirth: data.dateOfBirth,
				residingCountry: data.residingCountry,
				level: data.level,
				gender: data.gender,
				primaryWhatsappNumber: primaryFull,
				alternateWhatsappNumber: alternateFull,
				studentInfo: data.studentInfo ?? "",
				preferredLanguage: data.preferredLanguage,
				preferredDays: data.preferredDays,
				preferredSchedule: data.preferredSchedule,
				preferredTimeslots: selectedTimeslot
					? [
						{
							label: selectedTimeslot.label,
							timesPerWeek: selectedTimeslot.timesPerWeek,
							durationMinutes: selectedTimeslot.durationMinutes,
						},
					]
					: [],
				preferredStartTime: data.preferredStartTime,
				startClassWhen: data.startClassWhen,
				hearAboutUs: data.hearAboutUs,
				demoAvailability: data.demoAvailability,
				preferredMentorGender: data.preferredMentorGender,
				token,
			};

			const response = await fetch(`${baseUrl}/form/${leadId}/submit`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errPayload = await response.json().catch(() => null);
				const msg = extractErrorMessage(errPayload) || "Failed to submit form";
				toast.error(msg);
				return;
			}

			const result = (await response.json()) as { ok?: boolean };
			setIsFormSubmitted(result.ok ?? true);
			toast.success("Form submitted successfully!");
			setIsValid(false);
		} catch (error) {
			console.error("Form submission error:", error);
			const msg =
				extractErrorMessage(error) ||
				(error instanceof Error ? error.message : "Failed to submit form");
			toast.error(msg);
		} finally {
			setIsSubmitting(false);
		}
	};

	const stepProgress = `${Math.round((currentStep / 3) * 100)}%`;
	const canProceedToStep3 = Boolean(
		watch("preferredTimeslots")?.[0] &&
		watch("preferredLanguage") &&
		watch("preferredDays")?.length,
	);

	if (isValidating) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(32,111,89,0.12),transparent_34%),linear-gradient(135deg,#f8fbfa, #eef5f9)] px-4">
				<div className="text-center">
					<div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/70 bg-white/90 shadow-lg">
						<div className="h-7 w-7 animate-spin rounded-full border-2 border-brand border-t-transparent" />
					</div>

					<p className="mt-4 text-sm font-medium tracking-wide text-slate-600">
						Preparing your Zidnee experience...
					</p>
				</div>
			</div>
		);
	}

	if (!isValid) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(32,111,89,0.12),transparent_34%),linear-gradient(135deg,#f8fbfa, #eef5f9)] px-4">
				<div className="max-w-md rounded-4xl border border-white/70 bg-white/95 p-8 text-center shadow-[0_18px_60px_rgba(15,23,42,0.14)] backdrop-blur">
					<div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
						<svg
							viewBox="0 0 24 24"
							className="h-7 w-7 fill-none stroke-current stroke-[1.8]"
						>
							<path d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4Z" />
							<path
								d="M9 12l2 2 4-5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</div>
					<h1 className="text-2xl font-semibold tracking-tight text-slate-900">
						{isFormSubmitted ? "Form submitted" : "Form Not Available"}
					</h1>
					<p className="mt-3 text-sm leading-6 text-slate-600">
						{isFormSubmitted
							? "Submitted successfully. Our admissions team will review your application and contact you shortly with next steps."
							: "This form link has been revoked, expired, or already submitted. Please contact support to request a new link."}
					</p>
					{isFormSubmitted ? null : (
						<a
							href="https://wa.me/918281842824"
							target="_blank"
							rel="noopener noreferrer"
							className="mt-6 inline-flex items-center justify-center rounded-2xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition hover:bg-[#1a5d4a]"
						>
							Contact Support
						</a>
					)}
				</div>
			</div>
		);
	}

	const currentStepMeta = stepMeta[currentStep - 1] ?? stepMeta[0]!;

	return (
		<div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(32,111,89,0.12),transparent_32%),linear-gradient(135deg,#f8fbfa,#eef5f9)] px-4 py-4 sm:px-6 sm:py-6">
			<div className="mx-auto max-w-2xl">
				<div className="mb-4 flex items-center justify-between gap-3 rounded-3xl border border-white/70 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
					<div className="flex min-w-0 items-center gap-3">
						<img src="/logo.png" alt="Zidnee" className="h-9 w-auto" />
						<div className="min-w-0">
							<p className="truncate text-sm font-semibold text-slate-900">
								Zidnee application
							</p>
							<p className="truncate text-xs text-slate-500">
								Mobile-friendly, quick to complete
							</p>
						</div>
					</div>
					<div className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
						Step {currentStep}/3
					</div>
				</div>

				<div className="mb-4 flex items-center gap-2 overflow-x-auto rounded-3xl border border-white/70 bg-white/85 p-2 shadow-sm backdrop-blur">
					{stepMeta.map((step) => {
						const isActive = step.id === currentStep;
						const isDone = step.id < currentStep;
						return (
							<div
								key={step.id}
								className={`flex min-w-36 items-center gap-2 rounded-2xl px-3 py-2 text-sm transition ${isActive ? "bg-brand text-white" : isDone ? "bg-brand-soft text-brand" : "bg-slate-50 text-slate-500"}`}
							>
								<div
									className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${isActive ? "bg-white/15 text-white" : isDone ? "bg-white text-brand" : "bg-white text-slate-400"}`}
								>
									{isDone ? "✓" : step.id}
								</div>
								<div className="min-w-0">
									<p className="truncate text-xs font-semibold uppercase tracking-[0.18em]">
										{step.title}
									</p>
									<p
										className={`truncate text-[11px] ${isActive ? "text-white/80" : "text-inherit opacity-80"}`}
									>
										{step.description}
									</p>
								</div>
							</div>
						);
					})}
				</div>

				<div className="rounded-[1.75rem] border border-white/70 bg-white/92 p-4 shadow-[0_16px_50px_rgba(15,23,42,0.10)] backdrop-blur sm:p-5">
					<div className="mb-4 flex items-start justify-between gap-4">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">
								{currentStepMeta.title}
							</p>
							<h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
								{currentStepMeta.description}
							</h2>
						</div>
						<div className="hidden rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 sm:block">
							{stepProgress}
						</div>
					</div>

					<form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
						{currentStep === 1 ? (
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="sm:col-span-2">
									<label className="mb-2 block text-sm font-semibold text-slate-700">
										Name of student
									</label>
									<input
										{...register("name", {
											required: "Student name is required",
										})}
										placeholder="Enter student name"
										className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10"
									/>
									{errors.name?.message ? (
										<p className="mt-1 text-xs text-red-600">
											{errors.name.message}
										</p>
									) : null}
								</div>

								<div>
									<label className="mb-2 block text-sm font-semibold text-slate-700">
										Date of birth
									</label>
									<input
										type="date"
										{...register("dateOfBirth", {
											required: "Date of birth is required",
										})}
										className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
									/>
									{errors.dateOfBirth?.message ? (
										<p className="mt-1 text-xs text-red-600">
											{errors.dateOfBirth.message}
										</p>
									) : null}
									{calculatedAge !== null ? (
										<p className="mt-1 text-sm font-medium text-slate-700">
											Age:{" "}
											<span className="text-brand font-semibold">
												{calculatedAge}
											</span>{" "}
											years
										</p>
									) : null}
								</div>

								<div>
									<label className="mb-2 block text-sm font-semibold text-slate-700">
										Residing country
									</label>
									<select
										{...register("residingCountry", {
											required: "Residing country is required",
										})}
										className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
									>
										<option value="">Select country</option>
										{formOptions.countries.map((country) => (
											<option key={country} value={country}>
												{country}
											</option>
										))}
									</select>
									{errors.residingCountry?.message ? (
										<p className="mt-1 text-xs text-red-600">
											{errors.residingCountry.message}
										</p>
									) : null}
								</div>

								<div>
									<label className="mb-2 block text-sm font-semibold text-slate-700">
										Standard applying for
									</label>
									<select
										{...register("level", { required: "Standard is required" })}
										className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
									>
										<option value="">Select standard</option>
										{formOptions.standards.map((standard) => (
											<option key={standard} value={standard}>
												{standard}
											</option>
										))}
									</select>
									{errors.level?.message ? (
										<p className="mt-1 text-xs text-red-600">
											{errors.level.message}
										</p>
									) : null}
								</div>

								<div>
									<label className="mb-2 block text-sm font-semibold text-slate-700">
										Gender
									</label>
									<select
										{...register("gender", { required: "Gender is required" })}
										className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
									>
										<option value="">Select gender</option>
										<option value="male">Male</option>
										<option value="female">Female</option>
									</select>
									{errors.gender?.message ? (
										<p className="mt-1 text-xs text-red-600">
											{errors.gender.message}
										</p>
									) : null}
								</div>

								<div className="flex flex-col gap-2 sm:col-span-2">
									<label className="mb-2 block text-sm font-semibold text-slate-700">
										Primary WhatsApp number
									</label>
									<div className="grid gap-2">
										<div>
											<select
												{...register("primaryCountryCode")}
												className="w-full max-w-48 rounded-2xl border border-slate-200 bg-white px-3 py-3 outline-none"
											>
												{formOptions.phoneCodes.map((pc) => (
													<option key={pc.code} value={pc.code}>
														{pc.code} {pc.name}
													</option>
												))}
											</select>
										</div>
										<div>
											<input
												{...register("primaryWhatsappNumber", {
													required: "Primary WhatsApp number is required",
												})}
												placeholder="9876543210"
												className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10"
											/>
										</div>
									</div>
									{errors.primaryWhatsappNumber?.message ? (
										<p className="mt-1 text-xs text-red-600">
											{errors.primaryWhatsappNumber.message}
										</p>
									) : null}
								</div>

								<div className="flex flex-col gap-2 sm:col-span-2">
									<label className="mb-2 block text-sm font-semibold text-slate-700">
										Alternate WhatsApp number{" "}
										<span className="font-normal text-slate-400">
											(optional)
										</span>
									</label>
									<div className="grid gap-2">
										<div>
											<select
												{...register("alternateCountryCode")}
												className="w-full max-w-48 rounded-2xl border border-slate-200 bg-white px-3 py-3 outline-none"
											>
												<option value="">Code</option>
												{formOptions.phoneCodes.map((pc) => (
													<option key={pc.code} value={pc.code}>
														{pc.code} {pc.name}
													</option>
												))}
											</select>
										</div>
										<div>
											<input
												{...register("alternateWhatsappNumber")}
												placeholder="Optional"
												className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10"
											/>
										</div>
									</div>
								</div>

								<div className="sm:col-span-2">
									<label className="mb-2 block text-sm font-semibold text-slate-700">
										Additional details about the student{" "}
										<span className="font-normal text-slate-400">
											(optional)
										</span>
									</label>
									<textarea
										{...register("studentInfo")}
										placeholder="Any notes (learning style, medical info, goals)"
										className="w-full min-h-22 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10"
									/>
								</div>
							</div>
						) : null}

						{currentStep === 2 ? (
							<div className="space-y-4">


								<div>
									<label className="mb-2 block text-sm font-semibold text-slate-700">
										Preferred language for teaching
									</label>
									<select
										{...register("preferredLanguage", {
											required: "Preferred language is required",
										})}
										className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
									>
										<option value="">Select language</option>
										<option value="Malayalam Only">Malayalam Only</option>
										<option value="English Only">English Only</option>
										<option value="Malayalam - English Mixed">
											Malayalam - English Mixed
										</option>
									</select>
									{errors.preferredLanguage?.message ? (
										<p className="mt-1 text-xs text-red-600">
											{errors.preferredLanguage.message}
										</p>
									) : null}
								</div>

								<div>
									<label className="mb-2 block text-sm font-semibold text-slate-700">
										Preferred timeslots (IST) for classes
									</label>
									{formOptions.timeslots.length === 0 ? (
										<div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-sm text-slate-600">
											No time slots available yet. Please check back later or
											contact support.
										</div>
									) : (
										<div className="grid grid-cols-1 gap-3">
											{formOptions.timeslots.map((timeslot) => {
												const isSelected = selectedTimeslot?.id === timeslot.id;
												return (
													<label
														key={timeslot.id}
														className={`rounded-3xl border p-4 transition ${isSelected ? "border-brand bg-brand-soft/50 shadow-[0_12px_30px_rgba(32,111,89,0.12)]" : "border-slate-200 bg-white"}`}
													>
														<div className="flex items-start gap-3">
															<input
																type="radio"
																name="preferredTimeslot"
																value={timeslot.id}
																checked={isSelected}
																onChange={() =>
																	setValue("preferredTimeslots", [
																		{
																			label: timeslot.label,
																			timesPerWeek: timeslot.timesPerWeek,
																			durationMinutes: timeslot.durationMinutes,
																		},
																	])
																}
																className="mt-1 h-4 w-4 border-slate-300 text-brand focus:ring-brand"
															/>
															<div className="min-w-0">
																<div className="flex items-center gap-2">
																	<span className="text-sm font-semibold text-slate-950">
																		{timeslot.label}
																	</span>
																	<span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
																		{timeslot.timesPerWeek * 4} / month
																	</span>
																</div>
																<p className="mt-1 text-sm leading-6 text-slate-600">
																	Duration: {timeslot.durationMinutes} minutes.
																</p>
															</div>
														</div>
													</label>
												);
											})}
										</div>
									)}
									{errors.preferredTimeslots?.message ? (
										<p className="mt-1 text-xs text-red-600">
											{errors.preferredTimeslots.message}
										</p>
									) : null}
								</div>

								<div>
									<label className="mb-2 block text-sm font-semibold text-slate-700">
										Preferred day schedule
									</label>
									<p className="mb-3 text-xs text-slate-500">
										Select up to the number of days specified by the chosen
										timeslot.
									</p>
									<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
										{formOptions.days.map((day) => {
											const selectedDays: string[] =
												watch("preferredDays") || [];
											const maxAllowed =
												selectedTimeslot?.timesPerWeek ?? Infinity;
											const isChecked = selectedDays.includes(day);
											const disabled =
												!isChecked && selectedDays.length >= maxAllowed;

											return (
												<label
													key={day}
													className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm transition ${disabled ? "cursor-not-allowed border-slate-100 bg-white text-slate-400" : isChecked ? "border-brand bg-brand-soft/50 text-slate-900" : "border-slate-200 bg-white text-slate-700"}`}
												>
													<input
														type="checkbox"
														value={day}
														checked={isChecked}
														disabled={disabled}
														onChange={(e) => {
															const current: string[] =
																watch("preferredDays") || [];
															if (e.target.checked) {
																if (current.length >= maxAllowed) {
																	toast.error(
																		`You can select at most ${maxAllowed} day(s) for this timeslot`,
																	);
																	return;
																}
																setValue("preferredDays", [...current, day]);
															} else {
																setValue(
																	"preferredDays",
																	current.filter(
																		(selectedDay) => selectedDay !== day,
																	),
																);
															}
														}}
														className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
													/>
													<span>{day}</span>
												</label>
											);
										})}
									</div>
								</div>

								<div className="grid gap-4 sm:grid-cols-2">
									<div>
										<label className="mb-2 block text-sm font-semibold text-slate-700">
											When can we start the class?
										</label>
										<input
											type="date"
											{...register("startClassWhen", {
												required: "Start date is required",
											})}
											className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
										/>
										{errors.startClassWhen?.message ? (
											<p className="mt-1 text-xs text-red-600">
												{errors.startClassWhen.message}
											</p>
										) : null}
									</div>

									<div>
										<label className="mb-2 block text-sm font-semibold text-slate-700">
											Preferred class timing (Indian Time)
										</label>
										<input
											type="time"
											{...register("preferredStartTime")}
											className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
										/>
									</div>
									{selectedStartTime && calculatedEndTime ? (
										<div className="grid gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-3 sm:grid-cols-2 col-span-2">
											<div>
												<p className="text-xs font-semibold text-slate-600">
													Start time
												</p>
												<p className="mt-1 font-semibold text-slate-900">
													{to12HourFormat(selectedStartTime)}
												</p>
											</div>
											<div>
												<p className="text-xs font-semibold text-slate-600">
													End time
												</p>
												<p className="mt-1 font-semibold text-slate-900">
													{to12HourFormat(calculatedEndTime)}
												</p>
											</div>
										</div>
									) : null}

									<div className="col-span-2">
										<label className="mb-2 block text-sm font-semibold text-slate-700">
											Preferred mentor gender
										</label>
										<select
											{...register("preferredMentorGender", {
												required: "Preferred mentor gender is required",
											})}
											className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
										>
											<option value="">Select mentor</option>
											<option value="female">Female</option>
											<option value="male">Male</option>
											<option value="both">Both are okay for me</option>
										</select>
										{errors.preferredMentorGender?.message ? (
											<p className="mt-1 text-xs text-red-600">
												{errors.preferredMentorGender.message}
											</p>
										) : null}
									</div>

									<div>
										<label className="mb-2 block text-sm font-semibold text-slate-700">
											When can we give a demo?
										</label>
										<input
											type="datetime-local"
											{...register("demoAvailability", {
												required: "Demo time is required",
											})}
											className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
										/>
										{errors.demoAvailability?.message ? (
											<p className="mt-1 text-xs text-red-600">
												{errors.demoAvailability.message}
											</p>
										) : null}
									</div>

									<div>
										<label className="mb-2 block text-sm font-semibold text-slate-700">
											How did you hear about us?
										</label>
										<select
											{...register("hearAboutUs", {
												required: "This field is required",
											})}
											className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
										>
											<option value="">Select one</option>
											<option value="Friend or Family">Friend or Family</option>
											<option value="WhatsApp">WhatsApp</option>
											<option value="Facebook">Facebook</option>
											<option value="Instagram">Instagram</option>
											<option value="Google Search">Google Search</option>
											<option value="YouTube">YouTube</option>
											<option value="Other">Other</option>
										</select>
										{errors.hearAboutUs?.message ? (
											<p className="mt-1 text-xs text-red-600">
												{errors.hearAboutUs.message}
											</p>
										) : null}
									</div>
								</div>
							</div>
						) : null}

						{currentStep === 3 ? (
							<div className="space-y-4">
								<div className="rounded-2xl border border-slate-200 bg-white p-4">
									<p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
										Review before submit
									</p>
									<p className="mt-2 text-sm leading-6 text-slate-600">
										Check the essentials below. If something looks off, go back
										and edit it.
									</p>
								</div>
								<div className="grid gap-3 sm:grid-cols-2">
									<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
										<p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
											Student
										</p>
										<p className="mt-2 text-sm font-medium text-slate-900">
											{watch("name") || "Not filled"}
										</p>
										<p className="mt-1 text-sm text-slate-600">
											{watch("level")
												? `Standard ${watch("level")}`
												: "Standard not selected"}
										</p>
									</div>
									<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
										<p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
											Phone
										</p>
										<p className="mt-2 text-sm font-medium text-slate-900">{`${watch("primaryCountryCode") || ""}${watch("primaryWhatsappNumber") || ""}`}</p>
										<p className="mt-1 text-sm text-slate-600">
											{watch("residingCountry") || "Country not selected"}
										</p>
									</div>
									<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
										<p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
											Schedule
										</p>
										<p className="mt-2 text-sm font-medium text-slate-900">
											{watch("startClassWhen") || "No date chosen"}
										</p>
										<p className="mt-1 text-sm text-slate-600">
											{selectedStartTime
												? `Start ${selectedStartTime}${calculatedEndTime ? ` · End ${calculatedEndTime}` : ""}`
												: "No start time chosen"}
										</p>
									</div>
									<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
										<p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
											Notes
										</p>
										<p className="mt-2 text-sm leading-6 text-slate-700">
											{watch("studentInfo")?.trim()
												? watch("studentInfo")
												: "No extra details added."}
										</p>
									</div>
								</div>
							</div>
						) : null}
						<div className="mt-4 flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
							<button
								type="button"
								onClick={goBack}
								disabled={currentStep === 1}
								className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
							>
								Back
							</button>
							<div className="text-xs text-slate-500 sm:text-sm">
								{currentStep === 1
									? "Keep it quick and simple."
									: currentStep === 2
										? "Pick the class pattern."
										: "Ready when you are."}
							</div>
							{currentStep < 3 ? (
								<button
									type="button"
									onClick={goNext}
									className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition hover:bg-[#1a5d4a]"
								>
									<span>{stepButtonLabel}</span>
									<svg
										viewBox="0 0 24 24"
										className="h-4 w-4 fill-none stroke-current stroke-[1.8]"
									>
										<path d="M5 12h14" strokeLinecap="round" />
										<path
											d="M13 6l6 6-6 6"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
								</button>
							) : (
								<button
									type="submit"
									disabled={isSubmitting || !canProceedToStep3}
									className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition hover:bg-[#1a5d4a] disabled:cursor-not-allowed disabled:opacity-50"
								>
									<svg
										viewBox="0 0 24 24"
										className="h-4 w-4 fill-none stroke-current stroke-[1.8]"
									>
										<path
											d="M20 6 9 17l-5-5"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
									{isSubmitting ? "Submitting..." : "Submit"}
								</button>
							)}
						</div>
					</form>
				</div>
			</div>
		</div>
	);
};

export default PublicFormPage;
