import { CLASS_OBSERVATION_ITEMS, CLASSROOM_CHECK_ITEMS } from "@repo/schema";
import { HiArrowLeft } from "react-icons/hi2";
import { Link, useParams } from "react-router-dom";
import { Panel } from "@/components/dashboard-ui";
import {
	ComplianceBadge,
	ResultBadge,
} from "@/features/students/followup-session-ui";
import { useStudentFollowUpSessionQuery } from "@/features/students/students.queries";
import { useSession } from "@/lib/session";

const Text = ({ label, value }: { label: string; value?: string }) => (
	<div>
		<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
			{label}
		</p>
		<p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
			{value || "-"}
		</p>
	</div>
);

export const StudentFollowUpSessionViewPage = () => {
	const { studentId, sessionId } = useParams<{
		studentId: string;
		sessionId: string;
	}>();
	const { token } = useSession();
	const query = useStudentFollowUpSessionQuery(token, studentId, sessionId);
	const session = query.data?.session;

	if (query.isLoading) {
		return <p className="p-6 text-sm text-gray-500">Loading…</p>;
	}
	if (!session) {
		return <p className="p-6 text-sm text-gray-500">Session not found.</p>;
	}

	return (
		<div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
			<Link
				to={`/students/${studentId}`}
				className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
			>
				<HiArrowLeft className="h-4 w-4" /> Back to student
			</Link>

			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						Student Quality Inspection
					</h1>
					<p className="text-sm text-gray-500">
						{new Date(session.inspectionDate).toLocaleDateString("en-IN", {
							dateStyle: "medium",
						})}{" "}
						· by {session.performedByName}
					</p>
				</div>
				<ResultBadge value={session.findings.result} />
			</div>

			<Panel title="1. Student details">
				<div className="grid gap-4 sm:grid-cols-3">
					<Text label="Student ID" value={session.studentZid?.toUpperCase()} />
					<Text label="Student name" value={session.studentName} />
					<Text label="Level" value={session.level} />
					<Text label="Mentor name" value={session.mentorName} />
					<Text label="Class plan" value={session.classPlan} />
				</div>
			</Panel>

			<Panel title="2. Classroom group inspection">
				{CLASSROOM_CHECK_ITEMS.map((item) => (
					<div
						key={item.key}
						className="flex flex-col gap-2 border-b border-gray-100 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
					>
						<p className="text-sm text-gray-800 sm:max-w-md">{item.label}</p>
						<ComplianceBadge value={session.classroomChecks[item.key]} />
					</div>
				))}
			</Panel>

			<Panel title="3. Class observation">
				{CLASS_OBSERVATION_ITEMS.map((item) => (
					<div
						key={item.key}
						className="flex items-center justify-between gap-3 border-b border-gray-100 py-3 last:border-b-0"
					>
						<p className="text-sm text-gray-800">{item.label}</p>
						<ComplianceBadge value={session.classObservation[item.key]} />
					</div>
				))}
			</Panel>

			<Panel title="4. Parent feedback">
				<div className="grid gap-4 sm:grid-cols-2">
					<Text
						label="Parent contacted"
						value={session.parent.contacted ? "Yes" : "No"}
					/>
					<Text
						label="Parent satisfaction"
						value={
							session.parent.satisfaction === "SATISFIED"
								? "Satisfied"
								: session.parent.satisfaction === "NEEDS_IMPROVEMENT"
									? "Needs improvement"
									: undefined
						}
					/>
					<Text label="Feedback received" value={session.parent.feedback} />
					<Text
						label="Complaints or concerns"
						value={session.parent.complaints}
					/>
				</div>
			</Panel>

			<Panel title="5. Inspection findings">
				<div className="grid gap-4 sm:grid-cols-2">
					<Text
						label="Positive observations"
						value={session.findings.positiveObservations}
					/>
					<Text
						label="Areas requiring improvement"
						value={session.findings.areasForImprovement}
					/>
					<Text
						label="Student requiring additional attention"
						value={session.findings.needsAdditionalAttention ? "Yes" : "No"}
					/>
					<Text
						label="Counsellor remarks"
						value={session.findings.counsellorRemarks}
					/>
				</div>
			</Panel>
		</div>
	);
};
