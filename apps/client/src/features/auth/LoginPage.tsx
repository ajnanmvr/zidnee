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
		<main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 text-gray-900">
			<form
				className="w-full max-w-sm space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
				onSubmit={handleSubmit(onSubmit)}
			>
				<div className="flex items-center gap-3">
					<img src="/logo.png" alt="Zidnee logo" className="h-10 w-10 rounded-2xl border border-gray-200 bg-gray-50 p-1" />
					<div>
						<h1 className="text-xl font-semibold text-gray-900">Zidnee — Sign in</h1>
						<p className="mt-1 text-sm text-gray-600">Sign in with your email or username</p>
					</div>
				</div>

				<Controller
					name="username"
					control={control}
					render={({ field, fieldState }) => (
						<Field
							label="Username"
							value={field.value}
							onChange={field.onChange}
							placeholder="your username"
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
							placeholder="Enter your password"
							error={fieldState.error?.message}
						/>
					)}
				/>

				<button
					className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
					type="submit"
					disabled={loginMutation.isPending}
				>
					{loginMutation.isPending ? "Signing in..." : "Sign in"}
				</button>
			</form>
		</main>
	);
};
