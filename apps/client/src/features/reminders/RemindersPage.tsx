import { RemindersPageView } from "./RemindersPageView.js";

export const RemindersPage = () => {
    return (
        <RemindersPageView
            title="Reminders"
            description="Open reminders that still need attention"
            actionLabel="View closed tasks"
            actionTo="/reminders/closed"
            mode="open"
        />
    );
};
