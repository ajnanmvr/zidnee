import type { Reminder } from "@repo/schema";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
    HiArrowLeft,
    HiArchiveBox,
    HiCheckCircle,
    HiOutlineCalendarDays,
    HiMagnifyingGlass,
    HiSparkles,
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
    title,
    description,
    actionLabel,
    actionTo,
    mode,
}: RemindersPageViewProps) => {
    const navigate = useNavigate();
    const { token } = useSession();
    const canCreateReminder = useHasPermission("REMINDER_CREATE");
    const canUpdateReminder = useHasPermission("REMINDER_UPDATE");
    const canDeleteReminder = useHasPermission("REMINDER_DELETE");
    const studentsQuery = useStudentsQuery(token);
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

    const heroTone = mode === "closed" ? "from-slate-950 via-slate-900 to-emerald-900" : "from-emerald-950 via-slate-900 to-cyan-900";
    const heroTag = mode === "closed" ? "Closed reminders" : "Open reminders";

    return (
        <div className="space-y-6">
            <section className={`overflow-hidden rounded-4xl border border-white/10 bg-linear-to-br ${heroTone} text-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]`}>
                <div className="relative overflow-hidden px-6 py-7 sm:px-8 sm:py-8">
                    <div className="pointer-events-none absolute inset-0 opacity-60">
                        <div className="absolute -left-20 top-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
                        <div className="absolute right-0 top-10 h-44 w-44 rounded-full bg-emerald-300/10 blur-3xl" />
                    </div>

                    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">
                                <HiSparkles className="h-3.5 w-3.5" />
                                {heroTag}
                            </div>
                            <div className="mt-4 flex items-center gap-3">
                                <button
                                    onClick={() => navigate(-1)}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15"
                                >
                                    <HiArrowLeft className="h-5 w-5" />
                                </button>
                                <div>
                                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                                        {title}
                                    </h1>
                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200/90 sm:text-base">
                                        {description}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            {canCreateReminder ? (
                                <Link
                                    to={actionTo}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-black/10 transition hover:bg-emerald-50"
                                >
                                    <HiArchiveBox className="h-4 w-4" />
                                    {actionLabel}
                                </Link>
                            ) : null}
                        </div>
                    </div>

                    <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                            { label: "Pending", value: pendingCount, tone: "emerald" },
                            { label: "Closed", value: doneCount, tone: "cyan" },
                            { label: "Total", value: pendingCount + doneCount, tone: "white" },
                            { label: "Scope", value: scope === "assignedToMe" ? "Mine" : "All", tone: "amber" },
                        ].map((item) => (
                            <div
                                key={item.label}
                                className="rounded-3xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur"
                            >
                                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/80">
                                    {item.label}
                                </p>
                                <p className={`mt-2 text-2xl font-semibold ${item.tone === "white" ? "text-white" : "text-white"}`}>
                                    {item.value}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="rounded-4xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setScope("assignedToMe")}
                            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                                scope === "assignedToMe"
                                    ? "bg-slate-950 text-white shadow-sm"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                        >
                            Assigned to me ({scope === "assignedToMe" ? listReminders.length : 0})
                        </button>
                        <button
                            onClick={() => setScope("allAssignments")}
                            disabled={!canReadAllReminders}
                            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                                scope === "allAssignments"
                                    ? "bg-slate-950 text-white shadow-sm"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                        >
                            All assignments ({scope === "allAssignments" ? listReminders.length : 0})
                        </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:min-w-md">
                        <label className="relative block">
                            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Search
                            </span>
                            <HiMagnifyingGlass className="pointer-events-none absolute left-3 top-[2.6rem] h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Search reminders, students, or users"
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                            />
                        </label>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Sort by
                                </label>
                                <select
                                    value={sortBy}
                                    onChange={(event) =>
                                        setSortBy(event.target.value as "date" | "createdAt")
                                    }
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                                >
                                    <option value="date">Due Date</option>
                                    <option value="createdAt">Created Date</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Order
                                </label>
                                <select
                                    value={sortOrder}
                                    onChange={(event) =>
                                        setSortOrder(event.target.value as "asc" | "desc")
                                    }
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                                >
                                    <option value="asc">Ascending</option>
                                    <option value="desc">Descending</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-sm">
                {remindersQuery.isLoading ? (
                    <div className="p-10 text-center text-slate-500">Loading reminders...</div>
                ) : visibleReminders.length === 0 ? (
                    <div className="p-10 text-center text-slate-500">{emptyMessage}</div>
                ) : (
                    <div className="divide-y divide-slate-100">
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
                <div className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <p className="text-sm text-slate-600">
                        Page {safeCurrentPage} of {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={safeCurrentPage <= 1}
                            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            disabled={safeCurrentPage >= totalPages}
                            onClick={() =>
                                setCurrentPage((page) => Math.min(totalPages, page + 1))
                            }
                            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Next
                        </button>
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
        <div
            className={`flex flex-col gap-4 px-5 py-4 transition hover:bg-slate-50/70 sm:flex-row sm:items-start sm:justify-between ${
                reminder.isDone ? "bg-slate-50" : `${dueTone.background} ${dueTone.border}`
            }`}
        >
            <div className="flex-1">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                        {linkedPersonType === "mentor" ? "Mentor" : "Student"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
                        <HiOutlineCalendarDays className="h-4 w-4 text-slate-500" />
                        {formatReminderDate(dueDate)}
                    </span>
                    <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            reminder.isDone ? "bg-emerald-100 text-emerald-700" : dueTone.badge
                        }`}
                    >
                        {reminder.isDone
                            ? "Done"
                            : showDueStatus
                                ? dueStatus === "pastDue"
                                    ? "Past due"
                                    : dueStatus === "today"
                                        ? "Today"
                                        : dueStatus === "tomorrow"
                                            ? "Tomorrow"
                                            : "Upcoming"
                                : "Pending"}
                    </span>
                </div>

                <p
                    className={`text-sm leading-6 ${
                        reminder.isDone ? "text-slate-500 line-through" : "text-slate-900"
                    }`}
                >
                    {reminder.note}
                </p>

                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                    {linkedPersonType === "mentor" && mentor ? (
                        <span>
                            Mentor: {mentor.name ?? mentor.username}
                        </span>
                    ) : student ? (
                        <span>
                            Student: <Link to={`/students/${student.id}`} className="font-semibold text-emerald-700 hover:underline">
                                {student.name ?? student.zid}
                            </Link>
                        </span>
                    ) : null}
                    <span>
                        Created by {createdByUser?.name ?? createdByUser?.username ?? "Unknown"} · {new Date(reminder.createdAt).toLocaleDateString()}
                    </span>
                    {reminder.assignedTo !== reminder.createdBy ? (
                        <span>
                            Assigned to {assignedToUser?.name ?? assignedToUser?.username ?? "Unknown"}
                        </span>
                    ) : null}
                </div>
            </div>

            <div className="flex items-center gap-2 self-start">
                {canUpdateReminder ? (
                    <button
                        onClick={requestToggleDone}
                        disabled={updateMutation.isPending}
                        className={`rounded-2xl border p-2 transition ${
                            reminder.isDone
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        }`}
                        title={reminder.isDone ? "Mark as pending" : "Mark as done"}
                    >
                        <HiCheckCircle className="h-5 w-5" />
                    </button>
                ) : null}
                {canDeleteReminder ? (
                    <button
                        onClick={() => {
                            setConfirmDeleteOpen(true);
                        }}
                        disabled={deleteMutation.isPending}
                        className="rounded-2xl border border-red-200 bg-white p-2 text-red-500 transition hover:bg-red-50"
                        title="Delete reminder"
                    >
                        <HiTrash className="h-5 w-5" />
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
        </div>
    );
};
