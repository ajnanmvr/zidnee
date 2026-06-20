import type { LeadResponse } from "@repo/schema";
import { FOLLOW_UP_PERIOD_MS } from "@repo/schema";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { HiCalendarDays, HiCheck, HiClipboardDocumentList, HiMagnifyingGlass } from "react-icons/hi2";
import { Link } from "react-router-dom";
import { Modal } from "@/components/dashboard-ui";
import { useMeQuery } from "@/features/auth/auth.queries";
import { usePendingDemoRequestsQuery } from "@/features/leads/leads.queries";
import { useAssignDemoMentorMutation } from "@/features/leads/use-lead-mutations";
import { useUsersQuery } from "@/features/users/users.queries";
import { GROUP_DEMO_TIME_SLOTS, formatTimeSlotLabel } from "@/lib/constants/group-demo-slots";
import { useHasPermission } from "@/lib/hooks/use-has-permission";
import { useSession } from "@/lib/session";
import { RequirementsModal } from "./RequirementsModal";

function fmtDate(val?: string | Date | null): string {
	if (!val) return "—";
	const d = typeof val === "string" ? new Date(val) : val;
	if (Number.isNaN(d.getTime())) return "—";
	return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function ordinal(n: number): string {
	if (n === 1) return "1st";
	if (n === 2) return "2nd";
	if (n === 3) return "3rd";
	return `${n}th`;
}

/** Selectable row for the mentor-search list in the Assign Mentor modal. */
const MentorOption = ({
	mentor,
	selected,
	onSelect,
	counsellorName,
}: {
	mentor: { id: string; name?: string | null; username?: string | null; email?: string | null; zids?: { mentor?: string } | null };
	selected: boolean;
	onSelect: () => void;
	/** Shown for mentors not managed by the current counsellor, for less-prominent context. */
	counsellorName?: string | null;
}) => {
	const displayName = mentor.name || mentor.username || "Unknown";
	const zid = mentor.zids?.mentor;
	return (
		<button
			type="button"
			onClick={onSelect}
			className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
				selected
					? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200"
					: "border-gray-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40"
			}`}
		>
			<span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${selected ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"}`}>
				{displayName[0]?.toUpperCase()}
			</span>
			<span className="min-w-0 flex-1">
				<span className="block truncate text-sm font-semibold text-gray-900">{displayName}</span>
				<span className="block truncate text-xs text-gray-400">
					{[zid?.toUpperCase(), mentor.email].filter(Boolean).join(" · ") || "—"}
				</span>
			</span>
			{counsellorName ? (
				<span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-400">
					{counsellorName}
				</span>
			) : null}
			{selected ? <HiCheck className="h-5 w-5 shrink-0 text-emerald-600" /> : null}
		</button>
	);
};

export const UnassignedDemosPage = () => {
	const { token } = useSession();
	const meQuery = useMeQuery(token);
	const canAssignDemo = useHasPermission("LEAD_DEMO_ASSIGN");
	const canViewMine = useHasPermission("DEMO_UNASSIGNED_READ_MY");
	const canViewAll = useHasPermission("DEMO_UNASSIGNED_READ_ALL");
	const usersQuery = useUsersQuery(token);
	const assignDemoMutation = useAssignDemoMentorMutation();
	const currentUserId = meQuery.data?.id ?? "";

	const [selectedDemo, setSelectedDemo] = useState<LeadResponse | null>(null);
	const [assignOpen, setAssignOpen] = useState(false);
	const [requirementsOpen, setRequirementsOpen] = useState(false);
	const [selectedRequirements, setSelectedRequirements] = useState<LeadResponse | null>(null);
	const [viewScope, setViewScope] = useState<"mine" | "all">(canViewMine ? "mine" : "all");
	const [search, setSearch] = useState("");
	const [mentorSearch, setMentorSearch] = useState("");

	const canToggleScope = canViewMine && canViewAll;
	const demosQuery = usePendingDemoRequestsQuery(token, viewScope === "all" || !canViewMine);

	useEffect(() => {
		if (canViewMine) { setViewScope("mine"); return; }
		if (canViewAll) setViewScope("all");
	}, [canViewAll, canViewMine]);

	const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<{
		mentorId: string;
		demoScheduledFor: Date;
	}>({
		defaultValues: { mentorId: "", demoScheduledFor: new Date(Date.now() + FOLLOW_UP_PERIOD_MS.lead) },
	});

	const onAssignMentor = handleSubmit(async (data) => {
		if (!selectedDemo) { toast.error("Demo not selected"); return; }
		try {
			await assignDemoMutation.mutateAsync({
				leadId: selectedDemo.id,
				payload: { mentorId: data.mentorId, demoScheduledFor: data.demoScheduledFor },
			});
			toast.success("Demo assigned successfully");
			setAssignOpen(false);
			setSelectedDemo(null);
			reset();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to assign demo");
		}
	});

	const handleOpenAssign = (demo: LeadResponse) => {
		setSelectedDemo(demo);
		const scheduledDate = demo.demoAvailability
			? new Date(demo.demoAvailability)
			: new Date(Date.now() + FOLLOW_UP_PERIOD_MS.lead);
		reset({ mentorId: "", demoScheduledFor: scheduledDate });
		setAssignOpen(true);
	};

	const mentors = usersQuery.data?.users.filter((u) =>
		u.roles?.some((r) => (r.type ?? "admin") === "mentor"),
	) ?? [];

	/** Mentor previously assigned to this lead's demos — surfaced first as a quick pick. */
	const suggestedMentors = useMemo(() => {
		if (!selectedDemo) return [];
		const candidateIds = selectedDemo.demos
			.map((d) => d.mentorId)
			.filter((id): id is string => Boolean(id));
		const seen = new Set<string>();
		const suggestions: typeof mentors = [];
		for (const id of candidateIds.reverse()) {
			if (seen.has(id)) continue;
			const match = mentors.find((m) => m.id === id);
			if (!match) continue;
			seen.add(id);
			suggestions.push(match);
		}
		return suggestions;
	}, [mentors, selectedDemo]);

	const mentorSearchResults = useMemo(() => {
		const q = mentorSearch.trim().toLowerCase();
		if (!q) return mentors;
		return mentors.filter((m) => {
			const haystack = [m.name, m.username, m.zids?.mentor, m.email]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();
			return haystack.includes(q);
		});
	}, [mentors, mentorSearch]);

	const userNameById = useMemo(() => new Map(
		(usersQuery.data?.users ?? []).map((u) => [u.id, u.name || u.username]),
	), [usersQuery.data]);

	/** Mentors managed by the current counsellor get their own section, surfaced before everyone else's mentors. */
	const myMentorResults = useMemo(
		() => mentorSearchResults.filter((m) => m.counsellorId === currentUserId),
		[mentorSearchResults, currentUserId],
	);
	const otherMentorResults = useMemo(
		() => mentorSearchResults.filter((m) => m.counsellorId !== currentUserId),
		[mentorSearchResults, currentUserId],
	);

	const allDemos = demosQuery.data?.leads ?? [];
	const scopedDemos = viewScope === "mine"
		? allDemos.filter((d) => d.demoRequestAssignedTo === currentUserId)
		: allDemos;
	const rows = useMemo(() => {
		const q = search.toLowerCase();
		if (!q) return scopedDemos;
		return scopedDemos.filter((d) =>
			(d.name ?? "").toLowerCase().includes(q) ||
			(d.phone ?? "").toLowerCase().includes(q),
		);
	}, [scopedDemos, search]);

	return (
		<div className="space-y-3">
			{/* Page header */}
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
						<HiClipboardDocumentList className="h-5 w-5 text-amber-600" />
					</div>
					<div>
						<h1 className="text-lg font-bold text-gray-900">Unassigned Demos</h1>
						<p className="mt-0.5 text-sm text-gray-500">
							{rows.length > 0 ? `${rows.length} request${rows.length !== 1 ? "s" : ""}` : "No requests"} · Awaiting mentor assignment
						</p>
					</div>
				</div>
				{canToggleScope ? (
					<div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
						<button type="button" onClick={() => setViewScope("mine")}
							className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${viewScope === "mine" ? "bg-white text-amber-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
							Mine
						</button>
						<button type="button" onClick={() => setViewScope("all")}
							className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${viewScope === "all" ? "bg-white text-amber-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
							All
						</button>
					</div>
				) : null}
			</div>

			{/* Search */}
			<div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3">
				<input
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search by name or phone…"
					className="w-64 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
				/>
				{search ? (
					<button type="button" onClick={() => setSearch("")}
						className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50">
						Clear
					</button>
				) : null}
			</div>

			{/* Table */}
			<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
				{demosQuery.isLoading ? (
					<div className="flex justify-center py-16">
						<div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
					</div>
				) : rows.length === 0 ? (
					<div className="py-16 text-center">
						<HiClipboardDocumentList className="mx-auto h-10 w-10 text-gray-200" />
						<p className="mt-2 text-sm text-gray-400">No unassigned demo requests.</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="min-w-full border-collapse text-sm">
							<thead>
								<tr className="border-b border-gray-100 bg-gray-50/80">
									<th className="py-2.5 pl-5 pr-4 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Lead</th>
									<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Level</th>
									<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Sales</th>
									<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Attempt</th>
									<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Requested</th>
									<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Assigned To</th>
									<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Re-demo Note</th>
									<th className="px-4 py-2.5 pr-5 text-right text-[11px] font-bold uppercase tracking-widest text-gray-400">Actions</th>
								</tr>
							</thead>
							<tbody>
								{rows.map((demo) => {
									const latestDemo = demo.demos[demo.demos.length - 1];
									const attempt = Math.max(1, demo.demos.length || 1);
									const assignedTo = demo.demoRequestAssignedTo
										? (userNameById.get(demo.demoRequestAssignedTo) ?? "—")
										: "—";
									const salesName = (demo as any).assignedTo
										? (userNameById.get((demo as any).assignedTo) ?? "—")
										: "—";
									return (
										<tr key={demo.id} className="border-b border-gray-100 transition-colors hover:bg-slate-50">
											<td className="border-l-[3px] border-l-amber-400 py-3.5 pl-3 pr-6">
												<div className="flex items-center gap-3 min-w-0">
													<div className="h-8 w-8 shrink-0 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700">
														{(demo.name ?? demo.phone ?? "?")[0]?.toUpperCase()}
													</div>
													<div className="min-w-0">
														<Link to={`/leads/${demo.id}`} className="block font-bold text-blue-600 hover:underline text-sm leading-tight">
															{demo.phone}
														</Link>
														{demo.name ? <p className="text-[11px] text-gray-500 truncate leading-snug">{demo.name}</p> : null}
													</div>
												</div>
											</td>
											<td className="px-4 py-3.5">
												<span className="text-sm font-medium text-gray-700">{demo.level ?? "—"}</span>
											</td>
											<td className="px-4 py-3.5">
												<span className="text-sm text-gray-700">{salesName}</span>
											</td>
											<td className="px-4 py-3.5">
												<span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
													{ordinal(attempt)} demo
												</span>
											</td>
											<td className="px-4 py-3.5">
												<span className="text-sm text-gray-700">{fmtDate(latestDemo?.requestedAt)}</span>
											</td>
											<td className="px-4 py-3.5">
												<span className="text-sm text-gray-700">{assignedTo}</span>
											</td>
											<td className="px-4 py-3.5 max-w-45">
												{latestDemo?.note ? (
													<p className="truncate text-xs text-gray-500" title={latestDemo.note}>{latestDemo.note}</p>
												) : (
													<span className="text-xs text-gray-400">—</span>
												)}
											</td>
											<td className="px-4 py-3.5 pr-5">
												<div className="flex items-center justify-end gap-2">
													<button type="button" onClick={() => { setSelectedRequirements(demo); setRequirementsOpen(true); }}
														className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
														Requirements
													</button>
													{canAssignDemo ? (
														<button type="button" onClick={() => handleOpenAssign(demo)}
															className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600">
															<HiCalendarDays className="h-3.5 w-3.5" />
															Assign
														</button>
													) : null}
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Assign modal */}
			<Modal
				open={assignOpen}
				title="Assign Mentor for Demo"
				description={selectedDemo ? `Demo for ${selectedDemo.name ?? selectedDemo.phone}` : ""}
				onClose={() => { setAssignOpen(false); setSelectedDemo(null); setMentorSearch(""); reset(); }}
				footer={
					<>
						<button type="button" onClick={() => { setAssignOpen(false); setSelectedDemo(null); setMentorSearch(""); reset(); }}
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900">
							Cancel
						</button>
						{canAssignDemo ? (
							<button type="button" onClick={() => void onAssignMentor()} disabled={isSubmitting || assignDemoMutation.isPending}
								className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
								<HiCalendarDays className="h-4 w-4" />
								{assignDemoMutation.isPending ? "Assigning…" : "Assign Mentor"}
							</button>
						) : null}
					</>
				}
			>
				<form className="grid gap-4" onSubmit={onAssignMentor}>
					<Controller name="mentorId" control={control} rules={{ required: "Mentor is required" }}
						render={({ field, fieldState }) => (
							<div className="grid gap-2 text-sm font-medium text-gray-600">
								<span>Select Mentor</span>
								{mentors.length === 0 ? (
									<div className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
										No mentors available
									</div>
								) : (
									<>
										<div className="relative">
											<HiMagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
											<input
												type="text"
												value={mentorSearch}
												onChange={(e) => setMentorSearch(e.target.value)}
												placeholder="Search mentors by name, ZID, or email…"
												className="w-full rounded-2xl border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
											/>
										</div>

										<div className="max-h-72 space-y-3 overflow-y-auto pr-1">
											{!mentorSearch.trim() && suggestedMentors.length > 0 ? (
												<div className="space-y-1.5">
													<p className="px-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
														Suggested — previously involved with this lead
													</p>
													<div className="space-y-1.5">
														{suggestedMentors.map((m) => (
															<MentorOption
																key={m.id}
																mentor={m}
																selected={field.value === m.id}
																onSelect={() => field.onChange(m.id)}
															/>
														))}
													</div>
												</div>
											) : null}

											{myMentorResults.length > 0 ? (
												<div className="space-y-1.5 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-2">
													<p className="px-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
														My mentors
													</p>
													<div className="space-y-1.5">
														{myMentorResults.map((m) => (
															<MentorOption
																key={m.id}
																mentor={m}
																selected={field.value === m.id}
																onSelect={() => field.onChange(m.id)}
															/>
														))}
													</div>
												</div>
											) : null}

											<div className="space-y-1.5">
												{otherMentorResults.length > 0 ? (
													<p className="px-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
														{myMentorResults.length > 0 ? "Other mentors" : "All mentors"}
													</p>
												) : null}
												{mentorSearchResults.length === 0 ? (
													<div className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-center text-sm text-gray-500">
														No mentors match "{mentorSearch}"
													</div>
												) : (
													otherMentorResults.map((m) => (
														<MentorOption
															key={m.id}
															mentor={m}
															selected={field.value === m.id}
															onSelect={() => field.onChange(m.id)}
															counsellorName={m.counsellorId ? (userNameById.get(m.counsellorId) ?? null) : null}
														/>
													))
												)}
											</div>
										</div>
									</>
								)}
								{fieldState.error?.message ? <p className="text-xs text-red-600">{fieldState.error.message}</p> : null}
							</div>
						)}
					/>
					<Controller name="demoScheduledFor" control={control}
						rules={{ required: "Demo time is required", validate: (v) => v > new Date() || "Demo time must be in the future" }}
						render={({ field, fieldState }) => {
							if (selectedDemo?.courseType === "GROUP") {
								const currentDate = field.value instanceof Date ? format(field.value, "yyyy-MM-dd") : "";
								const currentTime = field.value instanceof Date ? format(field.value, "HH:mm") : "";
								return (
									<div className="grid gap-2 text-sm font-medium text-gray-600">
										<span>Demo Scheduled For</span>
										<input type="date"
											value={currentDate}
											onChange={(e) => {
												const time = currentTime || GROUP_DEMO_TIME_SLOTS[0]?.startTime || "06:00";
												field.onChange(new Date(`${e.target.value}T${time}`));
											}}
											className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
										/>
										<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
											{GROUP_DEMO_TIME_SLOTS.map((slot) => {
												const selected = currentTime === slot.startTime;
												return (
													<button key={slot.startTime} type="button"
														onClick={() => {
															const date = currentDate || format(new Date(), "yyyy-MM-dd");
															field.onChange(new Date(`${date}T${slot.startTime}`));
														}}
														className={`rounded-xl border px-2 py-2 text-xs font-semibold transition ${
															selected
																? "border-emerald-500 bg-emerald-50 text-emerald-700"
																: "border-gray-200 text-gray-700 hover:bg-gray-50"
														}`}
													>
														{formatTimeSlotLabel(slot)}
													</button>
												);
											})}
										</div>
										{fieldState.error?.message ? <p className="text-xs text-red-600">{fieldState.error.message}</p> : null}
									</div>
								);
							}

							return (
								<label className="grid gap-2 text-sm font-medium text-gray-600">
									<span>Demo Scheduled For</span>
									<input type="datetime-local"
										value={field.value instanceof Date ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ""}
										onChange={(e) => field.onChange(new Date(e.target.value))}
										className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
									/>
									{fieldState.error?.message ? <p className="text-xs text-red-600">{fieldState.error.message}</p> : null}
								</label>
							);
						}}
					/>
				</form>
			</Modal>

			<RequirementsModal
				open={requirementsOpen}
				lead={selectedRequirements}
				onClose={() => { setRequirementsOpen(false); setSelectedRequirements(null); }}
			/>
		</div>
	);
};
