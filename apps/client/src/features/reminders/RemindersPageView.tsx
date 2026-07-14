import type { Reminder } from "@repo/schema";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
    HiArchiveBox,
    HiCheckCircle,
    HiMagnifyingGlass,
    HiPencilSquare,
    HiTrash,
} from "react-icons/hi2";
import { Link, useNavigate } from "react-router-dom";
import {
    useDeleteReminderMutation,
    useGetAllReminders,
    useUpdateReminderMutation,
} from "./reminders.mutations.js";
import {
    formatReminderDate,
    getReminderDueStatus,
    getReminderDueToneClasses,
} from "./reminders.utils.js";
import { Modal } from "@/components/dashboard-ui";
import { useStudentsQuery } from "@/features/students/students.queries.js";
import { useUsersQuery } from "@/features/users/users.queries.js";
import { useHasPermission } from "@/lib/hooks/use-has-permission";
import { useSession } from "@/lib/session.js";

type ReminderPageMode = "open" | "closed";

interface RemindersPageViewProps {
    title: string;
    description: string;
    actionLabel: string;
    actionTo: string;
    mode: ReminderPageMode;
}

export const RemindersPageView = ({
    actionLabel,
    actionTo,
    mode,
}: RemindersPageViewProps) => {
    useNavigate();
    const { token } = useSession();
    const canCreateReminder = useHasPermission("REMINDER_CREATE");
    const canUpdateReminder = useHasPermission("REMINDER_UPDATE");
    const canDeleteReminder = useHasPermission("REMINDER_DELETE");
    const studentsQuery = useStudentsQuery(token, { limit: 2000 });
    const usersQuery = useUsersQuery(token);
    const [sortBy, setSortBy] = useState<"date" | "createdAt">("date");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [searchTerm, setSearchTerm] = useState("");
    const canReadAllReminders = useHasPermission("REMINDER_READ_ALL");
    const [scope, setScope] = useState<"assignedToMe" | "allAssignments">(
        "assignedToMe",
    );
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 8;

    const remindersQuery = useGetAllReminders({
        scope: scope === "assignedToMe" || !canReadAllReminders ? "mine" : "all",
        enabled: Boolean(token),
    });
    const reminders = remindersQuery.data ?? [];

    const activeReminders = useMemo(
        () => reminders.filter((reminder) => !reminder.isDone),
        [reminders],
    );
    const closedReminders = useMemo(
        () => reminders.filter((reminder) => reminder.isDone),
        [reminders],
    );
    const listReminders = mode === "closed" ? closedReminders : activeReminders;

    const pendingCount = activeReminders.length;
    const doneCount = closedReminders.length;

    const scopedReminders = listReminders;

    const sortedReminders = useMemo(() => {
        const sorted = [...scopedReminders];
        sorted.sort((a, b) => {
            const leftValue = new Date(sortBy === "date" ? a.date : a.createdAt).getTime();
            const rightValue = new Date(sortBy === "date" ? b.date : b.createdAt).getTime();
            return sortOrder === "asc" ? leftValue - rightValue : rightValue - leftValue;
        });

        return sorted;
    }, [scopedReminders, sortBy, sortOrder]);

    const visibleReminders = useMemo(() => {
        const search = searchTerm.trim().toLowerCase();

        if (!search) {
            return sortedReminders;
        }

        return sortedReminders.filter((reminder) => {
            const linkedPersonId = reminder.linkedPerson.id;
            const student = studentsQuery.data?.students.find(
                (item) => item.id === linkedPersonId,
            );
            const mentor = usersQuery.data?.users.find(
                (item) => item.id === linkedPersonId,
            );
            const creator = usersQuery.data?.users.find(
                (item) => item.id === reminder.createdBy,
            );
            const assignee = usersQuery.data?.users.find(
                (item) => item.id === reminder.assignedTo,
            );

            return [
                reminder.note,
                mentor?.name ?? mentor?.username ?? "",
                student?.name ?? "",
                student?.zid ?? "",
                creator?.name ?? creator?.username ?? "",
                assignee?.name ?? assignee?.username ?? "",
            ]
                .join(" ")
                .toLowerCase()
                .includes(search);
        });
    }, [sortedReminders, searchTerm, studentsQuery.data?.students, usersQuery.data?.users]);

    const totalPages = Math.max(1, Math.ceil(visibleReminders.length / pageSize));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const pagedReminders = visibleReminders.slice(
        (safeCurrentPage - 1) * pageSize,
        safeCurrentPage * pageSize,
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [mode, scope, searchTerm, sortBy, sortOrder]);

    const emptyMessage =
        mode === "closed"
            ? "No closed reminders yet"
            : scope === "assignedToMe"
                ? "No reminders assigned to you yet"
                : "No active reminders yet";

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setScope("assignedToMe")} className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${scope === "assignedToMe" ? "bg-emerald-600 text-white" : "border border-gray-200 bg-white text-gray-600 hover:border-emerald-400 hover:text-emerald-700"}`}>
                    Assigned to me
                </button>
                <button onClick={() => setScope("allAssignments")} disabled={!canReadAllReminders} className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${scope === "allAssignments" ? "bg-emerald-600 text-white" : "border border-gray-200 bg-white text-gray-600 hover:border-emerald-400 hover:text-emerald-700"} disabled:opacity-40`}>
                    All
                </button>
                <div className="relative">
                    <HiMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input type="search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search…" className="rounded-lg border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500" />
                </div>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "date" | "createdAt")} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none">
                    <option value="date">Due date</option>
                    <option value="createdAt">Created date</option>
                </select>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none">
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                </select>
                <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-gray-400">{pendingCount} open · {doneCount} closed</span>
                    {canCreateReminder ? (
                        <Link to={actionTo} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-600 transition hover:border-emerald-300 hover:text-emerald-700">
                            <HiArchiveBox className="h-4 w-4" /> {actionLabel}
                        </Link>
                    ) : null}
                </div>
            </div>

            {/* List */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                {remindersQuery.isLoading ? (
                    <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
                ) : visibleReminders.length === 0 ? (
                    <p className="py-10 text-center text-sm text-gray-400">{emptyMessage}</p>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {pagedReminders.map((reminder) => (
                            <ReminderRow
                                key={reminder.id}
                                reminder={reminder}
                                users={usersQuery.data?.users ?? []}
                                students={studentsQuery.data?.students ?? []}
                                showDueStatus={mode !== "closed"}
                                canUpdateReminder={canUpdateReminder}
                                canDeleteReminder={canDeleteReminder}
                            />
                        ))}
                    </div>
                )}
            </div>

            {visibleReminders.length > pageSize ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <p className="text-xs text-gray-500">Page {safeCurrentPage} of {totalPages}</p>
                    <div className="flex items-center gap-2">
                        <button type="button" disabled={safeCurrentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40">Prev</button>
                        <button type="button" disabled={safeCurrentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40">Next</button>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

interface ReminderRowProps {
    reminder: Reminder;
    users: Array<{ id: string; name: string; username: string }>;
    students: Array<{ id: string; name?: string; zid: string }>;
    showDueStatus?: boolean;
    canUpdateReminder?: boolean;
    canDeleteReminder?: boolean;
}

const ReminderRow: React.FC<ReminderRowProps> = ({
    reminder,
    users,
    students,
    showDueStatus = true,
    canUpdateReminder = false,
    canDeleteReminder = false,
}) => {
    const linkedPersonId = reminder.linkedPerson.id;
    const linkedPersonType = reminder.linkedPerson.type;

    const updateMutation = useUpdateReminderMutation(linkedPersonId);
    const deleteMutation = useDeleteReminderMutation(linkedPersonId);
    const [confirmDoneOpen, setConfirmDoneOpen] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editNote, setEditNote] = useState(reminder.note);
    const [editDate, setEditDate] = useState(() => {
        const d = new Date(reminder.date);
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    });

    const createdByUser = useMemo(() => {
        return users.find((user) => user.id === reminder.createdBy);
    }, [users, reminder.createdBy]);

    const assignedToUser = useMemo(() => {
        return users.find((user) => user.id === reminder.assignedTo);
    }, [users, reminder.assignedTo]);

    const student = useMemo(() => {
        return linkedPersonType === "student"
            ? students.find((item) => item.id === linkedPersonId)
            : undefined;
    }, [students, linkedPersonId, linkedPersonType]);

    const mentor = useMemo(() => {
        return linkedPersonType === "mentor"
            ? users.find((item) => item.id === linkedPersonId)
            : undefined;
    }, [users, linkedPersonId, linkedPersonType]);

    const dueStatus = getReminderDueStatus(reminder.date);
    const dueTone = getReminderDueToneClasses(dueStatus);

    const handleToggleDone = async () => {
        try {
            await updateMutation.mutateAsync({
                reminderId: reminder.id,
                payload: { isDone: !reminder.isDone },
            });
            toast.success(
                reminder.isDone ? "Reminder marked as pending" : "Reminder marked as done",
            );
        } catch {
            toast.error("Failed to update reminder");
        }
    };

    const requestToggleDone = () => {
        if (!reminder.isDone) {
            setConfirmDoneOpen(true);
            return;
        }

        void handleToggleDone();
    };

    const handleDelete = async () => {
        try {
            await deleteMutation.mutateAsync(reminder.id);
            toast.success("Reminder deleted");
            setConfirmDeleteOpen(false);
        } catch {
            toast.error("Failed to delete reminder");
        }
    };

    const dueDate = new Date(reminder.date);
    dueDate.setHours(0, 0, 0, 0);

    return (
        <div className={`flex items-start gap-3 px-4 py-3 transition hover:bg-gray-50/60 ${reminder.isDone ? "opacity-60" : ""}`}>
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${reminder.isDone ? "bg-emerald-100 text-emerald-700" : dueTone.badge}`}>
                        {reminder.isDone ? "Done" : showDueStatus ? (dueStatus === "pastDue" ? "Past due" : dueStatus === "today" ? "Today" : dueStatus === "tomorrow" ? "Tomorrow" : "Upcoming") : "Pending"}
                    </span>
                    <span className="text-xs text-gray-400">{formatReminderDate(dueDate)}</span>
                </div>
                <p className={`text-sm ${reminder.isDone ? "text-gray-400 line-through" : "text-gray-800"}`}>{reminder.note}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-400">
                    {linkedPersonType === "mentor" && mentor ? (
                        <span>Mentor: {mentor.name ?? mentor.username}</span>
                    ) : linkedPersonType === "student" ? (
                        <Link
                            to={`/students/${linkedPersonId}`}
                            className="font-medium text-emerald-600 hover:underline"
                        >
                            {student ? (student.name ?? student.zid) : "View student"}
                        </Link>
                    ) : null}
                    <span>By {createdByUser?.name ?? createdByUser?.username ?? "Unknown"} · {new Date(reminder.createdAt).toLocaleDateString()}</span>
                    {reminder.assignedTo !== reminder.createdBy ? <span>→ {assignedToUser?.name ?? assignedToUser?.username ?? "Unknown"}</span> : null}
                </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                {canUpdateReminder ? (
                    <button
                        onClick={() => {
                            setEditNote(reminder.note);
                            const d = new Date(reminder.date);
                            const pad = (n: number) => String(n).padStart(2, "0");
                            setEditDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                            setEditOpen(true);
                        }}
                        className="rounded-lg p-1.5 text-gray-300 transition hover:bg-blue-50 hover:text-blue-500"
                        title="Edit"
                    >
                        <HiPencilSquare className="h-4 w-4" />
                    </button>
                ) : null}
                {canUpdateReminder ? (
                    <button onClick={requestToggleDone} disabled={updateMutation.isPending} className={`rounded-lg p-1.5 transition ${reminder.isDone ? "text-emerald-600 hover:bg-emerald-50" : "text-gray-400 hover:bg-gray-100"}`} title={reminder.isDone ? "Mark pending" : "Mark done"}>
                        <HiCheckCircle className="h-5 w-5" />
                    </button>
                ) : null}
                {canDeleteReminder ? (
                    <button onClick={() => setConfirmDeleteOpen(true)} disabled={deleteMutation.isPending} className="rounded-lg p-1.5 text-gray-300 transition hover:bg-red-50 hover:text-red-500" title="Delete">
                        <HiTrash className="h-4 w-4" />
                    </button>
                ) : null}
            </div>

            <Modal
                open={confirmDoneOpen}
                title="Mark reminder as done"
                description="This reminder will be moved to closed tasks."
                onClose={() => {
                    setConfirmDoneOpen(false);
                }}
                footer={
                    <>
                        <button
                            type="button"
                            className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
                            onClick={() => {
                                setConfirmDoneOpen(false);
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-2xl bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                            onClick={() => {
                                void handleToggleDone();
                                setConfirmDoneOpen(false);
                            }}
                            disabled={updateMutation.isPending}
                        >
                            Mark done
                        </button>
                    </>
                }
            >
                <div className="py-4 text-sm text-gray-700">
                    Are you sure you want to mark this reminder as done?
                </div>
            </Modal>

            <Modal
                open={confirmDeleteOpen}
                title="Delete reminder"
                description="This will permanently delete the reminder. This action cannot be undone."
                onClose={() => {
                    setConfirmDeleteOpen(false);
                }}
                footer={
                    <>
                        <button
                            type="button"
                            className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
                            onClick={() => {
                                setConfirmDeleteOpen(false);
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                            onClick={() => void handleDelete()}
                            disabled={deleteMutation.isPending}
                        >
                            Delete reminder
                        </button>
                    </>
                }
            >
                <div className="py-4 text-sm text-gray-700">
                    Are you sure you want to delete this reminder?
                </div>
            </Modal>

            <Modal
                open={editOpen}
                title="Edit reminder"
                onClose={() => setEditOpen(false)}
                footer={
                    <>
                        <button type="button" onClick={() => setEditOpen(false)} className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900">Cancel</button>
                        <button
                            type="button"
                            disabled={updateMutation.isPending || !editNote.trim()}
                            onClick={async () => {
                                try {
                                    await updateMutation.mutateAsync({
                                        reminderId: reminder.id,
                                        payload: { note: editNote.trim(), date: new Date(editDate) },
                                    });
                                    toast.success("Reminder updated");
                                    setEditOpen(false);
                                } catch {
                                    toast.error("Failed to update reminder");
                                }
                            }}
                            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                            {updateMutation.isPending ? "Saving…" : "Save"}
                        </button>
                    </>
                }
            >
                <div className="space-y-3">
                    <label className="block">
                        <span className="mb-1 block text-xs font-medium text-gray-600">Note</span>
                        <textarea
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            rows={3}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                        />
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-xs font-medium text-gray-600">Date & time</span>
                        <input
                            type="datetime-local"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                        />
                    </label>
                </div>
            </Modal>
        </div>
    );
};
