import { CreateRolePayloadSchema } from "@repo/schema";
import { type FormEvent, useState } from "react";
import { Field, TextAreaField } from "@/components/dashboard-ui.js";
import {
	usePermissionsQuery,
	useRolesQuery,
} from "@/features/dashboard/dashboard.queries.js";
import { useCreateRoleMutation } from "@/features/roles/use-create-role-mutation.js";
import { ApiError } from "@/lib/api.js";
import { useSession } from "@/lib/session.js";

export const RolesPage = () => {
	const { token } = useSession();
	const rolesQuery = useRolesQuery(token);
	const permissionsQuery = usePermissionsQuery(token);
	const createRoleMutation = useCreateRoleMutation();
	const [form, setForm] = useState({
		name: "",
		description: "",
		permissionIds: [] as string[],
	});
	const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
	const [banner, setBanner] = useState("");

	const togglePermission = (permissionId: string) => {
		setForm((current) => ({
			...current,
			permissionIds: current.permissionIds.includes(permissionId)
				? current.permissionIds.filter((id) => id !== permissionId)
				: [...current.permissionIds, permissionId],
		}));
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setFieldErrors({});
		setBanner("");

		const validation = CreateRolePayloadSchema.safeParse({
			name: form.name,
			description: form.description || undefined,
			permissionIds: form.permissionIds,
		});

		if (!validation.success) {
			setFieldErrors(validation.error.flatten().fieldErrors);
			return;
		}

		try {
			await createRoleMutation.mutateAsync(validation.data);
			setBanner("Role created");
			setForm({ name: "", description: "", permissionIds: [] });
		} catch (error) {
			if (error instanceof ApiError) {
				setFieldErrors(error.payload.errors ?? {});
				setBanner(error.payload.message ?? "Unable to create role");
				return;
			}

			setBanner(
				error instanceof Error ? error.message : "Unable to create role",
			);
		}
	};

	return (
		<div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
			<section className="rounded-4xl border border-border bg-surface p-6 shadow-sm">
				<div className="flex items-center justify-between gap-4">
					<div>
						<p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand">
							Builder
						</p>
						<h3 className="mt-1 text-xl font-semibold text-ink">Create role</h3>
					</div>
					<span className="rounded-full bg-accent-soft px-3 py-1.5 text-sm font-medium text-ink">
						Compose permissions
					</span>
				</div>
				<form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
					<Field
						label="Name"
						value={form.name}
						onChange={(value) =>
							setForm((current) => ({ ...current, name: value }))
						}
						placeholder="Support Agent"
						error={fieldErrors.name?.[0]}
					/>
					<TextAreaField
						label="Description"
						value={form.description}
						onChange={(value) =>
							setForm((current) => ({ ...current, description: value }))
						}
						placeholder="Short role summary"
						error={fieldErrors.description?.[0]}
					/>
					<div className="grid gap-2 text-sm font-medium text-black/70">
						<span>Permissions</span>
						<div className="flex flex-wrap gap-2">
							{permissionsQuery.data?.permissions.map((permission) => (
								<button
									type="button"
									key={permission.id}
									className={
										form.permissionIds.includes(permission.id)
											? "rounded-full border border-brand bg-brand px-3 py-2 text-xs font-semibold text-surface transition hover:opacity-90"
											: "rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-accent hover:bg-accent-soft"
									}
									onClick={() => togglePermission(permission.id)}
								>
									{permission.key}
								</button>
							))}
						</div>
					</div>
					{fieldErrors.permissionIds?.map((error) => (
						<p
							className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
							key={error}
						>
							{error}
						</p>
					))}
					<button
						className="rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-surface transition duration-200 hover:bg-brand disabled:cursor-not-allowed disabled:opacity-70"
						type="submit"
						disabled={createRoleMutation.isPending}
					>
						{createRoleMutation.isPending ? "Saving..." : "Create role"}
					</button>
					{banner ? (
						<p className="rounded-2xl border border-brand/15 bg-brand-soft px-4 py-3 text-sm text-brand">
							{banner}
						</p>
					) : null}
				</form>
			</section>

			<section className="rounded-4xl border border-border bg-surface p-6 shadow-sm">
				<div className="flex items-center justify-between gap-4">
					<div>
						<p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand">
							Records
						</p>
						<h3 className="mt-1 text-xl font-semibold text-ink">Role list</h3>
					</div>
					<span className="rounded-full bg-accent-soft px-3 py-1.5 text-sm font-medium text-ink">
						{rolesQuery.data?.roles.length ?? 0} records
					</span>
				</div>
				<div className="mt-4 grid gap-3">
					{rolesQuery.data?.roles.map((role) => (
						<div
							key={role.id}
							className="rounded-3xl border border-border bg-surface p-4 shadow-sm"
						>
							<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
								<div>
									<p className="font-semibold text-ink">{role.name}</p>
									<p className="text-sm text-ink-soft">
										{role.description ?? "No description"}
									</p>
								</div>
								<div className="flex flex-wrap gap-2">
									{role.permissionIds.map((permissionId, index) => (
										<span
											key={permissionId}
											className={
												index % 2 === 0
													? "rounded-full bg-brand px-3 py-1 text-xs font-semibold text-surface"
													: "rounded-full bg-accent px-3 py-1 text-xs font-semibold text-surface"
											}
										>
											{permissionId.slice(0, 6)}
										</span>
									))}
								</div>
							</div>
							<div className="mt-4 h-1.5 w-full rounded-full bg-surface-muted">
								<div
									className="h-full rounded-full bg-accent"
									style={{ width: "74%" }}
								/>
							</div>
						</div>
					))}
				</div>
			</section>
		</div>
	);
};
