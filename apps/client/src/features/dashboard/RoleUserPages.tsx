import { AdminChangePasswordPayloadSchema, CreateUserPayloadSchema } from "@repo/schema";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { HiCheckCircle, HiLockClosed, HiPencilSquare, HiPower, HiTrash, HiUserPlus } from "react-icons/hi2";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "@/api/request";
import { ActionButton } from "@/components/ActionButton";
import { ConfirmDialog, Field, Modal, Panel } from "@/components/dashboard-ui";
import { useRolesQuery } from "@/features/roles/roles.queries";
import { useCreateUserMutation } from "@/features/users/use-create-user-mutation";
import {
	useChangeUserPasswordMutation,
	useDeleteUserMutation,
	useSetUserStatusMutation,
} from "@/features/users/use-user-management-mutations";
import { useUsersQuery } from "@/features/users/users.queries";
import type { CreateUserForm } from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

type RoleUsersPageProps = {
	title: string;
	description: string;
	roleName: string;
	createPath: string;
};

type RoleCreatePageProps = {
	title: string;
	description: string;
	roleName: string;
	backTo: string;
};

const matchesRole = (name: string, roleName: string) =>
	name.toLowerCase() === roleName.toLowerCase();

export const RoleUsersPage = ({ title, description, roleName, createPath }: RoleUsersPageProps) => {
	const { token } = useSession();
	const usersQuery = useUsersQuery(token);
	const deleteUserMutation = useDeleteUserMutation();
	const setUserStatusMutation = useSetUserStatusMutation();
	const changeUserPasswordMutation = useChangeUserPasswordMutation();
	const navigate = useNavigate();
	const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
	const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
	const [banner, setBanner] = useState("");
	const { control, handleSubmit, reset, setError } = useForm<{ newPassword: string }>({
		defaultValues: { newPassword: "" },
	});
	const allUsers = usersQuery.data?.users ?? [];

	const users = useMemo(() => {
		return allUsers.filter((user) =>
			user.roles.some((role) => matchesRole(role.name, roleName)),
		);
	}, [allUsers, roleName]);
	const identityHeader = roleName.toLowerCase() === "mentor" ? "Mentor ID" : "Counsellor ID";

	const handleToggleStatus = async (userId: string, isActive: boolean) => {
		setBanner("");

		try {
			await setUserStatusMutation.mutateAsync({ userId, isActive: !isActive });
			setBanner(!isActive ? "User activated successfully." : "User deactivated successfully.");
		} catch (error) {
			if (error instanceof ApiError) {
				setBanner(error.payload.message ?? "Unable to update status");
				return;
			}

			setBanner(error instanceof Error ? error.message : "Unable to update status");
		}
	};

	const handleDeleteUser = async () => {
		if (!deleteUserId) {
			return;
		}

		setBanner("");

		try {
			await deleteUserMutation.mutateAsync(deleteUserId);
			setBanner("User deleted successfully.");
			setDeleteUserId(null);
		} catch (error) {
			if (error instanceof ApiError) {
				setBanner(error.payload.message ?? "Unable to delete user");
				return;
			}

			setBanner(error instanceof Error ? error.message : "Unable to delete user");
		}
	};

	const onSubmitPassword = async ({ newPassword }: { newPassword: string }) => {
		if (!passwordUserId) {
			return;
		}

		setBanner("");

		const validation = AdminChangePasswordPayloadSchema.safeParse({ newPassword });
		if (!validation.success) {
			const passwordError = validation.error.flatten().fieldErrors.newPassword?.[0];
			if (passwordError) {
				setError("newPassword", { type: "manual", message: passwordError });
			}
			return;
		}

		try {
			await changeUserPasswordMutation.mutateAsync({
				userId: passwordUserId,
				payload: validation.data,
			});
			setBanner("Password updated successfully.");
			setPasswordUserId(null);
			reset({ newPassword: "" });
		} catch (error) {
			if (error instanceof ApiError) {
				const passwordError = error.payload.errors?.newPassword?.[0];
				if (passwordError) {
					setError("newPassword", { type: "server", message: passwordError });
				}
				setBanner(error.payload.message ?? "Unable to update password");
				return;
			}

			setBanner(error instanceof Error ? error.message : "Unable to update password");
		}
	};

	return (
		<div className="grid gap-6">
			<Panel
				title={title}
				description={description}
				action={
					<Link
						to={createPath}
						className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
					>
						<HiUserPlus className="h-4 w-4" aria-hidden="true" />
						Create {roleName}
					</Link>
				}
			>
				<div className="overflow-x-auto rounded-3xl border border-gray-300">
					<table className="min-w-full border-collapse bg-white text-left text-sm">
						<thead className="bg-gray-50 text-xs uppercase tracking-[0.14em] text-gray-600">
							<tr>
								<th className="px-4 py-3 font-semibold">Name</th>
								<th className="px-4 py-3 font-semibold">Username</th>
								<th className="px-4 py-3 font-semibold">Email</th>
								<th className="px-4 py-3 font-semibold">{identityHeader}</th>
								<th className="px-4 py-3 font-semibold">Roles</th>
								<th className="px-4 py-3 font-semibold">Status</th>
								<th className="px-4 py-3 font-semibold">Actions</th>
							</tr>
						</thead>
						<tbody>
							{users.map((user) => (
								<tr key={user.id} className="border-t border-gray-300 align-top">
									<td className="px-4 py-3 font-semibold text-gray-900">{user.name}</td>
									<td className="px-4 py-3 text-gray-600">{user.username ?? "-"}</td>
									<td className="px-4 py-3 text-gray-600">{user.email}</td>
									<td className="px-4 py-3 text-gray-600">
										{roleName.toLowerCase() === "mentor"
											? user.mentorId ?? "-"
											: user.counsellorId ?? "-"}
									</td>
									<td className="px-4 py-3">
										<div className="flex flex-wrap gap-2">
											{user.roles.map((role) => (
												<span key={role.id} className="rounded-full border border-blue-600/20 bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600">
													{role.name}
												</span>
											))}
										</div>
									</td>
									<td className="px-4 py-3">
										<span className={user.isActive ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700"}>
											{user.isActive ? "Active" : "Inactive"}
										</span>
									</td>
									<td className="px-4 py-3">
										<div className="flex flex-wrap items-center gap-2">
											<button
												type="button"
												className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50"
												onClick={() => navigate(`/users/${user.id}/edit`)}
												title="Edit user"
												aria-label="Edit user"
											>
												<HiPencilSquare className="h-4 w-4" aria-hidden="true" />
											</button>
											<ActionButton
												icon={<HiLockClosed className="h-4 w-4" aria-hidden="true" />}
												tooltip="Change password"
												color="purple"
												onClick={() => {
													setPasswordUserId(user.id);
													reset({ newPassword: "" });
												}}
											/>
											<ActionButton
												icon={<HiPower className="h-4 w-4" aria-hidden="true" />}
												tooltip={user.isActive ? "Deactivate user" : "Activate user"}
												color={user.isActive ? "orange" : "green"}
												onClick={() => void handleToggleStatus(user.id, user.isActive)}
											/>
											<ActionButton
												icon={<HiTrash className="h-4 w-4" aria-hidden="true" />}
												tooltip="Delete user"
												color="red"
												onClick={() => setDeleteUserId(user.id)}
											/>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Panel>

			<ConfirmDialog
				open={Boolean(deleteUserId)}
				title="Delete user"
				description="Are you sure you want to delete this user?"
				confirmLabel="Delete"
				busy={deleteUserMutation.isPending}
				tone="danger"
				onConfirm={() => void handleDeleteUser()}
				onCancel={() => setDeleteUserId(null)}
			/>

			<Modal
				open={Boolean(passwordUserId)}
				title="Change user password"
				description="Security"
				onClose={() => setPasswordUserId(null)}
				footer={
					<>
						<button type="button" className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900" onClick={() => setPasswordUserId(null)}>
							Cancel
						</button>
						<button type="submit" form="role-password-form" className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" disabled={changeUserPasswordMutation.isPending}>
							<HiLockClosed className="h-4 w-4" aria-hidden="true" />
							{changeUserPasswordMutation.isPending ? "Saving..." : "Update password"}
						</button>
					</>
				}
			>
				<form id="role-password-form" onSubmit={handleSubmit(onSubmitPassword)}>
					<Controller
						name="newPassword"
						control={control}
						render={({ field, fieldState }) => (
							<Field
								label="New password"
								type="password"
								value={field.value}
								onChange={field.onChange}
								error={fieldState.error?.message}
							/>
						)}
					/>
				</form>
			</Modal>

			{banner ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{banner}</p> : null}
		</div>
	);
};

export const RoleUserCreatePage = ({ title, description, roleName, backTo }: RoleCreatePageProps) => {
	const { token } = useSession();
	const rolesQuery = useRolesQuery(token);
	const createUserMutation = useCreateUserMutation();
	const { control, handleSubmit, setError } = useForm<CreateUserForm>({
		defaultValues: { name: "", username: "", email: "", password: "", roleIds: [] },
	});
	const [banner, setBanner] = useState("");

	const allRoles = rolesQuery.data?.roles ?? [];
	const role = useMemo(
		() => allRoles.find((item) => matchesRole(item.name, roleName)) ?? null,
		[allRoles, roleName],
	);

	const onSubmit = async (form: CreateUserForm) => {
		if (!role) {
			setBanner(`Role ${roleName} not found.`);
			return;
		}

		setBanner("");
		const validation = CreateUserPayloadSchema.safeParse({ ...form, roleIds: [role.id] });
		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			if (errors.name?.[0]) setError("name", { type: "manual", message: errors.name[0] });
			if (errors.username?.[0]) setError("username", { type: "manual", message: errors.username[0] });
			if (errors.email?.[0]) setError("email", { type: "manual", message: errors.email[0] });
			if (errors.password?.[0]) setError("password", { type: "manual", message: errors.password[0] });
			return;
		}

		try {
			await createUserMutation.mutateAsync(validation.data);
			setBanner(`${roleName} created successfully.`);
		} catch (error) {
			if (error instanceof ApiError) {
				setBanner(error.payload.message ?? `Unable to create ${roleName.toLowerCase()}`);
				return;
			}

			setBanner(error instanceof Error ? error.message : `Unable to create ${roleName.toLowerCase()}`);
		}
	};

	return (
		<Panel title={title} description={description}>
			{role ? (
				<form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
					<div className="grid gap-4 md:grid-cols-2">
						<Controller name="name" control={control} render={({ field, fieldState }) => <Field label="Full name" value={field.value} onChange={field.onChange} placeholder="Ajnan" error={fieldState.error?.message} />} />
						<Controller name="username" control={control} render={({ field, fieldState }) => <Field label="Username" value={field.value} onChange={field.onChange} placeholder="ajnan" error={fieldState.error?.message} />} />
						<Controller name="email" control={control} render={({ field, fieldState }) => <Field label="Email" value={field.value} onChange={field.onChange} placeholder="ajnan@zidnee.com" error={fieldState.error?.message} />} />
						<Controller name="password" control={control} render={({ field, fieldState }) => <Field label="Password" type="password" value={field.value} onChange={field.onChange} placeholder="Minimum 6 characters" error={fieldState.error?.message} />} />
					</div>

					<div className="rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
						Target role: <span className="font-semibold text-gray-900">{role.name}</span>
					</div>

					<div className="flex flex-wrap gap-2">
						<button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70" disabled={createUserMutation.isPending}>
							<HiUserPlus className="h-4 w-4" aria-hidden="true" />
							{createUserMutation.isPending ? "Creating..." : `Create ${roleName}`}
						</button>
						<Link to={backTo} className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900">
							<HiCheckCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
							Cancel
						</Link>
					</div>

					{banner ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{banner}</p> : null}
				</form>
			) : (
				<p className="text-sm text-gray-600">Role {roleName} not found. Create the role first.</p>
			)}
		</Panel>
	);
};




