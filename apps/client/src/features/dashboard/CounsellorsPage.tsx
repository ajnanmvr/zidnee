import { RoleUsersPage } from "./RoleUserPages";

export const CounsellorsPage = () => {
	return (
		<RoleUsersPage
			title="Counsellors"
			description="A complete list of counsellor accounts, their counsellor IDs, and current status"
			roleType="counsellor"
			createPath="/users/create?role=counsellor"
		/>
	);
};

export default CounsellorsPage;
