import { useMemo, useState } from "react";
import { useSession } from "@/lib/session";
import { useDueLeadFollowUpsQuery, useDemoRequestsQuery, useAdmissionLeadsQuery } from "@/features/leads/leads.queries";
import { Panel } from "@/components/dashboard-ui";
import { formatDistanceToNowStrict } from "date-fns";

const timeRanges = [
    { id: '7d', label: 'Last 7 days' },
    { id: '30d', label: 'Last 30 days' },
    { id: '90d', label: 'Last 90 days' },
    { id: 'all', label: 'All time' },
];

export const LeadOverviewPage = () => {
    const { token } = useSession();
    const [scope, setScope] = useState<'mine'|'all'>('mine');
    const [timeRange, setTimeRange] = useState<string>('30d');

    const leadsQuery = useDueLeadFollowUpsQuery(token, { scope, timeFilter: 'all', enabled: Boolean(token) });
    const demoQuery = useDemoRequestsQuery(token);
    const admissionQuery = useAdmissionLeadsQuery(token);

    const totals = useMemo(() => {
        const totalLeads = leadsQuery.data?.pagination?.total ?? (leadsQuery.data?.leads?.length ?? 0);
        const followups = (leadsQuery.data?.leads ?? []).filter((l: any) => l.status === 'FOLLOW_UP').length;
        const formSent = (leadsQuery.data?.leads ?? []).filter((l: any) => l.status === 'FORM_SENT').length;
        const demoRequests = demoQuery.data?.leads?.length ?? 0;
        const admissions = admissionQuery.data?.leads?.length ?? 0;
        return { totalLeads, followups, formSent, demoRequests, admissions };
    }, [leadsQuery.data, demoQuery.data, admissionQuery.data]);

    return (
        <div>
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Lead Overview</h2>
                <div className="flex items-center gap-3">
                    <select value={scope} onChange={(e) => setScope(e.target.value as any)} className="rounded border px-2 py-1">
                        <option value="mine">Mine</option>
                        <option value="all">All</option>
                    </select>
                    <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="rounded border px-2 py-1">
                        {timeRanges.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Panel title="Total Leads">
                    <div className="text-2xl font-bold">{totals.totalLeads}</div>
                    <div className="text-sm text-gray-600">Created {totals.totalLeads > 0 ? ` ${formatDistanceToNowStrict(new Date())}` : ''}</div>
                </Panel>
                <Panel title="Follow-ups">
                    <div className="text-2xl font-bold">{totals.followups}</div>
                    <div className="text-sm text-gray-600">Leads needing follow-up</div>
                </Panel>
                <Panel title="Demo Requests">
                    <div className="text-2xl font-bold">{totals.demoRequests}</div>
                    <div className="text-sm text-gray-600">Pending demo requests</div>
                </Panel>
                <Panel title="Admissions">
                    <div className="text-2xl font-bold">{totals.admissions}</div>
                    <div className="text-sm text-gray-600">Admission leads</div>
                </Panel>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Panel title="Stage Breakdown">
                    <ul className="space-y-2 text-sm text-gray-700">
                        <li>Follow-ups: {totals.followups}</li>
                        <li>Form Sent: {totals.formSent}</li>
                        <li>Demo Requests: {totals.demoRequests}</li>
                        <li>Admissions: {totals.admissions}</li>
                    </ul>
                </Panel>

                <Panel title="Activity Overview">
                    <p className="text-sm text-gray-600">Recent activity summary and charts will appear here.</p>
                </Panel>
            </div>
        </div>
    );
};

export default LeadOverviewPage;
