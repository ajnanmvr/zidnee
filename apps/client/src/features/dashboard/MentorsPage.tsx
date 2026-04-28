import { RoleUsersPage } from "./RoleUserPages";

export const MentorsPage = () => (
	<RoleUsersPage
		title="Mentors"
		description="Mentor team"
		roleName="Mentor"
		createPath="/mentors/create"
	/>
);