import type { LeadResponse } from "@repo/schema";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { HiArrowPath, HiCheckCircle } from "react-icons/hi2";
import { Modal } from "@/components/dashboard-ui";

interface DemoOutcomeModalProps {
	open: boolean;
	demo: LeadResponse | null;
	onClose: () => void;
	onProceed: () => Promise<void>;
	onRedemo: (payload: { note?: string }) => Promise<void>;
}

export const DemoOutcomeModal = ({
	open,
	demo,
	onClose,
	onProceed,
	onRedemo,
}: DemoOutcomeModalProps) => {
	const [selectedOutcome, setSelectedOutcome] = useState<
		"proceed" | "redemo" | null
	>(null);
	const [isLoading, setIsLoading] = useState(false);

	const {
		control: redemoControl,
		handleSubmit: handleSubmitRedemo,
		reset: resetRedemo,
	} = useForm<{
		note?: string;
	}>({
		defaultValues: {
			note: "",
		},
	});

	const handleProceed = async () => {
		try {
			setIsLoading(true);
			await onProceed();
			toast.success("Demo completed successfully. Student created!");
			setSelectedOutcome(null);
			onClose();
		} catch (error) {
			if (error instanceof Error) {
				toast.error(error.message);
			} else {
				toast.error("Failed to proceed with demo");
			}
		} finally {
			setIsLoading(false);
		}
	};

	const onRedemoFormSubmit = handleSubmitRedemo(async (data) => {
		try {
			setIsLoading(true);
			await onRedemo(data);
			toast.success("Re-demo scheduled successfully");
			setSelectedOutcome(null);
			resetRedemo();
			onClose();
		} catch (error) {
			if (error instanceof Error) {
				toast.error(error.message);
			} else {
				toast.error("Failed to schedule re-demo");
			}
		} finally {
			setIsLoading(false);
		}
	});

	const demoCount = demo?.demos?.length ?? 0;
	const previousMentors =
		demo?.demos
			?.slice(0, -1)
			.map((d) => d.mentorId)
			.filter(Boolean) ?? [];
	const currentMentor = demo?.demos?.[demo.demos.length - 1]?.mentorId;

	return (
		<Modal
			open={open}
			title="Demo Outcome"
			description={demo ? `${demo.name} - Demo #${demoCount}` : ""}
			onClose={() => {
				if (selectedOutcome === null) {
					onClose();
				} else {
					setSelectedOutcome(null);
				}
			}}
		>
			{selectedOutcome === null ? (
				<div className="space-y-4">
					<div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
						<p className="text-sm text-blue-900 font-medium">
							Demo Information
						</p>
						<div className="mt-3 grid grid-cols-2 gap-4 text-sm">
							<div>
								<p className="text-gray-600">Total Demos</p>
								<p className="font-semibold text-gray-900">{demoCount}</p>
							</div>
							<div>
								<p className="text-gray-600">Current Mentor</p>
								<p className="font-semibold text-gray-900">
									{currentMentor ? "Assigned" : "N/A"}
								</p>
							</div>
							<div>
								<p className="text-gray-600">Previous Mentors</p>
								<p className="font-semibold text-gray-900">
									{previousMentors.length > 0 ? previousMentors.length : "None"}
								</p>
							</div>
							<div>
								<p className="text-gray-600">Student Name</p>
								<p className="font-semibold text-gray-900 truncate">
									{demo?.name}
								</p>
							</div>
						</div>
					</div>

					<p className="text-sm font-semibold text-gray-900">
						What would you like to do?
					</p>

					<div className="grid grid-cols-2 gap-3">
						{/* Proceed Option */}
						<button
							type="button"
							onClick={() => setSelectedOutcome("proceed")}
							className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-4 text-left hover:border-emerald-400 hover:bg-emerald-100 transition"
						>
							<div className="flex items-center gap-2 mb-2">
								<HiCheckCircle className="h-5 w-5 text-emerald-600" />
								<span className="font-semibold text-emerald-900">Proceed</span>
							</div>
							<p className="text-xs text-emerald-700">
								Demo OK - Create student and proceed with enrollment
							</p>
						</button>

						{/* Re-Demo Option */}
						<button
							type="button"
							onClick={() => setSelectedOutcome("redemo")}
							className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4 text-left hover:border-amber-400 hover:bg-amber-100 transition"
						>
							<div className="flex items-center gap-2 mb-2">
								<HiArrowPath className="h-5 w-5 text-amber-600" />
								<span className="font-semibold text-amber-900">Re-Demo</span>
							</div>
							<p className="text-xs text-amber-700">
								Schedule another demo attempt
							</p>
						</button>
					</div>
				</div>
			) : selectedOutcome === "proceed" ? (
				<div className="space-y-4">
					<div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
						<p className="text-sm font-semibold text-emerald-900 mb-2">
							Confirm Proceed
						</p>
						<p className="text-sm text-emerald-800">
							This will mark the demo as completed and create a new student
							record. The student will be assigned to a counsellor and
							onboarded.
						</p>
						<div className="mt-3 text-xs text-emerald-700 space-y-1">
							<p>✓ Demo marked as completed</p>
							<p>✓ Student record created with ZID</p>
							<p>✓ Counsellor assigned automatically</p>
							<p>✓ Batch assigned based on level</p>
						</div>
					</div>

					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => setSelectedOutcome(null)}
							className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
							disabled={isLoading}
						>
							Back
						</button>
						<button
							type="button"
							onClick={() => void handleProceed()}
							disabled={isLoading}
							className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
						>
							<HiCheckCircle className="h-4 w-4" />
							{isLoading ? "Processing..." : "Confirm Proceed"}
						</button>
					</div>
				</div>
			) : (
				<div className="space-y-4">
					<div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
						<p className="text-sm font-semibold text-amber-900 mb-2">
							Schedule Re-Demo
						</p>
						<p className="text-sm text-amber-800 mb-3">
							This will create a new demo attempt. The previous mentor
							information will be preserved in the student's record.
						</p>
						{previousMentors.length > 0 && (
							<div className="text-xs text-amber-700 bg-white rounded p-2">
								<p className="font-semibold mb-1">Previous Mentors Used:</p>
								<p>Demo attempt(s) #{previousMentors.length}</p>
							</div>
						)}
					</div>

					<form
						onSubmit={() => void onRedemoFormSubmit()}
						className="space-y-3"
					>
						<Controller
							name="note"
							control={redemoControl}
							rules={{
								maxLength: {
									value: 500,
									message: "Note cannot exceed 500 characters",
								},
							}}
							render={({ field, fieldState }) => (
								<label className="grid gap-1 text-sm font-medium text-gray-600">
									<span className="text-gray-700">
										Reason for Re-Demo (Optional)
									</span>
									<textarea
										placeholder="e.g., Student was nervous, had connection issues, needs more preparation..."
										value={field.value || ""}
										onChange={field.onChange}
										onBlur={field.onBlur}
										maxLength={500}
										rows={3}
										className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-100 resize-none"
									/>
									<div className="flex justify-between">
										{fieldState.error?.message && (
											<p className="text-xs text-red-600">
												{fieldState.error.message}
											</p>
										)}
										<p className="text-xs text-gray-500 ml-auto">
											{(field.value || "").length}/500
										</p>
									</div>
								</label>
							)}
						/>

						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => setSelectedOutcome(null)}
								className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
								disabled={isLoading}
							>
								Back
							</button>
							<button
								type="submit"
								disabled={isLoading}
								className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
							>
								<HiArrowPath className="h-4 w-4" />
								{isLoading ? "Scheduling..." : "Schedule Re-Demo"}
							</button>
						</div>
					</form>
				</div>
			)}
		</Modal>
	);
};
