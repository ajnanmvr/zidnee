import { type FormEvent, useState } from "react";
import "./App.css";
import { LoginSchema } from "@repo/schema";

function App() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [message, setMessage] = useState("");
	const [fieldErrors, setFieldErrors] = useState<{
		email?: string[];
		password?: string[];
	}>({});

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setMessage("");
		setFieldErrors({});

		const result = LoginSchema.safeParse({ email, password });
		if (!result.success) {
			setFieldErrors(result.error.flatten().fieldErrors);
			return;
		}

		try {
			const response = await fetch("http://localhost:3001/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(result.data),
			});

			const payload = await response.json();
			if (!response.ok) {
				setFieldErrors(payload.errors ?? {});
				setMessage("Login failed");
				return;
			}

			setMessage(payload.message ?? "Login successful");
		} catch {
			setMessage("Cannot reach API server");
		}
	};

	return (
		<main className="wrapper">
			<form className="card" onSubmit={handleSubmit}>
				<h1>Login</h1>
				<p className="subtitle">Validated by shared @repo/schema LoginSchema</p>

				<label htmlFor="email">Email</label>
				<input
					id="email"
					type="email"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					placeholder="you@example.com"
				/>
				{fieldErrors.email?.map((error) => (
					<p className="error" key={error}>
						{error}
					</p>
				))}

				<label htmlFor="password">Password</label>
				<input
					id="password"
					type="password"
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					placeholder="at least 8 characters"
				/>
				{fieldErrors.password?.map((error) => (
					<p className="error" key={error}>
						{error}
					</p>
				))}

				<button type="submit">Send to Express API</button>
				{message ? <p className="status">{message}</p> : null}
			</form>
		</main>
	);
}

export default App;
