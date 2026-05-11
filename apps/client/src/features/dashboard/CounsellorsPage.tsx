import { RoleUsersPage } from "./RoleUserPages";

export const CounsellorsPage = () => (
	<RoleUsersPage
		title="Counsellors"
		description="Counsellor team"
		roleType="counsellor"
		createPath="/users/create"
	/>
);
