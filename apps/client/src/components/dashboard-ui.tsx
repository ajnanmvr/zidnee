import type { ReactNode } from "react";
import {
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
	accent?: "emerald" | "teal" | "lime" | "amber" | "orange" | "cyan" | "violet";
};

export type Tone = "brand" | "accent" | "ink" | "sky" | "warm";

const toneStyles: Record<Tone, { dot: string; fill: string; border: string }> =
	{
		brand: { dot: "bg-emerald-600", fill: "bg-emerald-600", border: "border-emerald-600/20" },
		accent: { dot: "bg-purple-600", fill: "bg-purple-600", border: "border-purple-600/20" },
		ink: { dot: "bg-gray-900", fill: "bg-gray-900", border: "border-gray-300" },
		sky: { dot: "bg-sky-600", fill: "bg-sky-600", border: "border-sky-600/20" },
		warm: { dot: "bg-orange-600", fill: "bg-orange-600", border: "border-orange-600/20" },
	};

const accentStyles: Record<NonNullable<NavigationItem["accent"]>, { icon: string; badge: string; active: string }> = {
	emerald: {
		icon: "text-emerald-700",
		badge: "bg-emerald-100 text-emerald-700 border border-emerald-200",
		active: "border-emerald-300 bg-emerald-50",
	},
	teal: {
		icon: "text-teal-700",
		badge: "bg-teal-100 text-teal-700 border border-teal-200",
		active: "border-teal-300 bg-teal-50",
	},
	lime: {
		icon: "text-lime-700",
		badge: "bg-lime-100 text-lime-700 border border-lime-200",
		active: "border-lime-300 bg-lime-50",
	},
	amber: {
		icon: "text-amber-700",
		badge: "bg-amber-100 text-amber-700 border border-amber-200",
		active: "border-amber-300 bg-amber-50",
	},
	orange: {
		icon: "text-orange-700",
		badge: "bg-orange-100 text-orange-700 border border-orange-200",
		active: "border-orange-300 bg-orange-50",
	},
	cyan: {
		icon: "text-cyan-700",
		badge: "bg-cyan-100 text-cyan-700 border border-cyan-200",
		active: "border-cyan-300 bg-cyan-50",
	},
	violet: {
		icon: "text-violet-700",
		badge: "bg-violet-100 text-violet-700 border border-violet-200",
		active: "border-violet-300 bg-violet-50",
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

export const Sidebar = ({ items, open, onToggle, onLogout, currentLocation }: SidebarProps) => {
	const isActiveItem = (item: NavigationItem) => currentLocation === item.to;

	return (
		<aside
			className="sticky top-0 hidden h-screen overflow-hidden border-r border-gray-300 bg-white transition-[width] duration-300 ease-out lg:flex lg:flex-col"
			style={{ width: open ? "16rem" : "4.75rem" }}
		>
			<div className="flex items-center justify-between gap-3 border-b border-gray-300 px-4 py-4">
				<div
					className={
						open
							? "flex items-center gap-3 overflow-hidden"
							: "flex items-center justify-center overflow-hidden"
					}
				>
					<img
						src="/logo.png"
						alt="Zidnee logo"
						className="h-10 w-10 shrink-0 rounded-2xl border border-gray-300 bg-gray-50 p-1.5"
					/>
					{open ? (
						<div>
						<p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
							Zidnee ERP
						</p>
						<h1 className="text-lg font-semibold text-gray-900">Workspace</h1>
						</div>
					) : null}
				</div>
				<button
					type="button"
						className="grid h-9 w-9 place-items-center rounded-full border border-gray-300 bg-white text-gray-900 transition duration-200 hover:border-emerald-600 hover:text-emerald-700"
					onClick={onToggle}
					aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
				>
					<HiChevronRight
						className={
							open
								? "h-5 w-5 transition-transform duration-300"
								: "h-5 w-5 rotate-180 transition-transform duration-300"
						}
						aria-hidden="true"
					/>
				</button>
			</div>

			<nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Dashboard sections">
				<div className="grid gap-1">
					{items.map((item) => {
						const accent = accentStyles[item.accent ?? "emerald"];
						const isActive = isActiveItem(item);

						return (
							<Link
								key={item.to}
								to={item.to}
								className={
									isActive
										? `flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left text-gray-900 transition duration-200 ${accent.active} ${open ? "justify-start" : "justify-center"}`
										: `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-gray-600 transition duration-200 hover:bg-gray-50 hover:text-gray-900 ${open ? "justify-start" : "justify-center"}`
								}
							>
								<span className={accent.icon}>{item.icon}</span>
								{open ? (
									<div className="min-w-0 flex-1">
										<div className="flex items-center justify-between gap-2">
											<span className="block truncate text-sm font-semibold">
												{item.label}
											</span>
											{typeof item.count === "number" ? (
												<span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${accent.badge}`}>
													{item.count}
												</span>
											) : null}
										</div>
									</div>
								) : null}
							</Link>
						);
					})}
				</div>

				<div className="mt-4 px-1">
					<button
						type="button"
						className={`w-full rounded-2xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-900 transition duration-200 hover:border-emerald-600 hover:text-emerald-700 ${open ? "justify-start" : "justify-center"}`}
						onClick={onLogout}
					>
						Log out
					</button>
				</div>
			</nav>
		</aside>
	);
};

export const DashboardHeader = ({
	title,
	breadcrumbs,
	userName,
	userLabel,
	onToggleSidebar,
}: DashboardHeaderProps) => {
	const lastCrumb = breadcrumbs.at(-1);
	const avatarSeed = userName.trim().charAt(0).toUpperCase() || "U";

	return (
		<header className="sticky top-0 z-20 border-b border-gray-300 bg-white/95 backdrop-blur-xl">
			<div className="px-4 py-3 sm:px-6 lg:px-8">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex items-center gap-3">
						<button
							type="button"
							className="grid h-10 w-10 place-items-center rounded-2xl border border-gray-300 bg-white text-gray-900 transition duration-200 hover:border-emerald-600 hover:text-emerald-700 lg:hidden"
							onClick={onToggleSidebar}
							aria-label="Toggle sidebar"
						>
							<HiBars3 className="h-5 w-5" aria-hidden="true" />
						</button>
						<div>
							<h2 className="text-xl font-semibold tracking-tight text-gray-900 md:text-2xl">
								{title}
							</h2>
							<div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-gray-600 sm:text-sm">
								{breadcrumbs.map((crumb, index) => (
									<div
										key={`${crumb}-${+index}`}
										className="flex items-center gap-1.5"
									>
										{index > 0 ? (
											<HiChevronRight
												aria-hidden="true"
												className="h-3.5 w-3.5 text-gray-600/60"
											/>
										) : null}
										<span
											className={
												crumb === lastCrumb ? "text-emerald-700" : "text-gray-600"
											}
										>
											{crumb}
										</span>
									</div>
								))}
							</div>
						</div>
					</div>

					<Link
						to="/me"
						className="flex items-center gap-3 rounded-2xl border border-gray-300 bg-gray-50 px-3 py-2 text-left transition duration-200 hover:border-emerald-600/30 hover:bg-white"
					>
						<span className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-200 bg-emerald-100 text-sm font-semibold text-emerald-700">
							{avatarSeed}
						</span>
						<div className="min-w-0">
						<p className="truncate text-sm font-semibold text-gray-900">
							{userName}
						</p>
						<p className="truncate text-xs text-gray-600">{userLabel}</p>
						</div>
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
				className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-600/50 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
				type={type}
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
			<div className="w-full max-w-xl rounded-3xl border border-gray-300 bg-white p-5 shadow-lg">
				<div className="flex items-start justify-between gap-3">
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

				<div className="mt-4">{children}</div>

				{footer ? (
					<div className="mt-5 flex items-center justify-end gap-2">
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




