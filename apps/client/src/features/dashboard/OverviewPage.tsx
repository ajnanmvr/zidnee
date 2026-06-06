import { Link } from "react-router-dom";
import { useNavigationItems } from "./useNavigationItems";

function greeting(): string {
	const h = new Date().getHours();
	if (h < 12) return "Good morning";
	if (h < 17) return "Good afternoon";
	return "Good evening";
}

const accentToColors = (accent?: string) => {
	switch (accent) {
		case "emerald":
			return { bg: "bg-emerald-100", text: "text-emerald-600" };
		case "teal":
			return { bg: "bg-teal-100", text: "text-teal-600" };
		case "lime":
			return { bg: "bg-lime-100", text: "text-lime-600" };
		case "amber":
			return { bg: "bg-amber-100", text: "text-amber-600" };
		case "orange":
			return { bg: "bg-orange-100", text: "text-orange-600" };
		case "cyan":
			return { bg: "bg-cyan-100", text: "text-cyan-600" };
		case "rose":
			return { bg: "bg-rose-100", text: "text-rose-600" };
		case "violet":
			return { bg: "bg-violet-100", text: "text-violet-600" };
		default:
			return { bg: "bg-gray-100", text: "text-gray-600" };
	}
};

const getBadgeStyles = (accent?: string) => {
	switch (accent) {
		case "emerald":
			return "bg-emerald-100 text-emerald-700 border border-emerald-200";
		case "teal":
			return "bg-teal-100 text-teal-700 border border-teal-200";
		case "lime":
			return "bg-lime-100 text-lime-700 border border-lime-200";
		case "amber":
			return "bg-amber-100 text-amber-700 border border-amber-200";
		case "orange":
			return "bg-orange-100 text-orange-700 border border-orange-200";
		case "cyan":
			return "bg-cyan-100 text-cyan-700 border border-cyan-200";
		case "rose":
			return "bg-rose-100 text-rose-700 border border-rose-200";
		case "violet":
			return "bg-violet-100 text-violet-700 border border-violet-200";
		default:
			return "bg-gray-100 text-gray-700 border border-gray-200";
	}
};

const getSectionAccent = (section: string) => {
	switch (section) {
		case "Lead Pipeline":
			return "from-blue-500 to-indigo-600";
		case "Reports":
			return "from-indigo-500 to-purple-600";
		case "Demo Management":
			return "from-violet-500 to-purple-600";
		case "Learners":
			return "from-teal-500 to-emerald-600";
		case "Management":
			return "from-slate-500 to-gray-700";
		case "Account":
			return "from-emerald-500 to-teal-600";
		default:
			return "from-gray-500 to-slate-600";
	}
};

export const OverviewPage = () => {
	const { navItems, meName, roleLabel } = useNavigationItems();

	// Group the valid items by section, filtering out the dashboard index page
	type SectionGroup = { title: string; accent: string; items: typeof navItems };
	const sections: SectionGroup[] = [];

	const itemsToDisplay = navItems.filter((item) => item.to !== "/");

	for (const item of itemsToDisplay) {
		const sectionTitle = item.section ?? "General";
		let group = sections.find((s) => s.title === sectionTitle);
		if (!group) {
			group = {
				title: sectionTitle,
				accent: getSectionAccent(sectionTitle),
				items: [],
			};
			sections.push(group);
		}
		group.items.push(item);
	}

	const firstName = meName.split(" ")[0] ?? meName;

	return (
		<div className="space-y-6">
			{/* Hero greeting */}
			<div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-teal-600 via-teal-700 to-emerald-800 px-7 py-8 shadow-lg">
				{/* Decorative circles */}
				<div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
				<div className="pointer-events-none absolute -bottom-8 right-24 h-32 w-32 rounded-full bg-white/5" />
				<div className="pointer-events-none absolute bottom-4 right-4 h-16 w-16 rounded-full bg-white/5" />

				<div className="relative">
					<p className="text-sm font-medium text-teal-200">{greeting()},</p>
					<h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
						{firstName} 👋
					</h1>
					<p className="mt-2 text-sm text-teal-100 opacity-80">
						{roleLabel} · Zidnee Workspace
					</p>
				</div>
			</div>

			{/* Feature sections */}
			{sections.map((section) => (
				<div key={section.title}>
					{/* Section header */}
					<div className="mb-3 flex items-center gap-3">
						<div
							className={`h-1 w-6 rounded-full bg-linear-to-r ${section.accent}`}
						/>
						<h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">
							{section.title}
						</h2>
					</div>

					{/* Cards grid */}
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{section.items.map((item) => {
							const colors = accentToColors(item.accent);
							const badgeStyles = getBadgeStyles(item.accent);
							return (
								<Link
									key={item.to}
									to={item.to}
									className="group flex items-start gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
								>
									<div
										className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors.bg} transition-transform duration-150 group-hover:scale-110`}
									>
										<span className={colors.text}>{item.icon}</span>
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex items-center justify-between gap-2">
											<p className="text-sm font-semibold text-gray-900 leading-snug truncate">
												{item.label}
											</p>
											{typeof item.count === "number" && item.count > 0 ? (
												<span
													className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeStyles}`}
												>
													{item.count}
												</span>
											) : null}
										</div>
										<p className="mt-0.5 text-xs text-gray-500 leading-snug">
											{item.description}
										</p>
									</div>
								</Link>
							);
						})}
					</div>
				</div>
			))}
		</div>
	);
};
