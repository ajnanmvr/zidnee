import { CreateUserPayloadSchema } from "@repo/schema";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { HiPlusCircle, HiXCircle } from "react-icons/hi2";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "@/api/request";
import { Field, Panel } from "@/components/dashboard-ui";
import { useRolesQuery } from "@/features/roles/roles.queries";
import { useCreateUserMutation } from "@/features/users/use-create-user-mutation";
import type { CreateUserForm } from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

export const CreateUserPage = () => {
	const navigate = useNavigate();
	const { token } = useSession();
	const rolesQuery = useRolesQuery(token);
	const createUserMutation = useCreateUserMutation();
	const {
		control,
		formState,
		handleSubmit,
		setError,
		setValue,
		watch,
	} = useForm<CreateUserForm>({
		defaultValues: {
			name: "",
			username: "",
			email: "",
			password: "",
			roleIds: [],
		},
	});
	const selectedRoleIds = watch("roleIds") ?? [];
	const [banner, setBanner] = useState("");

	const onSubmit = async (form: CreateUserForm) => {
		setBanner("");

		const validation = CreateUserPayloadSchema.safeParse(form);

		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			const nameError = errors.name?.[0];
			const usernameError = errors.username?.[0];
			const emailError = errors.email?.[0];
			const passwordError = errors.password?.[0];
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

			if (passwordError) {
				setError("password", { type: "manual", message: passwordError });
			}

			if (roleIdsError) {
				setError("roleIds", { type: "manual", message: roleIdsError });
			}

			return;
		}

		try {
			await createUserMutation.mutateAsync(validation.data);
			navigate("/users", { replace: true });
		} catch (error) {
			if (error instanceof ApiError) {
				const serverErrors = error.payload.errors ?? {};
				const nameError = serverErrors.name?.[0];
				const usernameError = serverErrors.username?.[0];
				const emailError = serverErrors.email?.[0];
				const passwordError = serverErrors.password?.[0];
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

				if (passwordError) {
					setError("password", { type: "server", message: passwordError });
				}

				if (roleIdsError) {
					setError("roleIds", { type: "server", message: roleIdsError });
				}

				setBanner(error.payload.message ?? "Unable to create user");
				return;
			}

			setBanner(
				error instanceof Error ? error.message : "Unable to create user",
			);
		}
	};

	return (
		<Panel title="Create user" description="Team">
			<form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
				<div className="grid gap-4 md:grid-cols-2">
					<Controller
						name="name"
						control={control}
						render={({ field, fieldState }) => (
							<Field
								label="Full name"
								value={field.value}
								onChange={field.onChange}
								placeholder="Ajnan"
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
								value={field.value}
								onChange={field.onChange}
								placeholder="ajnan"
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
								value={field.value}
								onChange={field.onChange}
								placeholder="ajnan@zidnee.com"
								error={fieldState.error?.message}
							/>
						)}
					/>
					<Controller
						name="password"
						control={control}
						render={({ field, fieldState }) => (
							<Field
								label="Password"
								type="password"
								value={field.value}
								onChange={field.onChange}
								placeholder="Minimum 6 characters"
								error={fieldState.error?.message}
							/>
						)}
					/>
				</div>

				<div className="grid gap-2 text-sm font-medium text-ink-soft">
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
											? "rounded-full border border-brand bg-brand-soft px-3 py-2 text-xs font-semibold text-brand"
											: "rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink-soft"
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
						<p className="rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-ink">
							{formState.errors.roleIds.message}
						</p>
					) : null}
				</div>

				<div className="flex flex-wrap gap-2">
					<button
						type="submit"
						className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-surface disabled:cursor-not-allowed disabled:opacity-70"
						disabled={createUserMutation.isPending}
					>
						<HiPlusCircle className="h-4 w-4" aria-hidden="true" />
						{createUserMutation.isPending ? "Creating..." : "Create user"}
					</button>
					<Link
						to="/users"
						className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-ink"
					>
						<HiXCircle className="h-4 w-4 text-danger" aria-hidden="true" />
						Cancel
					</Link>
				</div>

				{banner ? (
					<p className="rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-ink">
						{banner}
					</p>
				) : null}
			</form>
		</Panel>
	);
};
