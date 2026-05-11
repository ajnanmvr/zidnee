import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { ApiError } from "@/api/request";
import { useCreateUserMutation } from "@/features/users/use-create-user-mutation";
import { UserFormPanel } from "@/features/users/UserFormPanel";

export const CreateUserPage = () => {
	const navigate = useNavigate();
	const createUserMutation = useCreateUserMutation();

	const handleSubmit = async (form: {
		name: string;
		username: string;
		email?: string;
		password?: string;
		gender?: "male" | "female";
		roleIds: string[];
	}) => {
		try {
			await createUserMutation.mutateAsync({
				name: form.name,
				username: form.username,
				email: form.email,
				password: form.password as string,
				gender: form.gender,
				roleIds: form.roleIds,
			});
			toast.success("User created successfully!");
			navigate("/users", { replace: true });
		} catch (error) {
			if (error instanceof ApiError) {
				const serverErrors = error.payload.errors ?? {};
				const firstError =
					serverErrors.name?.[0] ??
					serverErrors.username?.[0] ??
					serverErrors.email?.[0] ??
					serverErrors.password?.[0] ??
					error.payload.message;

				if (firstError) {
					toast.error(firstError);
				}
				return;
			}

			toast.error(
				error instanceof Error ? error.message : "Unable to create user"
			);
		}
	};

	return (
		<UserFormPanel
			mode="create"
			onSubmit={handleSubmit}
			isLoading={createUserMutation.isPending}
		/>
	);
};
