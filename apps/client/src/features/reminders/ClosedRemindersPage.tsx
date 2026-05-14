import { RemindersPageView } from "./RemindersPageView.js";

export const ClosedRemindersPage = () => {
    return (
        <RemindersPageView
            title="Closed Tasks"
            description="Completed reminders kept in a separate archive view"
            actionLabel="View open reminders"
            actionTo="/reminders"
            mode="closed"
        />
    );
};
