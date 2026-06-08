import { RoleUsersPage } from "./RoleUserPages";

export const AdminsPage = () => {
	return (
		<RoleUsersPage
			title="Admins"
			description="A complete list of admin accounts and their current status"
			roleType="admin"
			createPath="/users/create?role=admin"
		/>
	);
};

export default AdminsPage;
