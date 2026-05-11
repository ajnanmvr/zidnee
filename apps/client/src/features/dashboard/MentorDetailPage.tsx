import { useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Panel } from "@/components/dashboard-ui";
import { useUsersQuery } from "@/features/users/users.queries";
import { HiPencilSquare, HiArrowLeft } from "react-icons/hi2";

export const MentorDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = { token: "" } as any; // session used internally by hook; callers set correct token via provider
  const usersQuery = useUsersQuery(token);
  const user = useMemo(() => usersQuery.data?.users.find((u) => u.id === id), [usersQuery.data, id]);

  if (!user) return <div className="p-6">Mentor not found</div>;

  return (
    <Panel title={user.name} description={`Mentor ${user.zids?.mentor ?? user.mentorId ?? user.username}`}>
      <div className="grid gap-4">
        <div>
          <p className="text-sm text-gray-600">ID</p>
          <p className="text-lg font-semibold">{user.zids?.mentor ?? user.mentorId ?? user.username}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Email</p>
          <p className="text-lg">{user.email ?? "-"}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(-1)} className="rounded-2xl border px-4 py-2"> <HiArrowLeft className="inline mr-2"/> Back</button>
          <Link to={`/users/${user.id}/edit`} className="rounded-2xl bg-emerald-600 px-4 py-2 text-white"> <HiPencilSquare className="inline mr-2"/> Edit</Link>
        </div>
      </div>
    </Panel>
  );
};
