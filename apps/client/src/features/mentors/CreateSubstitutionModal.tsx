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
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3 py-4">
			<div className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
				<div className="mb-2 flex items-center justify-between">
					<div>
						<p className="text-xs font-semibold uppercase text-gray-500">Substitution</p>
						<h3 className="text-lg font-medium">Temporary replacement</h3>
					</div>
					<button type="button" onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Close</button>
				</div>

				<form onSubmit={handleSubmit} className="grid gap-3">
					{error && (
						<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
							{error}
						</div>
					)}

					<div className="grid gap-2">
						<label className="text-xs text-gray-600">Original</label>
						{!defaultOriginalMentorId ? (
							<select
								value={originalMentorId}
								onChange={(e) => setOriginalMentorId(e.target.value)}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
							>
								<option value="">Choose...</option>
								{mentors.map((mentor) => (
									<option key={mentor.id} value={mentor.id}>
										{mentor.name?.trim() || mentor.username?.trim() || "Mentor"}
									</option>
								))}
							</select>
						) : (
							<div className="text-sm text-gray-700">{mentorLookup.get(defaultOriginalMentorId) ?? "Selected mentor"}</div>
						)}

						<label className="mt-2 text-xs text-gray-600">Substitute</label>
						<select
							value={substituteMentorId}
							onChange={(e) => setSubstituteMentorId(e.target.value)}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
						>
							<option value="">Choose...</option>
							{mentors
								.filter((mentor) => mentor.id !== (defaultOriginalMentorId ?? originalMentorId))
								.map((mentor) => (
									<option key={mentor.id} value={mentor.id}>
										{mentor.name?.trim() || mentor.username?.trim() || "Mentor"}
									</option>
								))}
						</select>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="text-xs text-gray-600">From</label>
							<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
						</div>
						<div>
							<label className="text-xs text-gray-600">{endDateLabel}</label>
							<input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
						</div>
					</div>

					<div>
						<label className="text-xs text-gray-600">Reason (optional)</label>
						<input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., leave" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
					</div>

					<div className="mt-3 flex justify-end gap-2">
						<button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700">Cancel</button>
						<button type="submit" disabled={createSubstitution.isPending} className="rounded-md bg-emerald-600 px-3 py-1 text-sm text-white disabled:opacity-60">{createSubstitution.isPending ? "Creating..." : "Save"}</button>
					</div>
				</form>
			</div>
		</div>
	);
};
