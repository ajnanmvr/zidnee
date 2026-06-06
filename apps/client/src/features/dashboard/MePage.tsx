import { ChangePasswordPayloadSchema } from "@repo/schema";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import {
	HiArrowRightOnRectangle,
	HiEnvelope,
	HiIdentification,
	HiKey,
	HiLockClosed,
	HiShieldCheck,
	HiUser,
	HiUserCircle,
} from "react-icons/hi2";
import { ApiError } from "@/api/request";
import { Field, Modal } from "@/components/dashboard-ui";
import { useMeQuery } from "@/features/auth/auth.queries";
import { useChangeMyPasswordMutation } from "@/features/users/use-user-management-mutations";
import type { ChangePasswordForm } from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

const AVATAR_COLORS = [
	"from-teal-500 to-emerald-600",
	"from-blue-500 to-indigo-600",
	"from-violet-500 to-purple-600",
	"from-rose-500 to-pink-600",
	"from-amber-500 to-orange-500",
];
function avatarGradient(str: string) {
	let h = 0;
	for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
	return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length] ?? AVATAR_COLORS[0];
}

export const MePage = () => {
	const { token, clearToken } = useSession();
	const navigate = useNavigate();
	const meQuery = useMeQuery(token);
	const changeMyPasswordMutation = useChangeMyPasswordMutation();
	const { control, handleSubmit, reset, setError } = useForm<ChangePasswordForm>({
		defaultValues: { currentPassword: "", newPassword: "" },
	});
	const me = meQuery.data;
	const [banner, setBanner] = useState<{ type: "success" | "error"; msg: string } | null>(null);
	const [passwordModalOpen, setPasswordModalOpen] = useState(false);

	const roleNames = me?.roles.map((r) => r.type ?? r.name ?? "general").join(", ") ?? "Workspace member";

	const initials = useMemo(() => {
		const name = me?.name ?? me?.username ?? "";
		return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
	}, [me]);

	const gradientCls = avatarGradient(me?.id ?? "");

	const onSubmit = async (form: ChangePasswordForm) => {
		setBanner(null);
		const validation = ChangePasswordPayloadSchema.safeParse(form);
		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			if (errors.currentPassword?.[0]) setError("currentPassword", { type: "manual", message: errors.currentPassword[0] });
			if (errors.newPassword?.[0]) setError("newPassword", { type: "manual", message: errors.newPassword[0] });
			return;
		}
		try {
			await changeMyPasswordMutation.mutateAsync(validation.data);
			setBanner({ type: "success", msg: "Password updated successfully." });
			reset({ currentPassword: "", newPassword: "" });
			setPasswordModalOpen(false);
		} catch (error) {
			if (error instanceof ApiError) {
				const serverErrors = error.payload.errors ?? {};
				if (serverErrors.currentPassword?.[0]) setError("currentPassword", { type: "server", message: serverErrors.currentPassword[0] });
				if (serverErrors.newPassword?.[0]) setError("newPassword", { type: "server", message: serverErrors.newPassword[0] });
				setBanner({ type: "error", msg: error.payload.message ?? "Unable to update password" });
				return;
			}
			setBanner({ type: "error", msg: error instanceof Error ? error.message : "Unable to update password" });
		}
	};

	return (
		<div className="space-y-4">
			{/* Hero card */}
			<div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
				{/* Gradient bar */}
				<div className={`h-24 bg-linear-to-r ${gradientCls}`} />

				<div className="px-6 pb-6">
					{/* Avatar overlapping the bar */}
					<div className={`-mt-10 mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-linear-to-br ${gradientCls} text-2xl font-bold text-white shadow-lg ring-4 ring-white`}>
						{initials || <HiUserCircle className="h-10 w-10" />}
					</div>

					<div className="flex flex-wrap items-end justify-between gap-4">
						<div>
							<h1 className="text-2xl font-bold text-gray-900">{me?.name ?? me?.username ?? "—"}</h1>
							<p className="mt-0.5 text-sm text-gray-500">{me?.username} · <span className="capitalize">{roleNames}</span></p>
							{me?.email ? (
								<div className="mt-2 flex items-center gap-1.5 text-sm text-gray-600">
									<HiEnvelope className="h-4 w-4 text-gray-400" />
									{me.email}
								</div>
							) : null}
						</div>

						{/* Stat pills */}
						<div className="flex flex-wrap gap-2">
							<div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
								<HiShieldCheck className="h-4 w-4 text-violet-500" />
								<div>
									<p className="text-xs text-gray-500">Roles</p>
									<p className="text-sm font-bold text-gray-900">{me?.roles?.length ?? 0}</p>
								</div>
							</div>
							<div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
								<HiLockClosed className="h-4 w-4 text-blue-500" />
								<div>
									<p className="text-xs text-gray-500">Permissions</p>
									<p className="text-sm font-bold text-gray-900">{me?.permissions?.length ?? 0}</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{banner ? (
				<div className={`rounded-xl border px-4 py-3 text-sm ${banner.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
					{banner.msg}
				</div>
			) : null}

			{/* Details + actions */}
			<div className="grid gap-4 lg:grid-cols-3">
				{/* Profile details */}
				<div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
					<h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-400">Profile Details</h2>
					<div className="grid gap-4 sm:grid-cols-2">
						{[
							{ label: "Username", value: me?.username, icon: <HiUser className="h-4 w-4" /> },
							{ label: "Full Name", value: me?.name, icon: <HiUserCircle className="h-4 w-4" /> },
							{ label: "Email", value: me?.email, icon: <HiEnvelope className="h-4 w-4" /> },
							{ label: "Role", value: roleNames, icon: <HiShieldCheck className="h-4 w-4" /> },
						].map(({ label, value, icon }) => (
							<div key={label} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
								<span className="mt-0.5 text-gray-400">{icon}</span>
								<div>
									<p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
									<p className="mt-0.5 text-sm font-semibold text-gray-900">{value ?? "—"}</p>
								</div>
							</div>
						))}
					</div>

					{/* ZIDs */}
					{me?.zids && Object.values(me.zids).some(Boolean) ? (
						<div className="mt-4">
							<p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">ZIDs</p>
							<div className="flex flex-wrap gap-2">
								{Object.entries(me.zids).map(([k, v]) =>
									v ? (
										<span key={k} className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
											<HiIdentification className="h-3.5 w-3.5" />
											{k}: {v}
										</span>
									) : null,
								)}
							</div>
						</div>
					) : null}
				</div>

				{/* Quick actions */}
				<div className="space-y-3">
					<div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
						<h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-400">Quick Actions</h2>
						<div className="space-y-2">
							<button
								type="button"
								onClick={() => setPasswordModalOpen(true)}
								className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm font-semibold text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
							>
								<HiKey className="h-4 w-4 shrink-0" />
								Change Password
							</button>
							<Link
								to="/me/permissions"
								className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
							>
								<HiLockClosed className="h-4 w-4 shrink-0" />
								View My Permissions
							</Link>
						</div>
					</div>

					{/* Assigned roles */}
					{(me?.roles?.length ?? 0) > 0 ? (
						<div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
							<h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">My Roles</h2>
							<div className="flex flex-wrap gap-2">
								{me?.roles.map((r) => (
									<span key={r.id} className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 capitalize">
										<HiShieldCheck className="h-3.5 w-3.5" />
										{r.name ?? r.type ?? "Role"}
									</span>
								))}
							</div>
						</div>
					) : null}

					{/* Logout */}
					<button
						type="button"
						onClick={() => { clearToken(); navigate("/login", { replace: true }); }}
						className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
					>
						<HiArrowRightOnRectangle className="h-4 w-4" />
						Sign Out
					</button>
				</div>
			</div>

			{/* Password modal */}
			<Modal
				open={passwordModalOpen}
				onClose={() => { setPasswordModalOpen(false); reset(); }}
				title="Change Password"
			>
				<form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
					<div className="grid gap-4 sm:grid-cols-2">
						<Controller name="currentPassword" control={control}
							render={({ field, fieldState }) => (
								<Field label="Current password" type="password" value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
							)}
						/>
						<Controller name="newPassword" control={control}
							render={({ field, fieldState }) => (
								<Field label="New password" type="password" value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
							)}
						/>
					</div>
					<div className="flex justify-end gap-2 pt-2">
						<button type="button" onClick={() => { setPasswordModalOpen(false); reset(); }}
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
							Cancel
						</button>
						<button type="submit" disabled={changeMyPasswordMutation.isPending}
							className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
							{changeMyPasswordMutation.isPending ? "Saving…" : "Update Password"}
						</button>
					</div>
				</form>
			</Modal>
		</div>
	);
};
