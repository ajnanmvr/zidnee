import { useState } from "react";

interface ActionButtonProps {
	icon: React.ReactNode;
	label?: string;
	tooltip?: string;
	onClick: () => void;
	disabled?: boolean;
	isLoading?: boolean;
	color?: "sky" | "red" | "green" | "orange" | "purple";
	loadingLabel?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
	icon,
	label,
	tooltip,
	onClick,
	disabled = false,
	isLoading = false,
	color = "sky",
	loadingLabel = "Loading...",
}) => {
	const [showTooltip, setShowTooltip] = useState(false);

	const colorMap = {
		sky: "text-cyan-700 border-cyan-300 hover:bg-cyan-50",
		red: "text-rose-700 border-rose-300 hover:bg-rose-50",
		green: "text-emerald-700 border-emerald-300 hover:bg-emerald-50",
		orange: "text-amber-700 border-amber-300 hover:bg-amber-50",
		purple: "text-violet-700 border-violet-300 hover:bg-violet-50",
	};
	const tooltipText = isLoading ? loadingLabel : (tooltip ?? label ?? "Action");

	return (
		<div className="relative inline-flex">
			<button
				type="button"
				className={`relative inline-flex items-center justify-center h-8 w-8 rounded-full border ${colorMap[color]} transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
				onClick={onClick}
				disabled={disabled || isLoading}
				onMouseEnter={() => setShowTooltip(true)}
				onMouseLeave={() => setShowTooltip(false)}
				title={tooltipText}
				aria-label={tooltipText}
			>
				{icon}
			</button>

			{showTooltip && (
				<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs font-semibold rounded whitespace-nowrap z-50">
					{tooltipText}
				</div>
			)}
		</div>
	);
};
