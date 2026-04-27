import type { ReactNode } from "react";
import {
	HiBars3,
	HiChevronRight,
	HiExclamationTriangle,
	HiXMark,
} from "react-icons/hi2";
import { Link, NavLink } from "react-router-dom";

export type NavigationItem = {
	to: string;
	label: string;
	description: string;
	icon: ReactNode;
};

export type Tone = "brand" | "accent" | "ink" | "sky" | "warm";

const toneStyles: Record<Tone, { dot: string; fill: string; border: string }> =
	{
		brand: { dot: "bg-brand", fill: "bg-brand", border: "border-brand/20" },
		accent: { dot: "bg-accent", fill: "bg-accent", border: "border-accent/20" },
		ink: { dot: "bg-ink", fill: "bg-ink", border: "border-border" },
		sky: { dot: "bg-sky", fill: "bg-sky", border: "border-sky/20" },
		warm: { dot: "bg-warm", fill: "bg-warm", border: "border-warm/20" },
	};

type SidebarProps = {
	items: NavigationItem[];
	open: boolean;
	onToggle: () => void;
	onLogout: () => void;
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

export const Sidebar = ({ items, open, onToggle, onLogout }: SidebarProps) => {
	return (
		<aside
			className="sticky top-0 hidden min-h-screen overflow-hidden border-r border-border bg-surface transition-[width] duration-300 ease-out lg:flex lg:flex-col"
			style={{ width: open ? "18rem" : "5.5rem" }}
		>
			<div className="flex items-center justify-between gap-3 border-b border-border px-5 py-5">
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
						className="h-11 w-11 shrink-0 rounded-2xl border border-border bg-surface-muted p-1.5"
					/>
					{open ? (
						<div>
							<p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand">
								Zidnee CRM
							</p>
							<h1 className="text-lg font-semibold text-ink">Workspace</h1>
						</div>
					) : null}
				</div>
				<button
					type="button"
					className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-ink transition duration-200 hover:border-brand hover:text-brand"
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

			<nav className="flex-1 px-3 py-4" aria-label="Dashboard sections">
				<div className="grid gap-1.5">
					{items.map((item) => (
						<NavLink
							key={item.to}
							to={item.to}
							end={item.to === "/"}
							className={({ isActive }) =>
								isActive
									? `flex items-center gap-3 rounded-2xl border border-brand/15 bg-brand-soft px-4 py-3 text-left text-ink transition duration-200 ${open ? "justify-start" : "justify-center px-3"}`
									: `flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-ink-soft transition duration-200 hover:bg-surface-muted hover:text-ink ${open ? "justify-start" : "justify-center px-3"}`
							}
						>
							<span className="text-brand">{item.icon}</span>
							{open ? (
								<div className="min-w-0 flex-1">
									<div className="flex items-center justify-between gap-2">
										<span className="block truncate text-sm font-semibold">
											{item.label}
										</span>
										<span className="text-xs text-ink-soft">
											{item.description}
										</span>
									</div>
								</div>
							) : null}
						</NavLink>
					))}
				</div>

				<div className="mt-6 rounded-3xl border border-border bg-surface-muted p-4">
					<p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-ink-soft">
						Navigation
					</p>
					<p className="mt-2 text-sm leading-6 text-ink-soft">
						Use the route sections to work through dashboard views.
					</p>
					<button
						type="button"
						className="mt-4 w-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-surface transition duration-200 hover:bg-brand"
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
		<header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur-xl">
			<div className="px-4 py-3 sm:px-6 lg:px-8">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex items-center gap-3">
						<button
							type="button"
							className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-surface text-ink transition duration-200 hover:border-brand hover:text-brand lg:hidden"
							onClick={onToggleSidebar}
							aria-label="Toggle sidebar"
						>
							<HiBars3 className="h-5 w-5" aria-hidden="true" />
						</button>
						<div>
							<h2 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">
								{title}
							</h2>
							<div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-ink-soft sm:text-sm">
								{breadcrumbs.map((crumb, index) => (
									<div
										key={`${crumb}-${+index}`}
										className="flex items-center gap-1.5"
									>
										{index > 0 ? (
											<HiChevronRight
												aria-hidden="true"
												className="h-3.5 w-3.5 text-ink-soft/60"
											/>
										) : null}
										<span
											className={
												crumb === lastCrumb ? "text-brand" : "text-ink-soft"
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
						className="flex items-center gap-3 rounded-2xl border border-border bg-surface-muted px-3 py-2 text-left transition duration-200 hover:border-brand/30 hover:bg-surface"
					>
						<span className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-brand-soft text-sm font-semibold text-brand">
							{avatarSeed}
						</span>
						<div className="min-w-0">
							<p className="truncate text-sm font-semibold text-ink">
								{userName}
							</p>
							<p className="truncate text-xs text-ink-soft">{userLabel}</p>
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
			className={`rounded-4xl border ${styles.border} bg-surface p-5 shadow-sm`}
		>
			<div className="flex items-center justify-between gap-3">
				<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-soft">
					{label}
				</p>
				<span className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} />
			</div>
			<p className="mt-4 text-2xl font-semibold tracking-tight text-ink">
				{value}
			</p>
			<div className="mt-4 h-1.5 w-full rounded-full bg-surface-muted">
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
		<section className="rounded-4xl border border-border bg-surface p-6 shadow-sm">
			<div className="flex items-center justify-between gap-4">
				<div>
					<p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand">
						{description}
					</p>
					<h3 className="mt-1 text-xl font-semibold text-ink">{title}</h3>
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
		<label className="grid gap-2 text-sm font-medium text-ink-soft">
			<span>{label}</span>
			<input
				className="rounded-2xl border border-border bg-surface px-4 py-3 text-ink outline-none transition placeholder:text-ink-soft/50 focus:border-brand focus:ring-4 focus:ring-brand-soft"
				type={type}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
			/>
			{error ? (
				<p className="rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-ink">
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
		<label className="grid gap-2 text-sm font-medium text-ink-soft">
			<span>{label}</span>
			<textarea
				className="min-h-28 rounded-2xl border border-border bg-surface px-4 py-3 text-ink outline-none transition placeholder:text-ink-soft/50 focus:border-brand focus:ring-4 focus:ring-brand-soft"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
			/>
			{error ? (
				<p className="rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-ink">
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
			className="fixed inset-0 z-50 grid place-items-center bg-ink/35 px-4"
			role="dialog"
			aria-modal="true"
		>
			<div className="w-full max-w-xl rounded-3xl border border-border bg-surface p-5 shadow-lg">
				<div className="flex items-start justify-between gap-3">
					<div>
						<h4 className="text-lg font-semibold text-ink">{title}</h4>
						{description ? (
							<p className="mt-1 text-sm text-ink-soft">{description}</p>
						) : null}
					</div>
					<button
						type="button"
						className="grid h-9 w-9 place-items-center rounded-xl border border-border text-ink-soft transition hover:text-ink"
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
						className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-ink"
						onClick={onCancel}
						disabled={busy}
					>
						{cancelLabel}
					</button>
					<button
						type="button"
						className={
							tone === "danger"
								? "inline-flex items-center gap-2 rounded-2xl bg-danger px-4 py-2 text-sm font-semibold text-surface"
								: "inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-surface"
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
			<p className="text-sm text-ink-soft">This action cannot be undone.</p>
		</Modal>
	);
};
