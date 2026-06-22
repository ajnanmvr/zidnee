import { TimeSlotsResponseSchema } from "@repo/schema";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useParams, useSearchParams } from "react-router-dom";
import { requestWithSchema } from "@/api/request";

type StepId = 1 | 2 | 3;

type PreferredTimeslot = {
	startTime: string;
	endTime: string;
};

type PreferredPlan = {
	timesPerWeek: number;
	durationMinutes: number;
};

type PublicFormValues = {
	name: string;
	email: string;
	dateOfBirth: string;
	residingCountry: string;
	residingCountryOther: string;
	level: string;
	gender: "" | "male" | "female";
	primaryWhatsappNumber: string;
	alternateWhatsappNumber: string;
	studentInfo: string;
	preferredLanguage:
	| ""
	| "Malayalam Only"
	| "English Only"
	| "Malayalam - English Mixed";
	preferredDays: string[];
	preferredSchedule: string;
	preferredTimeslots: PreferredTimeslot[];
	preferredPlan: PreferredPlan | null;
	preferredStartTime: string; // hh:mm
	preferredTimeIstConfirmed: boolean;
	hearAboutUs: string;
	demoAvailabilityDate: string; // YYYY-MM-DD
	demoAvailabilityTime: string; // hh:mm
	demoTimeIstConfirmed: boolean;
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
	prefill?: Partial<PublicFormValues> & {
		courseType?: "GROUP" | "INDIVIDUAL";
		demoAvailability?: string;
	};
};

const ALLOWED_COUNTRIES = [
	"Australia",
	"Bahrain",
	"Canada",
	"China",
	"Denmark",
	"Egypt",
	"France",
	"Germany",
	"India",
	"Ireland",
	"Iraq",
	"Italy",
	"Japan",
	"Kuwait",
	"Malaysia",
	"Netherlands",
	"Oman",
	"Qatar",
	"Saudi Arabia",
	"Singapore",
	"Sweden",
	"Switzerland",
	"UAE",
	"UK",
	"USA",
	"Yemen",
];

// Default form options (fallback in case preload fails)
const DEFAULT_FORM_OPTIONS: FormOptions = {
	countries: ALLOWED_COUNTRIES,
	standards: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
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

const addMinutesToTime = (time24: string, durationMinutes: number): string => {
	const [hoursText, minutesText] = time24.split(":");
	const hours = Number(hoursText);
	const minutes = Number(minutesText);
	if (Number.isNaN(hours) || Number.isNaN(minutes)) {
		return "";
	}

	const start = new Date();
	start.setHours(hours, minutes, 0, 0);
	const end = new Date(start.getTime() + durationMinutes * 60000);
	return `${end.getHours().toString().padStart(2, "0")}:${end.getMinutes().toString().padStart(2, "0")}`;
};

const splitDemoAvailability = (value?: string): { date: string; time: string } => {
	if (!value) return { date: "", time: "" };
	const [date, time] = value.split("T");
	return { date: date ?? "", time: (time ?? "").slice(0, 5) };
};

const extractReadableErrorMessage = (payload: unknown): string | null => {
	if (!payload) {
		return null;
	}

	if (typeof payload === "string") {
		return payload.trim() || null;
	}

	if (payload instanceof Error) {
		return payload.message.trim() || null;
	}

	if (typeof payload !== "object") {
		return null;
	}

	const value = payload as Record<string, unknown>;
	if (typeof value.message === "string" && value.message.trim()) {
		return value.message.trim();
	}

	if (typeof value.error === "string" && value.error.trim()) {
		return value.error.trim();
	}

	if (value.errors && typeof value.errors === "object") {
		for (const entry of Object.values(
			value.errors as Record<string, unknown>,
		)) {
			if (
				Array.isArray(entry) &&
				typeof entry[0] === "string" &&
				entry[0].trim()
			) {
				return entry[0].trim();
			}
			if (typeof entry === "string" && entry.trim()) {
				return entry.trim();
			}
		}
	}

	return null;
};

const GROUP_ALLOWED_LEVELS = ["1", "2", "3", "4", "5"] as const;

const fmtShortDate = (ymd: string): string => {
	if (!ymd) return "—";
	const d = new Date(`${ymd}T00:00:00`);
	if (Number.isNaN(d.getTime())) return ymd;
	return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const ReviewRow = ({ label, value }: { label: string; value: string }) => (
	<div className="flex items-start justify-between gap-4 px-4 py-2.5">
		<span className="shrink-0 text-xs text-slate-500">{label}</span>
		<span className="text-right text-xs font-medium text-slate-800 wrap-break-word max-w-[60%]">{value || "—"}</span>
	</div>
);

const ReviewSectionHeader = ({ title }: { title: string }) => (
	<div className="bg-slate-50 px-4 py-1.5">
		<p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
	</div>
);

const GROUP_TIME_SLOTS: PreferredTimeslot[] = [
	{ startTime: "06:00", endTime: "08:00" },
	{ startTime: "16:00", endTime: "18:00" },
	{ startTime: "18:00", endTime: "20:00" },
	{ startTime: "20:00", endTime: "22:00" },
];

const PHONE_NUMBER_PATTERN = /^[+]?\d{8,20}$/;
const validatePhoneNumber = (value: string) => {
	const cleaned = value.trim().replace(/[\s\-().]/g, "");
	return PHONE_NUMBER_PATTERN.test(cleaned) || "Enter a valid phone number with country code (digits only, optionally starting with +)";
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
	// Fetch phone codes only — countries are fixed to ALLOWED_COUNTRIES
	try {
		const res = await fetch("https://restcountries.com/v3.1/all");
		if (!res.ok) return DEFAULT_FORM_OPTIONS;
		const data = await res.json();

		const phoneMap = new Map<string, string>();

		for (const c of data) {
			const name = c?.name?.common;
			const idd = c?.idd;
			if (idd && idd.root) {
				const root: string = idd.root;
				const suffixes: string[] = Array.isArray(idd.suffixes) ? idd.suffixes : [];
				const suffix = suffixes.length > 0 ? suffixes[0] : "";
				const code = suffix ? `${root}${suffix}` : root;
				if (!phoneMap.has(code) && name) phoneMap.set(code, name);
			}
		}

		const phoneCodes = Array.from(phoneMap.entries()).map(([code, name]) => ({ code, name }));
		phoneCodes.sort((a, b) => a.code.localeCompare(b.code));

		return { ...DEFAULT_FORM_OPTIONS, phoneCodes };
	} catch (e) {
		console.error("Failed to fetch phone codes:", e);
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
	const [courseType, setCourseType] = useState<"GROUP" | "INDIVIDUAL" | "">("");
	const [extraStartTimes, setExtraStartTimes] = useState<string[]>([]);

	const {
		register,
		handleSubmit,
		reset,
		setValue,
		watch,
		trigger,
		getValues,
		formState: { errors },
	} = useForm<PublicFormValues>({
		defaultValues: {
			name: "",
			email: "",
			dateOfBirth: "",
			residingCountry: "",
			residingCountryOther: "",
			level: "",
			gender: "",
			primaryWhatsappNumber: "",
			alternateWhatsappNumber: "",
			studentInfo: "",
			preferredSchedule: "",
			preferredStartTime: "",
			preferredTimeIstConfirmed: false,
			preferredPlan: null,
			preferredLanguage: "",
			preferredDays: [],
			preferredTimeslots: [],
			hearAboutUs: "",
			demoAvailabilityDate: "",
			demoAvailabilityTime: "",
			demoTimeIstConfirmed: false,
			preferredMentorGender: "",
		},
	});

	const selectedPlanSnapshot = watch("preferredPlan");
	const selectedLevel = watch("level");
	const selectedPlan = useMemo(() => {
		if (!selectedPlanSnapshot) {
			return undefined;
		}

		return formOptions.timeslots.find(
			(timeslot) =>
				timeslot.timesPerWeek === selectedPlanSnapshot.timesPerWeek &&
				timeslot.durationMinutes === selectedPlanSnapshot.durationMinutes,
		);
	}, [formOptions.timeslots, selectedPlanSnapshot]);
	const selectedStartTime = watch("preferredStartTime");
	const preferredScheduleText = useMemo(() => {
		if (!selectedStartTime || !selectedPlan) {
			return "";
		}

		const start = to12HourFormat(selectedStartTime);
		const end = addMinutesToTime(selectedStartTime, selectedPlan.durationMinutes);
		if (!end) {
			return "";
		}

		return `${start} - ${to12HourFormat(end)} IST`;
	}, [selectedStartTime, selectedPlan]);
	const calculatedEndTime = useMemo(() => {
		if (!selectedPlan || !selectedStartTime) {
			return "";
		}

		return addMinutesToTime(selectedStartTime, selectedPlan.durationMinutes);
	}, [selectedStartTime, selectedPlan]);

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
			const fieldsToValidate = [
				"name",
				"dateOfBirth",
				"residingCountry",
				...(getValues("residingCountry") === "Other" ? ["residingCountryOther" as const] : []),
				"level",
				"gender",
				"primaryWhatsappNumber",
				"alternateWhatsappNumber",
				"email",
			] as const;
			const isValid = await trigger(fieldsToValidate as any);
			if (!isValid) {
				const errorFields = fieldsToValidate.filter((field) => {
					const err = errors[field as keyof typeof errors];
					return err?.message;
				});
				if (errorFields.length > 0) {
					toast.error(`Please fill in all required fields. Missing: ${errorFields.join(", ")}`);
				} else {
					toast.error("Please fill in all required fields.");
				}
				return false;
			}
			return true;
		}

		if (currentStep === 2) {
			const isIndividualCourse = courseType === "INDIVIDUAL";
			const isGroupCourse = courseType === "GROUP";
			let fieldsToValidate: (keyof PublicFormValues)[] = ["preferredLanguage"];
			const fieldLabels: Partial<Record<keyof PublicFormValues, string>> = {
				preferredLanguage: "preferred language",
				preferredTimeslots: "preferred class timing",
				preferredPlan: "choose a plan",
				preferredStartTime: "preferred class time",
				preferredTimeIstConfirmed: "IST confirmation for class time",
				hearAboutUs: "how you heard about us",
				demoAvailabilityTime: "demo time",
				demoAvailabilityDate: "demo date",
				demoTimeIstConfirmed: "IST confirmation for demo time",
				preferredMentorGender: "preferred mentor gender",
				preferredDays: "preferred days",
			};

			if (isGroupCourse) {
				fieldsToValidate = ["preferredLanguage", "preferredTimeslots", "hearAboutUs"];
				if ((watch("preferredTimeslots") ?? []).length === 0) {
					toast.error("Please select at least one preferred class timing.");
					return false;
				}
			} else if (isIndividualCourse) {
				fieldsToValidate = [
					"preferredLanguage",
					"preferredPlan",
					"preferredStartTime",
					"preferredTimeIstConfirmed",
					"preferredDays",
					"hearAboutUs",
					"demoAvailabilityTime",
					"demoAvailabilityDate",
					"demoTimeIstConfirmed",
					"preferredMentorGender",
				];
			}

			const isValid = await trigger(fieldsToValidate);
			if (!isValid) {
				const errorFields = fieldsToValidate.filter((field) => {
					const err = errors[field as keyof typeof errors];
					return err?.message;
				});
				if (errorFields.length > 0) {
					toast.error(
						`Please complete the learning plan. Missing: ${errorFields.map((field) => fieldLabels[field] ?? field).join(", ")}`,
					);
				} else {
					toast.error("Please complete all fields in the learning plan.");
				}
				return false;
			}
			return true;
		}

		return true;
	};

	const goNext = async () => {
		const isStepValid = await validateCurrentStep();
		if (!isStepValid) {
			return;
		}

		setCurrentStep((step) => (step === 3 ? step : ((step + 1) as StepId)));

		// Drop focus from the "Continue" button so it can't be re-activated as
		// the new "Submit application" button takes its place in the layout.
		if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}
	};

	const goBack = () => {
		setCurrentStep((step) => (step === 1 ? step : ((step - 1) as StepId)));
	};

	// Scroll to the top of the page whenever the step changes, after the new
	// step's content has rendered (avoids landing mid-page on taller steps).
	useEffect(() => {
		if (typeof window !== "undefined") {
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	}, [currentStep]);

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

				// Phone codes from Rest Countries API; countries fixed to ALLOWED_COUNTRIES
				const options = await preloadFormOptions();

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
				toast.error(
					"This form link is invalid or missing. Please request a new link.",
				);
				setIsValid(false);
				setIsValidating(false);
				return;
			}

			try {
				const result = await validateFormLink(leadId, token);
				setIsValid(result.isValid);

				if (result.isValid && result.prefill) {
					const { demoAvailability: prefillDemoAvailability, ...prefill } = result.prefill;
					const prefillDemo = splitDemoAvailability(prefillDemoAvailability);
					reset((currentValues) => ({
						...currentValues,
						...prefill,
						// Unlike other fields (e.g. primary WhatsApp number), the student's
						// name is not prefilled — the user fills it in themselves.
						name: currentValues.name,
						dateOfBirth: toInputDate(prefill.dateOfBirth),
						preferredDays: prefill.preferredDays ?? currentValues.preferredDays,
						preferredTimeslots:
							prefill.preferredTimeslots ?? currentValues.preferredTimeslots,
						preferredPlan: prefill.preferredPlan ?? currentValues.preferredPlan,
						preferredSchedule:
							prefill.preferredSchedule ?? currentValues.preferredSchedule,
						residingCountry:
							(prefill.residingCountry && !ALLOWED_COUNTRIES.includes(prefill.residingCountry as any))
								? "Other"
								: (prefill.residingCountry ?? currentValues.residingCountry),
						residingCountryOther:
							(prefill.residingCountry && !ALLOWED_COUNTRIES.includes(prefill.residingCountry as any))
								? prefill.residingCountry
								: currentValues.residingCountryOther,
						level: prefill.level ?? currentValues.level,
						gender: prefill.gender ?? currentValues.gender,
						preferredLanguage:
							prefill.preferredLanguage ?? currentValues.preferredLanguage,
						demoAvailabilityDate:
							prefillDemo.date || currentValues.demoAvailabilityDate,
						demoAvailabilityTime:
							prefillDemo.time || currentValues.demoAvailabilityTime,
						preferredMentorGender:
							String(prefill.courseType).toUpperCase() === "INDIVIDUAL"
								? (prefill.preferredMentorGender ??
									currentValues.preferredMentorGender)
								: "",
					}));

					// Set courseType from prefill (admin-selected)
					if (prefill.courseType) {
						const normalizedCourseType =
							prefill.courseType === "GROUP" ||
								prefill.courseType === "INDIVIDUAL"
								? prefill.courseType
								: String(prefill.courseType).toUpperCase() === "GROUP"
									? "GROUP"
									: String(prefill.courseType).toUpperCase() === "INDIVIDUAL"
										? "INDIVIDUAL"
										: "";
						setCourseType(normalizedCourseType);
					}
				}

				if (!result.isValid) {
					toast.error("This form link has expired or is no longer active.");
				}
			} catch (error) {
				console.error("Validation error:", error);
				toast.error("We couldn't verify the form link. Please try again.");
				setIsValid(false);
			} finally {
				setIsValidating(false);
			}
		};

		void runValidation();
	}, [leadId, token, reset]);

	const onSubmit = async (data: PublicFormValues) => {
		if (currentStep !== 3) {
			return;
		}

		if (!leadId || !token) {
			toast.error(
				"This form link is invalid or missing. Please request a new link.",
			);
			return;
		}

		setIsSubmitting(true);

		try {
			const baseUrl = getApiBaseUrl();
			const toOptionalValue = (value: string) =>
				value && value.trim().length > 0 ? value : undefined;
			const isIndividualSubmission = courseType === "INDIVIDUAL";
			const selectedPlan = data.preferredPlan ?? selectedPlanSnapshot;
			const allIndividualTimes = isIndividualSubmission && selectedPlan && data.preferredStartTime
				? [data.preferredStartTime, ...extraStartTimes].filter(Boolean)
				: [];
			const preferredTimeslots =
				data.preferredTimeslots.length > 0
					? data.preferredTimeslots.map((timeslot) => ({
						startTime: timeslot.startTime,
						endTime: timeslot.endTime,
					}))
					: allIndividualTimes.length > 0
						? allIndividualTimes.map((t) => ({
							startTime: t,
							endTime: addMinutesToTime(t, selectedPlan!.durationMinutes),
						}))
						: [];
			const demoAvailability =
				data.demoAvailabilityDate && data.demoAvailabilityTime
					? `${data.demoAvailabilityDate}T${data.demoAvailabilityTime}`
					: "";
			const payload = {
				name: data.name,
				email: data.email,
				dateOfBirth: data.dateOfBirth,
				residingCountry: data.residingCountry === "Other" ? data.residingCountryOther : data.residingCountry,
				level: data.level,
				gender: data.gender,
				primaryWhatsappNumber: data.primaryWhatsappNumber,
				alternateWhatsappNumber: data.alternateWhatsappNumber,
				courseType: courseType || undefined,
				studentInfo: data.studentInfo ?? "",
				preferredLanguage: data.preferredLanguage,
				preferredDays: data.preferredDays,
				preferredSchedule: data.preferredSchedule,
				preferredPlan: isIndividualSubmission ? selectedPlan ?? undefined : undefined,
				preferredTimeslots,
				preferredStartTime: toOptionalValue(data.preferredStartTime),
				hearAboutUs: data.hearAboutUs,
				demoAvailability: toOptionalValue(demoAvailability),
				preferredMentorGender: isIndividualSubmission
					? toOptionalValue(data.preferredMentorGender)
					: undefined,
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
				const errorPayload = await response.json().catch(() => null);
				const errorMessage =
					extractReadableErrorMessage(errorPayload) ||
					(response.status === 400
						? "Please check the highlighted fields and try again."
						: "Something went wrong. Please try again.");
				toast.error(errorMessage);
				return;
			}

			const result = (await response.json()) as { ok?: boolean };
			setIsFormSubmitted(result.ok ?? true);
			toast.success("Form submitted successfully!");
			setIsValid(false);
		} catch (error) {
			console.error("Form submission error:", error);
			toast.error(
				extractReadableErrorMessage(error) ||
				"Something went wrong. Please try again.",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const stepProgress = `${Math.round((currentStep / 3) * 100)}%`;
	const isGroupCourse = courseType === "GROUP";
	const levelOptions = isGroupCourse
		? GROUP_ALLOWED_LEVELS
		: formOptions.standards;

	useEffect(() => {
		if (!isGroupCourse) {
			return;
		}

		if (
			selectedLevel &&
			!GROUP_ALLOWED_LEVELS.includes(
				selectedLevel as "1" | "2" | "3" | "4" | "5",
			)
		) {
			setValue("level", "", { shouldDirty: true, shouldValidate: true });
		}
	}, [isGroupCourse, selectedLevel, setValue]);

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
							href="https://wa.me/918714131202"
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
				<div className="mb-4 flex bg-white/80 items-center justify-center gap-3 rounded-3xl border border-white/70  px-4 py-3 shadow-sm backdrop-blur">
					<div className="flex min-w-0 justify-center items-center gap-3">
						<img
							src="/zidnee-typography.png"
							alt="Zidnee"
							className="h-16 w-auto sm:h-24"
						/>
					</div>
				</div>

				<div className="mb-4 grid gap-2 rounded-3xl border border-white/70 bg-white/85 p-2 shadow-sm backdrop-blur sm:grid-cols-3">
					{stepMeta.map((step) => {
						const isActive = step.id === currentStep;
						const isDone = step.id < currentStep;
						return (
							<div
								key={step.id}
								className={`flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm transition ${isActive ? "bg-brand text-white" : isDone ? "bg-brand-soft text-brand" : "bg-slate-50 text-slate-500"}`}
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
					<div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
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

					<form
						onSubmit={handleSubmit(onSubmit)}
						noValidate
						onKeyDown={(event) => {
							if (
								event.key === "Enter" &&
								currentStep !== 3 &&
								(event.target as HTMLElement).tagName !== "TEXTAREA"
							) {
								event.preventDefault();
							}
						}}
						className="space-y-5"
					>
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
										<option value="Other">Other</option>
									</select>
									{errors.residingCountry?.message ? (
										<p className="mt-1 text-xs text-red-600">
											{errors.residingCountry.message}
										</p>
									) : null}
									
									{watch("residingCountry") === "Other" ? (
										<div className="mt-3">
											<input
												{...register("residingCountryOther", {
													required: "Please specify your country",
												})}
												placeholder="Enter your country"
												className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10"
											/>
											{errors.residingCountryOther?.message ? (
												<p className="mt-1 text-xs text-red-600">
													{errors.residingCountryOther.message}
												</p>
											) : null}
										</div>
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
										{levelOptions.map((standard) => (
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

								<div className="sm:col-span-2">
									<label className="mb-2 block text-sm font-semibold text-slate-700">
										Primary WhatsApp number with country code
									</label>
									<input
										{...register("primaryWhatsappNumber", {
											required: "Primary WhatsApp number is required",
											validate: validatePhoneNumber,
										})}
										placeholder="9876543210"
										className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10"
									/>
									{errors.primaryWhatsappNumber?.message ? (
										<p className="mt-1 text-xs text-red-600">
											{errors.primaryWhatsappNumber.message}
										</p>
									) : null}
								</div>

								<div className="sm:col-span-2">
									<label className="mb-2 block text-sm font-semibold text-slate-700">
										Alternate WhatsApp number with country code
									</label>
									<input
										{...register("alternateWhatsappNumber", {
											required: "Alternate WhatsApp number is required",
											validate: validatePhoneNumber,
										})}
										placeholder="9876543210"
										className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10"
									/>
									{errors.alternateWhatsappNumber?.message ? (
										<p className="mt-1 text-xs text-red-600">
											{errors.alternateWhatsappNumber.message}
										</p>
									) : null}
								</div>
								<div className="sm:col-span-2">
									<label className="mb-2 block text-sm font-semibold text-slate-700">
										Email address
									</label>
									<input
										{...register("email", {
											required: "Email is required",
											pattern: {
												value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
												message: "Enter a valid email address",
											},
										})}
										placeholder="parent@example.com"
										className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10"
									/>
									{errors.email?.message ? (
										<p className="mt-1 text-xs text-red-600">
											{errors.email.message}
										</p>
									) : null}
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
								{courseType === "INDIVIDUAL" && (
									<div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
										<div className="sm:col-span-2">
											<label className="mb-2 block text-sm font-semibold text-slate-700">
												Choose a plan
											</label>
											<p className="mb-3 text-xs text-slate-500">
												Select the plan that matches how often and how long you want classes.
											</p>
											<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 items-stretch">
												{formOptions.timeslots.map((timeslot) => {
													const isSelected =
														selectedPlanSnapshot?.timesPerWeek === timeslot.timesPerWeek &&
														selectedPlanSnapshot?.durationMinutes === timeslot.durationMinutes;

													return (
														<button
															key={`${timeslot.timesPerWeek}-${timeslot.durationMinutes}`}
															type="button"
															onClick={() => {
																setValue(
																	"preferredPlan",
																	{
																		timesPerWeek: timeslot.timesPerWeek,
																		durationMinutes: timeslot.durationMinutes,
																	},
																	{ shouldDirty: true, shouldValidate: true },
																);
															}}
															className={`w-full min-w-0 rounded-3xl border p-4 text-left transition ${isSelected ? "border-brand bg-brand-soft/50 shadow-[0_12px_30px_rgba(32,111,89,0.12)]" : "border-slate-200 bg-white hover:border-slate-300"}`}
														>
															<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
																<div>
																	<p className="text-sm font-semibold text-slate-950">
																		{timeslot.timesPerWeek} time{timeslot.timesPerWeek > 1 ? "s" : ""} per week
																	</p>
																	<p className="mt-1 text-sm text-slate-600">
																		Duration: {timeslot.durationMinutes} minutes
																	</p>
																</div>
																<span className={`mt-3 sm:mt-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${isSelected ? "bg-brand text-white" : "bg-slate-100 text-slate-600"}`}>
																	{isSelected ? "Selected" : "Choose"}
																</span>
															</div>
														</button>
													);
												})}
											</div>
											{errors.preferredPlan?.message ? (
												<p className="mt-1 text-xs text-red-600">
													{errors.preferredPlan.message}
												</p>
											) : null}
										</div>
										<div className="sm:col-span-2">
											<label className="mb-2 block text-sm font-semibold text-slate-700">
												Preferred days
											</label>
											<p className="mb-3 text-xs text-slate-500">
												Select all days you can attend individual classes.
												{selectedPlanSnapshot
													? ` Select at least ${selectedPlanSnapshot.timesPerWeek} day${selectedPlanSnapshot.timesPerWeek > 1 ? "s" : ""} to match your plan (${selectedPlanSnapshot.timesPerWeek}x/week).`
													: ""}
											</p>
											<input
												type="hidden"
												{...register("preferredDays", {
													validate: (value) => {
														if (!value || value.length === 0) {
															return "Select at least one day";
														}
														const required = selectedPlanSnapshot?.timesPerWeek ?? 0;
														if (value.length < required) {
															return `Select at least ${required} day${required > 1 ? "s" : ""} to match your plan`;
														}
														return true;
													},
												})}
											/>
											<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
												{formOptions.days.map((day) => {
													const currentDays = watch("preferredDays") || [];
													const isSelected = currentDays.includes(day);

													return (
														<button
															key={day}
															type="button"
															onClick={() => {
																const nextDays = isSelected
																	? currentDays.filter((selectedDay) => selectedDay !== day)
																	: [...currentDays, day];
																setValue("preferredDays", nextDays, {
																	shouldDirty: true,
																	shouldValidate: true,
																});
															}}
															className={`rounded-2xl border px-3 py-3 text-sm font-medium transition ${isSelected ? "border-brand bg-brand-soft text-brand" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}
														>
															{day}
														</button>
													);
												})}
											</div>
											{errors.preferredDays?.message ? (
												<p className="mt-1 text-xs text-red-600">
													{errors.preferredDays.message}
												</p>
											) : null}
										</div>
										<div>
											<label className="mb-2 block text-sm font-semibold text-slate-700">
												Preferred class times
											</label>
											{!selectedPlanSnapshot ? (
												<p className="mb-2 text-xs text-slate-500">
													Choose a plan first to calculate the class end time.
												</p>
											) : null}
											<div className="mb-2 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
												<span className="text-base leading-none">🇮🇳</span>
												<span>Please enter times in <strong>Indian Standard Time (IST)</strong>.</span>
											</div>

											{/* Primary time */}
											<div className="mb-2 flex items-center gap-2">
												<input
													type="time"
													disabled={!selectedPlanSnapshot}
													{...register("preferredStartTime", { required: "At least one class time is required" })}
													value={selectedPlanSnapshot ? undefined : ""}
													className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
												/>
												{selectedStartTime && selectedPlanSnapshot ? (
													<span className="shrink-0 text-xs text-slate-500">
														→ {to12HourFormat(addMinutesToTime(selectedStartTime, selectedPlanSnapshot.durationMinutes))}
													</span>
												) : null}
												{extraStartTimes.length > 0 ? (
													<button
														type="button"
														onClick={() => {
															setValue("preferredStartTime", extraStartTimes[0] ?? "");
															setExtraStartTimes((prev) => prev.slice(1));
														}}
														className="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
													>
														✕
													</button>
												) : null}
											</div>
											{errors.preferredStartTime?.message ? (
												<p className="mb-2 text-xs text-red-600">{errors.preferredStartTime.message}</p>
											) : null}

											{/* Extra times */}
											{extraStartTimes.map((t, idx) => (
												<div key={idx} className="mb-2 flex items-center gap-2">
													<input
														type="time"
														disabled={!selectedPlanSnapshot}
														value={t}
														onChange={(e) => {
															const next = [...extraStartTimes];
															next[idx] = e.target.value;
															setExtraStartTimes(next);
														}}
														className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
													/>
													{t && selectedPlanSnapshot ? (
														<span className="shrink-0 text-xs text-slate-500">
															→ {to12HourFormat(addMinutesToTime(t, selectedPlanSnapshot.durationMinutes))}
														</span>
													) : null}
													<button
														type="button"
														onClick={() => setExtraStartTimes((prev) => prev.filter((_, i) => i !== idx))}
														className="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
													>
														✕
													</button>
												</div>
											))}

											{/* Add another time */}
											{selectedStartTime && selectedPlanSnapshot && (extraStartTimes.length === 0 || extraStartTimes[extraStartTimes.length - 1]) ? (
												<button
													type="button"
													onClick={() => setExtraStartTimes((prev) => [...prev, ""])}
													className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand/40 bg-brand/5 py-2.5 text-sm font-semibold text-brand transition hover:border-brand hover:bg-brand/10 active:scale-[0.98]"
												>
													<span className="text-lg leading-none">+</span>
													Add another preferred time
												</button>
											) : null}

											<label className="mt-3 flex items-start gap-2 text-xs text-slate-600">
												<input
													type="checkbox"
													{...register("preferredTimeIstConfirmed", {
														required: "Please confirm the times are in IST",
													})}
													className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
												/>
												<span>I confirm all times above are in Indian Standard Time (IST) 🇮🇳.</span>
											</label>
											{errors.preferredTimeIstConfirmed?.message ? (
												<p className="mt-1 text-xs text-red-600">
													{errors.preferredTimeIstConfirmed.message}
												</p>
											) : null}
										</div>

										<div className="sm:col-span-2">
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

										<div className="sm:col-span-2">
											<label className="mb-2 block text-sm font-semibold text-slate-700">
												When can we give a demo?
											</label>
											<div className="mb-2 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
												<span className="text-base leading-none">🇮🇳</span>
												<span>Please enter the time in <strong>Indian Standard Time (IST)</strong>.</span>
											</div>
											<div className="grid gap-4 sm:grid-cols-2">
												<div>
													<label className="mb-1 block text-xs font-semibold text-slate-500">
														Time
													</label>
													<input
														type="time"
														{...register("demoAvailabilityTime", {
															required: "Demo time is required",
														})}
														className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
													/>
													{errors.demoAvailabilityTime?.message ? (
														<p className="mt-1 text-xs text-red-600">
															{errors.demoAvailabilityTime.message}
														</p>
													) : null}
												</div>
												<div>
													<label className="mb-1 block text-xs font-semibold text-slate-500">
														Date
													</label>
													<input
														type="date"
														{...register("demoAvailabilityDate", {
															required: "Demo date is required",
														})}
														className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
													/>
													{errors.demoAvailabilityDate?.message ? (
														<p className="mt-1 text-xs text-red-600">
															{errors.demoAvailabilityDate.message}
														</p>
													) : null}
												</div>
											</div>
											<label className="mt-2 flex items-start gap-2 text-xs text-slate-600">
												<input
													type="checkbox"
													{...register("demoTimeIstConfirmed", {
														required: "Please confirm the time is in IST",
													})}
													className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
												/>
												<span>I confirm the time above is given in Indian Standard Time (IST) 🇮🇳.</span>
											</label>
											{errors.demoTimeIstConfirmed?.message ? (
												<p className="mt-1 text-xs text-red-600">
													{errors.demoTimeIstConfirmed.message}
												</p>
											) : null}
										</div>
									</div>
								)}


								{courseType === "GROUP" ? (
									<div>
										<label className="mb-2 block text-sm font-semibold text-slate-700">
											Preferred class timing (Indian Time)
										</label>
										<p className="mb-3 text-xs text-slate-500">
											Tap one or more slots to select preferred timings for group classes.
										</p>

										<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
											{GROUP_TIME_SLOTS.map(({ startTime: start, endTime: end }) => {
												const currentPreferred = watch("preferredTimeslots") || [];
												const isAdded = currentPreferred.some(
													(t) => t.startTime === start && t.endTime === end,
												);

												return (
													<button
														key={start}
														type="button"
														onClick={() => {
															const current = watch("preferredTimeslots") || [];
															const exists = current.some(
																(t) => t.startTime === start && t.endTime === end,
															);
															let next: PreferredTimeslot[] = [];
															if (exists) {
																next = current.filter(
																	(t) => !(t.startTime === start && t.endTime === end),
																);
															} else {
																next = [...current, { startTime: start, endTime: end }];
															}
															setValue("preferredTimeslots", next, { shouldDirty: true, shouldValidate: true });
														}}
														className={`rounded-2xl px-3 py-2 text-sm font-medium transition ${isAdded ? "bg-brand text-white" : "bg-white border border-slate-200 text-slate-700"}`}
													>
														<div className="text-xs font-semibold">{to12HourFormat(start)}</div>
														<div className="text-[11px] text-slate-500">{to12HourFormat(end)}</div>
													</button>
												);
											})}
										</div>
									</div>
								) : null}



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
								{(watch("preferredTimeslots") ?? []).length === 0 ? (
									<p className="mt-2 text-xs font-medium text-red-600">
										Select at least one timing to continue.
									</p>
								) : null}
							</div>
						) : null}

						{currentStep === 3 ? (
							<div className="space-y-3">
								<div className="flex items-start justify-between gap-2 px-1">
									<div>
										<p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
											Review before submit
										</p>
										<p className="mt-1 text-xs text-slate-500">
											Check all details below. Go back if anything needs editing.
										</p>
									</div>
									{courseType ? (
										<span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${courseType === "GROUP" ? "bg-violet-100 text-violet-700" : "bg-teal-100 text-teal-700"}`}>
											{courseType === "GROUP" ? "Group" : "Individual"}
										</span>
									) : null}
								</div>

								<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 text-sm">
									<ReviewSectionHeader title="Personal" />
									<ReviewRow label="Name" value={watch("name") || "—"} />
									<ReviewRow label="Email" value={watch("email") || "—"} />
									<ReviewRow
										label="Gender"
										value={watch("gender") === "male" ? "Male" : watch("gender") === "female" ? "Female" : "—"}
									/>
									<ReviewRow label="Date of birth" value={fmtShortDate(watch("dateOfBirth"))} />
									<ReviewRow
										label="Level"
										value={watch("level") ? `Standard ${watch("level")}` : "—"}
									/>
									<ReviewRow
										label="Country"
										value={
											watch("residingCountry") === "Other"
												? watch("residingCountryOther") || "Other"
												: watch("residingCountry") || "—"
										}
									/>
									<ReviewRow
										label="Course type"
										value={courseType === "INDIVIDUAL" ? "Individual (1:1)" : courseType === "GROUP" ? "Group" : "—"}
									/>

									<ReviewSectionHeader title={courseType === "GROUP" ? "Preferred Time Slots" : "Class Schedule"} />
									{courseType === "INDIVIDUAL" ? (
										<>
											<ReviewRow
												label="Preferred days"
												value={(watch("preferredDays") ?? []).length > 0 ? watch("preferredDays").join(", ") : "—"}
											/>
											<ReviewRow
												label="Start time"
												value={selectedStartTime ? to12HourFormat(selectedStartTime) : "—"}
											/>
											<ReviewRow
												label="End time"
												value={calculatedEndTime ? to12HourFormat(calculatedEndTime) : "—"}
											/>
											<ReviewRow
												label="Plan"
												value={selectedPlan ? `${selectedPlan.timesPerWeek}× per week · ${selectedPlan.durationMinutes} min` : "—"}
											/>
										</>
									) : null}
									{courseType === "GROUP" ? (
										<ReviewRow
											label="Time slots"
											value={
												(watch("preferredTimeslots") ?? []).length > 0
													? watch("preferredTimeslots")
														.map((s) => `${to12HourFormat(s.startTime)} – ${to12HourFormat(s.endTime)}`)
														.join(", ")
													: "—"
											}
										/>
									) : null}

									<ReviewSectionHeader title="Contact & Preferences" />
									<ReviewRow
										label="WhatsApp"
										value={watch("primaryWhatsappNumber") ? `+91 ${watch("primaryWhatsappNumber")}` : "—"}
									/>
									{watch("alternateWhatsappNumber") ? (
										<ReviewRow label="Alt. WhatsApp" value={`+91 ${watch("alternateWhatsappNumber")}`} />
									) : null}
									<ReviewRow label="Language" value={watch("preferredLanguage") || "—"} />
									{courseType === "INDIVIDUAL" ? (
										<ReviewRow
											label="Preferred mentor"
											value={
												watch("preferredMentorGender") === "male"
													? "Male mentor"
													: watch("preferredMentorGender") === "female"
													? "Female mentor"
													: watch("preferredMentorGender") === "both"
													? "No preference"
													: "—"
											}
										/>
									) : null}
									<ReviewRow label="How you heard" value={watch("hearAboutUs") || "—"} />

									<ReviewSectionHeader title="Demo & Notes" />
									<ReviewRow
										label="Demo availability"
										value={[
											watch("demoAvailabilityDate") ? fmtShortDate(watch("demoAvailabilityDate")) : "",
											watch("demoAvailabilityTime") ? to12HourFormat(watch("demoAvailabilityTime")) : "",
										].filter(Boolean).join(" · ") || "—"}
									/>
									<ReviewRow
										label="Additional info"
										value={watch("studentInfo")?.trim() || "None"}
									/>
								</div>
							</div>
						) : null}
						<div className="mt-4 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
							<button
								type="button"
								onClick={goBack}
								disabled={currentStep === 1}
								className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-2.5"
							>
								Back
							</button>
							{currentStep < 3 ? (
								<button
									key="step-nav-continue"
									type="button"
									onClick={goNext}
									className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition hover:bg-[#1a5d4a] sm:w-auto sm:py-2.5"
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
									key="step-nav-submit"
									type="submit"
									disabled={isSubmitting}
									className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition hover:bg-[#1a5d4a] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-2.5"
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
