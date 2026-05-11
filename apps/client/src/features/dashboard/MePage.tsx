import { ChangePasswordPayloadSchema } from "@repo/schema";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ApiError } from "@/api/request";
import { Field, Panel } from "@/components/dashboard-ui";
import { useMeQuery } from "@/features/auth/auth.queries";
import { useChangeMyPasswordMutation } from "@/features/users/use-user-management-mutations";
import type { ChangePasswordForm } from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

export const MePage = () => {
	const { token } = useSession();
	const meQuery = useMeQuery(token);
	const changeMyPasswordMutation = useChangeMyPasswordMutation();
	const { control, handleSubmit, reset, setError } =
		useForm<ChangePasswordForm>({
			defaultValues: {
				currentPassword: "",
				newPassword: "",
			},
		});
	const me = meQuery.data;
	const [banner, setBanner] = useState("");

	const roleNames =
		me?.roles.map((role) => role.type ?? role.name ?? "general").join(", ") ??
		"Workspace member";

	const onSubmit = async (passwordForm: ChangePasswordForm) => {
		setBanner("");

		const validation = ChangePasswordPayloadSchema.safeParse(passwordForm);
		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			const currentPasswordError = errors.currentPassword?.[0];
			const newPasswordError = errors.newPassword?.[0];

			if (currentPasswordError) {
				setError("currentPassword", {
					type: "manual",
					message: currentPasswordError,
				});
			}

			if (newPasswordError) {
				setError("newPassword", { type: "manual", message: newPasswordError });
			}

			return;
		}

		try {
			await changeMyPasswordMutation.mutateAsync(validation.data);
			setBanner("Password updated successfully.");
			reset({ currentPassword: "", newPassword: "" });
		} catch (error) {
			if (error instanceof ApiError) {
				const serverErrors = error.payload.errors ?? {};
				const currentPasswordError = serverErrors.currentPassword?.[0];
				const newPasswordError = serverErrors.newPassword?.[0];

				if (currentPasswordError) {
					setError("currentPassword", {
						type: "server",
						message: currentPasswordError,
					});
				}

				if (newPasswordError) {
					setError("newPassword", {
						type: "server",
						message: newPasswordError,
					});
				}

				setBanner(error.payload.message ?? "Unable to update password");
				return;
			}

			setBanner(
				error instanceof Error ? error.message : "Unable to update password",
			);
		}
	};

	return (
		<div className="grid gap-6">
			<Panel title="My profile" description="Me">
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3">
						<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-600">
							User ID
						</p>
						<p className="mt-1 text-sm font-semibold text-gray-900">
							{me?.id ?? "-"}
						</p>
					</div>
					<div className="rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3">
						<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-600">
							Username
						</p>
						<p className="mt-1 text-sm font-semibold text-gray-900">
							{me?.username ?? "-"}
						</p>
					</div>
					<div className="rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3">
						<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-600">
							Name
						</p>
						<p className="mt-1 text-sm font-semibold text-gray-900">
							{me?.name ?? "-"}
						</p>
					</div>
					<div className="rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3">
						<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-600">
							Role
						</p>
						<p className="mt-1 text-sm font-semibold text-gray-900">
							{roleNames}
						</p>
					</div>
					<div className="rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 sm:col-span-2">
						<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-600">
							Email
						</p>
						<p className="mt-1 text-sm font-semibold text-gray-900">
							{me?.email ?? "-"}
						</p>
					</div>
				</div>
				{meQuery.error ? (
					<p className="mt-4 rounded-2xl border border-red-600/20 bg-red-600-soft px-4 py-3 text-sm text-gray-900">
						Unable to load profile.
					</p>
				) : null}
			</Panel>

			<Panel title="Change password" description="Security">
				<form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
					<div className="grid gap-4 md:grid-cols-2">
						<Controller
							name="currentPassword"
							control={control}
							render={({ field, fieldState }) => (
								<Field
									label="Current password"
									type="password"
									value={field.value}
									onChange={field.onChange}
									error={fieldState.error?.message}
								/>
							)}
						/>
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
					</div>
					<div className="mt-4">
						<button
							type="submit"
							className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
							disabled={changeMyPasswordMutation.isPending}
						>
							{changeMyPasswordMutation.isPending
								? "Saving..."
								: "Update password"}
						</button>
					</div>
				</form>
			</Panel>

			{banner ? (
				<p className="rounded-2xl border border-blue-600/15 bg-blue-100 px-4 py-3 text-sm text-blue-600">
					{banner}
				</p>
			) : null}
		</div>
	);
};
