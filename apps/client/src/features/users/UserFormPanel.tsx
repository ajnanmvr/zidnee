import { CreateUserPayloadSchema, UpdateUserPayloadSchema } from "@repo/schema";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { HiArrowLeft, HiCheckCircle } from "react-icons/hi2";
import { Link } from "react-router-dom";
import { Field, Panel } from "@/components/dashboard-ui";
import { useRolesQuery } from "@/features/roles/roles.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useHasPermission } from "@/lib/hooks/use-has-permission";
import { useSession } from "@/lib/session";

type CreateUserFormData = {
	name: string;
	username: string;
	email: string;
	password?: string;
	confirmPassword?: string;
	gender: "male" | "female" | undefined;
	roleIds: string[];
	counsellorId?: string;
};

export type UserFormPanelProps = {
	mode: "create" | "edit";
	user?: {
		id: string;
		name: string;
		username: string;
		email?: string;
		roles: Array<{ id: string; name: string; type: string }>;
		counsellorId?: string;
	};
	onSubmit: (data: CreateUserFormData) => Promise<void>;
	isLoading: boolean;
	title?: string;
	description?: string;
	submitLabel?: string;
};

export const UserFormPanel: React.FC<UserFormPanelProps> = ({
	mode,
	user,
	onSubmit,
	isLoading,
	title,
	description,
	submitLabel,
}) => {
	const { token } = useSession();
	const canCreateUser = useHasPermission("USER_CREATE");
	const canUpdateUser = useHasPermission("USER_UPDATE");
	const rolesQuery = useRolesQuery(token);
	const usersQuery = useUsersQuery(token);
	const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(
		mode === "edit" && user ? user.roles.map((r) => r.id) : [],
	);

	const counsellors = useMemo(
		() =>
			(usersQuery.data?.users ?? []).filter((row) =>
				row.roles.some((role) => role.type === "counsellor"),
			),
		[usersQuery.data?.users],
	);

	const mentorRoleId = useMemo(
		() =>
			rolesQuery.data?.roles.find((role) => role.type === "mentor")?.id ?? null,
		[rolesQuery.data?.roles],
	);

	const showCounsellorSelector =
		mode === "edit" && mentorRoleId
			? selectedRoleIds.includes(mentorRoleId)
			: false;

	const { control, handleSubmit, setError } = useForm<CreateUserFormData>({
		defaultValues: {
			name: user?.name ?? "",
			username: user?.username ?? "",
			email: user?.email ?? "",
			password: "",
			confirmPassword: "",
			gender: undefined,
			roleIds: mode === "edit" && user ? user.roles.map((r) => r.id) : [],
			counsellorId: user?.counsellorId ?? undefined,
		},
	});

	const roles = useMemo(
		() => rolesQuery.data?.roles ?? [],
		[rolesQuery.data?.roles],
	);

	if ((mode === "create" && !canCreateUser) || (mode === "edit" && !canUpdateUser)) {
		return (
			<Panel
				title={title ?? (mode === "create" ? "Create User" : "Edit user")}
				description={
					description ??
					(mode === "create" ? "Add a new user to the system" : "Update")
				}
			>
				<p className="text-sm text-gray-600">
					You do not have permission to {mode === "create" ? "create" : "edit"} users.
				</p>
			</Panel>
		);
	}

	const toggleRole = (roleId: string) => {
		setSelectedRoleIds((prev) =>
			prev.includes(roleId)
				? prev.filter((id) => id !== roleId)
				: [...prev, roleId],
		);
	};

	const handleFormSubmit = async (form: CreateUserFormData) => {
		// Validate passwords match (only for create mode)
		if (mode === "create") {
			if (form.password !== form.confirmPassword) {
				setError("confirmPassword", {
					type: "manual",
					message: "Passwords do not match",
				});
				return;
			}

			if (!form.password) {
				setError("password", {
					type: "manual",
					message: "Password is required",
				});
				return;
			}
		}

		// Validate at least one role selected
		if (selectedRoleIds.length === 0) {
			toast.error("Please select at least one role");
			return;
		}

		// Validate form based on mode
		const schema =
			mode === "create" ? CreateUserPayloadSchema : UpdateUserPayloadSchema;
		const payload =
			mode === "create"
				? {
						name: form.name,
						username: form.username,
						email: form.email || undefined,
						password: form.password,
						gender: form.gender,
						roleIds: selectedRoleIds,
					}
				: {
						name: form.name,
						username: form.username,
						email: form.email || undefined,
						gender: form.gender,
						roleIds: selectedRoleIds,
						counsellorId: form.counsellorId,
					};

		const validation = schema.safeParse(payload);

		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			if (errors.name?.[0])
				setError("name", { type: "manual", message: errors.name[0] });
			if (errors.username?.[0])
				setError("username", { type: "manual", message: errors.username[0] });
			if (errors.email?.[0])
				setError("email", { type: "manual", message: errors.email[0] });
			if (mode === "create" && (errors as any).password?.[0])
				setError("password", {
					type: "manual",
					message: (errors as any).password[0],
				});
			if (errors.roleIds?.[0])
				setError("roleIds", { type: "manual", message: errors.roleIds[0] });
			return;
		}

		try {
			await onSubmit(payload as CreateUserFormData);
		} catch (error) {
			// Error is already handled in parent component
		}
	};

	return (
		<div className="grid gap-6">
			<Panel
				title={title ?? (mode === "create" ? "Create User" : "Edit user")}
				description={
					description ??
					(mode === "create" ? "Add a new user to the system" : "Update")
				}
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
				<form className="grid gap-6" onSubmit={handleSubmit(handleFormSubmit)}>
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

					{/* Security Section (only for create mode) */}
					{mode === "create" && (
						<div className="grid gap-3">
							<div className="flex items-center gap-2">
								<div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600">
									2
								</div>
								<h3 className="text-base font-semibold text-gray-900">
									Security
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
											value={field.value ?? ""}
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
											value={field.value ?? ""}
											onChange={field.onChange}
											placeholder="Re-enter password"
											error={fieldState.error?.message}
										/>
									)}
								/>
							</div>
						</div>
					)}

					{/* Role Selection Section */}
					<div className="grid gap-3">
						<div className="flex items-center gap-2">
							<div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600">
								{mode === "create" ? 3 : 2}
							</div>
							<h3 className="text-base font-semibold text-gray-900">
								Select Roles
							</h3>
						</div>

						{roles.length > 0 ? (
							<div className="grid md:grid-cols-3 gap-2">
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

					{/* Counsellor Selector (only for edit mode when mentor is selected) */}
					{showCounsellorSelector && (
						<div className="grid gap-3">
							<div className="flex items-center gap-2">
								<div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600">
									3
								</div>
								<h3 className="text-base font-semibold text-gray-900">
									Counsellor Assignment
								</h3>
							</div>

							<Controller
								name="counsellorId"
								control={control}
								render={({ field, fieldState }) => (
									<label className="grid gap-2">
										<select
											className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
											value={field.value ?? ""}
											onChange={(event) =>
												field.onChange(event.target.value || undefined)
											}
										>
											<option value="">No counsellor</option>
											{counsellors.map((counsellor) => (
												<option key={counsellor.id} value={counsellor.id}>
													{counsellor.zids?.counsellor
														? `${counsellor.zids.counsellor} - ${counsellor.name ?? counsellor.username}`
														: counsellor.name ?? counsellor.username}
												</option>
											))}
										</select>
										{fieldState.error?.message ? (
											<p className="text-xs text-red-600">
												{fieldState.error.message}
											</p>
										) : null}
									</label>
								)}
							/>
						</div>
					)}

					{/* Action Buttons */}
					<div className="flex flex-wrap gap-2 border-t border-gray-200 pt-4">
						<button
							type="submit"
							disabled={isLoading}
							className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
						>
							<HiCheckCircle className="h-4 w-4" />
							{isLoading
								? mode === "create"
									? "Creating..."
									: "Saving..."
								: (submitLabel ??
									(mode === "create" ? "Create User" : "Save changes"))}
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
