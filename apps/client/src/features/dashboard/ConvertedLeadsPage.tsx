import { useMemo } from "react";
import { Link } from "react-router-dom";
import { DataTable } from "@/components/DataTable";
import { useSession } from "@/lib/session";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useUsersQuery } from "@/features/users/users.queries";

export const ConvertedLeadsPage = () => {
    const { token } = useSession();

    const studentsQuery = useStudentsQuery(token, { page: 1, limit: 50 });
    const usersQuery = useUsersQuery(token, Boolean(token));

    const userNameById = useMemo(() => {
        const users = usersQuery.data?.users ?? [];
        return new Map(users.map((u: any) => [u.id, u.name || u.username]));
    }, [usersQuery.data]);

    const rows = useMemo(() => {
        return (studentsQuery.data?.students ?? []).map((s: any) => ({
            id: s.id,
            zid: s.zid,
            name: s.name,
            phone: s.phone,
            admittedAt: s.admittedAt,
            admittedBy: s.admittedBy,
            leadId: s.leadId,
        }));
    }, [studentsQuery.data]);

    const columns = [
        {
            header: "ZID",
            accessorKey: "zid",
            cell: (ctx: any) => (
                <Link to={`/students/${ctx.row.original.id}`} className="text-blue-600 hover:underline">{ctx.getValue()}</Link>
            ),
        },
        { header: "Name", accessorKey: "name" },
        { header: "Phone", accessorKey: "phone" },
        {
            header: "Converted At",
            accessorKey: "admittedAt",
        },
        {
            header: "Converted By",
            accessorKey: "admittedBy",
            cell: (ctx: any) => <span>{userNameById.get(ctx.getValue() as string) ?? "-"}</span>,
        },
        {
            header: "Lead",
            accessorKey: "leadId",
            cell: (ctx: any) => (
                <Link to={`/leads/${ctx.getValue()}`} className="text-blue-600 hover:underline">Open Lead</Link>
            ),
        },
    ];

    return (
        <div>
            <h2 className="text-lg font-semibold">Converted Leads (Students)</h2>
            <div className="mt-4">
                <DataTable columns={columns as any} data={rows} searchPlaceholder="Search converted leads..." />
            </div>
        </div>
    );
};

export default ConvertedLeadsPage;
