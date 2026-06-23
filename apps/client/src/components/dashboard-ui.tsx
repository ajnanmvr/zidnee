import type { ReactNode } from "react";
import {
	HiArrowLeft,
	HiArrowRightOnRectangle,
	HiBars3,
	HiChevronRight,
	HiExclamationTriangle,
	HiXMark,
} from "react-icons/hi2";
import { Link } from "react-router-dom";

export type NavigationItem = {
	to: string;
	label: string;
	description: string;
	icon: ReactNode;
	count?: number;
	accent?:
		| "emerald"
		| "teal"
		| "lime"
		| "amber"
		| "orange"
		| "cyan"
		| "violet"
		| "rose";
	section?: string;
};

export type Tone = "brand" | "accent" | "ink" | "sky" | "warm";

const toneStyles: Record<Tone, { dot: string; fill: string; border: string }> =
	{
		brand: {
			dot: "bg-emerald-600",
			fill: "bg-emerald-600",
			border: "border-emerald-600/20",
		},
		accent: {
			dot: "bg-purple-600",
			fill: "bg-purple-600",
			border: "border-purple-600/20",
		},
		ink: { dot: "bg-gray-900", fill: "bg-gray-900", border: "border-gray-300" },
		sky: { dot: "bg-sky-600", fill: "bg-sky-600", border: "border-sky-600/20" },
		warm: {
			dot: "bg-orange-600",
			fill: "bg-orange-600",
			border: "border-orange-600/20",
		},
	};

type SidebarProps = {
	items: NavigationItem[];
	open: boolean;
	onToggle: () => void;
	onLogout: () => void;
	currentLocation: string;
};

type DashboardHeaderProps = {
	title: string;
	breadcrumbs: string[];
	userName: string;
	userLabel: string;
	onToggleSidebar: () => void;
	onBack?: () => void;
};

type MetricCardProps = {
	label: string;
	value: string;
	tone: Tone;
	progress: number;
};

type PanelProps = {
	title: string;
	description?: string;
	children: ReactNode;
	action?: ReactNode;
};

type FieldProps = {
	label: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	type?: string;
	error?: string;
};

type TextAreaProps = {
	label: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	error?: string;
};

type SelectProps = {
	label: string;
	value: string;
	onChange: (value: string) => void;
	options: Array<{ value: string; label: string }>;
	placeholder?: string;
	error?: string;
};

type ModalProps = {
	open: boolean;
	title: string;
	description?: string;
	children: ReactNode;
	onClose: () => void;
	footer?: ReactNode;
};

type ConfirmDialogProps = {
	open: boolean;
	title: string;
	description: string;
	confirmLabel?: string;
	cancelLabel?: string;
	busy?: boolean;
	tone?: "danger" | "brand";
	onConfirm: () => void;
	onCancel: () => void;
};

const accentIconBg: Record<NonNullable<NavigationItem["accent"]>, string> = {
	emerald: "bg-emerald-100 text-emerald-700",
	teal: "bg-teal-100 text-teal-700",
	lime: "bg-lime-100 text-lime-700",
	amber: "bg-amber-100 text-amber-700",
	orange: "bg-orange-100 text-orange-700",
	cyan: "bg-cyan-100 text-cyan-700",
	violet: "bg-violet-100 text-violet-700",
	rose: "bg-rose-100 text-rose-700",
};

const accentIconBgMuted: Record<NonNullable<NavigationItem["accent"]>, string> = {
	emerald: "bg-emerald-50 text-emerald-500",
	teal: "bg-teal-50 text-teal-500",
	lime: "bg-lime-50 text-lime-500",
	amber: "bg-amber-50 text-amber-500",
	orange: "bg-orange-50 text-orange-500",
	cyan: "bg-cyan-50 text-cyan-500",
	violet: "bg-violet-50 text-violet-500",
	rose: "bg-rose-50 text-rose-500",
};

const accentBar: Record<NonNullable<NavigationItem["accent"]>, string> = {
	emerald: "bg-emerald-500",
	teal: "bg-teal-500",
	lime: "bg-lime-500",
	amber: "bg-amber-500",
	orange: "bg-orange-500",
	cyan: "bg-cyan-500",
	violet: "bg-violet-500",
	rose: "bg-rose-500",
};

export const Sidebar = ({
	items,
	open,
	onToggle,
	onLogout,
	currentLocation,
}: SidebarProps) => {
	// Score how well a nav item's `to` matches the current location: 0 means
	// no match, otherwise higher scores mean a more specific match (more
	// query params accounted for). This ensures that e.g. "Leads" (`/leads`)
	// doesn't stay highlighted as active alongside the more specific
	// "Follow Up" (`/leads?stage=followUp`) item.
	const matchScore = (item: NavigationItem): number => {
		try {
			const currentUrl = new URL(currentLocation, "http://local");
			const itemUrl = new URL(item.to, "http://local");
			if (currentUrl.pathname !== itemUrl.pathname) {
				return 0;
			}

			let matchedParams = 0;
			for (const [key, value] of itemUrl.searchParams.entries()) {
				if (currentUrl.searchParams.get(key) !== value) {
					return 0;
				}
				matchedParams += 1;
			}

			return 1 + matchedParams;
		} catch {
			return currentLocation === item.to ? 1 : 0;
		}
	};

	// Filter valid items
	const validItems = items.filter(
		(item): item is NavigationItem =>
			Boolean(item?.icon && item.to && item.label),
	);

	const bestMatchScore = validItems.reduce(
		(best, item) => Math.max(best, matchScore(item)),
		0,
	);
	const isActiveItem = (item: NavigationItem) =>
		bestMatchScore > 0 && matchScore(item) === bestMatchScore;

	// Group the valid items
	type GroupType = { section: string; items: NavigationItem[] };
	const groupedItems: GroupType[] = [];

	for (const item of validItems) {
		const section = item.section ?? "General";
		const existingGroup = groupedItems.find((g) => g.section === section);
		if (existingGroup) {
			existingGroup.items.push(item);
		} else {
			groupedItems.push({ section, items: [item] });
		}
	}

	try {

	const renderNavItem = (item: NavigationItem, collapsed: boolean, onNavigate?: () => void) => {
		const accent = item.accent ?? "emerald";
		const isActive = isActiveItem(item);
		return (
			<Link
				key={item.to}
				to={item.to}
				onClick={onNavigate}
				title={collapsed ? item.label : undefined}
				className={`group relative flex items-center gap-3 rounded-xl py-2.5 transition duration-150 ${
					collapsed ? "justify-center px-2" : "px-2.5"
				} ${
					isActive
						? "bg-gray-50 text-gray-900"
						: "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
				}`}
			>
				{isActive ? (
					<span className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full ${accentBar[accent]}`} aria-hidden="true" />
				) : null}
				<span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base transition ${isActive ? accentIconBg[accent] : accentIconBgMuted[accent]}`}>
					{item.icon}
				</span>
				{!collapsed ? (
					<div className="min-w-0 flex-1">
						<div className="flex items-center justify-between gap-2">
							<span className={`block truncate text-sm ${isActive ? "font-semibold text-gray-900" : "font-medium"}`}>{item.label}</span>
							{typeof item.count === "number" && item.count > 0 ? (
								<span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${accentIconBg[accent]}`}>
									{item.count}
								</span>
							) : null}
						</div>
						{item.description ? (
							<span className="block truncate text-xs text-gray-400">{item.description}</span>
						) : null}
					</div>
				) : typeof item.count === "number" && item.count > 0 ? (
					<span className={`absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${accentIconBg[accent]}`}>
						{item.count > 99 ? "99+" : item.count}
					</span>
				) : null}
			</Link>
		);
	};

	const renderNavGroups = (collapsed: boolean, onNavigate?: () => void) => (
		<div className="grid gap-5">
			{groupedItems.map((group) => (
				<div key={group.section} className="grid gap-1">
					{!collapsed ? (
						<p className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
							{group.section}
						</p>
					) : (
						<div className="mx-2 mb-1 h-px bg-gray-100" aria-hidden="true" />
					)}
					{group.items.map((item) => renderNavItem(item, collapsed, onNavigate))}
				</div>
			))}
		</div>
	);

	const Brand = ({ collapsed }: { collapsed: boolean }) => (
		<div className={`flex items-center gap-3 overflow-hidden ${collapsed ? "justify-center" : ""}`}>
			<img
				src="/logo.png"
				alt="Zidnee logo"
				className="h-10 w-10 shrink-0 rounded-2xl border border-gray-200 bg-gray-50 object-contain p-1.5"
			/>
			{!collapsed ? (
				<div className="min-w-0">
					<p className="truncate text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-600">Zidnee ERP</p>
					<h1 className="truncate text-base font-bold text-gray-900">Workspace</h1>
				</div>
			) : null}
		</div>
	);

	const LogoutButton = ({ collapsed }: { collapsed: boolean }) => (
		<button
			type="button"
			title={collapsed ? "Log out" : undefined}
			className={`flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-2.5 py-2.5 text-sm font-semibold text-gray-500 transition duration-150 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 ${collapsed ? "justify-center" : ""}`}
			onClick={onLogout}
		>
			<HiArrowRightOnRectangle className="h-5 w-5 shrink-0" aria-hidden="true" />
			{!collapsed ? "Log out" : null}
		</button>
	);

	return (
		<>
			{/* Desktop Sidebar */}
			<aside
				className="sticky top-0 hidden h-screen overflow-hidden border-r border-gray-200 bg-white transition-[width] duration-300 ease-out lg:flex lg:flex-col"
				style={{ width: open ? "17rem" : "4.75rem" }}
			>
				<div className="flex items-center justify-between gap-2 px-4 py-4">
					<Brand collapsed={!open} />
					{open ? (
						<button
							type="button"
							className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gray-400 transition duration-150 hover:bg-gray-100 hover:text-gray-700"
							onClick={onToggle}
							aria-label="Collapse sidebar"
						>
							<HiChevronRight className="h-4 w-4 rotate-180 transition-transform duration-300" aria-hidden="true" />
						</button>
					) : null}
				</div>

				{!open ? (
					<div className="px-4 pb-2">
						<button
							type="button"
							className="grid h-8 w-8 place-items-center rounded-lg border border-gray-200 text-gray-400 transition duration-150 hover:border-emerald-300 hover:text-emerald-600"
							onClick={onToggle}
							aria-label="Expand sidebar"
						>
							<HiChevronRight className="h-4 w-4 transition-transform duration-300" aria-hidden="true" />
						</button>
					</div>
				) : null}

				<nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Dashboard sections">
					{renderNavGroups(!open)}
				</nav>

				<div className="border-t border-gray-100 p-3">
					<LogoutButton collapsed={!open} />
				</div>
			</aside>

			{/* Mobile Sidebar Drawer */}
			{open && (
				<>
					{/* Overlay */}
					<div
						className="fixed inset-0 z-30 bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
						onClick={onToggle}
						aria-hidden="true"
					/>
					{/* Drawer */}
					<aside className="fixed inset-y-0 left-0 z-40 flex w-72 flex-col overflow-hidden border-r border-gray-200 bg-white shadow-2xl lg:hidden">
						<div className="flex items-center justify-between gap-2 px-4 py-4">
							<Brand collapsed={false} />
							<button
								type="button"
								className="grid h-9 w-9 place-items-center rounded-lg text-gray-400 transition duration-150 hover:bg-gray-100 hover:text-gray-700"
								onClick={onToggle}
								aria-label="Close sidebar"
							>
								<HiXMark className="h-5 w-5" aria-hidden="true" />
							</button>
						</div>
						<nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Dashboard sections">
							{renderNavGroups(false, onToggle)}
						</nav>
						<div className="border-t border-gray-100 p-3">
							<LogoutButton collapsed={false} />
						</div>
					</aside>
				</>
			)}
		</>
	);
	} catch (error) {
		console.error("Sidebar render error:", error);
		return (
			<aside className="sticky top-0 hidden h-screen overflow-hidden border-r border-gray-200 bg-white lg:flex lg:flex-col p-4">
				<p className="text-sm text-red-600">Sidebar error - please refresh the page</p>
			</aside>
		);
	}
};

const AVATAR_GRADIENTS = [
	"from-teal-500 to-emerald-600",
	"from-blue-500 to-indigo-600",
	"from-violet-500 to-purple-600",
	"from-rose-500 to-pink-600",
	"from-amber-500 to-orange-500",
];
function headerAvatarGradient(seed: string) {
	let h = 0;
	for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
	return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length] ?? AVATAR_GRADIENTS[0];
}

export const DashboardHeader = ({
	title,
	breadcrumbs,
	userName,
	userLabel,
	onToggleSidebar,
	onBack,
}: DashboardHeaderProps) => {
	const crumbs = breadcrumbs.filter((c, i) => i === 0 || c !== breadcrumbs[i - 1]);
	const lastCrumb = crumbs.at(-1);
	const avatarSeed = userName.trim().charAt(0).toUpperCase() || "U";
	const gradientCls = headerAvatarGradient(userName || "user");

	return (
		<header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur-xl">
			<div className="px-4 py-3 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between gap-3">
					<div className="flex min-w-0 items-center gap-3">
						<button
							type="button"
							className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gray-200 bg-white text-gray-500 transition duration-150 hover:border-emerald-300 hover:text-emerald-700 lg:hidden"
							onClick={onToggleSidebar}
							aria-label="Toggle sidebar"
						>
							<HiBars3 className="h-5 w-5" aria-hidden="true" />
						</button>
						{onBack ? (
							<button
								type="button"
								className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gray-200 bg-white text-gray-500 transition duration-150 hover:border-emerald-300 hover:text-emerald-700"
								onClick={onBack}
								aria-label="Go back"
								title="Go back"
							>
								<HiArrowLeft className="h-5 w-5" aria-hidden="true" />
							</button>
						) : null}
						<div className="min-w-0">
							<div className="flex flex-wrap items-center gap-1 text-[11px] font-medium text-gray-400 sm:text-xs">
								{crumbs.map((crumb, index) => (
									<div key={`${crumb}-${+index}`} className="flex items-center gap-1">
										{index > 0 ? (
											<HiChevronRight aria-hidden="true" className="h-3 w-3 text-gray-300" />
										) : null}
										<span className={crumb === lastCrumb ? "font-semibold text-emerald-600" : ""}>
											{crumb}
										</span>
									</div>
								))}
							</div>
							<h2 className="truncate text-lg font-bold tracking-tight text-gray-900 sm:text-xl">
								{title}
							</h2>
						</div>
					</div>

					<Link
						to="/me"
						className="group flex shrink-0 items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-2 py-1.5 text-left transition duration-150 hover:border-emerald-300 hover:bg-emerald-50/40 sm:px-3 sm:py-2"
					>
						<span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-linear-to-br ${gradientCls} text-sm font-bold text-white shadow-sm`}>
							{avatarSeed}
						</span>
						<div className="hidden min-w-0 sm:block">
							<p className="truncate text-sm font-semibold text-gray-900">
								{userName}
							</p>
							<p className="truncate text-xs text-gray-400">{userLabel}</p>
						</div>
						<HiChevronRight className="hidden h-4 w-4 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-500 md:block" aria-hidden="true" />
					</Link>
				</div>
			</div>
		</header>
	);
};

export const MetricCard = ({
	label,
	value,
	tone,
	progress,
}: MetricCardProps) => {
	const styles = toneStyles[tone];

	return (
		<div
			className={`rounded-4xl border ${styles.border} bg-white p-5 shadow-sm`}
		>
			<div className="flex items-center justify-between gap-3">
				<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-600">
					{label}
				</p>
				<span className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} />
			</div>
			<p className="mt-4 text-2xl font-semibold tracking-tight text-gray-900">
				{value}
			</p>
			<div className="mt-4 h-1.5 w-full rounded-full bg-gray-50">
				<div
					className={`h-full rounded-full ${styles.fill}`}
					style={{ width: `${progress}%` }}
				/>
			</div>
		</div>
	);
};

export const Panel = ({ title, description, children, action }: PanelProps) => {
	return (
		<section className="rounded-4xl border border-gray-300 bg-white p-6 shadow-sm">
			<div className="flex items-center justify-between gap-4">
				<div>
					<p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">
						{description}
					</p>
					<h3 className="mt-1 text-xl font-semibold text-gray-900">{title}</h3>
				</div>
				{action}
			</div>
			<div className="mt-5">{children}</div>
		</section>
	);
};

export const Field = ({
	label,
	value,
	onChange,
	placeholder,
	type = "text",
	error,
}: FieldProps) => {
	return (
		<label className="grid gap-2 text-sm font-medium text-gray-600">
			<span>{label}</span>
			<input
				className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-600/50 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
				type={type}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
				onWheel={type === "number" ? (e) => e.currentTarget.blur() : undefined}
			/>
			{error ? (
				<p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					{error}
				</p>
			) : null}
		</label>
	);
};

export const TextAreaField = ({
	label,
	value,
	onChange,
	placeholder,
	error,
}: TextAreaProps) => {
	return (
		<label className="grid gap-2 text-sm font-medium text-gray-600">
			<span>{label}</span>
			<textarea
				className="min-h-28 rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-600/50 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
			/>
			{error ? (
				<p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					{error}
				</p>
			) : null}
		</label>
	);
};

export const SelectField = ({
	label,
	value,
	onChange,
	options,
	placeholder,
	error,
}: SelectProps) => {
	return (
		<label className="grid gap-2 text-sm font-medium text-gray-600">
			<span>{label}</span>
			<select
				className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
				value={value}
				onChange={(event) => onChange(event.target.value)}
			>
				{placeholder ? (
					<option value="" disabled>
						{placeholder}
					</option>
				) : null}
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
			{error ? (
				<p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					{error}
				</p>
			) : null}
		</label>
	);
};

export const Modal = ({
	open,
	title,
	description,
	children,
	onClose,
	footer,
}: ModalProps) => {
	if (!open) {
		return null;
	}

	return (
		<div
			className="fixed inset-0 z-50 grid place-items-center bg-gray-900/35 px-4"
			role="dialog"
			aria-modal="true"
		>
			<div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-3xl border border-gray-300 bg-white p-5 shadow-lg">
				<div className="flex shrink-0 items-start justify-between gap-3">
					<div>
						<h4 className="text-lg font-semibold text-gray-900">{title}</h4>
						{description ? (
							<p className="mt-1 text-sm text-gray-600">{description}</p>
						) : null}
					</div>
					<button
						type="button"
						className="grid h-9 w-9 place-items-center rounded-xl border border-gray-300 text-gray-600 transition hover:text-gray-900"
						onClick={onClose}
						aria-label="Close dialog"
					>
						<HiXMark className="h-5 w-5" aria-hidden="true" />
					</button>
				</div>

				<div className="mt-4 min-h-0 flex-1 overflow-y-auto">{children}</div>

				{footer ? (
					<div className="mt-5 flex shrink-0 items-center justify-end gap-2">
						{footer}
					</div>
				) : null}
			</div>
		</div>
	);
};

export const ConfirmDialog = ({
	open,
	title,
	description,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	busy = false,
	tone = "danger",
	onConfirm,
	onCancel,
}: ConfirmDialogProps) => {
	return (
		<Modal
			open={open}
			title={title}
			description={description}
			onClose={onCancel}
			footer={
				<>
					<button
						type="button"
						className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
						onClick={onCancel}
						disabled={busy}
					>
						{cancelLabel}
					</button>
					<button
						type="button"
						className={
							tone === "danger"
								? "inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
								: "inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
						}
						onClick={onConfirm}
						disabled={busy}
					>
						<HiExclamationTriangle className="h-4 w-4" aria-hidden="true" />
						{busy ? "Working..." : confirmLabel}
					</button>
				</>
			}
		>
			<p className="text-sm text-gray-600">This action cannot be undone.</p>
		</Modal>
	);
};
