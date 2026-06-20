import type { Permission } from "@repo/schema";
import { useMemo, useState } from "react";
import {
	HiArrowDownTray,
	HiArrowUpTray,
	HiCheckCircle,
	HiChevronDown,
	HiEye,
	HiInformationCircle,
	HiMagnifyingGlass,
	HiPencil,
	HiPlus,
	HiShieldCheck,
	HiTrash,
	HiWrench,
	HiXMark,
} from "react-icons/hi2";

// ─── Sub-category mapping ─────────────────────────────────────────────────────

const PERM_SUB: Record<string, string> = {
	// User Management → General Users
	USER_CREATE: "General Users",
	USER_READ: "General Users",
	USER_UPDATE: "General Users",
	USER_DELETE: "General Users",
	USER_CHANGE_PASSWORD: "General Users",
	// User Management → Admins
	ADMIN_CREATE: "Admins",
	ADMIN_READ: "Admins",
	ADMIN_UPDATE: "Admins",
	ADMIN_DELETE: "Admins",
	// User Management → Sales
	SALES_CREATE: "Sales",
	SALES_READ: "Sales",
	SALES_USERS_READ: "Sales",
	SALES_UPDATE: "Sales",
	SALES_DELETE: "Sales",
	// User Management → Counsellors
	COUNSELLOR_CREATE: "Counsellors",
	COUNSELLOR_READ: "Counsellors",
	COUNSELLOR_UPDATE: "Counsellors",
	COUNSELLOR_DELETE: "Counsellors",
	// User Management → Mentors
	MENTOR_CREATE: "Mentors",
	MENTOR_READ: "Mentors",
	MENTOR_READ_MY: "Mentors",
	MENTOR_READ_ALL: "Mentors",
	MENTOR_UPDATE: "Mentors",
	MENTOR_DELETE: "Mentors",
	// Roles & Permissions
	ROLE_CREATE: "Roles",
	ROLE_READ: "Roles",
	ROLE_UPDATE: "Roles",
	ROLE_DELETE: "Roles",
	PERMISSION_READ: "Permissions",
	// Leads & Admissions → Lead Access
	LEAD_READ: "Lead Access",
	LEAD_READ_MY: "Lead Access",
	LEAD_READ_ALL: "Lead Access",
	LEAD_PROFILE_READ: "Lead Access",
	// Leads & Admissions → Lead Actions
	LEAD_CREATE: "Lead Actions",
	LEAD_UPDATE: "Lead Actions",
	LEAD_UPDATE_MY: "Lead Actions",
	LEAD_UPDATE_ALL: "Lead Actions",
	LEAD_DELETE: "Lead Actions",
	LEAD_ASSIGN: "Lead Assignment",
	// Leads & Admissions → Views & Reports
	LEADS_OVERVIEW_READ: "Lead Views & Reports",
	LEADS_CLOSED_READ: "Lead Views & Reports",
	LEADS_CONVERTED_READ: "Lead Views & Reports",
	// Leads & Admissions → Form
	LEAD_FORM_MANAGE: "Form Management",
	// Leads & Admissions → Demo Actions
	LEAD_DEMO_REQUEST: "Demo Actions",
	LEAD_DEMO_ASSIGN: "Demo Actions",
	LEAD_DEMO_COMPLETE: "Demo Actions",
	// Leads & Admissions → Admission
	LEAD_ADMISSION_REQUEST: "Admission",
	LEAD_ADMISSION_CONFIRM: "Admission",
	// Demo Management
	DEMO_UNASSIGNED_READ_MY: "Unassigned Demos",
	DEMO_UNASSIGNED_READ_ALL: "Unassigned Demos",
	DEMO_SCHEDULED_READ_MY: "Scheduled Demos",
	DEMO_SCHEDULED_READ_ALL: "Scheduled Demos",
	DEMO_COMPLETED_READ_MY: "Completed Demos",
	DEMO_COMPLETED_READ_ALL: "Completed Demos",
	// Students → Access
	STUDENT_READ: "Student Access",
	STUDENT_READ_MY: "Student Access",
	STUDENT_READ_ALL: "Student Access",
	STUDENT_READ_MY_GROUP: "Student Access",
	STUDENT_READ_MY_INDIVIDUAL: "Student Access",
	STUDENT_READ_ALL_GROUP: "Student Access",
	STUDENT_READ_ALL_INDIVIDUAL: "Student Access",
	STUDENT_PROFILE_READ: "Student Access",
	// Students → Records
	STUDENT_CREATE: "Student Records",
	STUDENT_UPDATE: "Student Records",
	STUDENT_DELETE: "Student Records",
	STUDENT_EXPORT: "Student Records",
	STUDENT_IMPORT: "Student Records",
	// Students → Process
	STUDENT_PROCESS_READ_MY: "Processes",
	STUDENT_PROCESS_READ_ALL: "Processes",
	STUDENT_PROCESS_HISTORY_READ_MY: "Process History",
	STUDENT_PROCESS_HISTORY_READ_ALL: "Process History",
	// Students → Assessments
	STUDENT_ASSESSMENT_READ: "Assessments",
	STUDENT_ASSESSMENT_UPDATE: "Assessments",
	// Students → Media
	STUDENT_POSTER_DOWNLOAD: "Media & Downloads",
	STUDENT_CERTIFICATE_DOWNLOAD: "Media & Downloads",
	STUDENT_UPLOAD_PROFILE_PIC: "Media & Downloads",
	// Students → Starting Date
	STUDENT_STARTING_DATE_READ: "Starting Date Monitor",
	// Batches
	BATCH_CREATE: "Batches",
	BATCH_READ: "Batches",
	BATCH_READ_MY: "Batches",
	BATCH_READ_ALL: "Batches",
	BATCH_UPDATE: "Batches",
	BATCH_DELETE: "Batches",
	// Reminders
	REMINDER_CREATE: "Reminders",
	REMINDER_READ: "Reminders",
	REMINDER_READ_MY: "Reminders",
	REMINDER_READ_ALL: "Reminders",
	REMINDER_UPDATE: "Reminders",
	REMINDER_DELETE: "Reminders",
	// Others
	TIMESLOT_CREATE: "Time Slots",
	VIEW_REPORTS: "Reports Access",
	ORDER_DELETE: "Orders",
};

const SUB_ORDER: Record<string, string[]> = {
	"User Management": ["General Users", "Admins", "Sales", "Counsellors", "Mentors"],
	"Roles & Permissions": ["Roles", "Permissions"],
	"Leads & Admissions": [
		"Lead Access", "Lead Actions", "Lead Assignment",
		"Lead Views & Reports", "Form Management", "Demo Actions", "Admission",
	],
	"Demo Management": ["Unassigned Demos", "Scheduled Demos", "Completed Demos"],
	"Students": [
		"Student Access", "Student Records", "Processes", "Process History",
		"Assessments", "Media & Downloads", "Starting Date Monitor",
	],
	"Batches & Groups": ["Batches"],
	"Reminders & Follow-ups": ["Reminders"],
};

// Demo-management resource gets its own top-level category
const RESOURCE_CATEGORY: Record<string, string> = {
	"demo-management": "Demo Management",
	users: "User Management",
	sales: "User Management",
	mentors: "User Management",
	counsellors: "User Management",
	admins: "User Management",
	roles: "Roles & Permissions",
	permissions: "Roles & Permissions",
	leads: "Leads & Admissions",
	students: "Students",
	"student-processes": "Students",
	"student-process-history": "Students",
	batches: "Batches & Groups",
	reminders: "Reminders & Follow-ups",
	timeslots: "Scheduling",
	reports: "Reports",
	orders: "Orders",
};

const CATEGORY_ORDER = [
	"User Management", "Roles & Permissions", "Leads & Admissions",
	"Demo Management", "Students", "Batches & Groups",
	"Reminders & Follow-ups", "Scheduling", "Reports", "Orders",
];

// ─── Action type helpers ──────────────────────────────────────────────────────

type ActionType = "read" | "create" | "update" | "delete" | "download" | "upload" | "manage";

function getActionType(key: string): ActionType {
	if (key.includes("_IMPORT")) return "upload";
	if (key.includes("_EXPORT") || key.includes("_DOWNLOAD")) return "download";
	if (key.includes("_CREATE")) return "create";
	if (key.includes("_DELETE")) return "delete";
	if (key.includes("_UPDATE") || key.includes("_CHANGE_PASSWORD")) return "update";
	if (key.includes("_READ") || key.startsWith("VIEW_") || key.includes("_VIEW")) return "read";
	return "manage";
}

const ACTION_META: Record<ActionType, { icon: React.ReactNode; label: string; bg: string; text: string }> = {
	read:     { icon: <HiEye className="h-3 w-3" />,           label: "Read",     bg: "bg-blue-100",   text: "text-blue-700" },
	create:   { icon: <HiPlus className="h-3 w-3" />,          label: "Create",   bg: "bg-emerald-100",text: "text-emerald-700" },
	update:   { icon: <HiPencil className="h-3 w-3" />,        label: "Edit",     bg: "bg-amber-100",  text: "text-amber-700" },
	delete:   { icon: <HiTrash className="h-3 w-3" />,         label: "Delete",   bg: "bg-red-100",    text: "text-red-700" },
	download: { icon: <HiArrowDownTray className="h-3 w-3" />, label: "Download", bg: "bg-sky-100",    text: "text-sky-700" },
	upload:   { icon: <HiArrowUpTray className="h-3 w-3" />,   label: "Upload",   bg: "bg-violet-100", text: "text-violet-700" },
	manage:   { icon: <HiWrench className="h-3 w-3" />,        label: "Action",   bg: "bg-gray-100",   text: "text-gray-700" },
};

type ScopeType = "mine" | "all" | "none";

function getScope(key: string): ScopeType {
	if (/_MY(_|$)/.test(key) || /_OWN(_|$)/.test(key)) return "mine";
	if (/_ALL(_|$)/.test(key)) return "all";
	return "none";
}

// ─── Category colors ──────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { badge: string; border: string; header: string }> = {
	"User Management":      { badge: "bg-violet-100 text-violet-700", border: "border-l-violet-400",  header: "bg-violet-50/60" },
	"Roles & Permissions":  { badge: "bg-amber-100 text-amber-700",   border: "border-l-amber-400",   header: "bg-amber-50/60" },
	"Leads & Admissions":   { badge: "bg-blue-100 text-blue-700",     border: "border-l-blue-400",    header: "bg-blue-50/60" },
	"Demo Management":      { badge: "bg-indigo-100 text-indigo-700", border: "border-l-indigo-400",  header: "bg-indigo-50/60" },
	"Students":             { badge: "bg-emerald-100 text-emerald-700",border: "border-l-emerald-400",header: "bg-emerald-50/60" },
	"Batches & Groups":     { badge: "bg-cyan-100 text-cyan-700",     border: "border-l-cyan-400",    header: "bg-cyan-50/60" },
	"Reminders & Follow-ups":{ badge: "bg-rose-100 text-rose-700",    border: "border-l-rose-400",    header: "bg-rose-50/60" },
	"Scheduling":           { badge: "bg-orange-100 text-orange-700", border: "border-l-orange-400",  header: "bg-orange-50/60" },
	"Reports":              { badge: "bg-slate-100 text-slate-700",   border: "border-l-slate-400",   header: "bg-slate-50/60" },
	"Orders":               { badge: "bg-teal-100 text-teal-700",     border: "border-l-teal-400",    header: "bg-teal-50/60" },
};
const DEFAULT_CATEGORY_COLORS = { badge: "bg-gray-100 text-gray-700", border: "border-l-gray-300", header: "bg-gray-50/60" };

// ─── Data structures ──────────────────────────────────────────────────────────

type SubGroup = { sub: string; permissions: Permission[] };
type CatGroup = { category: string; subGroups: SubGroup[]; all: Permission[] };

function buildGroups(permissions: Permission[]): CatGroup[] {
	const catMap = new Map<string, Map<string, Permission[]>>();

	for (const p of permissions) {
		const cat = RESOURCE_CATEGORY[p.resource] ?? "Other";
		const sub = PERM_SUB[p.key] ?? cat;
		if (!catMap.has(cat)) catMap.set(cat, new Map());
		const subMap = catMap.get(cat)!;
		if (!subMap.has(sub)) subMap.set(sub, []);
		subMap.get(sub)!.push(p);
	}

	return Array.from(catMap.entries())
		.sort(([a], [b]) => {
			const ai = CATEGORY_ORDER.indexOf(a);
			const bi = CATEGORY_ORDER.indexOf(b);
			return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
		})
		.map(([category, subMap]) => {
			const order = SUB_ORDER[category] ?? [];
			const subGroups = Array.from(subMap.entries())
				.sort(([a], [b]) => {
					const ai = order.indexOf(a);
					const bi = order.indexOf(b);
					return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi) || a.localeCompare(b);
				})
				.map(([sub, perms]) => ({
					sub,
					permissions: perms.sort((a, b) => {
						// sort: mine before all, then by action type order
						const scopeA = getScope(a.key);
						const scopeB = getScope(b.key);
						if (scopeA !== scopeB) {
							const scopeOrder = { mine: 0, none: 1, all: 2 };
							return scopeOrder[scopeA] - scopeOrder[scopeB];
						}
						return a.name.localeCompare(b.name);
					}),
				}));
			const all = subGroups.flatMap((sg) => sg.permissions);
			return { category, subGroups, all };
		});
}

// ─── Component ───────────────────────────────────────────────────────────────

type RoleFormValues = {
	name: string;
	type: string;
	description: string;
	permissionIds: string[];
};

type RoleFormPageProps = {
	mode: "create" | "edit";
	initialValues: RoleFormValues;
	permissions: Permission[];
	isLoading: boolean;
	error?: string;
	onSubmit: (values: RoleFormValues) => void;
	onCancel: () => void;
};

export const RoleFormPage = ({
	mode,
	initialValues,
	permissions,
	isLoading,
	error,
	onSubmit,
	onCancel,
}: RoleFormPageProps) => {
	const [name, setName] = useState(initialValues.name);
	const [type, setType] = useState(initialValues.type);
	const [description, setDescription] = useState(initialValues.description);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialValues.permissionIds));
	const [search, setSearch] = useState("");
	const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
	const [collapsedSubs, setCollapsedSubs] = useState<Set<string>>(new Set());
	const [detail, setDetail] = useState<Permission | null>(null);

	const groups = useMemo(() => buildGroups(permissions), [permissions]);

	const filteredGroups = useMemo((): CatGroup[] => {
		const q = search.trim().toLowerCase();
		if (!q) return groups;
		return groups.map((g) => ({
			...g,
			subGroups: g.subGroups.map((sg) => ({
				...sg,
				permissions: sg.permissions.filter(
					(p) =>
						p.name.toLowerCase().includes(q) ||
						p.key.toLowerCase().includes(q) ||
						(p.description ?? "").toLowerCase().includes(q),
				),
			})).filter((sg) => sg.permissions.length > 0),
			all: g.all.filter(
				(p) =>
					p.name.toLowerCase().includes(q) ||
					p.key.toLowerCase().includes(q) ||
					(p.description ?? "").toLowerCase().includes(q),
			),
		})).filter((g) => g.all.length > 0);
	}, [groups, search]);

	const toggleId = (id: string) =>
		setSelectedIds((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});

	const togglePerms = (perms: Permission[]) => {
		const allSel = perms.every((p) => selectedIds.has(p.id));
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (allSel) perms.forEach((p) => next.delete(p.id));
			else perms.forEach((p) => next.add(p.id));
			return next;
		});
	};

	const toggleCat = (cat: string) =>
		setCollapsedCats((prev) => {
			const next = new Set(prev);
			next.has(cat) ? next.delete(cat) : next.add(cat);
			return next;
		});

	const toggleSub = (key: string) =>
		setCollapsedSubs((prev) => {
			const next = new Set(prev);
			next.has(key) ? next.delete(key) : next.add(key);
			return next;
		});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit({ name, type, description, permissionIds: Array.from(selectedIds) });
	};

	const totalSelected = selectedIds.size;

	return (
		<div className="min-h-screen bg-gray-50/60">
			{/* Sticky top bar */}
			<div className="sticky top-0 z-20 border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
							<HiShieldCheck className="h-5 w-5 text-violet-600" />
						</div>
						<div>
							<p className="text-[10px] font-bold uppercase tracking-widest text-violet-600">
								{mode === "create" ? "New Role" : "Edit Role"}
							</p>
							<p className="text-sm font-bold text-gray-900 leading-tight">
								{name.trim() || (mode === "create" ? "Untitled role" : "Role")}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<span className="hidden sm:inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
							{totalSelected} permission{totalSelected !== 1 ? "s" : ""} selected
						</span>
						<button
							type="button"
							onClick={onCancel}
							className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
						>
							Cancel
						</button>
						<button
							type="submit"
							form="role-form"
							disabled={isLoading}
							className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-60"
						>
							<HiCheckCircle className="h-4 w-4" />
							{isLoading ? "Saving…" : mode === "create" ? "Create Role" : "Save Changes"}
						</button>
					</div>
				</div>
			</div>

			<div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
				<form id="role-form" onSubmit={handleSubmit}>
					<div className="grid gap-6 lg:grid-cols-[320px_1fr]">

						{/* LEFT: Role details + summary */}
						<div className="space-y-4">
							<div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
								<p className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-400">Role Details</p>
								<div className="space-y-4">
									<div>
										<label className="mb-1.5 block text-sm font-semibold text-gray-700">Role Name <span className="text-rose-500">*</span></label>
										<input
											type="text"
											value={name}
											onChange={(e) => setName(e.target.value)}
											placeholder="e.g. Support Agent"
											required
											className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
										/>
									</div>
									<div>
										<label className="mb-1.5 block text-sm font-semibold text-gray-700">Role Type <span className="text-rose-500">*</span></label>
										<select
											value={type}
											onChange={(e) => setType(e.target.value)}
											required
											className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
										>
											{mode === "create" ? <option value="">— Select type —</option> : null}
											<option value="admin">Admin</option>
											<option value="mentor">Mentor</option>
											<option value="counsellor">Counsellor</option>
											<option value="sales">Sales</option>
										</select>
									</div>
									<div>
										<label className="mb-1.5 block text-sm font-semibold text-gray-700">Description</label>
										<textarea
											value={description}
											onChange={(e) => setDescription(e.target.value)}
											placeholder="Briefly describe what this role does"
											rows={3}
											className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
										/>
									</div>
								</div>
							</div>

							{/* Summary */}
							<div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
								<p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">Permission Summary</p>
								{groups.length === 0 ? (
									<p className="text-xs text-gray-400">No permissions available.</p>
								) : (
									<div className="space-y-2">
										{groups.map((g) => {
											const count = g.all.filter((p) => selectedIds.has(p.id)).length;
											const total = g.all.length;
											const pct = total > 0 ? (count / total) * 100 : 0;
											const colors = CATEGORY_COLORS[g.category] ?? DEFAULT_CATEGORY_COLORS;
											return (
												<div key={g.category} className="flex items-center gap-2.5">
													<span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${colors.badge}`}>
														{count}/{total}
													</span>
													<div className="flex-1 min-w-0">
														<span className="block truncate text-xs font-medium text-gray-700 mb-0.5">{g.category}</span>
														<div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
															<div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${pct}%` }} />
														</div>
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>

							{/* Legend */}
							<div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
								<p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Action Legend</p>
								<div className="grid grid-cols-2 gap-1.5">
									{(Object.entries(ACTION_META) as [ActionType, typeof ACTION_META[ActionType]][]).map(([type, meta]) => (
										<div key={type} className="flex items-center gap-1.5">
											<span className={`flex h-5 w-5 items-center justify-center rounded ${meta.bg} ${meta.text}`}>
												{meta.icon}
											</span>
											<span className="text-[11px] text-gray-600">{meta.label}</span>
										</div>
									))}
									<div className="flex items-center gap-1.5">
										<span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-indigo-100 text-indigo-700">Mine</span>
										<span className="text-[11px] text-gray-600">Own scope</span>
									</div>
									<div className="flex items-center gap-1.5">
										<span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-700">All</span>
										<span className="text-[11px] text-gray-600">All users</span>
									</div>
								</div>
							</div>

							{error ? (
								<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
									{error}
								</div>
							) : null}
						</div>

						{/* RIGHT: Permission picker */}
						<div className="space-y-3">
							{/* Search */}
							<div className="relative">
								<HiMagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
								<input
									type="search"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Search permissions…"
									className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
								/>
							</div>

							{/* Category groups */}
							{filteredGroups.map((g) => {
								const catSel = g.all.filter((p) => selectedIds.has(p.id)).length;
								const catTotal = g.all.length;
								const catAllSel = catSel === catTotal;
								const collapsed = collapsedCats.has(g.category);
								const colors = CATEGORY_COLORS[g.category] ?? DEFAULT_CATEGORY_COLORS;

								return (
									<div key={g.category} className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm border-l-4 ${colors.border}`}>
										{/* Category header */}
										<div className={`flex items-center gap-2 px-4 py-3 ${colors.header}`}>
											<button
												type="button"
												onClick={() => toggleCat(g.category)}
												className="flex flex-1 items-center gap-2 text-left"
											>
												<HiChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${collapsed ? "-rotate-90" : ""}`} />
												<span className="text-sm font-bold text-gray-900">{g.category}</span>
											</button>
											<span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${colors.badge}`}>
												{catSel}/{catTotal}
											</span>
											<button
												type="button"
												onClick={() => togglePerms(g.all)}
												className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${catAllSel ? "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100" : "border-gray-200 text-gray-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"}`}
											>
												{catAllSel ? "Deselect all" : "Select all"}
											</button>
										</div>

										{/* Sub-groups */}
										{!collapsed ? (
											<div className="divide-y divide-gray-100">
												{g.subGroups.map((sg) => {
													const subKey = `${g.category}::${sg.sub}`;
													const subSel = sg.permissions.filter((p) => selectedIds.has(p.id)).length;
													const subTotal = sg.permissions.length;
													const subAllSel = subSel === subTotal;
													const subCollapsed = collapsedSubs.has(subKey);

													return (
														<div key={sg.sub} className="bg-white">
															{/* Sub-category header */}
															<div className="flex items-center gap-2 border-b border-gray-50 bg-gray-50/70 px-4 py-2">
																<button
																	type="button"
																	onClick={() => toggleSub(subKey)}
																	className="flex flex-1 items-center gap-1.5 text-left"
																>
																	<HiChevronDown className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${subCollapsed ? "-rotate-90" : ""}`} />
																	<span className="text-xs font-semibold text-gray-700">{sg.sub}</span>
																</button>
																<span className="text-[10px] font-semibold text-gray-400">{subSel}/{subTotal}</span>
																<button
																	type="button"
																	onClick={() => togglePerms(sg.permissions)}
																	className={`rounded px-2 py-0.5 text-[10px] font-semibold transition ${subAllSel ? "bg-violet-100 text-violet-700" : "text-gray-400 hover:bg-violet-50 hover:text-violet-600"}`}
																>
																	{subAllSel ? "Deselect" : "Select all"}
																</button>
															</div>

															{/* Permission cards */}
															{!subCollapsed ? (
																<div className="grid gap-px bg-gray-100 sm:grid-cols-2 xl:grid-cols-3">
																	{sg.permissions.map((p) => {
																		const sel = selectedIds.has(p.id);
																		const action = getActionType(p.key);
																		const scope = getScope(p.key);
																		const actionMeta = ACTION_META[action];
																		return (
																			<div
																				key={p.id}
																				className={`flex items-center gap-2.5 bg-white px-3 py-2.5 transition ${sel ? "bg-violet-50/60" : "hover:bg-gray-50/80"}`}
																			>
																				{/* Checkbox */}
																				<button
																					type="button"
																					onClick={() => toggleId(p.id)}
																					className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${sel ? "border-violet-500 bg-violet-500 text-white" : "border-gray-300 bg-white hover:border-violet-400"}`}
																					aria-label={sel ? `Deselect ${p.name}` : `Select ${p.name}`}
																				>
																					{sel ? <HiCheckCircle className="h-3 w-3" /> : null}
																				</button>

																				{/* Action icon */}
																				<span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${actionMeta.bg} ${actionMeta.text}`} title={actionMeta.label}>
																					{actionMeta.icon}
																				</span>

																				{/* Name + scope */}
																				<div className="min-w-0 flex-1">
																					<div className="flex items-center gap-1 flex-wrap">
																						<span className={`text-xs font-semibold leading-tight ${sel ? "text-violet-900" : "text-gray-800"}`}>
																							{p.name}
																						</span>
																						{scope === "mine" ? (
																							<span className="rounded px-1 py-0.5 text-[9px] font-bold bg-indigo-100 text-indigo-700">Mine</span>
																						) : scope === "all" ? (
																							<span className="rounded px-1 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-700">All</span>
																						) : null}
																					</div>
																				</div>

																				{/* Info */}
																				<button
																					type="button"
																					title="View details"
																					onClick={() => setDetail(p)}
																					className="shrink-0 rounded-full p-0.5 text-gray-300 transition hover:text-violet-500"
																				>
																					<HiInformationCircle className="h-3.5 w-3.5" />
																				</button>
																			</div>
																		);
																	})}
																</div>
															) : null}
														</div>
													);
												})}
											</div>
										) : null}
									</div>
								);
							})}

							{filteredGroups.length === 0 ? (
								<div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 py-12 text-gray-400">
									<HiMagnifyingGlass className="h-7 w-7" />
									<p className="text-sm">No permissions match your search.</p>
								</div>
							) : null}
						</div>
					</div>
				</form>
			</div>

			{/* Detail modal */}
			{detail ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p4">
					<div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
						<div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
							<div>
								<div className="flex items-center gap-2">
									<span className={`flex h-5 w-5 items-center justify-center rounded ${ACTION_META[getActionType(detail.key)].bg} ${ACTION_META[getActionType(detail.key)].text}`}>
										{ACTION_META[getActionType(detail.key)].icon}
									</span>
									<p className="text-sm font-bold text-gray-900">{detail.name}</p>
									{getScope(detail.key) === "mine" ? (
										<span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-indigo-100 text-indigo-700">Mine</span>
									) : getScope(detail.key) === "all" ? (
										<span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-700">All</span>
									) : null}
								</div>
								<p className="text-xs text-gray-500 mt-0.5">{detail.key}</p>
							</div>
							<button type="button" onClick={() => setDetail(null)} className="rounded-lg border border-gray-100 p-1.5 text-gray-400 hover:bg-gray-50">
								<HiXMark className="h-4 w-4" />
							</button>
						</div>
						<dl className="grid gap-3 p-5 sm:grid-cols-2 text-sm">
							<div>
								<dt className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Category</dt>
								<dd className="mt-0.5 font-medium text-gray-800">{RESOURCE_CATEGORY[detail.resource] ?? "Other"}</dd>
							</div>
							<div>
								<dt className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sub-category</dt>
								<dd className="mt-0.5 font-medium text-gray-800">{PERM_SUB[detail.key] ?? "—"}</dd>
							</div>
							<div>
								<dt className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Resource</dt>
								<dd className="mt-0.5 font-medium text-gray-800">{detail.resource}</dd>
							</div>
							<div>
								<dt className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Action</dt>
								<dd className="mt-0.5 font-medium text-gray-800">{detail.action}</dd>
							</div>
							<div className="sm:col-span-2">
								<dt className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Description</dt>
								<dd className="mt-0.5 text-gray-700">{detail.description ?? "No description available."}</dd>
							</div>
						</dl>
					</div>
				</div>
			) : null}
		</div>
	);
};
