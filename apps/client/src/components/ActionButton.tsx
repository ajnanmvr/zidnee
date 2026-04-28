import { useState } from "react";

interface ActionButtonProps {
	icon: React.ReactNode;
	label?: string;
	tooltip?: string;
	onClick: () => void;
	disabled?: boolean;
	isLoading?: boolean;
	color?: "sky" | "red" | "green" | "orange";
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
		sky: "text-sky border-sky/30 hover:bg-sky/10",
		red: "text-red border-red/30 hover:bg-red/10",
		green: "text-green border-green/30 hover:bg-green/10",
		orange: "text-orange border-orange/30 hover:bg-orange/10",
	};

	return (
		<div className="relative inline-flex">
			<button
				type="button"
				className={`relative inline-flex items-center justify-center h-8 w-8 rounded-full border ${colorMap[color]} transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
				onClick={onClick}
				disabled={disabled || isLoading}
				onMouseEnter={() => setShowTooltip(true)}
				onMouseLeave={() => setShowTooltip(false)}
			>
				{icon}
			</button>

			{showTooltip && (
				<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-ink text-surface text-xs font-semibold rounded whitespace-nowrap z-50">
					{isLoading ? loadingLabel : tooltip ?? label}
				</div>
			)}
		</div>
	);
};
