import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DataTable } from "@/components/DataTable";
import { Panel } from "@/components/dashboard-ui";
import { DateCell } from "@/components/DateCell";
import { useSession } from "@/lib/session";
import { useMeQuery } from "@/features/auth/auth.queries";
import { useDueLeadFollowUpsQuery } from "@/features/leads/leads.queries";
import { useHasPermission } from "@/lib/hooks/use-has-permission";
import type { LeadResponse } from "@repo/schema";

const columns = [
  {
    accessorKey: "slNo",
    header: "SL No",
    cell: (info: any) => (info.getValue() ? `#${info.getValue()}` : "-"),
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: (info: any) => (
      <Link to={`/leads/${info.row.original.id}`} className="text-blue-600">{String(info.getValue())}</Link>
    ),
  },
  { accessorKey: "name", header: "Name", cell: (info: any) => (info.getValue() ?? "-") },
  { accessorKey: "closeReason", header: "Close Reason", cell: (info: any) => (info.getValue() ?? "-") },
  { accessorKey: "deletedBy", header: "Deleted By", cell: (info: any) => (info.getValue() ?? "-") },
  { accessorKey: "deletedAt", header: "Deleted At", cell: (info: any) => <DateCell date={String(info.getValue() ?? "")} /> },
  {
    id: "actions",
    header: "",
    cell: (info: any) => (
      <Link to={`/leads/${info.row.original.id}`} className="inline-flex items-center rounded-2xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700">View</Link>
    ),
  },
];

export const ClosedLeadsPage = () => {
  const { token } = useSession();
  const meQuery = useMeQuery(token);
  const canReadAll = useHasPermission("LEAD_READ_ALL");
  const [scope, setScope] = useState<"mine" | "all">(canReadAll ? "all" : "mine");

  const leadsQuery = useDueLeadFollowUpsQuery(token, {
    scope,
    timeFilter: "all",
    status: "CLOSED",
    page: 1,
    limit: 100,
    enabled: true,
  });

  const data = useMemo(() => leadsQuery.data?.leads ?? [], [leadsQuery.data]);

  return (
    <Panel title="Closed Leads" className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-slate-600">Showing closed leads with deletion reason and who deleted.</div>
        {canReadAll ? (
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => setScope("mine")}
              className={`px-3 py-1.5 text-sm font-semibold ${scope === "mine" ? "bg-gray-900 text-white" : "bg-white text-gray-700"} border border-gray-200`}
            >
              Mine
            </button>
            <button
              type="button"
              onClick={() => setScope("all")}
              className={`px-3 py-1.5 text-sm font-semibold ${scope === "all" ? "bg-gray-900 text-white" : "bg-white text-gray-700"} border border-gray-200`}
            >
              All
            </button>
          </div>
        ) : null}
      </div>
      <DataTable columns={columns} data={data as LeadResponse[]} />
    </Panel>
  );
};

export default ClosedLeadsPage;
