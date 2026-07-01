import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { ApiError } from "@/api/request";
import { UserFormPanel } from "@/features/users/UserFormPanel";
import { useCreateUserMutation } from "@/features/users/use-create-user-mutation";
import { useHasAnyPermission, useHasPermission } from "@/lib/hooks/use-has-permission";

export const CreateUserPage = () => {
	const navigate = useNavigate();
	const createUserMutation = useCreateUserMutation();
	const canCreateFullUser = useHasAnyPermission(["USER_CREATE", "ADMIN_CREATE"]);
	const hasSalesCreate = useHasPermission("SALES_CREATE");
	const salesOnlyMode = hasSalesCreate && !canCreateFullUser;

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
			navigate(salesOnlyMode ? "/sales-users" : "/admins", { replace: true });
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
				error instanceof Error ? error.message : "Unable to create user",
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
