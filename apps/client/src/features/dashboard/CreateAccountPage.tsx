import {
	CreateCounsellorPayloadSchema,
	CreateMentorPayloadSchema,
	CreateUserPayloadSchema,
} from "@repo/schema";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { HiPlusCircle, HiXCircle } from "react-icons/hi2";
import toast from "react-hot-toast";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "@/api/request";
import { Field, Panel } from "@/components/dashboard-ui";
import { useRolesQuery } from "@/features/roles/roles.queries";
import { useCreateCounsellorMutation } from "@/features/users/use-create-counsellor-mutation";
import { useCreateMentorMutation } from "@/features/users/use-create-mentor-mutation";
import { useCreateUserMutation } from "@/features/users/use-create-user-mutation";
import { useUsersQuery } from "@/features/users/users.queries";
import type { CreateCounsellorForm, CreateMentorForm, CreateUserForm } from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

export type CreateAccountRoleType = "general" | "sales" | "mentor" | "counsellor";

type CreateAccountPageProps = {
	defaultRoleType?: CreateAccountRoleType;
	title?: string;
	description?: string;
	backTo?: string;
};

type CreateAccountForm = {
	name: string;
	username: string;
	email: string;
	password: string;
	gender: "male" | "female" | undefined;
	mentorCode?: string;
	counsellorCode?: string;
	counsellorId?: string;
};

const roleLabels: Record<CreateAccountRoleType, string> = {
	general: "User",
	sales: "Sales",
	mentor: "Mentor",
	counsellor: "Counsellor",
};

const rolePrefixes: Record<CreateAccountRoleType, string> = {
	general: "zud",
	sales: "zsl",
	mentor: "zmn",
	counsellor: "zcs",
};

const buildSequentialIdentity = (prefix: string, existingIds: Array<string | undefined>): string => {
	const highest = existingIds.reduce((max, currentId) => {
		if (!currentId || !currentId.startsWith(prefix)) {
			return max;
		}

		const numericPart = Number(currentId.slice(prefix.length));
		if (!Number.isFinite(numericPart)) {
			return max;
		}

		return Math.max(max, numericPart);
	}, 0);

	return `${prefix}${String(highest + 1).padStart(3, "0")}`;
};

const parseRoleFromSearch = (search: string): CreateAccountRoleType | null => {
	const value = new URLSearchParams(search).get("role");
	if (value === "general" || value === "sales" || value === "mentor" || value === "counsellor") {
		return value;
	}

	return null;
};

type SubmitTarget =
	| { kind: "user"; payload: CreateUserForm }
	| { kind: "mentor"; payload: CreateMentorForm }
	| { kind: "counsellor"; payload: CreateCounsellorForm };

export const CreateAccountPage = ({
	defaultRoleType,
	title,
	description,
	backTo,
}: CreateAccountPageProps) => {
	const navigate = useNavigate();
	const location = useLocation();
	const { token } = useSession();
	const usersQuery = useUsersQuery(token);
	const rolesQuery = useRolesQuery(token);
	const createUserMutation = useCreateUserMutation();
	const createMentorMutation = useCreateMentorMutation();
	const createCounsellorMutation = useCreateCounsellorMutation();
	const [roleType, setRoleType] = useState<CreateAccountRoleType>(
		defaultRoleType ?? parseRoleFromSearch(location.search) ?? "general",
	);

	const users = usersQuery.data?.users ?? [];
	const counsellors = useMemo(
		() => users.filter((user) => user.roles.some((role) => role.type === "counsellor")),
		[users],
	);
	const selectedRole = useMemo(
		() => rolesQuery.data?.roles.find((role) => role.type === roleType) ?? null,
		[roleType, rolesQuery.data?.roles],
	);
	const generatedUsername = useMemo(
		() => buildSequentialIdentity(rolePrefixes[roleType], users.map((user) => user.username)),
		[roleType, users],
	);

	const { control, handleSubmit, setError, reset, setValue, watch } = useForm<CreateAccountForm>({
		defaultValues: {
			name: "",
			username: generatedUsername,
			email: "",
			password: "",
			gender: undefined,
			mentorCode: undefined,
			counsellorCode: undefined,
			counsellorId: undefined,
		},
	});

	const usernameValue = watch("username");

	useEffect(() => {
		setValue("username", generatedUsername, { shouldDirty: false, shouldValidate: true });
	}, [generatedUsername, roleType, setValue]);

	const roleTitle = roleLabels[roleType];
	const resolvedTitle = title ?? `Create ${roleTitle.toLowerCase()}`;
	const resolvedDescription = description ?? `Add a new ${roleTitle.toLowerCase()}`;
	const resolvedBackTo =
		backTo ?? (roleType === "mentor" ? "/mentors" : roleType === "counsellor" ? "/counsellors" : roleType === "sales" ? "/users?role=sales" : "/users");

	const resetFormForRole = (nextRole: CreateAccountRoleType) => {
		setRoleType(nextRole);
		reset({
			name: "",
			username: buildSequentialIdentity(rolePrefixes[nextRole], users.map((user) => user.username)),
			email: "",
			password: "",
			gender: undefined,
			mentorCode: undefined,
			counsellorCode: undefined,
			counsellorId: undefined,
		});
	};

	const submitTarget = async (form: CreateAccountForm): Promise<SubmitTarget> => {
		if (roleType === "mentor") {
			const validation = CreateMentorPayloadSchema.safeParse({
				name: form.name,
				username: form.username,
				gender: form.gender,
				mentorCode: form.mentorCode,
				counsellorId: form.counsellorId,
			});
			if (!validation.success) {
				throw validation.error;
			}

			return { kind: "mentor", payload: validation.data };
		}

		if (roleType === "counsellor") {
			const validation = CreateCounsellorPayloadSchema.safeParse({
				name: form.name,
				username: form.username,
				gender: form.gender,
				counsellorCode: form.counsellorCode,
			});
			if (!validation.success) {
				throw validation.error;
			}

			return { kind: "counsellor", payload: validation.data };
		}

		if (!selectedRole) {
			throw new Error(`Role type ${roleType} not found.`);
		}

		const validation = CreateUserPayloadSchema.safeParse({
			name: form.name,
			username: form.username,
			email: form.email,
			password: form.password,
			gender: form.gender,
			roleIds: [selectedRole.id],
		});

		if (!validation.success) {
			throw validation.error;
		}

		return { kind: "user", payload: validation.data };
	};

	const onSubmit = async (form: CreateAccountForm) => {
		try {
			const target = await submitTarget(form);

			if (target.kind === "mentor") {
				await createMentorMutation.mutateAsync(target.payload);
			} else if (target.kind === "counsellor") {
				await createCounsellorMutation.mutateAsync(target.payload);
			} else {
				await createUserMutation.mutateAsync(target.payload);
			}

			toast.success(`${roleTitle} created successfully.`);
			navigate(resolvedBackTo, { replace: true });
		} catch (error) {
			if (error instanceof ApiError) {
				const serverErrors = error.payload.errors ?? {};
				const firstError =
					serverErrors.name?.[0] ??
					serverErrors.username?.[0] ??
					serverErrors.email?.[0] ??
					serverErrors.password?.[0] ??
					serverErrors.gender?.[0] ??
					serverErrors.mentorCode?.[0] ??
					serverErrors.counsellorCode?.[0] ??
					serverErrors.counsellorId?.[0];

				if (firstError) {
					toast.error(firstError);
				} else {
					toast.error(error.payload.message ?? `Unable to create ${roleTitle.toLowerCase()}`);
				}
				return;
			}

			toast.error(error instanceof Error ? error.message : `Unable to create ${roleTitle.toLowerCase()}`);
		}
	};

	const roleOptions: Array<{ value: CreateAccountRoleType; label: string }> = [
		{ value: "general", label: "User" },
		{ value: "sales", label: "Sales" },
		{ value: "mentor", label: "Mentor" },
		{ value: "counsellor", label: "Counsellor" },
	];

	return (
		<Panel title={resolvedTitle} description={resolvedDescription}>
			<form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
				<div className="grid gap-2 text-sm font-medium text-gray-600">
					<span>Account type</span>
					<div className="flex flex-wrap gap-2">
						{roleOptions.map((option) => {
							const active = option.value === roleType;
							return (
								<button
									type="button"
									key={option.value}
									className={active ? "rounded-full border border-blue-600 bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-600" : "rounded-full border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-600"}
									onClick={() => resetFormForRole(option.value)}
								>
									{option.label}
								</button>
							);
						})}
					</div>
				</div>

				<div className="grid gap-4 md:grid-cols-2">
					<Controller
						name="name"
						control={control}
						render={({ field, fieldState }) => (
							<Field label="Full name" value={field.value} onChange={field.onChange} placeholder="Ajnan" error={fieldState.error?.message} />
						)}
					/>
					<Controller
						name="username"
						control={control}
						render={({ field, fieldState }) => (
							<Field label={`${roleTitle} ID`} value={field.value} onChange={field.onChange} placeholder={generatedUsername} error={fieldState.error?.message} />
						)}
					/>
					<Controller
						name="gender"
						control={control}
						render={({ field, fieldState }) => (
							<label className="grid gap-2">
								<span className="text-sm font-medium text-gray-600">Gender</span>
								<select className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={field.value ?? ""} onChange={(event) => field.onChange(event.target.value || undefined)}>
									<option value="">Select gender</option>
									<option value="male">Male</option>
									<option value="female">Female</option>
								</select>
								{fieldState.error?.message ? <span className="text-xs text-red-600">{fieldState.error.message}</span> : null}
							</label>
						)}
					/>
					{roleType === "general" || roleType === "sales" ? (
						<Controller
							name="email"
							control={control}
							render={({ field, fieldState }) => (
								<Field label="Email" value={field.value} onChange={field.onChange} placeholder={`${usernameValue || generatedUsername}@zidnee.com`} error={fieldState.error?.message} />
							)}
						/>
					) : null}
					{roleType === "general" || roleType === "sales" ? (
						<Controller
							name="password"
							control={control}
							render={({ field, fieldState }) => (
								<Field label="Password" type="password" value={field.value} onChange={field.onChange} placeholder="Minimum 6 characters" error={fieldState.error?.message} />
							)}
						/>
					) : null}
					{roleType === "mentor" ? (
						<Controller
							name="mentorCode"
							control={control}
							render={({ field, fieldState }) => (
								<Field label="Mentor code (Optional)" value={field.value ?? ""} onChange={field.onChange} placeholder="Auto-generated if empty" error={fieldState.error?.message} />
							)}
						/>
					) : null}
					{roleType === "counsellor" ? (
						<Controller
							name="counsellorCode"
							control={control}
							render={({ field, fieldState }) => (
								<Field label="Counsellor code (Optional)" value={field.value ?? ""} onChange={field.onChange} placeholder="Auto-generated if empty" error={fieldState.error?.message} />
							)}
						/>
					) : null}
					{roleType === "mentor" ? (
						<Controller
							name="counsellorId"
							control={control}
							render={({ field, fieldState }) => (
								<label className="grid gap-2">
									<span className="text-sm font-medium text-gray-600">Counsellor</span>
									<select className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={field.value ?? ""} onChange={(event) => field.onChange(event.target.value || undefined)}>
										<option value="">No counsellor</option>
										{counsellors.map((counsellor) => (
											<option key={counsellor.id} value={counsellor.id}>
												{counsellor.name}
											</option>
										))}
									</select>
									{fieldState.error?.message ? <span className="text-xs text-red-600">{fieldState.error.message}</span> : null}
								</label>
							)}
						/>
					) : null}
				</div>

				<div className="flex flex-wrap gap-2">
					<button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70" disabled={createUserMutation.isPending || createMentorMutation.isPending || createCounsellorMutation.isPending}>
						<HiPlusCircle className="h-4 w-4" aria-hidden="true" />
						{createUserMutation.isPending || createMentorMutation.isPending || createCounsellorMutation.isPending ? "Creating..." : `Create ${roleTitle.toLowerCase()}`}
					</button>
					<Link to={resolvedBackTo} className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900">
						<HiXCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
						Cancel
					</Link>
				</div>
			</form>
		</Panel>
	);
};