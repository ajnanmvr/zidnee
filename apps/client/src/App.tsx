import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
	CreateRolePayloadSchema,
	LoginPayloadSchema,
	type Permission,
	type Role,
	type User,
} from "@repo/schema";

type AuthUser = Omit<User, "password">;

type MeResponse = {
	ok: boolean;
	id: string;
	username?: string;
	email: string;
	name: string;
	roleIds: string[];
	isActive: boolean;
	roles: Role[];
	permissions: Permission[];
};

type LoginResponse = {
	ok: boolean;
	token?: string;
	user?: AuthUser;
	message?: string;
	errors?: Record<string, string[]>;
};

type ApiErrorPayload = {
	message?: string;
	errors?: Record<string, string[]>;
};

type ActiveView = "overview" | "users" | "roles" | "permissions";

type DashboardData = {
	me: MeResponse | null;
	users: AuthUser[];
	roles: Role[];
	permissions: Permission[];
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001/api";

const storedToken = () => localStorage.getItem("zidnee.authToken") ?? "";

const authHeaders = (token: string) => ({
	Authorization: `Bearer ${token}`,
});

const readJson = async <T,>(response: Response): Promise<T> => {
	return (await response.json()) as T;
};

const getErrorMessage = (payload: ApiErrorPayload, fallback: string): string => {
	if (payload.message) {
		return payload.message;
	}

	const fieldError = Object.values(payload.errors ?? {})
		.flat()
		.find(Boolean);

	return fieldError ?? fallback;
};

function App() {
	const [token, setToken] = useState(() => storedToken());
	const [currentView, setCurrentView] = useState<ActiveView>("overview");
	const [loading, setLoading] = useState(Boolean(token));
	const [loginForm, setLoginForm] = useState({ username: "", password: "" });
	const [roleForm, setRoleForm] = useState({
		name: "",
		description: "",
		permissionIds: [] as string[],
	});
	const [banner, setBanner] = useState("");
	const [loginErrors, setLoginErrors] = useState<Record<string, string[]>>({});
	const [roleErrors, setRoleErrors] = useState<Record<string, string[]>>({});
	const [data, setData] = useState<DashboardData>({
		me: null,
		users: [],
		roles: [],
		permissions: [],
	});
	const [busy, setBusy] = useState(false);

	const isAuthenticated = Boolean(token);

	const sortedPermissions = useMemo(
		() => [...data.permissions].sort((a, b) => a.name.localeCompare(b.name)),
		[data.permissions],
	);

	const sortedRoles = useMemo(
		() => [...data.roles].sort((a, b) => a.name.localeCompare(b.name)),
		[data.roles],
	);

	const sortedUsers = useMemo(
		() => [...data.users].sort((a, b) => a.name.localeCompare(b.name)),
		[data.users],
	);

	const loadDashboard = useCallback(async (authToken: string) => {
		setLoading(true);
		try {
			const [meResponse, usersResponse, rolesResponse, permissionsResponse] =
				await Promise.all([
					fetch(`${API_BASE_URL}/auth/me`, {
						headers: authHeaders(authToken),
					}),
					fetch(`${API_BASE_URL}/users`, {
						headers: authHeaders(authToken),
					}),
					fetch(`${API_BASE_URL}/roles`, {
						headers: authHeaders(authToken),
					}),
					fetch(`${API_BASE_URL}/permissions`, {
						headers: authHeaders(authToken),
					}),
				]);

			if (!meResponse.ok) {
				throw new Error("Session expired");
			}

			const [mePayload, usersPayload, rolesPayload, permissionsPayload] =
				await Promise.all([
					readJson<MeResponse>(meResponse),
					readJson<{ users: AuthUser[] }>(usersResponse),
					readJson<{ roles: Role[] }>(rolesResponse),
					readJson<{ permissions: Permission[] }>(permissionsResponse),
				]);

			setData({
				me: mePayload,
				users: usersPayload.users ?? [],
				roles: rolesPayload.roles ?? [],
				permissions: permissionsPayload.permissions ?? [],
			});
			setCurrentView("overview");
			setBanner("Dashboard loaded");
		} catch {
			localStorage.removeItem("zidnee.authToken");
			setToken("");
			setData({ me: null, users: [], roles: [], permissions: [] });
			setBanner("Session expired. Please log in again.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!token) {
			setLoading(false);
			return;
		}

		void loadDashboard(token);
	}, [loadDashboard, token]);

	const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setLoginErrors({});
		setBanner("");

		const validation = LoginPayloadSchema.safeParse(loginForm);
		if (!validation.success) {
			setLoginErrors(validation.error.flatten().fieldErrors);
			return;
		}

		setBusy(true);
		try {
			const response = await fetch(`${API_BASE_URL}/auth/login`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validation.data),
			});

			const payload = await readJson<LoginResponse>(response);
			if (!response.ok) {
				setLoginErrors(payload.errors ?? {});
				setBanner(getErrorMessage(payload, "Unable to sign in"));
				return;
			}

			if (!payload.token) {
				setBanner("Login succeeded but token was missing");
				return;
			}

			localStorage.setItem("zidnee.authToken", payload.token);
			setToken(payload.token);
			await loadDashboard(payload.token);
			setLoginForm({ username: "", password: "" });
		} catch {
			setBanner("Cannot reach API server");
		} finally {
			setBusy(false);
		}
	};

	const handleLogout = () => {
		localStorage.removeItem("zidnee.authToken");
		setToken("");
		setData({ me: null, users: [], roles: [], permissions: [] });
		setBanner("Logged out");
	};

	const handleCreateRole = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setRoleErrors({});
		setBanner("");

		const validation = CreateRolePayloadSchema.safeParse({
			name: roleForm.name,
			description: roleForm.description || undefined,
			permissionIds: roleForm.permissionIds,
		});

		if (!validation.success) {
			setRoleErrors(validation.error.flatten().fieldErrors);
			return;
		}

		if (!token) {
			return;
		}

		setBusy(true);
		try {
			const response = await fetch(`${API_BASE_URL}/roles`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...authHeaders(token),
				},
				body: JSON.stringify(validation.data),
			});

			const payload = await readJson<ApiErrorPayload>(response);
			if (!response.ok) {
				setBanner(getErrorMessage(payload, "Unable to create role"));
				setRoleErrors(payload.errors ?? {});
				return;
			}

			setBanner("Role created");
			setRoleForm({ name: "", description: "", permissionIds: [] });
			await loadDashboard(token);
		} catch {
			setBanner("Cannot reach API server");
		} finally {
			setBusy(false);
		}
	};

	const toggleRolePermission = (permissionId: string) => {
		setRoleForm((current) => ({
			...current,
			permissionIds: current.permissionIds.includes(permissionId)
				? current.permissionIds.filter((id) => id !== permissionId)
				: [...current.permissionIds, permissionId],
		}));
	};

	return isAuthenticated ? (
		<main className="min-h-screen bg-slate-100 text-slate-900 lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
			<aside className="border-b border-slate-200 bg-white px-6 py-6 shadow-sm lg:border-b-0 lg:border-r">
				<div className="flex items-center gap-3">
					<div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-900 text-lg font-bold text-white">
						Z
					</div>
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
							Zidnee CRM
						</p>
						<h1 className="text-lg font-semibold text-slate-900">Workspace</h1>
					</div>
				</div>

				<nav className="mt-8 grid gap-2" aria-label="Dashboard sections">
					{[
						["overview", "Overview"],
						["users", "Users"],
						["roles", "Roles"],
						["permissions", "Permissions"],
					].map(([key, label]) => (
						<button
							type="button"
							key={key}
							className={
								currentView === key
									? "flex w-full items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 text-left text-sm font-semibold text-white"
									: "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
							}
							onClick={() => setCurrentView(key as ActiveView)}
						>
							<span>{label}</span>
							<span className="text-xs text-slate-400">{String(sortedUsers.length + sortedRoles.length + sortedPermissions.length).padStart(2, "0")}</span>
						</button>
					))}
				</nav>

				<div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-4">
					<p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Signed in as</p>
					<p className="mt-2 text-sm font-semibold text-slate-900">{data.me?.name ?? "User"}</p>
					<button type="button" className="mt-4 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50" onClick={handleLogout}>
						Log out
					</button>
				</div>
			</aside>

			<section className="min-w-0 px-6 py-6 lg:px-8">
				<header className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Control panel</p>
						<h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
							{currentView === "overview" ? "Overview" : currentView}
						</h2>
					</div>
					<div className="flex flex-wrap gap-2 text-sm font-medium text-slate-600">
						<span className="rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">{sortedUsers.length} users</span>
						<span className="rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">{sortedRoles.length} roles</span>
						<span className="rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">{sortedPermissions.length} permissions</span>
					</div>
				</header>

				{banner ? (
					<div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">{banner}</div>
				) : null}
				{loading ? (
					<div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Loading dashboard...</div>
				) : null}

				{!loading ? (
					<div className="mt-6 grid gap-6">
						{currentView === "overview" ? (
							<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
								{[
									["Active user", data.me?.name ?? "User"],
									["Roles", String(sortedRoles.length)],
									["Permissions", String(sortedPermissions.length)],
									["Users", String(sortedUsers.length)],
								].map(([label, value]) => (
									<div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
										<p className="text-sm font-medium text-slate-500">{label}</p>
										<p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
									</div>
								))}
							</div>
						) : null}

						{currentView === "users" ? (
							<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
								<div className="flex items-center justify-between gap-4">
									<h3 className="text-lg font-semibold text-slate-900">Users</h3>
									<span className="text-sm text-slate-500">{sortedUsers.length} records</span>
								</div>
								<div className="mt-4 grid gap-3">
									{sortedUsers.map((user) => (
										<div key={user.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
											<div>
												<p className="font-semibold text-slate-900">{user.name}</p>
												<p className="text-sm text-slate-500">{user.email}</p>
											</div>
											<div className="flex flex-wrap gap-2">
												{user.roleIds.map((roleId) => (
													<span key={roleId} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">Role {roleId.slice(0, 6)}</span>
												))}
											</div>
										</div>
									))}
								</div>
							</section>
						) : null}

						{currentView === "roles" ? (
							<div className="grid gap-6 xl:grid-cols-2">
								<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
									<div className="flex items-center justify-between gap-4">
										<h3 className="text-lg font-semibold text-slate-900">Create role</h3>
										<span className="text-sm text-slate-500">Compose permissions</span>
									</div>
									<form className="mt-5 grid gap-4" onSubmit={handleCreateRole}>
										<label className="grid gap-2 text-sm font-medium text-slate-700">
											<span>Name</span>
											<input
												className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
												value={roleForm.name}
												onChange={(event) =>
													setRoleForm((current) => ({
														...current,
														name: event.target.value,
													}))
												}
												placeholder="Support Agent"
											/>
										</label>
										<label className="grid gap-2 text-sm font-medium text-slate-700">
											<span>Description</span>
											<textarea
												className="min-h-28 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
												value={roleForm.description}
												onChange={(event) =>
													setRoleForm((current) => ({
														...current,
														description: event.target.value,
													}))
												}
												placeholder="Short role summary"
											/>
										</label>
										<div className="grid gap-2 text-sm font-medium text-slate-700">
											<span>Permissions</span>
											<div className="flex flex-wrap gap-2">
												{sortedPermissions.map((permission) => (
													<button
														type="button"
														key={permission.id}
														className={
															roleForm.permissionIds.includes(permission.id)
																? "rounded-full border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
																: "rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
														}
														onClick={() => toggleRolePermission(permission.id)}
													>
														{permission.key}
													</button>
												))}
											</div>
										</div>
										{roleErrors.name?.map((error) => (
											<p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" key={error}>
												{error}
											</p>
										))}
										<button className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled={busy}>
											{busy ? "Saving..." : "Create role"}
										</button>
									</form>
								</section>

								<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
									<div className="flex items-center justify-between gap-4">
										<h3 className="text-lg font-semibold text-slate-900">Role list</h3>
										<span className="text-sm text-slate-500">{sortedRoles.length} records</span>
									</div>
									<div className="mt-4 grid gap-3">
										{sortedRoles.map((role) => (
											<div key={role.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
												<div>
													<p className="font-semibold text-slate-900">{role.name}</p>
													<p className="text-sm text-slate-500">{role.description ?? "No description"}</p>
												</div>
												<div className="flex flex-wrap gap-2">
													{role.permissionIds.map((permissionId) => (
														<span key={permissionId} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">{permissionId.slice(0, 6)}</span>
													))}
												</div>
											</div>
										))}
									</div>
								</section>
							</div>
						) : null}

						{currentView === "permissions" ? (
							<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
								<div className="flex items-center justify-between gap-4">
									<h3 className="text-lg font-semibold text-slate-900">Permissions</h3>
									<span className="text-sm text-slate-500">{sortedPermissions.length} records</span>
								</div>
								<div className="mt-4 grid gap-3">
									{sortedPermissions.map((permission) => (
										<div key={permission.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
											<div>
												<p className="font-semibold text-slate-900">{permission.key}</p>
												<p className="text-sm text-slate-500">{permission.name}</p>
											</div>
											<p className="text-sm font-medium text-slate-500">{permission.resource}:{permission.action}</p>
										</div>
									))}
								</div>
							</section>
						) : null}
					</div>
				) : null}
			</section>
		</main>
	) : (
		<main className="min-h-screen bg-slate-100 flex justify-center items-center px-4 py-8 text-slate-900 md:px-8 lg:px-12">
					<form className="flex flex-col justify-center rounded-2xl bg-white gap-5 p-8 md:p-10 lg:p-12 w-125" onSubmit={handleLogin}>
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Login</p>
						<h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h2>
					</div>

					<label className="grid gap-2 text-sm font-medium text-slate-700">
						<span>Username</span>
						<input
							className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
							type="text"
							value={loginForm.username}
							onChange={(event) =>
								setLoginForm((current) => ({ ...current, username: event.target.value }))
							}
							placeholder="admin"
						/>
					</label>
					{loginErrors.username?.map((error) => (
						<p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" key={error}>
							{error}
						</p>
					))}

					<label className="grid gap-2 text-sm font-medium text-slate-700">
						<span>Password</span>
						<input
							className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
							type="password"
							value={loginForm.password}
							onChange={(event) =>
								setLoginForm((current) => ({
									...current,
									password: event.target.value,
								}))
							}
							placeholder="Minimum 8 characters"
						/>
					</label>
					{loginErrors.password?.map((error) => (
						<p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" key={error}>
							{error}
						</p>
					))}

					<button className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled={busy}>
						{busy ? "Signing in..." : "Sign in"}
					</button>
					{banner ? <p className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">{banner}</p> : null}
				</form>
		</main>
	);
}

export default App;
