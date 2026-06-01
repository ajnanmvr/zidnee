import { useMemo, useState } from "react";
import { Panel } from "@/components/dashboard-ui";
import { useDueLeadFollowUpsQuery } from "@/features/leads/leads.queries";
import { useSession } from "@/lib/session";

type TimeScope = "currentMonth" | "previousMonth" | "custom" | "all";

type PeriodRange = {
    start: Date;
    end: Date;
    label: string;
};

type LeadMetricCard = {
    title: string;
    value: string;
    subtitle: string;
    comparison: string;
    accent: string;
};

const getMonthName = (monthIndex: number) =>
    new Date(2000, monthIndex, 1).toLocaleString("en-US", { month: "long" });

const toDate = (value?: string | null) => {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const monthRange = (year: number, month: number): PeriodRange => {
    const start = new Date(year, month, 1, 0, 0, 0, 0);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return {
        start,
        end,
        label: `${getMonthName(month)} ${year}`,
    };
};

const previousMonthRange = (range: PeriodRange): PeriodRange => {
    const month = range.start.getMonth();
    const year = range.start.getFullYear();
    return monthRange(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1);
};

const isWithinRange = (value: string | null | undefined, range: PeriodRange) => {
    const date = toDate(value);
    if (!date) {
        return false;
    }

    return date >= range.start && date <= range.end;
};

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const formatPointChange = (current: number, previous: number) => {
    const change = current - previous;
    const sign = change > 0 ? "+" : "";
    return `${sign}${change.toFixed(1)} pts vs previous period`;
};

const formatGrowthRate = (current: number, previous: number) => {
    if (previous === 0) {
        return current === 0 ? "0.0% growth" : "New activity";
    }

    const growth = ((current - previous) / previous) * 100;
    const sign = growth > 0 ? "+" : "";
    return `${sign}${growth.toFixed(1)}% growth`;
};

const formatChange = (current: number, previous: number) => {
    if (previous === 0) {
        if (current === 0) {
            return "No change from previous period";
        }
        return "New activity vs previous period";
    }

    const change = ((current - previous) / previous) * 100;
    const sign = change > 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}% vs previous period`;
};

export const LeadOverviewPage = () => {
    const { token } = useSession();
    const [scope, setScope] = useState<"mine" | "all">("mine");
    const [timeScope, setTimeScope] = useState<TimeScope>("currentMonth");
    const now = useMemo(() => new Date(), []);
    const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

    const leadsQuery = useDueLeadFollowUpsQuery(token, {
        scope,
        timeFilter: "all",
        limit: 1000,
        sortBy: "createdAt",
        sortOrder: "desc",
        enabled: Boolean(token),
    });

    const leads = leadsQuery.data?.leads ?? [];

    const availableYears = useMemo(() => {
        const years = new Set<number>();
        for (const lead of leads) {
            const createdAt = toDate(lead.createdAt);
            if (createdAt) {
                years.add(createdAt.getFullYear());
            }
        }
        years.add(now.getFullYear());
        return Array.from(years).sort((left, right) => right - left);
    }, [leads, now]);

    const selectedRange = useMemo<PeriodRange | null>(() => {
        if (timeScope === "all") {
            return null;
        }

        if (timeScope === "previousMonth") {
            return previousMonthRange(monthRange(now.getFullYear(), now.getMonth()));
        }

        if (timeScope === "currentMonth") {
            return monthRange(now.getFullYear(), now.getMonth());
        }

        return monthRange(selectedYear, selectedMonth);
    }, [now, selectedMonth, selectedYear, timeScope]);

    const previousRange = useMemo(() => {
        if (!selectedRange) {
            return null;
        }

        return previousMonthRange(selectedRange);
    }, [selectedRange]);

    const selectedCounts = useMemo(() => {
        const counters = { created: 0, converted: 0, deleted: 0, inProgress: 0 };
        const currentSelection = selectedRange;
        const currentPrevious = previousRange;

        for (const lead of leads) {
            const createdAt = toDate(lead.createdAt);
            if (!createdAt) {
                continue;
            }

            const isSelected = currentSelection
                ? createdAt >= currentSelection.start && createdAt <= currentSelection.end
                : true;
            if (!isSelected) {
                continue;
            }

            counters.created += 1;
            if (lead.status === "CONVERTED") {
                counters.converted += 1;
            } else if (lead.status === "CLOSED") {
                counters.deleted += 1;
            } else {
                counters.inProgress += 1;
            }
        }

        const conversionRate = counters.created > 0 ? (counters.converted / counters.created) * 100 : 0;
        return { ...counters, conversionRate, previousRange: currentPrevious };
    }, [leads, previousRange, selectedRange]);

    const previousCounts = useMemo(() => {
        const counters = { created: 0, converted: 0, deleted: 0, inProgress: 0 };
        const range = selectedCounts.previousRange;

        if (!range) {
            return { ...counters, conversionRate: 0 };
        }

        for (const lead of leads) {
            const createdAt = toDate(lead.createdAt);
            if (!createdAt) {
                continue;
            }

            if (createdAt < range.start || createdAt > range.end) {
                continue;
            }

            counters.created += 1;
            if (lead.status === "CONVERTED") {
                counters.converted += 1;
            } else if (lead.status === "CLOSED") {
                counters.deleted += 1;
            } else {
                counters.inProgress += 1;
            }
        }

        const conversionRate = counters.created > 0 ? (counters.converted / counters.created) * 100 : 0;
        return { ...counters, conversionRate };
    }, [leads, selectedCounts.previousRange]);

    const currentLabel = selectedRange?.label ?? "All time";
    const comparisonLabel = previousRange?.label ?? "previous period";

    const cards: LeadMetricCard[] = [
        {
            title: "Leads Created",
            value: String(selectedCounts.created),
            subtitle: `Created in ${currentLabel}`,
            comparison: formatChange(selectedCounts.created, previousCounts.created),
            accent: "text-teal-700",
        },
        {
            title: "Converted",
            value: String(selectedCounts.converted),
            subtitle: `Converted in ${currentLabel}`,
            comparison: formatChange(selectedCounts.converted, previousCounts.converted),
            accent: "text-emerald-700",
        },
        {
            title: "Deleted",
            value: String(selectedCounts.deleted),
            subtitle: `Closed in ${currentLabel}`,
            comparison: formatChange(selectedCounts.deleted, previousCounts.deleted),
            accent: "text-rose-700",
        },
        {
            title: "In Progress",
            value: String(selectedCounts.inProgress),
            subtitle: `Created, not converted or deleted`,
            comparison: formatChange(selectedCounts.inProgress, previousCounts.inProgress),
            accent: "text-violet-700",
        },
        {
            title: "Conversion Rate",
            value: formatPercent(selectedCounts.conversionRate),
            subtitle: `Converted / created in ${currentLabel}`,
            comparison: formatPointChange(selectedCounts.conversionRate, previousCounts.conversionRate),
            accent: "text-blue-700",
        },
        {
            title: "Lead Coming Rate",
            value: formatGrowthRate(selectedCounts.created, previousCounts.created),
            subtitle: `New lead growth in ${currentLabel}`,
            comparison: `Created: ${selectedCounts.created} | Previous: ${previousCounts.created}`,
            accent: "text-amber-700",
        },
    ];

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold">Lead Report</h2>
                    <p className="text-sm text-gray-600">
                        {selectedRange ? `Showing ${selectedRange.label}` : "Showing all time"}
                        {previousRange ? ` vs ${comparisonLabel}` : ""}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={scope}
                        onChange={(e) => setScope(e.target.value as "mine" | "all")}
                        className="rounded border px-2 py-1"
                    >
                        <option value="mine">Mine</option>
                        <option value="all">All</option>
                    </select>
                    <select
                        value={timeScope}
                        onChange={(e) => setTimeScope(e.target.value as TimeScope)}
                        className="rounded border px-2 py-1"
                    >
                        <option value="currentMonth">Current Month</option>
                        <option value="previousMonth">Previous Month</option>
                        <option value="custom">Select Month</option>
                        <option value="all">All Time</option>
                    </select>
                    {timeScope === "custom" ? (
                        <>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="rounded border px-2 py-1"
                            >
                                {Array.from({ length: 12 }, (_, monthIndex) => (
                                    <option key={monthIndex} value={monthIndex}>
                                        {getMonthName(monthIndex)}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="rounded border px-2 py-1"
                            >
                                {availableYears.map((year) => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                        </>
                    ) : null}
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {cards.map((card) => (
                    <Panel key={card.title} title={card.title}>
                        <div className={`text-2xl font-bold ${card.accent}`}>{card.value}</div>
                        <div className="mt-1 text-sm text-gray-600">{card.subtitle}</div>
                        <div className="mt-2 text-xs font-medium text-gray-500">{card.comparison}</div>
                    </Panel>
                ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Panel title="Period Breakdown">
                    <ul className="space-y-2 text-sm text-gray-700">
                        <li>Created: {selectedCounts.created}</li>
                        <li>Previous Created: {previousCounts.created}</li>
                        <li>Converted: {selectedCounts.converted}</li>
                        <li>Deleted: {selectedCounts.deleted}</li>
                        <li>In Progress: {selectedCounts.inProgress}</li>
                    </ul>
                </Panel>

                <Panel title="Rate Comparison">
                    <ul className="space-y-2 text-sm text-gray-700">
                        <li>Conversion Rate: {formatPercent(selectedCounts.conversionRate)}</li>
                        <li>Previous Conversion Rate: {formatPercent(previousCounts.conversionRate)}</li>
                        <li>Lead Coming Rate: {formatChange(selectedCounts.created, previousCounts.created)}</li>
                        <li>Comparison Window: {comparisonLabel}</li>
                    </ul>
                </Panel>
            </div>
        </div>
    );
};

export default LeadOverviewPage;
