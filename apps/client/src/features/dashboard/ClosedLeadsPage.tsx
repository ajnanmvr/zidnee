import { useMemo } from "react";
import { Link } from "react-router-dom";
import { DataTable } from "@/components/DataTable";
import { useSession } from "@/lib/session";
import { useDueLeadFollowUpsQuery } from "@/features/leads/leads.queries";

export const ClosedLeadsPage = () => {
    const { token } = useSession();

    const leadsQuery = useDueLeadFollowUpsQuery(token, { scope: "all", status: "CLOSED" });

    const rows = useMemo(() => {
        return (leadsQuery.data?.leads ?? []).map((l: any) => ({
            id: l.id,
            name: l.name,
            phone: l.phone,
            deletedAt: l.updatedAt ?? l.createdAt,
        }));
    }, [leadsQuery.data]);

    const columns = [
        {
            header: "Name",
            accessorKey: "name",
            cell: (ctx: any) => (
                <Link to={`/leads/${ctx.row.original.id}`} className="text-blue-600 hover:underline">
                    {ctx.getValue()}
                </Link>
            ),
        },
        {
            header: "Phone",
            accessorKey: "phone",
        },
        {
            header: "Deleted At",
            accessorKey: "deletedAt",
        },
        {
            header: "Actions",
            accessorKey: "id",
            cell: (ctx: any) => (
                <Link to={`/leads/${ctx.getValue()}`} className="text-sm text-gray-700 hover:underline">View</Link>
            ),
        },
    ];

    return (
        <div>
            <h2 className="text-lg font-semibold">Closed Leads</h2>
            <div className="mt-4">
                <DataTable columns={columns as any} data={rows} searchPlaceholder="Search closed leads..." />
            </div>
        </div>
    );
};

export default ClosedLeadsPage;
