import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DataTable } from "@/components/DataTable";
import { useSession } from "@/lib/session";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useHasPermission } from "@/lib/hooks/use-has-permission";

export const ConvertedLeadsPage = () => {
    const { token } = useSession();

    const canReadAllStudents = useHasPermission("STUDENT_READ_ALL");
    const [scope, setScope] = useState<"mine" | "all">("mine");
    const studentsQuery = useStudentsQuery(token, { page: 1, limit: 50, scope });
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
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Converted Leads (Students)</h2>
                {canReadAllStudents ? (
                    <div className="inline-flex rounded-md shadow-sm" role="group">
                        <button type="button" onClick={() => setScope("mine")} className={`px-3 py-1.5 text-sm font-semibold ${scope === "mine" ? "bg-gray-900 text-white" : "bg-white text-gray-700"} border border-gray-200`}>Mine</button>
                        <button type="button" onClick={() => setScope("all")} className={`px-3 py-1.5 text-sm font-semibold ${scope === "all" ? "bg-gray-900 text-white" : "bg-white text-gray-700"} border border-gray-200`}>All</button>
                    </div>
                ) : null}
            </div>
            <div className="mt-4">
                <DataTable columns={columns as any} data={rows} searchPlaceholder="Search converted leads..." />
            </div>
        </div>
    );
};

export default ConvertedLeadsPage;
