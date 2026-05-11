import { CreateAccountPage } from "./CreateAccountPage";

export const CreateCounsellorPage = () => {
	return (
		<CreateAccountPage
			defaultRoleType="counsellor"
			title="Create counsellor"
			description="Add a new counsellor"
			backTo="/counsellors"
		/>
	);
};
