import {
	CLASS_OBSERVATION_ITEMS,
	CLASSROOM_CHECK_ITEMS,
	type ClassObservationKey,
	type ClassroomCheckKey,
	type ComplianceStatus,
	CreateStudentFollowUpSessionPayloadSchema,
	INSPECTION_RESULT_LABELS,
	type InspectionResult,
} from "@repo/schema";
import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { HiArrowLeft } from "react-icons/hi2";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "@/api/request";
import { Panel } from "@/components/dashboard-ui";
import {
	ComplianceSelector,
	RESULT_OPTIONS,
	resultTone,
} from "@/features/students/followup-session-ui";
import { useCreateStudentFollowUpSessionMutation } from "@/features/students/students.mutations";
import { useStudentByIdQuery } from "@/features/students/students.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useSession } from "@/lib/session";

const inputClass =
	"w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100";

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const ReadOnlyField = ({ label, value }: { label: string; value: string }) => (
	<div>
		<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
			{label}
		</p>
		<p className="mt-1 text-sm font-semibold text-gray-900">{value || "-"}</p>
	</div>
);

const YesNo = ({
	value,
	onChange,
}: {
	value: boolean | undefined;
	onChange: (next: boolean) => void;
}) => (
	<div className="flex gap-2">
		{[true, false].map((option) => (
			<button
				key={String(option)}
				type="button"
				onClick={() => onChange(option)}
				className={`rounded-xl border px-4 py-1.5 text-sm font-semibold transition ${
					value === option
						? "border-teal-400 bg-teal-50 text-teal-700"
						: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
				}`}
			>
				{option ? "Yes" : "No"}
			</button>
		))}
	</div>
);

export const StudentFollowUpSessionPage = () => {
	const { studentId } = useParams<{ studentId: string }>();
	const navigate = useNavigate();
	const { token } = useSession();
	const studentQuery = useStudentByIdQuery(token, studentId);
	const usersQuery = useUsersQuery(token);
	const createMutation = useCreateStudentFollowUpSessionMutation();
	const student = studentQuery.data ?? null;

	const [classPlan, setClassPlan] = useState("");
	const [inspectionDate, setInspectionDate] = useState(todayInputValue());
	const [classroomChecks, setClassroomChecks] = useState<
		Partial<Record<ClassroomCheckKey, ComplianceStatus>>
	>({});
	const [classObservation, setClassObservation] = useState<
		Partial<Record<ClassObservationKey, ComplianceStatus>>
	>({});
	const [parentContacted, setParentContacted] = useState<boolean | undefined>();
	const [parentSatisfaction, setParentSatisfaction] = useState<
		"SATISFIED" | "NEEDS_IMPROVEMENT" | ""
	>("");
	const [parentFeedback, setParentFeedback] = useState("");
	const [parentComplaints, setParentComplaints] = useState("");
	const [positive, setPositive] = useState("");
	const [improvements, setImprovements] = useState("");
	const [needsAttention, setNeedsAttention] = useState<boolean | undefined>();
	const [result, setResult] = useState<InspectionResult | "">("");
	const [remarks, setRemarks] = useState("");
	const [nextFollowUpDate, setNextFollowUpDate] = useState("");
	const [error, setError] = useState<string | undefined>();

	const mentorName = useMemo(() => {
		if (!student?.mentorId) return "";
		const user = usersQuery.data?.users.find((u) => u.id === student.mentorId);
		return user?.name ?? user?.username ?? "";
	}, [student?.mentorId, usersQuery.data?.users]);

	const backPath = `/students/${studentId}`;

	const submit = async () => {
		if (!studentId) return;
		setError(undefined);

		if (
			parentContacted === undefined ||
			needsAttention === undefined ||
			!result
		) {
			setError(
				"Please answer 'Parent contacted', 'Student requiring additional attention' and choose an overall result.",
			);
			return;
		}

		const parsed = CreateStudentFollowUpSessionPayloadSchema.safeParse({
			classPlan: classPlan || undefined,
			inspectionDate: inspectionDate ? new Date(inspectionDate) : undefined,
			classroomChecks,
			classObservation,
			parent: {
				contacted: parentContacted,
				satisfaction: parentContacted
					? parentSatisfaction || undefined
					: undefined,
				feedback: parentFeedback || undefined,
				complaints: parentComplaints || undefined,
			},
			findings: {
				positiveObservations: positive || undefined,
				areasForImprovement: improvements || undefined,
				needsAdditionalAttention: needsAttention,
				result,
				counsellorRemarks: remarks || undefined,
			},
			nextFollowUpAt: nextFollowUpDate ? new Date(nextFollowUpDate) : undefined,
		});

		if (!parsed.success) {
			setError("Please rate every inspection point in sections 2 and 3.");
			return;
		}

		try {
			await createMutation.mutateAsync({ studentId, payload: parsed.data });
			toast.success("Follow-up session saved");
			navigate(backPath);
		} catch (err) {
			if (err instanceof ApiError) {
				toast.error(err.payload.message ?? "Failed to save follow-up session");
			} else {
				toast.error("Failed to save follow-up session");
			}
		}
	};

	if (studentQuery.isLoading) {
		return <p className="p-6 text-sm text-gray-500">Loading student…</p>;
	}
	if (!student) {
		return <p className="p-6 text-sm text-gray-500">Student not found.</p>;
	}

	return (
		<div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
			<Link
				to={backPath}
				className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
			>
				<HiArrowLeft className="h-4 w-4" /> Back to student
			</Link>

			<div>
				<h1 className="text-2xl font-bold text-gray-900">
					Student Quality Inspection
				</h1>
				<p className="text-sm text-gray-500">
					Academic quality assurance &amp; student follow-up
				</p>
			</div>

			<Panel title="1. Student details">
				<div className="grid gap-4 sm:grid-cols-3">
					<ReadOnlyField
						label="Student ID"
						value={student.zid?.toUpperCase() ?? ""}
					/>
					<ReadOnlyField label="Student name" value={student.name ?? ""} />
					<ReadOnlyField
						label="Level"
						value={student.level ? String(student.level) : ""}
					/>
					<ReadOnlyField label="Mentor name" value={mentorName} />
					<label className="grid gap-1">
						<span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
							Class plan
						</span>
						<input
							className={inputClass}
							value={classPlan}
							onChange={(e) => setClassPlan(e.target.value)}
							placeholder="e.g. 3 days / week"
						/>
					</label>
					<label className="grid gap-1">
						<span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
							Inspection date
						</span>
						<input
							type="date"
							className={inputClass}
							value={inspectionDate}
							onChange={(e) => setInspectionDate(e.target.value)}
						/>
					</label>
				</div>
			</Panel>

			<Panel title="2. Classroom group inspection">
				{CLASSROOM_CHECK_ITEMS.map((item) => (
					<ComplianceSelector
						key={item.key}
						label={item.label}
						value={classroomChecks[item.key]}
						onChange={(next) =>
							setClassroomChecks((prev) => ({ ...prev, [item.key]: next }))
						}
					/>
				))}
			</Panel>

			<Panel title="3. Class observation">
				{CLASS_OBSERVATION_ITEMS.map((item) => (
					<ComplianceSelector
						key={item.key}
						label={item.label}
						value={classObservation[item.key]}
						onChange={(next) =>
							setClassObservation((prev) => ({ ...prev, [item.key]: next }))
						}
					/>
				))}
			</Panel>

			<Panel title="4. Parent feedback">
				<div className="space-y-4">
					<div className="flex items-center justify-between gap-3">
						<p className="text-sm font-medium text-gray-800">
							Parent contacted
						</p>
						<YesNo value={parentContacted} onChange={setParentContacted} />
					</div>
					{parentContacted ? (
						<div className="flex items-center justify-between gap-3">
							<p className="text-sm font-medium text-gray-800">
								Parent satisfaction
							</p>
							<div className="flex gap-2">
								{(
									[
										["SATISFIED", "Satisfied"],
										["NEEDS_IMPROVEMENT", "Needs improvement"],
									] as const
								).map(([value, label]) => (
									<button
										key={value}
										type="button"
										onClick={() => setParentSatisfaction(value)}
										className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
											parentSatisfaction === value
												? "border-teal-400 bg-teal-50 text-teal-700"
												: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
										}`}
									>
										{label}
									</button>
								))}
							</div>
						</div>
					) : null}
					<label className="grid gap-1">
						<span className="text-sm font-medium text-gray-800">
							Feedback received
						</span>
						<textarea
							rows={3}
							className={inputClass}
							value={parentFeedback}
							onChange={(e) => setParentFeedback(e.target.value)}
						/>
					</label>
					<label className="grid gap-1">
						<span className="text-sm font-medium text-gray-800">
							Complaints or concerns
						</span>
						<textarea
							rows={3}
							className={inputClass}
							value={parentComplaints}
							onChange={(e) => setParentComplaints(e.target.value)}
						/>
					</label>
				</div>
			</Panel>

			<Panel title="5. Inspection findings">
				<div className="space-y-4">
					<label className="grid gap-1">
						<span className="text-sm font-medium text-gray-800">
							Positive observations
						</span>
						<textarea
							rows={3}
							className={inputClass}
							value={positive}
							onChange={(e) => setPositive(e.target.value)}
						/>
					</label>
					<label className="grid gap-1">
						<span className="text-sm font-medium text-gray-800">
							Areas requiring improvement
						</span>
						<textarea
							rows={3}
							className={inputClass}
							value={improvements}
							onChange={(e) => setImprovements(e.target.value)}
						/>
					</label>
					<div className="flex items-center justify-between gap-3">
						<p className="text-sm font-medium text-gray-800">
							Student requiring additional attention
						</p>
						<YesNo value={needsAttention} onChange={setNeedsAttention} />
					</div>
					<div className="space-y-2">
						<p className="text-sm font-medium text-gray-800">
							Overall inspection result
						</p>
						<div className="flex flex-wrap gap-2">
							{RESULT_OPTIONS.map((option) => (
								<button
									key={option}
									type="button"
									onClick={() => setResult(option)}
									className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
										result === option
											? resultTone[option]
											: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
									}`}
								>
									{INSPECTION_RESULT_LABELS[option]}
								</button>
							))}
						</div>
					</div>
					<label className="grid gap-1">
						<span className="text-sm font-medium text-gray-800">
							Counsellor remarks
						</span>
						<textarea
							rows={3}
							className={inputClass}
							value={remarks}
							onChange={(e) => setRemarks(e.target.value)}
						/>
					</label>
					<label className="grid gap-1 sm:max-w-xs">
						<span className="text-sm font-medium text-gray-800">
							Next follow-up date (optional)
						</span>
						<input
							type="datetime-local"
							className={inputClass}
							value={nextFollowUpDate}
							onChange={(e) => setNextFollowUpDate(e.target.value)}
						/>
						<span className="text-xs text-gray-500">
							Leave empty to use the default follow-up interval.
						</span>
					</label>
				</div>
			</Panel>

			{error ? (
				<p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					{error}
				</p>
			) : null}

			<div className="flex justify-end gap-3 pb-6">
				<Link
					to={backPath}
					className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
				>
					Cancel
				</Link>
				<button
					type="button"
					onClick={() => void submit()}
					disabled={createMutation.isPending}
					className="rounded-2xl bg-teal-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
				>
					{createMutation.isPending ? "Saving…" : "Save inspection"}
				</button>
			</div>
		</div>
	);
};
