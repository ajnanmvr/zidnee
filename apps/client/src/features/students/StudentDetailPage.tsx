import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { HiArrowLeft } from "react-icons/hi2";
import { Link } from "react-router-dom";
import { Panel } from "@/components/dashboard-ui";
import { getStudentStatusColor, getStudentStatusLabel } from "@/features/students/student-table";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useSession } from "@/lib/session";

export const StudentDetailPage = () => {
	const { studentId } = useParams<{ studentId: string }>();
	const navigate = useNavigate();
	const { token } = useSession();
	const studentsQuery = useStudentsQuery(token);
	const usersQuery = useUsersQuery(token);
	const [activeTab, setActiveTab] = useState<"overview" | "details">("overview");

	const student = useMemo(
		() => studentsQuery.data?.students.find((s) => s.id === studentId),
		[studentsQuery.data?.students, studentId]
	);

	const mentorName = useMemo(() => {
		if (!student?.mentorId) return "—";
		const user = usersQuery.data?.users.find((u) => u.id === student.mentorId);
		return user?.name ?? user?.username ?? "Unknown";
	}, [student?.mentorId, usersQuery.data?.users]);

	const admittedByName = useMemo(() => {
		if (!student?.admittedBy) return "—";
		const user = usersQuery.data?.users.find((u) => u.id === student.admittedBy);
		return user?.name ?? user?.username ?? "Unknown";
	}, [student?.admittedBy, usersQuery.data?.users]);

	if (studentsQuery.isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<p className="text-gray-600">Loading student details...</p>
			</div>
		);
	}

	if (!student) {
		return (
			<div className="text-center py-12">
				<p className="text-gray-600 mb-4">Student not found</p>
				<button
					onClick={() => navigate(-1)}
					className="text-teal-600 hover:underline text-sm font-medium"
				>
					Go back
				</button>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-start justify-between">
				<div className="flex items-start gap-3">
					<button
						onClick={() => navigate(-1)}
						className="mt-1 text-gray-600 hover:text-gray-900"
					>
						<HiArrowLeft className="h-5 w-5" />
					</button>
					<div>
						<div className="flex items-center gap-2">
							<h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
							<span
								className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold text-white ${getStudentStatusColor(
									student.status
								)}`}
							>
								{getStudentStatusLabel(student.status)}
							</span>
						</div>
						<p className="text-sm text-gray-600 mt-1">
							ZID: <span className="font-mono font-semibold">{student.zid}</span>
						</p>
					</div>
				</div>
			</div>

			{/* Stat Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div className="rounded-lg border border-gray-200 bg-white p-4">
					<p className="text-xs text-gray-600 uppercase tracking-wide">
						Phone
					</p>
					<p className="text-lg font-semibold text-gray-900 mt-1">
						{student.phone}
					</p>
				</div>
				<div className="rounded-lg border border-gray-200 bg-white p-4">
					<p className="text-xs text-gray-600 uppercase tracking-wide">
						Email
					</p>
					<p className="text-lg font-semibold text-gray-900 mt-1">
						{student.email}
					</p>
				</div>
				<div className="rounded-lg border border-gray-200 bg-white p-4">
					<p className="text-xs text-gray-600 uppercase tracking-wide">
						Course Type
					</p>
					<p className="text-lg font-semibold text-gray-900 mt-1">
						{student.courseType ?? "—"}
					</p>
				</div>
				<div className="rounded-lg border border-gray-200 bg-white p-4">
					<p className="text-xs text-gray-600 uppercase tracking-wide">Level</p>
					<p className="text-lg font-semibold text-gray-900 mt-1">
						{student.level ?? "—"}
					</p>
				</div>
			</div>

			{/* Tabs */}
			<div className="border-b border-gray-200">
				<nav className="flex gap-8">
					<button
						onClick={() => setActiveTab("overview")}
						className={`px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
							activeTab === "overview"
								? "border-teal-600 text-teal-600"
								: "border-transparent text-gray-600 hover:text-gray-900"
						}`}
					>
						Overview
					</button>
					<button
						onClick={() => setActiveTab("details")}
						className={`px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
							activeTab === "details"
								? "border-teal-600 text-teal-600"
								: "border-transparent text-gray-600 hover:text-gray-900"
						}`}
					>
						Details
					</button>
				</nav>
			</div>

			{/* Tab Content */}
			{activeTab === "overview" && (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					{/* Admission Info */}
					<Panel title="Admission Info">
						<dl className="space-y-4">
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">
									Admitted By
								</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">
									{admittedByName}
								</dd>
							</div>
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">
									Admitted On
								</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">
									{new Date(student.admittedAt).toLocaleDateString("en-IN", {
										year: "numeric",
										month: "long",
										day: "numeric",
									})}
								</dd>
							</div>
						</dl>
					</Panel>

					{/* Learning Setup */}
					<Panel title="Learning Setup">
						<dl className="space-y-4">
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">
									Mentor
								</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">
									{mentorName}
								</dd>
							</div>
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">
									Classes Per Week
								</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">
									{student.timeslot?.classesPerWeek ?? "—"}
								</dd>
							</div>
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">
									Duration
								</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">
									{student.timeslot?.durationMinutes
										? `${student.timeslot.durationMinutes} minutes`
										: "—"}
								</dd>
							</div>
						</dl>
					</Panel>

					{/* Preferences */}
					<Panel title="Preferences">
						<dl className="space-y-4">
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">
									Language
								</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">
									{student.preferredLanguage ?? "—"}
								</dd>
							</div>
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">
									Schedule
								</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">
									{student.preferredSchedule ?? "—"}
								</dd>
							</div>
						</dl>
					</Panel>

					{/* Personal Info */}
					<Panel title="Personal Information">
						<dl className="space-y-4">
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">
									Date of Birth
								</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">
									{student.dateOfBirth
										? new Date(student.dateOfBirth).toLocaleDateString("en-IN")
										: "—"}
								</dd>
							</div>
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">
									Gender
								</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">
									{student.gender ?? "—"}
								</dd>
							</div>
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">
									Country
								</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">
									{student.residingCountry ?? "—"}
								</dd>
							</div>
						</dl>
					</Panel>
				</div>
			)}

			{activeTab === "details" && (
				<div className="space-y-4">
					{/* Contact Info */}
					<Panel title="Contact Information">
						<dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">
									Primary WhatsApp
								</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">
									{student.primaryWhatsappNumber ?? "—"}
								</dd>
							</div>
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">
									Alternate WhatsApp
								</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">
									{student.alternateWhatsappNumber ?? "—"}
								</dd>
							</div>
						</dl>
					</Panel>

					{/* Background */}
					<Panel title="Background & Goals">
						<dl className="space-y-4">
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">
									Student Info
								</dt>
								<dd className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
									{student.studentInfo ?? "—"}
								</dd>
							</div>
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">
									How did you hear about us?
								</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">
									{student.hearAboutUs ?? "—"}
								</dd>
							</div>
							<div>
								<dt className="text-xs text-gray-600 uppercase tracking-wide">
									When to start class?
								</dt>
								<dd className="text-sm font-medium text-gray-900 mt-1">
									{student.startClassWhen ?? "—"}
								</dd>
							</div>
						</dl>
					</Panel>

					{/* Pricing */}
					{student.price && (
						<Panel title="Pricing">
							<dl className="space-y-4">
								<div>
									<dt className="text-xs text-gray-600 uppercase tracking-wide">
										Course Fee
									</dt>
									<dd className="text-lg font-semibold text-gray-900 mt-1">
										₹{student.price.toLocaleString("en-IN")}
									</dd>
								</div>
							</dl>
						</Panel>
					)}
				</div>
			)}

			{/* Back to Students Link */}
			<div className="flex gap-2">
				<Link
					to="/students"
					className="text-teal-600 hover:text-teal-700 text-sm font-medium"
				>
					← Back to Students
				</Link>
			</div>
		</div>
	);
};
