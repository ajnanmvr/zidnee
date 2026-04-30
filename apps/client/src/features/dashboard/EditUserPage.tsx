import { UpdateUserPayloadSchema } from "@repo/schema";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { HiCheckCircle, HiUserPlus } from "react-icons/hi2";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "@/api/request";
import { Field, Panel } from "@/components/dashboard-ui";
import { useRolesQuery } from "@/features/roles/roles.queries";
import { useUpdateUserMutation } from "@/features/users/use-user-management-mutations";
import { useUsersQuery } from "@/features/users/users.queries";
import type { UpdateUserForm } from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

export const EditUserPage = () => {
	const { userId = "" } = useParams();
	const navigate = useNavigate();
	const { token } = useSession();
	const usersQuery = useUsersQuery(token);
	const rolesQuery = useRolesQuery(token);
	const updateUserMutation = useUpdateUserMutation();
	const { control, formState, handleSubmit, reset, setError, setValue, watch } =
		useForm<UpdateUserForm>({
			defaultValues: {
				name: "",
				username: "",
				email: "",
				roleIds: [],
			},
		});
	const selectedRoleIds = watch("roleIds") ?? [];

	const user = useMemo(
		() => usersQuery.data?.users.find((row) => row.id === userId) ?? null,
		[userId, usersQuery.data?.users],
	);

	const [banner, setBanner] = useState("");

	useEffect(() => {
		if (!user) {
			return;
		}

		reset({
			name: user.name,
			username: user.username ?? "",
			email: user.email,
			roleIds: user.roles.map((role) => role.id),
		});
	}, [reset, user]);

	const onSubmit = async (form: UpdateUserForm) => {
		if (!userId) {
			return;
		}

		setBanner("");

		const validation = UpdateUserPayloadSchema.safeParse(form);
		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			const nameError = errors.name?.[0];
			const usernameError = errors.username?.[0];
			const emailError = errors.email?.[0];
			const roleIdsError = errors.roleIds?.[0];

			if (nameError) {
				setError("name", { type: "manual", message: nameError });
			}

			if (usernameError) {
				setError("username", { type: "manual", message: usernameError });
			}

			if (emailError) {
				setError("email", { type: "manual", message: emailError });
			}

			if (roleIdsError) {
				setError("roleIds", { type: "manual", message: roleIdsError });
			}

			return;
		}

		try {
			await updateUserMutation.mutateAsync({
				userId,
				payload: validation.data,
			});
			navigate("/users");
		} catch (error) {
			if (error instanceof ApiError) {
				const serverErrors = error.payload.errors ?? {};
				const nameError = serverErrors.name?.[0];
				const usernameError = serverErrors.username?.[0];
				const emailError = serverErrors.email?.[0];
				const roleIdsError = serverErrors.roleIds?.[0];

				if (nameError) {
					setError("name", { type: "server", message: nameError });
				}

				if (usernameError) {
					setError("username", { type: "server", message: usernameError });
				}

				if (emailError) {
					setError("email", { type: "server", message: emailError });
				}

				if (roleIdsError) {
					setError("roleIds", { type: "server", message: roleIdsError });
				}

				setBanner(error.payload.message ?? "Unable to update user");
				return;
			}

			setBanner(
				error instanceof Error ? error.message : "Unable to update user",
			);
		}
	};

	if (!user) {
		return (
			<Panel
				title="Edit user"
				description="Update"
				action={
					<Link
						to="/users"
						className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
					>
						Back
					</Link>
				}
			>
				<p className="text-sm text-gray-600">User not found.</p>
			</Panel>
		);
	}

	return (
		<Panel
			title="Edit user"
			description="Update"
			action={
				<Link
					to="/users"
					className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
				>
					<HiUserPlus className="h-4 w-4" aria-hidden="true" />
					Back to users
				</Link>
			}
		>
			<form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
				<div className="grid gap-4 md:grid-cols-2">
					<Controller
						name="name"
						control={control}
						render={({ field, fieldState }) => (
							<Field
								label="Full name"
								value={field.value ?? ""}
								onChange={field.onChange}
								error={fieldState.error?.message}
							/>
						)}
					/>
					<Controller
						name="username"
						control={control}
						render={({ field, fieldState }) => (
							<Field
								label="Username"
								value={field.value ?? ""}
								onChange={field.onChange}
								error={fieldState.error?.message}
							/>
						)}
					/>
					<Controller
						name="email"
						control={control}
						render={({ field, fieldState }) => (
							<Field
								label="Email"
								value={field.value ?? ""}
								onChange={field.onChange}
								error={fieldState.error?.message}
							/>
						)}
					/>
				</div>

				<div className="mt-4 grid gap-2 text-sm font-medium text-gray-600">
					<span>Roles</span>
					<div className="flex flex-wrap gap-2">
						{rolesQuery.data?.roles.map((role) => {
							const selected = selectedRoleIds.includes(role.id);
							return (
								<button
									type="button"
									key={role.id}
									className={
										selected
											? "rounded-full border border-blue-600 bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-600"
											: "rounded-full border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-600"
									}
									onClick={() => {
										const nextRoleIds = selected
											? selectedRoleIds.filter((roleId) => roleId !== role.id)
											: [...selectedRoleIds, role.id];

										setValue("roleIds", nextRoleIds, {
											shouldValidate: true,
											shouldDirty: true,
										});
									}}
								>
									{role.name}
								</button>
							);
						})}
					</div>
					{formState.errors.roleIds?.message ? (
						<p className="rounded-2xl border border-red-600/20 bg-red-600-soft px-4 py-3 text-sm text-gray-900">
							{formState.errors.roleIds.message}
						</p>
					) : null}
				</div>

				<div className="mt-5 flex gap-2">
					<button
						type="submit"
						className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
						disabled={updateUserMutation.isPending}
					>
						<HiCheckCircle className="h-4 w-4" aria-hidden="true" />
						{updateUserMutation.isPending ? "Saving..." : "Save changes"}
					</button>
					<Link
						to="/users"
						className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
					>
						Cancel
					</Link>
				</div>
			</form>

			{banner ? (
				<p className="mt-4 rounded-2xl border border-blue-600/15 bg-blue-100 px-4 py-3 text-sm text-blue-600">
					{banner}
				</p>
			) : null}
		</Panel>
	);
};




