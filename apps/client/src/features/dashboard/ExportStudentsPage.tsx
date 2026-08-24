import { useMemo, useState } from "react";
import { HiArrowDownTray, HiDocumentArrowDown, HiTableCells } from "react-icons/hi2";
import { useBatchesQuery } from "@/features/batches/batches.queries";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useHasAnyPermission } from "@/lib/hooks/use-has-permission";
import { useSession } from "@/lib/session";
import { exportToCSV, exportToExcel } from "@/lib/utils/export";

const LEVEL_LABELS: Record<string, string> = {
	"1": "Seed", "2": "Sprout", "3": "Root", "4": "Leaf", "5": "Bud", "6": "Bloom", "7": "Fruit",
};

const STATUS_LABELS: Record<string, string> = {
	STUDENT: "Active",
	BREAK: "On Break",
	DROPPED: "Dropped",
};

const formatDate = (value?: string | Date | null) =>
	value ? new Date(value).toLocaleDateString() : "";

const formatDateTime = (value?: string | Date | null) =>
	value ? new Date(value).toLocaleString() : "";

const formatBoolean = (value?: boolean | null) => (value ? "Yes" : "No");

const formatLevel = (level?: string | null) => {
	if (!level) return "";
	if (level === "-1") return "Other";
	return LEVEL_LABELS[level] ?? level;
};

// Every field on the Student record, in export order. Preview shows a
// smaller subset (see PREVIEW_KEYS below) but the export always includes
// all of these.
const EXPORT_COLUMNS: Array<{ key: string; label: string }> = [
	{ key: "zid", label: "ZID" },
	{ key: "name", label: "Name" },
	{ key: "status", label: "Status" },
	{ key: "courseType", label: "Course Type" },
	{ key: "level", label: "Level" },
	{ key: "levelNote", label: "Level Note" },
	{ key: "mentor", label: "Mentor" },
	{ key: "group", label: "Group" },
	{ key: "phone", label: "Phone" },
	{ key: "email", label: "Email" },
	{ key: "primaryWhatsappNumber", label: "Primary WhatsApp" },
	{ key: "alternateWhatsappNumber", label: "Alternate WhatsApp" },
	{ key: "dateOfBirth", label: "Date of Birth" },
	{ key: "gender", label: "Gender" },
	{ key: "residingCountry", label: "Residing Country" },
	{ key: "preferredLanguage", label: "Preferred Language" },
	{ key: "preferredSchedule", label: "Preferred Schedule" },
	{ key: "preferredDays", label: "Preferred Days" },
	{ key: "classesPerWeek", label: "Classes / Week" },
	{ key: "durationMinutes", label: "Class Duration (min)" },
	{ key: "price", label: "Price" },
	{ key: "admissionFee", label: "Admission Fee" },
	{ key: "hearAboutUs", label: "Heard About Us Via" },
	{ key: "studentInfo", label: "Notes" },
	{ key: "processLabel", label: "Process" },
	{ key: "oralAssessmentDone", label: "Oral Assessment Done" },
	{ key: "writtenAssessmentDone", label: "Written Assessment Done" },
	{ key: "levelAssessmentDone", label: "Level Assessment Done" },
	{ key: "classStarted", label: "Class Started" },
	{ key: "classStartConfirmedAt", label: "Class Start Confirmed At" },
	{ key: "admittedBy", label: "Admitted By" },
	{ key: "admittedAt", label: "Admitted At" },
	{ key: "nextFollowUpAt", label: "Next Follow-up" },
	{ key: "inactiveFrom", label: "Break From" },
	{ key: "inactiveUntil", label: "Break Until" },
	{ key: "dropReason", label: "Drop Reason" },
	{ key: "dropTemporary", label: "Drop Temporary" },
	{ key: "createdAt", label: "Created At" },
	{ key: "updatedAt", label: "Updated At" },
];

const PREVIEW_KEYS = ["zid", "name", "status", "courseType", "level", "mentor", "group", "phone"];

export const ExportStudentsPage = () => {
	const { token } = useSession();
	// STUDENT_EXPORT holders can export the full dataset even without general
	// STUDENT_READ_ALL access - the server grants "all" scope for either.
	const canReadAllStudents = useHasAnyPermission(["STUDENT_READ_ALL", "STUDENT_EXPORT"]);
	// Default to the full dataset when permitted - someone opening a
	// dedicated export page almost always wants everything, not just "mine".
	const [loadAllRequested, setLoadAllRequested] = useState(true);
	const activeScope: "mine" | "all" = loadAllRequested && canReadAllStudents ? "all" : "mine";

	const studentsQuery = useStudentsQuery(token, { scope: activeScope, limit: 2000 });
	const usersQuery = useUsersQuery(token);
	const batchesQuery = useBatchesQuery(token, { scope: activeScope });

	const [statusFilter, setStatusFilter] = useState<"all" | "STUDENT" | "BREAK" | "DROPPED">("all");
	const [courseTypeFilter, setCourseTypeFilter] = useState<"all" | "GROUP" | "INDIVIDUAL">("all");
	const [levelFilter, setLevelFilter] = useState<string>("all");
	const [mentorFilter, setMentorFilter] = useState<string>("all");

	const usersById = useMemo(() => {
		const map: Record<string, { name: string }> = {};
		(usersQuery.data?.users ?? []).forEach((u) => {
			map[u.id] = { name: u.name ?? u.username ?? u.zids?.mentor ?? u.id };
		});
		return map;
	}, [usersQuery.data?.users]);

	const batchesById = useMemo(() => {
		const map: Record<string, { name: string }> = {};
		(batchesQuery.data?.batches ?? []).forEach((b) => {
			map[b.id] = { name: b.name ?? b.groupId ?? b.id };
		});
		return map;
	}, [batchesQuery.data?.batches]);

	const mentors = useMemo(
		() => (usersQuery.data?.users ?? []).filter((u) => u.roles.some((r) => r.type === "mentor")),
		[usersQuery.data?.users],
	);

	const allStudents = studentsQuery.data?.students ?? [];

	const filteredStudents = useMemo(() => {
		return allStudents.filter((s) => {
			if (statusFilter !== "all" && s.status !== statusFilter) return false;
			if (courseTypeFilter !== "all" && s.courseType !== courseTypeFilter) return false;
			if (levelFilter !== "all" && s.level !== levelFilter) return false;
			if (mentorFilter !== "all" && s.mentorId !== mentorFilter) return false;
			return true;
		});
	}, [allStudents, statusFilter, courseTypeFilter, levelFilter, mentorFilter]);

	const rows = useMemo(() => {
		return filteredStudents.map((s) => {
			const row: Record<string, string> = {
				zid: s.zid ?? "",
				name: s.name ?? "",
				status: STATUS_LABELS[s.status] ?? s.status,
				courseType: s.courseType ?? "",
				level: s.level === "-1" ? "Other" : formatLevel(s.level),
				levelNote: s.level === "-1" ? (s.studentInfo ?? "") : "",
				mentor: s.mentorId ? (usersById[s.mentorId]?.name ?? "") : "",
				group: s.batchId ? (batchesById[s.batchId]?.name ?? "") : "",
				phone: s.phone ?? "",
				email: s.email ?? "",
				primaryWhatsappNumber: s.primaryWhatsappNumber ?? "",
				alternateWhatsappNumber: s.alternateWhatsappNumber ?? "",
				dateOfBirth: formatDate(s.dateOfBirth),
				gender: s.gender ?? "",
				residingCountry: s.residingCountry ?? "",
				preferredLanguage: s.preferredLanguage ?? "",
				preferredSchedule: s.preferredSchedule ?? "",
				preferredDays: (s.preferredDays ?? []).join(", "),
				classesPerWeek: s.timeslot?.classesPerWeek != null ? String(s.timeslot.classesPerWeek) : "",
				durationMinutes: s.timeslot?.durationMinutes != null ? String(s.timeslot.durationMinutes) : "",
				price: s.price != null ? String(s.price) : "",
				admissionFee: s.admissionFee != null ? String(s.admissionFee) : "",
				hearAboutUs: s.hearAboutUs ?? "",
				studentInfo: s.level === "-1" ? "" : (s.studentInfo ?? ""),
				processLabel: s.processLabel ?? "",
				oralAssessmentDone: formatBoolean(s.oralAssessmentDone),
				writtenAssessmentDone: formatBoolean(s.writtenAssessmentDone),
				levelAssessmentDone: formatBoolean(s.levelAssessmentDone),
				classStarted: formatBoolean(s.classStarted),
				classStartConfirmedAt: formatDateTime(s.classStartConfirmedAt),
				admittedBy: s.admittedBy ? (usersById[s.admittedBy]?.name ?? "") : "",
				admittedAt: formatDate(s.admittedAt),
				nextFollowUpAt: formatDateTime(s.nextFollowUpAt),
				inactiveFrom: formatDate(s.inactiveFrom),
				inactiveUntil: formatDate(s.inactiveUntil),
				dropReason: s.dropReason ?? "",
				dropTemporary: s.dropTemporary != null ? formatBoolean(s.dropTemporary) : "",
				createdAt: formatDateTime(s.createdAt),
				updatedAt: formatDateTime(s.updatedAt),
			};

			return row;
		});
	}, [filteredStudents, usersById, batchesById]);

	const isLoading = studentsQuery.isLoading || usersQuery.isLoading || batchesQuery.isLoading;

	const buildExportData = () => ({
		columns: EXPORT_COLUMNS.map((c) => c.label),
		data: rows.map((row) => EXPORT_COLUMNS.map((c) => row[c.key] ?? "")),
	});

	const handleExportCSV = () => {
		exportToCSV(`students-export-${new Date().toISOString().slice(0, 10)}`, buildExportData());
	};

	const handleExportExcel = () => {
		exportToExcel(`students-export-${new Date().toISOString().slice(0, 10)}`, buildExportData());
	};

	const inputCls =
		"rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-500";
	const btnPrimary =
		"inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50";
	const btnGhost =
		"inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50";

	return (
		<div className="space-y-4">
			<div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
						<HiDocumentArrowDown className="h-5 w-5" />
					</div>
					<div>
						<h1 className="text-base font-bold text-gray-900">Export Students</h1>
						<p className="text-sm text-gray-500">
							Download the complete student record — every field, not just what's shown on screen.
						</p>
					</div>
				</div>
			</div>

			{/* Filters */}
			<div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
				<div className="flex flex-wrap items-end gap-3">
					{canReadAllStudents ? (
						<div className="flex gap-1">
							<button
								type="button"
								onClick={() => setLoadAllRequested(false)}
								className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${!loadAllRequested ? "bg-emerald-600 text-white" : "border border-gray-200 bg-white text-gray-600 hover:border-emerald-400"}`}
							>
								Mine
							</button>
							<button
								type="button"
								onClick={() => setLoadAllRequested(true)}
								className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${loadAllRequested ? "bg-emerald-600 text-white" : "border border-gray-200 bg-white text-gray-600 hover:border-emerald-400"}`}
							>
								All students
							</button>
						</div>
					) : null}

					<label className="grid gap-1 text-xs font-semibold text-gray-500">
						Status
						<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className={inputCls}>
							<option value="all">All</option>
							<option value="STUDENT">Active</option>
							<option value="BREAK">On Break</option>
							<option value="DROPPED">Dropped</option>
						</select>
					</label>

					<label className="grid gap-1 text-xs font-semibold text-gray-500">
						Course type
						<select value={courseTypeFilter} onChange={(e) => setCourseTypeFilter(e.target.value as typeof courseTypeFilter)} className={inputCls}>
							<option value="all">All</option>
							<option value="GROUP">Group</option>
							<option value="INDIVIDUAL">Individual</option>
						</select>
					</label>

					<label className="grid gap-1 text-xs font-semibold text-gray-500">
						Level
						<select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className={inputCls}>
							<option value="all">All</option>
							{Object.entries(LEVEL_LABELS).map(([value, label]) => (
								<option key={value} value={value}>{label}</option>
							))}
							<option value="-1">Other</option>
						</select>
					</label>

					<label className="grid gap-1 text-xs font-semibold text-gray-500">
						Mentor
						<select value={mentorFilter} onChange={(e) => setMentorFilter(e.target.value)} className={inputCls}>
							<option value="all">All</option>
							{mentors.map((m) => (
								<option key={m.id} value={m.id}>{m.name ?? m.username}</option>
							))}
						</select>
					</label>

					<div className="ml-auto flex flex-col items-end gap-1">
						<span className="text-xs text-gray-500">
							{isLoading ? "Loading…" : `${rows.length} student${rows.length !== 1 ? "s" : ""} match these filters`}
						</span>
						<div className="flex gap-2">
							<button type="button" onClick={handleExportExcel} disabled={isLoading || rows.length === 0} className={btnPrimary}>
								<HiTableCells className="h-4 w-4" />
								Export Excel
							</button>
							<button type="button" onClick={handleExportCSV} disabled={isLoading || rows.length === 0} className={btnGhost}>
								<HiArrowDownTray className="h-4 w-4" />
								Export CSV
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Preview */}
			<div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
				<div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
					<p className="text-sm font-semibold text-gray-800">Preview</p>
					<p className="text-xs text-gray-400">
						Showing {Math.min(rows.length, 20)} of {rows.length} — the export includes all {EXPORT_COLUMNS.length} fields for every matching student
					</p>
				</div>
				<div className="overflow-x-auto">
					<table className="min-w-full text-left text-sm">
						<thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
							<tr>
								{PREVIEW_KEYS.map((key) => (
									<th key={key} className="px-4 py-2.5">
										{EXPORT_COLUMNS.find((c) => c.key === key)?.label ?? key}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{rows.length === 0 ? (
								<tr>
									<td colSpan={PREVIEW_KEYS.length} className="px-4 py-8 text-center text-sm text-gray-400">
										{isLoading ? "Loading…" : "No students match these filters."}
									</td>
								</tr>
							) : (
								rows.slice(0, 20).map((row, i) => (
									<tr key={i} className="hover:bg-gray-50">
										{PREVIEW_KEYS.map((key) => (
											<td key={key} className="px-4 py-2.5 text-gray-700">
												{row[key] || "—"}
											</td>
										))}
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};

export default ExportStudentsPage;
