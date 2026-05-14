import { Modal } from "@/components/dashboard-ui";
import type { LeadResponse } from "@repo/schema";
import { useState } from "react";
import toast from "react-hot-toast";
import { HiCheckCircle } from "react-icons/hi2";

interface DemoOutcomeModalProps {
	open: boolean;
	demo: LeadResponse | null;
	onClose: () => void;
	onProceed: () => Promise<void>;
}

export const DemoOutcomeModal = ({
	open,
	demo,
	onClose,
	onProceed,
}: DemoOutcomeModalProps) => {
	const [selectedOutcome, setSelectedOutcome] = useState<"proceed" | null>(
		null,
	);
	const [isLoading, setIsLoading] = useState(false);

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

					<div className="grid grid-cols-1 gap-3">
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
					</div>
				</div>
			) : selectedOutcome === "proceed" ? (
				<div className="space-y-4">
					<div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
						<p className="text-sm font-semibold text-emerald-900 mb-2">
							Confirm Proceed
						</p>
						<p className="text-sm text-emerald-800">
							This will mark the demo as completed
						</p>
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
			) : null}
		</Modal>
	);
};
