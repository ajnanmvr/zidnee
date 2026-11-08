import {
	COMPLIANCE_STATUS_LABELS,
	type ComplianceStatus,
	INSPECTION_RESULT_LABELS,
	type InspectionResult,
} from "@repo/schema";

export const COMPLIANCE_OPTIONS: ComplianceStatus[] = [
	"COMPLIANT",
	"PARTIAL",
	"NON_COMPLIANT",
];

export const RESULT_OPTIONS: InspectionResult[] = [
	"SATISFACTORY",
	"NEEDS_IMPROVEMENT",
	"URGENT_ATTENTION",
];

const statusTone: Record<ComplianceStatus, string> = {
	COMPLIANT: "border-emerald-300 bg-emerald-50 text-emerald-700",
	PARTIAL: "border-amber-300 bg-amber-50 text-amber-700",
	NON_COMPLIANT: "border-red-300 bg-red-50 text-red-700",
};

export const resultTone: Record<InspectionResult, string> = {
	SATISFACTORY: "border-emerald-300 bg-emerald-50 text-emerald-700",
	NEEDS_IMPROVEMENT: "border-amber-300 bg-amber-50 text-amber-700",
	URGENT_ATTENTION: "border-red-300 bg-red-50 text-red-700",
};

const idleTone = "border-gray-200 bg-white text-gray-600 hover:bg-gray-50";

/** Three-way Compliant / Partially / Non-compliant selector for one inspection point. */
export const ComplianceSelector = ({
	label,
	value,
	onChange,
}: {
	label: string;
	value: ComplianceStatus | undefined;
	onChange: (next: ComplianceStatus) => void;
}) => (
	<div className="flex flex-col gap-2 border-b border-gray-100 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
		<p className="text-sm font-medium text-gray-800 sm:max-w-md">{label}</p>
		<div className="flex flex-wrap gap-2">
			{COMPLIANCE_OPTIONS.map((option) => (
				<button
					key={option}
					type="button"
					onClick={() => onChange(option)}
					className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
						value === option ? statusTone[option] : idleTone
					}`}
				>
					{COMPLIANCE_STATUS_LABELS[option]}
				</button>
			))}
		</div>
	</div>
);

export const ComplianceBadge = ({ value }: { value: ComplianceStatus }) => (
	<span
		className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusTone[value]}`}
	>
		{COMPLIANCE_STATUS_LABELS[value]}
	</span>
);

export const ResultBadge = ({ value }: { value: InspectionResult }) => (
	<span
		className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${resultTone[value]}`}
	>
		{INSPECTION_RESULT_LABELS[value]}
	</span>
);
