import type { Permission } from "@repo/schema";
import { getPermissionCategory, PERMISSION_CATEGORY_ORDER } from "@repo/schema";
import { useMemo, useState } from "react";
import {
	HiCheckCircle,
	HiChevronDown,
	HiInformationCircle,
	HiMagnifyingGlass,
	HiShieldCheck,
	HiXMark,
} from "react-icons/hi2";

type CategoryGroup = {
	category: string;
	permissions: Permission[];
};

const categoryRank = (c: string) => {
	const i = PERMISSION_CATEGORY_ORDER.indexOf(c);
	return i === -1 ? PERMISSION_CATEGORY_ORDER.length : i;
};

const CATEGORY_COLORS: Record<string, string> = {
	"User Management": "bg-violet-100 text-violet-700 border-violet-200",
	"Roles & Permissions": "bg-amber-100 text-amber-700 border-amber-200",
	"Leads & Admissions": "bg-blue-100 text-blue-700 border-blue-200",
	"Students": "bg-emerald-100 text-emerald-700 border-emerald-200",
	"Batches & Groups": "bg-cyan-100 text-cyan-700 border-cyan-200",
	"Reminders & Follow-ups": "bg-rose-100 text-rose-700 border-rose-200",
	"Scheduling": "bg-orange-100 text-orange-700 border-orange-200",
	"Reports": "bg-slate-100 text-slate-700 border-slate-200",
	"Orders": "bg-teal-100 text-teal-700 border-teal-200",
};

const getCategoryColor = (cat: string) => CATEGORY_COLORS[cat] ?? "bg-gray-100 text-gray-700 border-gray-200";

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
	const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
	const [detail, setDetail] = useState<Permission | null>(null);

	const groups = useMemo<CategoryGroup[]>(() => {
		const catMap = new Map<string, Permission[]>();
		for (const p of permissions) {
			const cat = getPermissionCategory(p.resource);
			const arr = catMap.get(cat) ?? [];
			arr.push(p);
			catMap.set(cat, arr);
		}
		return Array.from(catMap.entries())
			.sort(([a], [b]) => categoryRank(a) - categoryRank(b) || a.localeCompare(b))
			.map(([category, perms]) => ({
				category,
				permissions: perms.sort((a, b) => a.name.localeCompare(b.name)),
			}));
	}, [permissions]);

	const filteredGroups = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return groups;
		return groups.map((g) => ({
			...g,
			permissions: g.permissions.filter(
				(p) => p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q),
			),
		})).filter((g) => g.permissions.length > 0);
	}, [groups, search]);

	const toggleId = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	};

	const toggleCategory = (_category: string, catPerms: Permission[]) => {
		const allSelected = catPerms.every((p) => selectedIds.has(p.id));
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (allSelected) {
				catPerms.forEach((p) => next.delete(p.id));
			} else {
				catPerms.forEach((p) => next.add(p.id));
			}
			return next;
		});
	};

	const toggleCollapse = (cat: string) => {
		setCollapsedCategories((prev) => {
			const next = new Set(prev);
			next.has(cat) ? next.delete(cat) : next.add(cat);
			return next;
		});
	};

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
					<div className="grid gap-6 lg:grid-cols-[360px_1fr]">

						{/* LEFT: Role metadata */}
						<div className="space-y-4">
							{/* Role details card */}
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

							{/* Summary card */}
							<div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
								<p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">Permission Summary</p>
								{groups.length === 0 ? (
									<p className="text-xs text-gray-400">No permissions available.</p>
								) : (
									<div className="space-y-2">
										{groups.map((g) => {
											const count = g.permissions.filter((p) => selectedIds.has(p.id)).length;
											const total = g.permissions.length;
											const pct = total > 0 ? (count / total) * 100 : 0;
											const colorClass = getCategoryColor(g.category);
											return (
												<div key={g.category} className="flex items-center gap-2.5">
													<span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${colorClass}`}>
														{count}/{total}
													</span>
													<div className="flex-1 min-w-0">
														<div className="flex items-center justify-between mb-0.5">
															<span className="truncate text-xs font-medium text-gray-700">{g.category}</span>
														</div>
														<div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
															<div
																className="h-full rounded-full bg-violet-500 transition-all"
																style={{ width: `${pct}%` }}
															/>
														</div>
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>

							{error ? (
								<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
									{error}
								</div>
							) : null}
						</div>

						{/* RIGHT: Permission picker */}
						<div className="space-y-3">
							{/* Search bar */}
							<div className="relative">
								<HiMagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
								<input
									type="search"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Search permissions by name or key…"
									className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
								/>
							</div>

							{/* Category groups */}
							{filteredGroups.map((g) => {
								const catSelected = g.permissions.filter((p) => selectedIds.has(p.id)).length;
								const catTotal = g.permissions.length;
								const allSelected = catSelected === catTotal;
								const collapsed = collapsedCategories.has(g.category);
								const colorClass = getCategoryColor(g.category);

								return (
									<div key={g.category} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
										{/* Category header */}
										<div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
											<button
												type="button"
												onClick={() => toggleCollapse(g.category)}
												className="flex flex-1 items-center gap-2 text-left"
											>
												<HiChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${collapsed ? "-rotate-90" : ""}`} />
												<span className="text-sm font-bold text-gray-900">{g.category}</span>
											</button>
											<span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${colorClass}`}>
												{catSelected}/{catTotal}
											</span>
											<button
												type="button"
												onClick={() => toggleCategory(g.category, g.permissions)}
												className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${allSelected ? "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100" : "border-gray-200 text-gray-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"}`}
											>
												{allSelected ? "Deselect all" : "Select all"}
											</button>
										</div>

										{/* Permissions grid */}
										{!collapsed ? (
											<div className="grid gap-px bg-gray-100 sm:grid-cols-2 xl:grid-cols-3">
												{g.permissions.map((p) => {
													const sel = selectedIds.has(p.id);
													return (
														<div
															key={p.id}
															className={`flex items-start gap-2.5 bg-white p-3.5 transition ${sel ? "bg-violet-50/60" : "hover:bg-gray-50"}`}
														>
															<button
																type="button"
																onClick={() => toggleId(p.id)}
																className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition ${sel ? "border-violet-500 bg-violet-500 text-white" : "border-gray-300 bg-white hover:border-violet-400"}`}
																aria-label={sel ? `Deselect ${p.name}` : `Select ${p.name}`}
															>
																{sel ? <HiCheckCircle className="h-3.5 w-3.5" /> : null}
															</button>
															<div className="min-w-0 flex-1">
																<p className={`text-xs font-semibold leading-tight ${sel ? "text-violet-900" : "text-gray-800"}`}>{p.name}</p>
																<p className="mt-0.5 truncate text-[10px] text-gray-400">{p.key}</p>
															</div>
															<button
																type="button"
																title="View details"
																onClick={() => setDetail(p)}
																className="shrink-0 rounded-full p-0.5 text-gray-300 transition hover:text-violet-500"
															>
																<HiInformationCircle className="h-4 w-4" />
															</button>
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
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
						<div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
							<div>
								<p className="text-sm font-bold text-gray-900">{detail.name}</p>
								<p className="text-xs text-gray-500">{detail.key}</p>
							</div>
							<button type="button" onClick={() => setDetail(null)} className="rounded-lg border border-gray-100 p-1.5 text-gray-400 hover:bg-gray-50">
								<HiXMark className="h-4 w-4" />
							</button>
						</div>
						<dl className="grid gap-3 p-5 sm:grid-cols-2 text-sm">
							<div>
								<dt className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Category</dt>
								<dd className="mt-0.5 font-medium text-gray-800">{getPermissionCategory(detail.resource)}</dd>
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
