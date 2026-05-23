import { useMemo } from "react";
import { Link } from "react-router-dom";
import { HiUsers, HiUserPlus } from "react-icons/hi2";
import { Panel } from "@/components/dashboard-ui";
import { useBatchesQuery } from "@/features/batches/batches.queries";
import { useGetAllSubstitutions } from "@/features/mentors/mentor-substitution.queries";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useSession } from "@/lib/session";

const formatUserName = (name?: string | null, username?: string | null) =>
name?.trim() || username?.trim() || "-";

const getMentorDisplayId = (mentor: {
mentorId?: string | null;
zids?: Record<string, string>;
}) => mentor.mentorId ?? mentor.zids?.mentor ?? "-";

const getMentorSubstitutionSummary = (
mentorId: string,
allSubstitutions: Array<{
originalMentorId: string;
substituteMentorId: string;
startDate: string | Date;
endDate: string | Date;
}>,
allUsers: Array<{
id: string;
name?: string | null;
username?: string | null;
}>,
) => {
const related = allSubstitutions
.filter(
(substitution) =>
substitution.originalMentorId === mentorId ||
substitution.substituteMentorId === mentorId,
)
.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

if (related.length === 0) {
return {
label: "None",
detail: "No substitution assigned",
tone: "bg-gray-100 text-gray-700",
};
}

const current = related[0];

if (!current) {
return {
label: "None",
detail: "No substitution assigned",
tone: "bg-gray-100 text-gray-700",
};
}

const isOriginal = current.originalMentorId === mentorId;
const counterpartId = isOriginal ? current.substituteMentorId : current.originalMentorId;
const counterpart = allUsers.find((user) => user.id === counterpartId);

return {
label: isOriginal ? "Original" : "Substitute",
detail: `${counterpart ? formatUserName(counterpart.name, counterpart.username) : "Unknown mentor"} · ${new Date(current.startDate).toLocaleDateString()} to ${new Date(current.endDate).toLocaleDateString()}`,
tone: isOriginal
? "bg-emerald-100 text-emerald-800"
: "bg-blue-100 text-blue-800",
};
};

export const MentorsPage = () => {
const { token } = useSession();
const usersQuery = useUsersQuery(token);
const studentsQuery = useStudentsQuery(token);
const batchesQuery = useBatchesQuery(token);
const { data: substitutions = [] } = useGetAllSubstitutions(token);

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
const substitutionSummary = getMentorSubstitutionSummary(
mentor.id,
substitutions,
allUsers,
);

return {
mentor,
counsellor,
individualStudents,
groupStudents,
groupCount,
substitutionSummary,
};
});
}, [batchesQuery.data?.batches, studentsQuery.data?.students, substitutions, usersQuery.data?.users]);

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
<div className="flex flex-col items-end gap-3">
<Link
to="/mentors/create"
className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600"
>
<HiUserPlus className="h-4 w-4" />
Add mentor
</Link>
<div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right">
<p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Mentors</p>
<p className="text-2xl font-bold text-emerald-900">{mentors.length}</p>
</div>
</div>
</div>

<Panel
title="Mentors"
description="Mentor ID, assigned counsellor, and student counts"
action={
<Link
to="/mentors/create"
className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-100"
>
Add mentor
</Link>
}
>
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
{mentors.map(({ mentor, counsellor, individualStudents, groupStudents, groupCount, substitutionSummary }) => (
<tr key={mentor.id} className="odd:bg-white even:bg-gray-50">
<td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{getMentorDisplayId(mentor)}</td>
	<td className="px-4 py-3">
	<div className="text-sm font-medium text-gray-900">{formatUserName(mentor.name, mentor.username)}</div>
	<div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${substitutionSummary.tone}`}>
	{substitutionSummary.label}
	</div>
	<div className="mt-1 text-xs text-gray-500">{substitutionSummary.detail}</div>
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
