import { ChangePasswordPayloadSchema } from "@repo/schema";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ApiError } from "@/api/request";
import { Field, Panel, Modal } from "@/components/dashboard-ui";
import { useMeQuery } from "@/features/auth/auth.queries";
import { useChangeMyPasswordMutation } from "@/features/users/use-user-management-mutations";
import type { ChangePasswordForm } from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";
import { Link, useNavigate } from "react-router-dom";
// icons intentionally omitted to keep design lightweight


export const MePage = () => {
	const { token, clearToken } = useSession();
	const navigate = useNavigate();
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
	const [passwordModalOpen, setPasswordModalOpen] = useState(false);

	const roleNames =
		me?.roles.map((role) => role.type ?? role.name ?? "general").join(", ") ??
		"Workspace member";

	const initials = useMemo(() => {
		const name = me?.name ?? me?.username ?? "";
		return name
			.split(" ")
			.map((p) => p[0])
			.join("")
			.slice(0, 2)
			.toUpperCase();
	}, [me]);

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
			<section className="rounded-4xl overflow-hidden bg-linear-to-br from-emerald-800 via-slate-900 to-slate-800 text-white shadow-lg">
				<div className="p-6 lg:p-8 grid lg:grid-cols-3 gap-6 items-center">
					<div className="flex items-center gap-4 lg:col-span-1">
						<div className="h-20 w-20 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold text-white">{initials}</div>
						<div>
							<h1 className="text-2xl font-bold">{me?.name ?? me?.username ?? "-"}</h1>
							<p className="text-sm opacity-80">{me?.username ?? "-"} · {roleNames}</p>
							<div className="mt-3 flex items-center gap-2">
								<span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium">{me?.email ?? "No email"}</span>
								<button onClick={() => setPasswordModalOpen(true)} className="rounded-2xl bg-white/10 px-3 py-1 text-sm font-semibold">Change password</button>
							</div>
						</div>
					</div>

					<div className="lg:col-span-2 grid grid-cols-2 gap-4">
						<div className="rounded-2xl bg-white/5 p-4">
							<p className="text-xs uppercase tracking-wide text-white/70">ZIDs</p>
							<div className="mt-3 flex flex-wrap gap-2">
								{me?.zids ? (
									Object.entries(me.zids || {}).map(([k, v]) =>
										v ? (
											<span key={k} className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-sm font-medium">{k}: {v}</span>
										) : null,
									)
								) : (
									<p className="text-sm text-white/60">No ZIDs assigned</p>
								)}
							</div>
						</div>

						<div className="rounded-2xl bg-white/5 p-4">
							<p className="text-xs uppercase tracking-wide text-white/70">Quick stats</p>
							<div className="mt-3 grid grid-cols-3 gap-2">
								<div className="text-center">
									<div className="text-lg font-bold">{me?.roles?.length ?? 0}</div>
									<div className="text-xs text-white/70">Roles</div>
								</div>
								<div className="text-center">
									<div className="text-lg font-bold">{me?.permissions?.length ?? 0}</div>
									<div className="text-xs text-white/70">Permissions</div>
								</div>
								<div className="text-center">
									<div className="text-lg font-bold">{me?.permissions?.length ?? 0}</div>
									<div className="text-xs text-white/70">Permissions</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			<div className="grid lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2">
					<Panel title="Details" description="Your profile information">
						<div className="grid gap-4 sm:grid-cols-2">
						<div>
							<p className="text-xs text-gray-500">Username</p>
							<p className="mt-1 text-sm font-semibold text-gray-900">{me?.username ?? "-"}</p>
						</div>
						<div>
							<p className="text-xs text-gray-500">Name</p>
							<p className="mt-1 text-sm font-semibold text-gray-900">{me?.name ?? "-"}</p>
						</div>
						<div>
							<p className="text-xs text-gray-500">Email</p>
							<p className="mt-1 text-sm font-semibold text-gray-900">{me?.email ?? "-"}</p>
						</div>
						<div>
							<p className="text-xs text-gray-500">Roles</p>
							<p className="mt-1 text-sm font-semibold text-gray-900">{roleNames}</p>
						</div>
					</div>
					</Panel>
				</div>

				<Panel title="Permissions" description="Open the full permission table">
					<div className="flex flex-col gap-3">
						<p className="text-sm text-gray-600">
							View every permission you currently have, with the key, resource, action, and description.
						</p>
						<Link
							to="/me/permissions"
							className="inline-flex items-center justify-center rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
						>
							View my permissions
						</Link>
					</div>
				</Panel>
			</div>

			{banner ? (
				<p className="rounded-2xl border border-blue-600/15 bg-blue-100 px-4 py-3 text-sm text-blue-600">
					{banner}
				</p>
			) : null}

			<Modal open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} title="Change password">
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
					<div className="mt-4 flex justify-end gap-2">
						<button type="button" onClick={() => setPasswordModalOpen(false)} className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold">Cancel</button>
						<button
							type="submit"
							className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
							disabled={changeMyPasswordMutation.isPending}
						>
							{changeMyPasswordMutation.isPending ? "Saving..." : "Update password"}
						</button>
					</div>
				</form>
			</Modal>

			<div className="mt-6">
				<button
					type="button"
					className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700"
					onClick={() => {
						clearToken();
						navigate("/login", { replace: true });
					}}
				>
					Logout
				</button>
			</div>
		</div>
	);
};
