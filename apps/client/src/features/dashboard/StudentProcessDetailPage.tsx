import { useState } from "react";
import toast from "react-hot-toast";
import { useCompleteProcessMutation, useSetTaskCompletedMutation } from "@/features/students/students.queries";
import { Link, useNavigate, useParams } from "react-router-dom";
import { HiArrowLeft, HiCheckCircle, HiClipboardDocument, HiXCircle } from "react-icons/hi2";
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
    const [isCopyingMessage, setIsCopyingMessage] = useState(false);
    const [showForceConfirm, setShowForceConfirm] = useState(false);
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
        <div className="space-y-4">
            {/* Header */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900"
                        >
                            <HiArrowLeft className="h-4 w-4" />
                            Back
                        </button>
                        <div>
                            <h1 className="text-base font-bold text-gray-900">{process.label}</h1>
                            <p className="text-xs text-gray-500">
                                <Link to={`/students/${process.student.id}`} className="font-medium text-emerald-600 hover:underline">
                                    {process.student.zid} · {process.student.name ?? process.student.phone}
                                </Link>
                                {" · "}{process.student.phone}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isArchived ? (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                Completed · {new Date(process.archivedAt as any).toLocaleDateString()}
                            </span>
                        ) : (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                In progress
                            </span>
                        )}
                        {!isArchived && canCompleteProcess ? (
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
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                            >
                                {completeProcessMutation.isPending ? "Completing…" : "Mark as completed"}
                            </button>
                        ) : null}
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div
                            className={`h-full rounded-full transition-all ${isArchived ? "bg-gray-400" : "bg-emerald-500"}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="shrink-0 text-xs font-medium text-gray-500">{completedCount}/{process.tasks.length} tasks · {progress}%</span>
                </div>
            </div>

            {/* Tasks table */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            <th className="px-4 py-2.5 w-8" />
                            <th className="px-4 py-2.5">Task</th>
                            <th className="px-4 py-2.5 hidden sm:table-cell">Completed</th>
                            {!isArchived ? <th className="px-4 py-2.5 text-right">Actions</th> : null}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {process.tasks.map((task: any) => {
                            const isWelcomeTask = task.key === "send-welcome-message";
                            const hasProfile = Boolean(process.student?.profilePic);
                            const hasStartDate = Boolean(process.student?.classStartConfirmedAt);
                            const welcomeConditionsMet = hasProfile && hasStartDate;

                            return (
                                <tr key={task.key} className={task.completed ? "bg-gray-50/50" : "bg-white"}>
                                    {/* Status dot */}
                                    <td className="px-4 py-3">
                                        <div className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold ${task.completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-gray-300 bg-white text-gray-300"}`}>
                                            {task.completed ? "✓" : ""}
                                        </div>
                                    </td>

                                    {/* Task info */}
                                    <td className="px-4 py-3">
                                        <p className={`font-medium ${task.completed ? "text-gray-500" : "text-gray-800"}`}>{task.label}</p>
                                        {isWelcomeTask && !isArchived ? (
                                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                                                <span className={`flex items-center gap-1 text-xs ${hasProfile ? "text-emerald-600" : "text-gray-400"}`}>
                                                    {hasProfile ? <HiCheckCircle className="h-3 w-3" /> : <HiXCircle className="h-3 w-3" />}
                                                    Profile uploaded
                                                </span>
                                                <span className={`flex items-center gap-1 text-xs ${hasStartDate ? "text-emerald-600" : "text-gray-400"}`}>
                                                    {hasStartDate ? <HiCheckCircle className="h-3 w-3" /> : <HiXCircle className="h-3 w-3" />}
                                                    Start date confirmed{hasStartDate && process.student?.classStartConfirmedAt ? ` · ${new Date(process.student.classStartConfirmedAt).toLocaleDateString()}` : ""}
                                                </span>
                                            </div>
                                        ) : null}
                                    </td>

                                    {/* Date */}
                                    <td className="px-4 py-3 hidden sm:table-cell">
                                        <span className="text-xs text-gray-400">
                                            {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : "—"}
                                        </span>
                                    </td>

                                    {/* Actions */}
                                    {!isArchived ? (
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap justify-end gap-1.5">
                                                {isWelcomeTask ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleTaskAction(task)}
                                                            className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                                                        >
                                                            Send WhatsApp
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={!welcomeConditionsMet && !task.completed}
                                                            title={!welcomeConditionsMet && !task.completed ? "Profile and start date required" : undefined}
                                                            onClick={async () => {
                                                                if (!welcomeConditionsMet && !task.completed) return;
                                                                try {
                                                                    await setTaskMutation.mutateAsync({
                                                                        processId: process.id,
                                                                        taskKey: task.key,
                                                                        completed: !task.completed,
                                                                    });
                                                                } catch (e) {
                                                                    toast.error(e instanceof Error ? e.message : "Failed to update task");
                                                                }
                                                            }}
                                                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${task.completed ? "border border-gray-200 text-gray-600 hover:bg-gray-50" : welcomeConditionsMet ? "bg-gray-800 text-white hover:bg-gray-900" : "cursor-not-allowed bg-gray-100 text-gray-400 opacity-60"}`}
                                                        >
                                                            {task.completed ? "Undo" : "Mark done"}
                                                        </button>
                                                        {!task.completed ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowForceConfirm(true)}
                                                                className="rounded-lg border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-50"
                                                            >
                                                                Override
                                                            </button>
                                                        ) : null}
                                                    </>
                                                ) : (
                                                    <>
                                                        {task.whatsappMessage ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => void handleTaskAction(task)}
                                                                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                                                            >
                                                                Send WhatsApp
                                                            </button>
                                                        ) : null}
                                                        {ADMISSION_MODAL_TASK_KEYS.has(task.key) && !task.completed ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => openStatusModal(task)}
                                                                className="rounded-lg bg-gray-800 px-2.5 py-1 text-xs font-semibold text-white hover:bg-gray-900"
                                                            >
                                                                Open
                                                            </button>
                                                        ) : null}
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                try {
                                                                    await setTaskMutation.mutateAsync({
                                                                        processId: process.id,
                                                                        taskKey: task.key,
                                                                        completed: !task.completed,
                                                                    });
                                                                } catch (e) {
                                                                    toast.error(e instanceof Error ? e.message : "Failed to update task");
                                                                }
                                                            }}
                                                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${task.completed ? "border border-gray-200 text-gray-600 hover:bg-gray-50" : "bg-gray-800 text-white hover:bg-gray-900"}`}
                                                        >
                                                            {task.completed ? "Undo" : "Mark done"}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    ) : null}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

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
                        {modalTaskKey === "send-welcome-message" && modalMessage ? (
                            <button
                                type="button"
                                onClick={async () => {
                                    try {
                                        setIsCopyingMessage(true);
                                        await navigator.clipboard.writeText(modalMessage);
                                        toast.success("Message copied");
                                    } catch {
                                        toast.error("Unable to copy message");
                                    } finally {
                                        setIsCopyingMessage(false);
                                    }
                                }}
                                disabled={isCopyingMessage}
                                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <HiClipboardDocument className="h-4 w-4" />
                                {isCopyingMessage ? "Copying..." : "Copy message"}
                            </button>
                        ) : null}
                    </div>
                </div>
            ) : null}

            {showForceConfirm ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowForceConfirm(false)} />
                    <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                        <h3 className="text-base font-semibold text-slate-900">Mark as done anyway?</h3>
                        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 leading-relaxed">
                            ⚠️ The student hasn't uploaded their profile photo and/or confirmed their starting date yet. Even so, this task will be marked as done.
                        </div>
                        <div className="mt-4 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowForceConfirm(false)}
                                className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={setTaskMutation.isPending}
                                onClick={async () => {
                                    try {
                                        await setTaskMutation.mutateAsync({
                                            processId: process.id,
                                            taskKey: "send-welcome-message",
                                            completed: true,
                                        });
                                        setShowForceConfirm(false);
                                    } catch (e) {
                                        toast.error(e instanceof Error ? e.message : "Failed to update task");
                                    }
                                }}
                                className="flex-1 rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                            >
                                {setTaskMutation.isPending ? "Saving..." : "Yes, mark as done"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default StudentProcessDetailPage;
