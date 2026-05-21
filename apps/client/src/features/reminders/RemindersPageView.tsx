import type { Reminder } from "@repo/schema";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
    HiArrowLeft,
    HiArchiveBox,
    HiCheckCircle,
    HiOutlineCalendarDays,
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
import { useMeQuery } from "@/features/auth/auth.queries.js";
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
    const meQuery = useMeQuery(token);
    const canCreateReminder = useHasPermission("REMINDER_CREATE");
    const canUpdateReminder = useHasPermission("REMINDER_UPDATE");
    const canDeleteReminder = useHasPermission("REMINDER_DELETE");
    const studentsQuery = useStudentsQuery(token);
    const usersQuery = useUsersQuery(token);
    const [sortBy, setSortBy] = useState<"date" | "createdAt">("date");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [searchTerm, setSearchTerm] = useState("");
    const [scope, setScope] = useState<"assignedToMe" | "allAssignments">(
        "assignedToMe",
    );
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 8;
    const currentUserId = meQuery.data?.id ?? "";

    const remindersQuery = useGetAllReminders({ enabled: Boolean(token) });
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

    const assignedToMeReminders = useMemo(
        () => listReminders.filter((reminder) => reminder.assignedTo === currentUserId),
        [listReminders, currentUserId],
    );
    const scopedReminders =
        scope === "assignedToMe" ? assignedToMeReminders : listReminders;

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

    const statusLabel = mode === "closed" ? "Closed" : "Pending";
    const emptyMessage =
        mode === "closed"
            ? "No closed reminders yet"
            : scope === "assignedToMe"
                ? "No reminders assigned to you yet"
                : "No active reminders yet";

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="text-gray-600 hover:text-gray-900"
                    >
                        <HiArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                        <p className="text-sm text-gray-500">{description}</p>
                    </div>
                    {canCreateReminder ? (
                        <Link
                            to={actionTo}
                            className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
                        >
                            <HiArchiveBox className="h-4 w-4" />
                            {actionLabel}
                        </Link>
                    ) : null}
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                            Pending
                        </p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">{pendingCount}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                            Closed
                        </p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">{doneCount}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                            Total
                        </p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">
                            {pendingCount + doneCount}
                        </p>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    <button
                        onClick={() => setScope("assignedToMe")}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                            scope === "assignedToMe"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                    >
                        Assigned to me ({assignedToMeReminders.length})
                    </button>
                    <button
                        onClick={() => setScope("allAssignments")}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                            scope === "allAssignments"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                    >
                        All assignments ({listReminders.length})
                    </button>
                </div>
            </div>

            <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="min-w-60 flex-1">
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                            Search
                        </label>
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search reminders, students, or users"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="min-w-45">
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                            List type
                        </label>
                        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
                            {statusLabel}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                            Sort By
                        </label>
                        <select
                            value={sortBy}
                            onChange={(event) =>
                                setSortBy(event.target.value as "date" | "createdAt")
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="date">Due Date</option>
                            <option value="createdAt">Created Date</option>
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                            Order
                        </label>
                        <select
                            value={sortOrder}
                            onChange={(event) =>
                                setSortOrder(event.target.value as "asc" | "desc")
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="asc">Ascending</option>
                            <option value="desc">Descending</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                {remindersQuery.isLoading ? (
                    <div className="p-8 text-center text-gray-500">Loading reminders...</div>
                ) : visibleReminders.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">{emptyMessage}</div>
                ) : (
                    <div className="divide-y">
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
                <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <p className="text-sm text-gray-600">
                        Page {safeCurrentPage} of {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={safeCurrentPage <= 1}
                            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            disabled={safeCurrentPage >= totalPages}
                            onClick={() =>
                                setCurrentPage((page) => Math.min(totalPages, page + 1))
                            }
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
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
            className={`flex items-start justify-between gap-4 p-4 transition hover:bg-gray-50 ${
                reminder.isDone
                    ? "border-gray-200 bg-gray-50"
                    : `${dueTone.background} ${dueTone.border}`
            }`}
        >
            <div className="flex-1">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {linkedPersonType === "mentor" ? "Mentor" : "Student"}
                </div>
                <div className="mb-2 flex items-center gap-2">
                    <HiOutlineCalendarDays className="h-4 w-4 text-gray-500" />
                    <span
                        className={`text-sm font-medium ${
                            reminder.isDone ? "text-gray-700" : dueTone.date
                        }`}
                    >
                        {formatReminderDate(dueDate)}
                    </span>

                    {showDueStatus && !reminder.isDone ? (
                        <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${dueTone.badge}`}
                        >
                            {dueStatus === "pastDue"
                                ? "Past due"
                                : dueStatus === "today"
                                    ? "Today"
                                    : dueStatus === "tomorrow"
                                        ? "Tomorrow"
                                        : "Upcoming"}
                        </span>
                    ) : (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                            Done
                        </span>
                    )}
                </div>
                <p
                    className={`text-sm ${
                        reminder.isDone ? "text-gray-600 line-through" : "text-gray-900"
                    }`}
                >
                    {reminder.note}
                </p>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                    {linkedPersonType === "mentor" && mentor ? (
                        <span>
                            Mentor: {mentor.name ?? mentor.username}
                        </span>
                    ) : student ? (
                        <span>
                            Student: <Link to={`/students/${student.id}`} className="text-blue-600 hover:underline">
                                {student.name ?? student.zid}
                            </Link>
                        </span>
                    ) : null}
                    <span>
                        Created by {createdByUser?.name ?? createdByUser?.username ?? "Unknown"} • {new Date(reminder.createdAt).toLocaleDateString()}
                    </span>
                    {reminder.assignedTo !== reminder.createdBy ? (
                        <span>
                            Assigned to {assignedToUser?.name ?? assignedToUser?.username ?? "Unknown"}
                        </span>
                    ) : null}
                </div>
            </div>

            <div className="flex items-center gap-2">
                {canUpdateReminder ? (
                <button
                    onClick={requestToggleDone}
                    disabled={updateMutation.isPending}
                    className={`rounded-md p-2 transition ${
                        reminder.isDone
                            ? "bg-green-50 text-green-600 hover:bg-green-100"
                            : "text-gray-400 hover:bg-gray-100"
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
                    className="rounded-md p-2 text-red-500 transition hover:bg-red-50"
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
