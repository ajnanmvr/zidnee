import { useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Controller, useForm } from "react-hook-form";
import type { SubmitLeadFormPayload } from "@repo/schema";

const PublicFormPage = () => {
	const { leadId } = useParams<{ leadId: string }>();
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isValidating, setIsValidating] = useState(true);
	const [isValid, setIsValid] = useState(false);

	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<SubmitLeadFormPayload>({
		defaultValues: {
			token: token ?? "",
		},
	});

	// Validate token when page loads
	useEffect(() => {
		const validateToken = async () => {
			if (!leadId || !token) {
				toast.error("Invalid form link");
				setIsValid(false);
				setIsValidating(false);
				return;
			}

			try {
				const response = await fetch(`/api/form/${leadId}/validate`, {
					method: "GET",
					headers: {
						"Content-Type": "application/json",
					},
				});

				if (response.ok) {
					setIsValid(true);
				} else {
					toast.error("Form link has expired or is invalid");
					setIsValid(false);
				}
			} catch {
				toast.error("Unable to validate form link");
				setIsValid(false);
			} finally {
				setIsValidating(false);
			}
		};

		validateToken();
	}, [leadId, token]);

	const onSubmit = async (data: SubmitLeadFormPayload) => {
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
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				toast.error(error.message || "Failed to submit form");
				return;
			}

			toast.success("Form submitted successfully!");

			// Show success page with ZID
			setIsValid(false);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to submit form");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isValidating) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p className="mt-4 text-gray-600">Loading form...</p>
				</div>
			</div>
		);
	}

	if (!isValid) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="rounded-2xl border border-red-200 bg-red-50 p-8 max-w-md text-center">
					<h1 className="text-xl font-bold text-red-900">Form Not Available</h1>
					<p className="mt-2 text-sm text-red-700">This form link has expired or is invalid. Please contact support for a new link.</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
			<div className="max-w-md mx-auto">
				<div className="bg-white rounded-2xl shadow-lg p-8">
					<h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome</h1>
					<p className="text-gray-600 mb-8">Please fill out this form to get started</p>

					<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
						<div>
							<label className="block text-sm font-semibold text-gray-700 mb-2">
								Full Name
							</label>
							<Controller
								name="name"
								control={control}
								render={({ field }) => (
									<input
										type="text"
										{...field}
										className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
										placeholder="Enter your full name"
									/>
								)}
							/>
							{errors.name?.message && (
								<p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
							)}
						</div>

						<div>
							<label className="block text-sm font-semibold text-gray-700 mb-2">
								Phone Number
							</label>
							<Controller
								name="phone"
								control={control}
								render={({ field }) => (
									<input
										type="tel"
										{...field}
										className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
										placeholder="Enter your phone number"
									/>
								)}
							/>
							{errors.phone?.message && (
								<p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
							)}
						</div>

						<button
							type="submit"
							disabled={isSubmitting}
							className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isSubmitting ? "Submitting..." : "Submit"}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
};

export default PublicFormPage;
