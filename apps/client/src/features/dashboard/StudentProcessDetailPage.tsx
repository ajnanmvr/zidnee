import { Link, useParams } from "react-router-dom";
import { HiCheckCircle } from "react-icons/hi2";
import { Panel } from "@/components/dashboard-ui";
import { useStudentProcessQuery } from "@/features/students/students.queries";
import { useSession } from "@/lib/session";

export const StudentProcessDetailPage = () => {
    const { token } = useSession();
    const { processId } = useParams<{ processId: string }>();
    const q = useStudentProcessQuery(token, processId);

    if (q.isLoading) return <div className="py-10 text-center">Loading process...</div>;
    if (q.isError) {
        const err = q.error as any;
        return (
            <div className="py-10 text-center">
                <div>Unable to load process.</div>
                <div className="mt-2 text-xs text-rose-600">{err?.message ?? JSON.stringify(err)}</div>
                <div className="mt-3">
                    <button
                        onClick={() => q.refetch()}
                        className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1 text-sm font-semibold text-white"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }
    const process = (q.data as any)?.process;
    if (!process) return <div className="py-10 text-center">Process not found.</div>;

    const completedCount = process.tasks.filter((t: any) => t.completed).length;
    const progress = process.tasks.length ? Math.round((completedCount / process.tasks.length) * 100) : 0;

    return (
        <div className="grid gap-6">
            <Panel title={process.label} description={`Process for ${process.student.zid} — ${process.student.name ?? "Unnamed"}`}>
                <div className="mb-4">
                    <p className="text-sm">Student: <Link to={`/students/${process.student.id}`} className="text-emerald-600 font-semibold">{process.student.zid} · {process.student.name ?? process.student.phone}</Link></p>
                    <p className="text-sm">Status: <span className="font-semibold">{process.status}</span></p>
                </div>

                <div className="mb-4">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <span>Progress</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
                    </div>
                </div>

                <div className="grid gap-2">
                    {process.tasks.map((task: any) => (
                        <div key={task.key} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                            <div>
                                <p className="text-sm font-semibold text-slate-900">{task.label}</p>
                                <p className="mt-0.5 text-xs text-slate-500">{task.completedAt ? `Completed ${new Date(task.completedAt).toLocaleDateString()}` : "Pending"}</p>
                            </div>
                            <span className={task.completed ? "inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700" : "inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700"}>
                                {task.completed ? <HiCheckCircle className="h-4 w-4 mr-1" /> : null}
                                {task.completed ? "Done" : "Open"}
                            </span>
                        </div>
                    ))}
                </div>
            </Panel>
        </div>
    );
};

export default StudentProcessDetailPage;
