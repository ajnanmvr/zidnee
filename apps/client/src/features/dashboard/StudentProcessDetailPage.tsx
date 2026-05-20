import { useState } from "react";
import { useMarkTaskCompletedMutation, useSetTaskCompletedMutation } from "@/features/students/students.queries";
import { Link, useParams } from "react-router-dom";
import { Panel } from "@/components/dashboard-ui";
import { generateFormLink } from "@/features/leads/leads.service";
import { useStudentProcessQuery } from "@/features/students/students.queries";
import { useSession } from "@/lib/session";

const normalizeWhatsAppNumber = (phone?: string | null) =>
    phone?.replace(/\D/g, "") ?? "";

const getPrimaryWhatsAppNumber = (student: {
    primaryWhatsappNumber?: string | null;
    phone?: string | null;
}) => student.primaryWhatsappNumber ?? student.phone ?? null;

export const StudentProcessDetailPage = () => {
    const { token } = useSession();
    const { processId } = useParams<{ processId: string }>();
    const q = useStudentProcessQuery(token, processId);
    const [loadingTaskKey, setLoadingTaskKey] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState<string | null>(null);
    const [modalPhone, setModalPhone] = useState<string | null>(null);
    const [modalTaskKey, setModalTaskKey] = useState<string | null>(null);
    const markTaskMutation = useMarkTaskCompletedMutation();
    const setTaskMutation = useSetTaskCompletedMutation();

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

    const openWhatsApp = (phone?: string | null, message?: string) => {
        const targetNumber = normalizeWhatsAppNumber(phone);
        if (!targetNumber || !message) {
            return;
        }
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${targetNumber}?text=${encodedMessage}`, "_blank");
    };

    const openComposeModal = (phone?: string | null, message?: string, taskKey?: string) => {
        setModalPhone(phone ?? null);
        setModalMessage(message ?? "");
        setModalTaskKey(taskKey ?? null);
        setShowModal(true);
    };

    // welcome task handled inline in the task list; no separate panel needed

    const handleTaskAction = async (task: any) => {
        if (!token || !process?.student?.leadId) {
            return;
        }

                if (task.actionType === "FORM_LINK") {
            // prepare form link then open compose modal so user can edit before sending
            setLoadingTaskKey(task.key);
            try {
                const result = await generateFormLink(token, process.student.leadId);
                openComposeModal(
                    getPrimaryWhatsAppNumber(process.student),
                    `${task.whatsappMessage ?? "Please complete the form below."}\n${result.formLink}`,
                    task.key,
                );
            } finally {
                setLoadingTaskKey(null);
            }
            return;
        }

        // For plain whatsapp messages open compose modal so the message can be edited
        openComposeModal(
            getPrimaryWhatsAppNumber(process.student),
            task.whatsappMessage,
            task.key,
        );
    };

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

                <div className="grid gap-3">
                    {process.tasks.map((task: any) => (
                        <div
                            key={task.key}
                            className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/40"
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    // toggle completion
                                    if (loadingTaskKey) return;
                                    void setTaskMutation.mutateAsync({ processId: process.id, taskKey: task.key, completed: !task.completed });
                                }}
                                disabled={Boolean(setTaskMutation.isPending)}
                                className={
                                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition " +
                                    (task.completed
                                        ? "border-emerald-600 bg-emerald-600 text-white"
                                        : task.whatsappMessage
                                            ? "border-amber-400 bg-amber-50 text-amber-700 hover:border-emerald-500 hover:bg-emerald-100"
                                            : "border-slate-300 bg-slate-100 text-slate-400")
                                }
                            >
                                {task.completed ? "✓" : ""}
                            </button>

                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    {task.whatsappMessage ? (
                                        <button
                                            type="button"
                                            onClick={() => void handleTaskAction(task)}
                                            className="text-left"
                                        >
                                            <p className="text-sm font-semibold text-slate-900 underline decoration-transparent transition hover:decoration-current">
                                                {task.label}
                                            </p>
                                        </button>
                                    ) : (
                                        <p className="text-sm font-semibold text-slate-900">{task.label}</p>
                                    )}

                                    <span
                                        className={
                                            "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] " +
                                            (task.completed
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-amber-100 text-amber-700")
                                        }
                                    >
                                        {task.completed ? "Done" : "Pending"}
                                    </span>
                                </div>

                                <p className="mt-1 text-xs text-slate-500">
                                    {task.completedAt ? `Completed ${new Date(task.completedAt).toLocaleDateString()}` : "Not completed yet"}
                                </p>

                                {task.whatsappMessage ? (
                                    <p className="mt-1 text-xs text-slate-500">
                                        WhatsApp automation for the student&apos;s primary number.
                                    </p>
                                ) : null}
                            </div>

                            <div className="flex shrink-0 flex-col items-end gap-2">
                                <button
                                    type="button"
                                    onClick={task.whatsappMessage ? () => void handleTaskAction(task) : undefined}
                                    disabled={!task.whatsappMessage}
                                    className={
                                        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold transition " +
                                        (task.completed
                                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                            : "bg-slate-900 text-white hover:bg-slate-800") +
                                        (task.whatsappMessage ? " focus:outline-none focus:ring-2 focus:ring-emerald-400" : " opacity-60")
                                    }
                                >
                                    {task.completed ? "Completed" : "Open"}
                                </button>
                                {task.whatsappMessage ? (
                                    <button
                                        onClick={() => void handleTaskAction(task)}
                                        disabled={loadingTaskKey === task.key}
                                        className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {loadingTaskKey === task.key ? "Preparing..." : "Send on WhatsApp"}
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Removed duplicate welcome panel — task row contains action buttons */}
            </Panel>

            {showModal ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
                    <div className="relative z-10 w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
                        <h3 className="text-lg font-semibold text-slate-900">Send welcome message</h3>
                        <p className="mt-1 text-sm text-slate-500">Primary WhatsApp: {modalPhone}</p>
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700 whitespace-pre-line">
                            {modalMessage}
                        </div>
                        <button
                            onClick={async () => {
                                openWhatsApp(modalPhone ?? undefined, modalMessage ?? undefined);
                                setShowModal(false);
                                if (modalTaskKey) {
                                    try {
                                        await markTaskMutation.mutateAsync({ processId: process.id, taskKey: modalTaskKey });
                                    } catch (e) {
                                        // ignore; cache invalidation will refresh on next view
                                    }
                                }
                            }}
                            className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                        >
                            Send to WhatsApp
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default StudentProcessDetailPage;
