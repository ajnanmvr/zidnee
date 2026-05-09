import { formatRelativeDateTime, getDateLabel } from "@/lib/utils/date";

interface DateCellProps {
	date: Date | string;
	className?: string;
}

export const DateCell: React.FC<DateCellProps> = ({ date, className }) => {
	const displayText = formatRelativeDateTime(date);
	const fullDate = getDateLabel(date);
	const resolvedClassName = className ?? "font-semibold text-gray-900";

	return (
		<span className={`cursor-help inline-block ${resolvedClassName}`} title={fullDate} aria-label={fullDate}>
				{displayText}
		</span>
	);
};




