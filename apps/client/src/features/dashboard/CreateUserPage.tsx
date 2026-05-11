import { CreateUserPayloadSchema } from "@repo/schema";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { HiArrowLeft, HiCheckCircle } from "react-icons/hi2";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "@/api/request";
import { Field, Panel } from "@/components/dashboard-ui";
import { useRolesQuery } from "@/features/roles/roles.queries";
import { useCreateUserMutation } from "@/features/users/use-create-user-mutation";
import { useSession } from "@/lib/session";

type CreateUserFormData = {
	name: string;
	username: string;
	email: string;
	password: string;
	confirmPassword: string;
	gender: "male" | "female" | undefined;
	roleIds: string[];
};

export const CreateUserPage = () => {
	const navigate = useNavigate();
	const { token } = useSession();
	const rolesQuery = useRolesQuery(token);
	const createUserMutation = useCreateUserMutation();
	const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

	const { control, handleSubmit, setError, watch } = useForm<CreateUserFormData>({
		defaultValues: {
			name: "",
			username: "",
			email: "",
			password: "",
			confirmPassword: "",
			gender: undefined,
			roleIds: [],
		},
	});

	const passwordValue = watch("password");
	const roles = useMemo(() => rolesQuery.data?.roles ?? [], [rolesQuery.data?.roles]);

	const toggleRole = (roleId: string) => {
		setSelectedRoleIds((prev) =>
			prev.includes(roleId)
				? prev.filter((id) => id !== roleId)
				: [...prev, roleId]
		);
	};

	const onSubmit = async (form: CreateUserFormData) => {
		// Validate passwords match
		if (form.password !== form.confirmPassword) {
			setError("confirmPassword", {
				type: "manual",
				message: "Passwords do not match",
			});
			return;
		}

		// Validate at least one role selected
		if (selectedRoleIds.length === 0) {
			toast.error("Please select at least one role");
			return;
		}

		// Validate form
		const validation = CreateUserPayloadSchema.safeParse({
			name: form.name,
			username: form.username,
			email: form.email || undefined,
			password: form.password,
			gender: form.gender,
			roleIds: selectedRoleIds,
		});

		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			if (errors.name?.[0])
				setError("name", { type: "manual", message: errors.name[0] });
			if (errors.username?.[0])
				setError("username", { type: "manual", message: errors.username[0] });
			if (errors.email?.[0])
				setError("email", { type: "manual", message: errors.email[0] });
			if (errors.password?.[0])
				setError("password", { type: "manual", message: errors.password[0] });
			return;
		}

		try {
			await createUserMutation.mutateAsync(validation.data);
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
		<div className="grid gap-6">
			<Panel
				title="Create User"
				description="Add a new user to the system"
				action={
					<Link
						to="/users"
						className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
					>
						<HiArrowLeft className="h-4 w-4" />
						Back
					</Link>
				}
			>
<form className="grid gap-6" onSubmit={handleSubmit(onSubmit)}>
				{/* Personal Information Section */}
				<div className="grid gap-3">
					<div className="flex items-center gap-2">
						<div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600">
							1
						</div>
						<h3 className="text-base font-semibold text-gray-900">
								Personal Information
							</h3>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<Controller
								name="name"
								control={control}
								rules={{ required: "Full name is required" }}
								render={({ field, fieldState }) => (
									<Field
										label="Full name"
										value={field.value}
										onChange={field.onChange}
										placeholder="John Doe"
										error={fieldState.error?.message}
									/>
								)}
							/>
							<Controller
								name="username"
								control={control}
								rules={{ required: "Username is required" }}
								render={({ field, fieldState }) => (
									<Field
										label="Username"
										value={field.value}
										onChange={field.onChange}
										placeholder="johndoe"
										error={fieldState.error?.message}
									/>
								)}
							/>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<Controller
								name="gender"
								control={control}
								render={({ field, fieldState }) => (
									<label className="grid gap-2">
										<span className="text-sm font-medium text-gray-900">
											Gender
										</span>
										<select
											value={field.value ?? ""}
											onChange={(e) =>
												field.onChange(e.target.value || undefined)
											}
											className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
										>
											<option value="">Select gender</option>
											<option value="male">Male</option>
											<option value="female">Female</option>
										</select>
										{fieldState.error?.message && (
											<span className="text-xs text-red-600">
												{fieldState.error.message}
											</span>
										)}
									</label>
								)}
							/>
							<Controller
								name="email"
								control={control}
								render={({ field, fieldState }) => (
									<Field
										label="Email (Optional)"
										type="email"
										value={field.value}
										onChange={field.onChange}
										placeholder="john@example.com"
										error={fieldState.error?.message}
									/>
								)}
							/>
						</div>
					</div>

					{/* Security Section */}
				<div className="grid gap-3">
					<div className="flex items-center gap-2">
						<div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600">
							2
						</div>
						<h3 className="text-base font-semibold text-gray-900">
							</h3>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<Controller
								name="password"
								control={control}
								rules={{ required: "Password is required" }}
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
							<Controller
								name="confirmPassword"
								control={control}
								rules={{ required: "Please confirm your password" }}
								render={({ field, fieldState }) => (
									<Field
										label="Confirm Password"
										type="password"
										value={field.value}
										onChange={field.onChange}
										placeholder="Re-enter password"
										error={fieldState.error?.message}
									/>
								)}
							/>
						</div>
					</div>

					{/* Role Selection Section */}
					<div className="grid gap-3">
						<div className="flex items-center gap-2">
							<div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600">
								3
							</div>
							<h3 className="text-base font-semibold text-gray-900">
								Select Roles
							</h3>
						</div>

						{roles.length > 0 ? (
							<div className="grid gap-2">
								{roles.map((role) => {
									const isSelected = selectedRoleIds.includes(role.id);
									return (
										<button
											key={role.id}
											type="button"
											onClick={() => toggleRole(role.id)}
											className={`rounded-lg border-2 px-3 py-2 text-left transition ${
												isSelected
													? "border-blue-600 bg-blue-50"
													: "border-gray-200 bg-white hover:border-gray-300"
											}`}
										>
											<div className="flex items-center justify-between gap-3">
												<div className="flex-1">
													<div className="flex items-center gap-2">
														<h4 className="text-sm font-medium text-gray-900">
															{role.name}
														</h4>
														<span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
															{role.type}
														</span>
													</div>
													{role.description && (
														<p className="text-xs text-gray-500">
															{role.description}
														</p>
													)}
												</div>
												<div
													className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
														isSelected
															? "border-blue-600 bg-blue-600"
															: "border-gray-300 bg-white"
													}`}
												>
													{isSelected && (
														<HiCheckCircle className="h-4 w-4 text-white" />
													)}
												</div>
											</div>
										</button>
									);
								})}
							</div>
						) : (
							<p className="text-sm text-gray-600">No roles available</p>
						)}

						{selectedRoleIds.length === 0 && (
							<p className="text-sm font-medium text-amber-600">
								Please select at least one role
							</p>
						)}
					</div>

					{/* Action Buttons */}
					<div className="flex flex-wrap gap-2 border-t border-gray-200 pt-4">
						<button
							type="submit"
							disabled={createUserMutation.isPending}
							className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
						>
							{createUserMutation.isPending ? "Creating..." : "Create User"}
						</button>
						<Link
							to="/users"
							className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
						>
							Cancel
						</Link>
					</div>
				</form>
			</Panel>
		</div>
	);
};
