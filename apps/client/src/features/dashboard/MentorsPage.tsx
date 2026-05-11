import { RoleUsersPage } from "./RoleUserPages";

export const MentorsPage = () => (
	<RoleUsersPage
		title="Mentors"
		description="Mentor team"
		roleType="mentor"
		createPath="/mentors/create"
	/>
);
