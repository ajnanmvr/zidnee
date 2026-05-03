import { CreateAccountPage } from "./CreateAccountPage";

export const CreateMentorPage = () => {
	return (
		<CreateAccountPage
			defaultRoleType="mentor"
			title="Create mentor"
			description="Add a new mentor"
			backTo="/mentors"
		/>
	);
};




