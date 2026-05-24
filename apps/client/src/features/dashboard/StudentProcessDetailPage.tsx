import { useState } from "react";
import toast from "react-hot-toast";
import { useCompleteProcessMutation, useSetTaskCompletedMutation } from "@/features/students/students.queries";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Panel } from "@/components/dashboard-ui";
import { useStudentProcessQuery } from "@/features/students/students.queries";
import { useSession } from "@/lib/session";

const ADMISSION_MODAL_TASK_KEYS = new Set([
    "data-confirmed",
    "data-confirmed-and-shared-class-group-awareness",
    "mentor-assigned-informed",
    "data-shared-to-mentor-for-confirmation-and-created-group",
    "student-data-shared",
    "group-created",
    "added-in-parents-group",
    "confirmed-data-shared-to-new-mentor",
    "level-drive-link-shared-to-parent",
    "level-teaching-guide-shared-to-ongoing-mentor",
]);

const normalizeWhatsAppNumber = (phone?: string | null) =>
    phone?.replace(/\D/g, "") ?? "";

const getPrimaryWhatsAppNumber = (student: {
    primaryWhatsappNumber?: string | null;
    phone?: string | null;
}) => student.primaryWhatsappNumber ?? student.phone ?? null;

export const StudentProcessDetailPage = () => {
    const { token } = useSession();
    const navigate = useNavigate();
    const { processId } = useParams<{ processId: string }>();
    const q = useStudentProcessQuery(token, processId);
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState<string | null>(null);
    const [modalPhone, setModalPhone] = useState<string | null>(null);
    const [modalTaskKey, setModalTaskKey] = useState<string | null>(null);
    const [modalTaskLabel, setModalTaskLabel] = useState<string | null>(null);
    const [modalTaskCompleted, setModalTaskCompleted] = useState(false);
    const setTaskMutation = useSetTaskCompletedMutation();
    const completeProcessMutation = useCompleteProcessMutation();

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
        setModalTaskLabel(null);
        setModalTaskCompleted(false);
        setShowModal(true);
    };

    const openStatusModal = (task: any) => {
        setModalPhone(null);
        setModalMessage(
            task.label === "Data confirmed"
                ? "Confirm that the student's details have been reviewed and verified."
                : task.label === "Mentor assigned & informed"
                    ? "Confirm that a mentor has been assigned and informed."
                    : task.label === "Student data shared"
                        ? "Confirm that the student's data has been shared with the relevant team."
                        : "Confirm that the group has been created.",
        );
        setModalTaskKey(task.key);
        setModalTaskLabel(task.label);
        setModalTaskCompleted(Boolean(task.completed));
        setShowModal(true);
    };

    // welcome task handled inline in the task list; no separate panel needed

    const handleTaskAction = async (task: any) => {
        if (!token || !process?.student?.leadId) {
            return;
        }

        if (ADMISSION_MODAL_TASK_KEYS.has(task.key)) {
            openStatusModal(task);
            return;
        }

        // For plain whatsapp messages open compose modal so the message can be edited
        openComposeModal(
            getPrimaryWhatsAppNumber(process.student),
            task.whatsappMessage,
            task.key,
        );
    };

        // Task toggle handled via modal or inline actions; removed unused toggle handler

    const completedCount = process.tasks.filter((t: any) => t.completed).length;
    const progress = process.tasks.length ? Math.round((completedCount / process.tasks.length) * 100) : 0;
    const canCompleteProcess = progress === 100;
    const isArchived = Boolean(process.archivedAt);

    return (
        <div className="grid gap-6">
            <Panel
                title={process.label}
                description={`Process for ${process.student.zid} — ${process.student.name ?? "Unnamed"}`}
            >
                {isArchived ? (
                    <div className="mb-4 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm">Student: <Link to={`/students/${process.student.id}`} className="text-emerald-600 font-semibold">{process.student.zid} · {process.student.name ?? process.student.phone}</Link></p>
                            <p className="text-sm">Status: <span className="font-semibold">{process.status}</span></p>
                            <p className="text-sm text-gray-600">Completed: {new Date(process.archivedAt as any).toLocaleString()}</p>
                        </div>
                        <div className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">Completed</div>
                    </div>
                ) : (
                    <div className="mb-4">
                        <p className="text-sm">Student: <Link to={`/students/${process.student.id}`} className="text-emerald-600 font-semibold">{process.student.zid} · {process.student.name ?? process.student.phone}</Link></p>
                        <p className="text-sm">Status: <span className="font-semibold">{process.status}</span></p>
                    </div>
                )}

                <div className="mb-4">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <span>Progress</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div className={`h-full rounded-full ${isArchived ? "bg-slate-400" : "bg-emerald-500"}`} style={{ width: `${progress}%` }} />
                    </div>
                    {!isArchived && canCompleteProcess ? (
                        <div className="mt-4 flex justify-end">
                            <button
                                type="button"
                                onClick={async () => {
                                    try {
                                        await completeProcessMutation.mutateAsync({ processId: process.id });
                                        toast.success("Process marked as completed");
                                        navigate("/processes");
                                    } catch (error) {
                                        toast.error(error instanceof Error ? error.message : "Unable to complete process");
                                    }
                                }}
                                disabled={completeProcessMutation.isPending}
                                className="inline-flex items-center rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {completeProcessMutation.isPending ? "Completing..." : "Mark whole process as completed"}
                            </button>
                        </div>
                    ) : null}
                </div>

                <div className="grid gap-3">
                    {process.tasks.map((task: any) => (
                        <div
                            key={task.key}
                            className={`flex items-start gap-4 rounded-2xl border px-4 py-4 shadow-sm ${isArchived ? "border-transparent bg-slate-50" : "border-slate-200 bg-white"}`}
                        >
                            <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${task.completed ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 bg-slate-100 text-slate-400"}`}>
                                {task.completed ? "✓" : ""}
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className={`text-sm font-semibold ${isArchived ? "text-slate-700" : "text-slate-900"}`}>{task.label}</p>

                                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${task.completed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                        {task.completed ? "Done" : "Pending"}
                                    </span>
                                </div>

                                <p className="mt-1 text-xs text-slate-500">
                                    {task.completedAt ? `Completed ${new Date(task.completedAt).toLocaleDateString()}` : "Not completed yet"}
                                </p>

                                {task.whatsappMessage ? (
                                    <p className="mt-1 text-xs text-slate-500">WhatsApp automation for the student&apos;s primary number.</p>
                                ) : null}
                            </div>

                            {!isArchived ? (
                                <div className="flex shrink-0 flex-col items-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (ADMISSION_MODAL_TASK_KEYS.has(task.key)) {
                                                openStatusModal(task);
                                                return;
                                            }

                                            if (task.whatsappMessage) {
                                                void handleTaskAction(task);
                                            }
                                        }}
                                        disabled={!(task.whatsappMessage || ADMISSION_MODAL_TASK_KEYS.has(task.key))}
                                        className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold transition ${task.completed ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-slate-900 text-white hover:bg-slate-800"} ${(task.whatsappMessage || ADMISSION_MODAL_TASK_KEYS.has(task.key)) ? " focus:outline-none focus:ring-2 focus:ring-emerald-400" : " opacity-60"}`}
                                    >
                                        {task.completed ? "Completed" : "Open"}
                                    </button>
                                    {task.whatsappMessage ? (
                                        <button onClick={() => void handleTaskAction(task)} className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">Send on WhatsApp</button>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    ))}
                </div>

                {/* Removed duplicate welcome panel — task row contains action buttons */}
            </Panel>

            {showModal ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
                    <div className="relative z-10 w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
                        <h3 className="text-lg font-semibold text-slate-900">
                            {modalTaskLabel ?? "Send welcome message"}
                        </h3>
                        {modalPhone ? (
                            <p className="mt-1 text-sm text-slate-500">Primary WhatsApp: {modalPhone}</p>
                        ) : null}
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700 whitespace-pre-line">
                            {modalMessage}
                        </div>
                        <button
                            onClick={async () => {
                                if (modalPhone) {
                                    openWhatsApp(modalPhone ?? undefined, modalMessage ?? undefined);
                                    setShowModal(false);
                                    return;
                                }

                                if (modalTaskKey) {
                                    const nextCompleted = !modalTaskCompleted;
                                    setShowModal(false);

                                    try {
                                        await setTaskMutation.mutateAsync({
                                            processId: process.id,
                                            taskKey: modalTaskKey,
                                            completed: nextCompleted,
                                        });
                                    } catch (e) {
                                        toast.error(
                                            e instanceof Error
                                                ? e.message
                                                : "Failed to update task status",
                                        );
                                    }
                                }
                            }}
                            className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                        >
                            {modalPhone ? "Send to WhatsApp" : modalTaskCompleted ? "Mark as not done" : "Mark as done"}
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default StudentProcessDetailPage;
