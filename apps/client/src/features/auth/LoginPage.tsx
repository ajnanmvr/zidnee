import { LoginPayloadSchema } from "@repo/schema";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { ApiError } from "@/api/request";
import { Field } from "@/components/dashboard-ui";
import { useLoginMutation } from "@/features/auth/use-login-mutation";
import type { LoginForm } from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

export const LoginPage = () => {
	const navigate = useNavigate();
	const { token } = useSession();
	const loginMutation = useLoginMutation();
	const { control, handleSubmit, setError } = useForm<LoginForm>({
		defaultValues: { username: "", password: "" },
	});

	useEffect(() => {
		if (token) {
			navigate("/", { replace: true });
		}
	}, [navigate, token]);

	const onSubmit = async (form: LoginForm) => {
		const validation = LoginPayloadSchema.safeParse(form);
		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			const usernameError = errors.username?.[0];
			const passwordError = errors.password?.[0];

			if (usernameError) {
				setError("username", { type: "manual", message: usernameError });
			}

			if (passwordError) {
				setError("password", { type: "manual", message: passwordError });
			}

			return;
		}

		try {
			const response = await loginMutation.mutateAsync(validation.data);
			if (response.token) {
				navigate("/", { replace: true });
				return;
			}

			toast.error(response.message ?? "Login succeeded but token was missing");
		} catch (error) {
			if (error instanceof ApiError) {
				const usernameError = error.payload.errors?.username?.[0];
				const passwordError = error.payload.errors?.password?.[0];

				if (usernameError) {
					setError("username", { type: "server", message: usernameError });
				}

				if (passwordError) {
					setError("password", { type: "server", message: passwordError });
				}

				toast.error(error.payload.message ?? "Unable to sign in");
				return;
			}

			toast.error(
				error instanceof Error ? error.message : "Cannot reach API server",
			);
		}
	};

	return (
		<main className="min-h-screen bg-surface-muted px-4 py-8 text-ink md:px-8 lg:px-12">
			<div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
				<section className="rounded-[2.5rem] border border-border bg-surface p-8 shadow-sm md:p-10 lg:p-12">
					<div className="flex items-center gap-3">
						<img
							src="/logo.png"
							alt="Zidnee logo"
							className="h-12 w-12 rounded-2xl border border-border bg-surface-muted p-1.5"
						/>
						<p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-brand">
							Zidnee CRM
						</p>
					</div>
					<h2 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight text-ink md:text-5xl">
						Soft, calm access to your workspace.
					</h2>
					<p className="mt-4 max-w-xl text-base leading-7 text-ink-soft">
						Sign in to manage users, roles, and permissions from a routed
						dashboard backed by React Query and shared Zod schemas.
					</p>
					<div className="mt-8 grid gap-3 sm:grid-cols-3">
						{[
							["brand", "Core actions"],
							["ink", "Structure"],
							["accent", "Highlights"],
						].map(([color, label]) => (
							<div
								key={label}
								className="rounded-3xl border border-border bg-surface-muted p-4 shadow-sm"
							>
								<div
									className={`h-2.5 w-14 rounded-full ${color === "brand" ? "bg-brand" : color === "accent" ? "bg-accent" : "bg-ink"}`}
								/>
								<p className="mt-4 text-sm font-semibold text-ink">{label}</p>
							</div>
						))}
					</div>
					<div className="mt-8 rounded-3xl border border-border bg-brand-soft px-5 py-4 text-ink">
						<p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand">
							Visual rule
						</p>
						<p className="mt-2 text-sm leading-6 text-ink-soft">
							Soft colors guide attention. Structure stays calm and readable.
						</p>
					</div>
				</section>

				<form
					className="rounded-[2.5rem] border border-border bg-surface gap-5 p-8 shadow-sm md:p-10 lg:p-12"
					onSubmit={handleSubmit(onSubmit)}
				>
					<div>
						<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand">
							Login
						</p>
						<h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
							Welcome back
						</h2>
						<p className="mt-2 text-sm text-ink-soft">
							Use your seeded username and password to enter the dashboard.
						</p>
					</div>

					<Controller
						name="username"
						control={control}
						render={({ field, fieldState }) => (
							<Field
								label="Username"
								value={field.value}
								onChange={field.onChange}
								placeholder="admin"
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
								value={field.value}
								onChange={field.onChange}
								type="password"
								placeholder="Minimum 6 characters"
								error={fieldState.error?.message}
							/>
						)}
					/>

					<button
						className="rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-surface transition duration-200 hover:bg-brand disabled:cursor-not-allowed disabled:opacity-70"
						type="submit"
						disabled={loginMutation.isPending}
					>
						{loginMutation.isPending ? "Signing in..." : "Sign in"}
					</button>
				</form>
			</div>
		</main>
	);
};
