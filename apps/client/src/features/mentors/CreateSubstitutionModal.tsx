import { useEffect, useMemo, useState } from "react";
import { useCreateSubstitution } from "./mentor-substitution.queries";

interface CreateSubstitutionModalProps {
	isOpen: boolean;
	mentors: Array<{
		id: string;
		name?: string | null;
		username?: string | null;
	}>;
	defaultOriginalMentorId?: string;
	endDateLabel?: string;
	onClose: () => void;
	onSuccess?: () => void;
}

export const CreateSubstitutionModal = ({
	isOpen,
	mentors,
	defaultOriginalMentorId,
	endDateLabel = "End Date",
	onClose,
	onSuccess,
}: CreateSubstitutionModalProps) => {
	const [originalMentorId, setOriginalMentorId] = useState("");
	const [substituteMentorId, setSubstituteMentorId] = useState("");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [reason, setReason] = useState("");
	const [error, setError] = useState("");

	const createSubstitution = useCreateSubstitution();

	const mentorLookup = useMemo(() => {
		return new Map(
			mentors.map((mentor) => [mentor.id, mentor.name?.trim() || mentor.username?.trim() || "Mentor"]),
		);
	}, [mentors]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const today = new Date().toISOString().split("T")[0] ?? "";
		setOriginalMentorId(defaultOriginalMentorId ?? "");
		setSubstituteMentorId("");
		// Default the start date to today but allow changing it
		setStartDate(today);
		setEndDate("");
		setReason("");
		setError("");
	}, [defaultOriginalMentorId, isOpen]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		if (!originalMentorId || !substituteMentorId || !startDate || !endDate) {
			setError("All fields are required");
			return;
		}

		if (originalMentorId === substituteMentorId) {
			setError("Original and substitute mentors must be different");
			return;
		}

		if (new Date(endDate) <= new Date(startDate)) {
			setError("Until date must be after start date");
			return;
		}

		try {
			await createSubstitution.mutateAsync({
				originalMentorId,
				substituteMentorId,
				startDate: new Date(startDate),
				endDate: new Date(endDate),
				reason: reason || undefined,
			});

			// Reset form
			setOriginalMentorId("");
			setSubstituteMentorId("");
			setStartDate("");
			setEndDate("");
			setReason("");
			onClose();
			onSuccess?.();
		} catch (err: any) {
			setError(err.response?.data?.message || "Failed to create substitution");
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
			<div className="w-full max-w-xl overflow-hidden rounded-[1.25rem] border border-white/70 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
				<div className="bg-linear-to-r from-emerald-950 via-slate-900 to-slate-800 px-6 py-5 text-white">
					<p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-100/80">
						Mentor substitution
					</p>
					<h2 className="mt-2 text-2xl font-semibold">Mark a temporary mentor replacement</h2>
					<p className="mt-2 max-w-2xl text-sm text-emerald-50/80">
						Select the mentor, choose the substitute, and set the date until the substitution should run.
					</p>
				</div>

				<form onSubmit={handleSubmit} className="grid gap-4 p-4">
					{error && (
						<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
							{error}
						</div>
					)}

					<div className="grid gap-4 md:grid-cols-2">
						<div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
							<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
								Original mentor
							</p>
							{!defaultOriginalMentorId ? (
								<select
									value={originalMentorId}
									onChange={(e) => setOriginalMentorId(e.target.value)}
									className="mt-3 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
								>
									<option value="">Select mentor...</option>
									{mentors.map((mentor) => (
										<option key={mentor.id} value={mentor.id}>
											{mentor.name?.trim() || mentor.username?.trim() || "Mentor"}
										</option>
									))}
								</select>
							) : (
								<div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
									{mentorLookup.get(defaultOriginalMentorId) ?? "Selected mentor"}
									<span className="ml-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
										fixed
									</span>
								</div>
							)}
						</div>

						<div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
							<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
								Substitute mentor
							</p>
							<select
								value={substituteMentorId}
								onChange={(e) => setSubstituteMentorId(e.target.value)}
								className="mt-3 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
							>
								<option value="">Select mentor...</option>
								{mentors
									.filter((mentor) => mentor.id !== (defaultOriginalMentorId ?? originalMentorId))
									.map((mentor) => (
										<option key={mentor.id} value={mentor.id}>
											{mentor.name?.trim() || mentor.username?.trim() || "Mentor"}
										</option>
									))}
							</select>
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<div className="rounded-3xl border border-gray-200 bg-white p-4">
							<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
								Start date
							</p>
							<input
								type="date"
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
								className="mt-3 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
							/>
						</div>

						<div className="rounded-3xl border border-gray-200 bg-white p-4">
							<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
								{endDateLabel}
							</p>
							<input
								type="date"
								value={endDate}
								onChange={(e) => setEndDate(e.target.value)}
								className="mt-3 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
							/>
						</div>
					</div>

					<div className="rounded-3xl border border-gray-200 bg-white p-4">
						<label className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
							Reason
						</label>
						<textarea
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder="Leave, conference, emergency, etc."
							rows={4}
							className="mt-3 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-500 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
						/>
					</div>

					<div className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={createSubstitution.isPending}
							className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
						>
							{createSubstitution.isPending ? "Creating..." : "Create substitution"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
