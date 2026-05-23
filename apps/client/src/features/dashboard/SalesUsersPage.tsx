import { RoleUsersPage } from "./RoleUserPages";

export const SalesUsersPage = () => {
	return (
		<RoleUsersPage
			title="Sales Users"
			description="A complete list of sales accounts, their sales IDs, and current status"
			roleType="sales"
			createPath="/users/create?role=sales"
		/>
	);
};

export default SalesUsersPage;