import { useState } from "react";
import { formatTableDate, getDateLabel } from "@/lib/utils/date";

interface DateCellProps {
	date: Date | string;
}

export const DateCell: React.FC<DateCellProps> = ({ date }) => {
	const [showTooltip, setShowTooltip] = useState(false);
	const displayText = formatTableDate(date);
	const fullDate = getDateLabel(date);

	return (
		<div className="relative inline-block">
			<span
				onMouseEnter={() => setShowTooltip(true)}
				onMouseLeave={() => setShowTooltip(false)}
				className="cursor-help font-semibold text-gray-900"
			>
				{displayText}
			</span>

			{showTooltip && (
				<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs font-semibold rounded whitespace-nowrap z-50">
					{fullDate}
				</div>
			)}
		</div>
	);
};




