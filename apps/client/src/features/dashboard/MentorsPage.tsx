import { useMemo } from "react";
import { Link } from "react-router-dom";
import { HiUsers } from "react-icons/hi2";
import { Panel } from "@/components/dashboard-ui";
import { useBatchesQuery } from "@/features/batches/batches.queries";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useSession } from "@/lib/session";

const formatUserName = (name?: string | null, username?: string | null) =>
name?.trim() || username?.trim() || "-";

export const MentorsPage = () => {
const { token } = useSession();
const usersQuery = useUsersQuery(token);
const studentsQuery = useStudentsQuery(token);
const batchesQuery = useBatchesQuery(token);

const mentors = useMemo(() => {
const allUsers = usersQuery.data?.users ?? [];
const allStudents = studentsQuery.data?.students ?? [];
const allBatches = batchesQuery.data?.batches ?? [];

return allUsers
.filter((user) => user.roles.some((role) => role.type === "mentor"))
.map((mentor) => {
const counsellor = allUsers.find(
(user) => user.id === mentor.counsellorId,
);
const mentorStudents = allStudents.filter(
(student) => student.mentorId === mentor.id,
);
const individualStudents = mentorStudents.filter(
(student) => student.batchId == null,
).length;
const groupStudents = mentorStudents.filter(
(student) => student.batchId != null,
).length;
const groupCount = allBatches.filter(
(batch) => batch.type === "GROUP" && batch.mentorId === mentor.id,
).length;

return {
mentor,
counsellor,
individualStudents,
groupStudents,
groupCount,
};
});
}, [batchesQuery.data?.batches, studentsQuery.data?.students, usersQuery.data?.users]);

return (
<div className="grid gap-6">
<div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white/90 p-6 shadow-sm md:flex-row md:items-end md:justify-between">
<div>
<p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
Mentor directory
</p>
<h2 className="mt-2 text-2xl font-semibold text-gray-900">Mentors</h2>
<p className="mt-2 max-w-2xl text-sm text-gray-600">
A complete list of mentor accounts, their mentor IDs, and the
counsellor assigned to each mentor.
</p>
</div>
<div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right">
<p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
Mentors
</p>
<p className="text-2xl font-bold text-emerald-900">{mentors.length}</p>
</div>
</div>

<Panel title="Mentors" description="Mentor ID, assigned counsellor, and student counts">
{mentors.length === 0 ? (
<div className="rounded-3xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-600">
No mentor accounts found.
</div>
) : (
<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
<table className="w-full table-fixed">
<thead className="bg-gray-50">
<tr>
<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Mentor ID</th>
<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Name</th>
<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Counsellor</th>
<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Individual</th>
<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Group</th>
<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Groups</th>
<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Actions</th>
</tr>
</thead>
<tbody className="divide-y divide-gray-100">
{mentors.map(({ mentor, counsellor, individualStudents, groupStudents, groupCount }) => (
<tr key={mentor.id} className="odd:bg-white even:bg-gray-50">
<td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{mentor.mentorId ?? "-"}</td>
<td className="px-4 py-3">
<div className="text-sm font-medium text-gray-900">{formatUserName(mentor.name, mentor.username)}</div>
<div className="mt-1 text-xs text-gray-500">{mentor.username ?? "-"} · {mentor.email ?? "-"}</div>
</td>
<td className="px-4 py-3 text-sm text-gray-700">
{counsellor ? (
<div className="font-medium text-gray-900">{formatUserName(counsellor.name, counsellor.username)}</div>
) : (
<Link
to={`/users/${mentor.id}/edit`}
className="inline-flex rounded-2xl border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-100"
>
Assign counsellor
</Link>
)}
</td>
<td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">{individualStudents}</td>
<td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">{groupStudents}</td>
<td className="whitespace-nowrap px-4 py-3 text-right text-sm text-emerald-800 font-semibold">{groupCount}</td>
<td className="px-4 py-3 text-sm">
<Link to={`/mentors/${mentor.id}`} className="text-emerald-700 hover:underline mr-3">Details</Link>
<Link to={`/users/${mentor.id}/edit`} className="text-emerald-700 hover:underline">Edit</Link>
</td>
</tr>
))}
</tbody>
</table>
</div>
)}
</Panel>

<div className="rounded-3xl border border-dashed border-gray-300 bg-white px-5 py-4 text-sm text-gray-600">
<div className="flex items-center gap-2 font-medium text-gray-900">
<HiUsers className="h-4 w-4 text-emerald-700" aria-hidden="true" />
Mentor ownership
</div>
<p className="mt-2">
Mentors are linked to counsellors through the user account&apos;s
<cite>counsellorId</cite> field.
</p>
</div>
</div>
);
};

export default MentorsPage;
