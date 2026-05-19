import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { HiCheckCircle } from "react-icons/hi2";
import { Panel } from "@/components/dashboard-ui";
import { generateFormLink } from "@/features/leads/leads.service";
import { useStudentProcessQuery } from "@/features/students/students.queries";
import { useSession } from "@/lib/session";

const normalizeWhatsAppNumber = (phone?: string | null) =>
    phone?.replace(/\D/g, "") ?? "";

export const StudentProcessDetailPage = () => {
    const { token } = useSession();
    const { processId } = useParams<{ processId: string }>();
    const q = useStudentProcessQuery(token, processId);
    const [loadingTaskKey, setLoadingTaskKey] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState<string | null>(null);
    const [modalPhone, setModalPhone] = useState<string | null>(null);

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

    const openComposeModal = (phone?: string | null, message?: string) => {
        setModalPhone(phone ?? null);
        setModalMessage(message ?? "");
        setShowModal(true);
    };

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
                    process.student.primaryWhatsappNumber ?? process.student.phone,
                    `${task.whatsappMessage ?? "Please complete the form below."}\n${result.formLink}`,
                );
            } finally {
                setLoadingTaskKey(null);
            }
            return;
        }

        // For plain whatsapp messages open compose modal so the message can be edited
        openComposeModal(
            process.student.primaryWhatsappNumber ?? process.student.phone,
            task.whatsappMessage,
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

                <div className="grid gap-2">
                    {process.tasks.map((task: any) => (
                        <div key={task.key} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3">
                            <div>
                                <p className="text-sm font-semibold text-slate-900">{task.label}</p>
                                {task.whatsappMessage ? (
                                    <p className="mt-1 text-xs text-slate-500">Automation message for WhatsApp on the student&apos;s primary number.</p>
                                ) : null}
                                <p className="mt-0.5 text-xs text-slate-500">{task.completedAt ? `Completed ${new Date(task.completedAt).toLocaleDateString()}` : "Pending"}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className={task.completed ? "inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700" : "inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700"}>
                                    {task.completed ? <HiCheckCircle className="mr-1 h-4 w-4" /> : null}
                                    {task.completed ? "Done" : "Open"}
                                </span>
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
            </Panel>

            {showModal ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
                    <div className="relative z-10 w-full max-w-xl rounded-lg bg-white p-6 shadow-lg">
                        <h3 className="text-lg font-semibold">Send WhatsApp message</h3>
                        <p className="mt-1 text-sm text-slate-500">Phone: {modalPhone}</p>
                        <textarea
                            className="mt-3 h-36 w-full rounded-md border p-3 text-sm"
                            value={modalMessage ?? ""}
                            onChange={(e) => setModalMessage(e.target.value)}
                        />
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => setShowModal(false)}
                                className="inline-flex items-center rounded-md border px-3 py-1 text-sm font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    openWhatsApp(modalPhone ?? undefined, modalMessage ?? undefined);
                                    setShowModal(false);
                                }}
                                className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1 text-sm font-semibold text-white"
                            >
                                Send on WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default StudentProcessDetailPage;
