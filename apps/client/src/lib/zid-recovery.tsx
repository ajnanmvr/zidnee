import type { ZidConflict } from "@repo/schema";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { HiExclamationTriangle } from "react-icons/hi2";
import { ApiError } from "@/api/request";

type Overrides = Record<string, unknown>;

export const getZidConflict = (error: unknown): ZidConflict | null =>
	error instanceof ApiError ? (error.payload.zidConflict ?? null) : null;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** Deep-merges ZID overrides (e.g. `{ zids: { mentor: "ZM0050" } }`) into a payload. */
export const mergeZidOverrides = <T extends object>(payload: T, overrides: Overrides): T => {
	const out: Record<string, unknown> = { ...(payload as Record<string, unknown>) };
	for (const [key, value] of Object.entries(overrides)) {
		const current = out[key];
		out[key] = isPlainObject(current) && isPlainObject(value) ? mergeZidOverrides(current, value) : value;
	}
	return out as T;
};

const setPath = (path: string, value: string): Overrides => {
	const keys = path.split(".");
	return keys.reduceRight<unknown>((acc, key) => ({ [key]: acc }), value) as Overrides;
};

type Prompt = { conflict: ZidConflict; resolve: (value: string | null) => void };

type ZidRecoveryContextValue = {
	/**
	 * Runs `submit`; if the server reports a ZID conflict, asks the user for a
	 * replacement ID and calls `submit` again with it merged into `overrides`.
	 * Rethrows the original error if the user cancels.
	 */
	run: <T>(submit: (overrides: Overrides) => Promise<T>) => Promise<T>;
};

const ZidRecoveryContext = createContext<ZidRecoveryContextValue | null>(null);

export const ZidRecoveryProvider = ({ children }: { children: ReactNode }) => {
	const [prompt, setPrompt] = useState<Prompt | null>(null);

	const ask = useCallback(
		(conflict: ZidConflict) =>
			new Promise<string | null>((resolve) => {
				setPrompt({ conflict, resolve });
			}),
		[],
	);

	const run = useCallback(
		async <T,>(submit: (overrides: Overrides) => Promise<T>): Promise<T> => {
			let overrides: Overrides = {};
			for (;;) {
				try {
					return await submit(overrides);
				} catch (error) {
					const conflict = getZidConflict(error);
					if (!conflict) throw error;
					const chosen = await ask(conflict);
					if (chosen === null) throw error;
					overrides = mergeZidOverrides(overrides, setPath(conflict.field, chosen));
				}
			}
		},
		[ask],
	);

	const close = (value: string | null) => {
		prompt?.resolve(value);
		setPrompt(null);
	};

	return (
		<ZidRecoveryContext.Provider value={{ run }}>
			{children}
			{prompt ? <ZidConflictDialog key={`${prompt.conflict.field}-${prompt.conflict.zid}`} conflict={prompt.conflict} onClose={close} /> : null}
		</ZidRecoveryContext.Provider>
	);
};

export const useZidRecovery = () => {
	const ctx = useContext(ZidRecoveryContext);
	if (!ctx) throw new Error("useZidRecovery must be used inside ZidRecoveryProvider");
	return ctx.run;
};

const ZidConflictDialog = ({
	conflict,
	onClose,
}: {
	conflict: ZidConflict;
	onClose: (value: string | null) => void;
}) => {
	const [value, setValue] = useState(conflict.suggestedZid);
	const inputRef = useRef<HTMLInputElement>(null);
	const trimmed = value.trim().toUpperCase();
	const sameAsTaken = trimmed === conflict.zid.toUpperCase();

	useEffect(() => {
		inputRef.current?.select();
	}, []);

	return (
		<div className="fixed inset-0 z-100 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
			<form
				className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
				onSubmit={(e) => {
					e.preventDefault();
					if (trimmed && !sameAsTaken) onClose(trimmed);
				}}
			>
				<div className="flex items-start gap-3">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
						<HiExclamationTriangle className="h-5 w-5" aria-hidden="true" />
					</div>
					<div>
						<h2 className="text-base font-bold text-gray-900">ID already in use</h2>
						<p className="mt-1 text-sm text-gray-600">
							<span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono font-semibold text-gray-800">{conflict.zid}</span>{" "}
							is already taken. Type the ID to use instead and it will be created with that.
						</p>
					</div>
				</div>

				<label className="mt-5 block">
					<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">New ID</span>
					<input
						ref={inputRef}
						value={value}
						onChange={(e) => setValue(e.target.value.toUpperCase())}
						className="w-full rounded-xl border border-gray-300 px-3 py-2.5 font-mono text-lg font-semibold tracking-wide text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
					/>
				</label>
				<div className="mt-2 flex items-center justify-between text-xs">
					{sameAsTaken ? (
						<span className="font-medium text-rose-600">That's the ID that's already taken.</span>
					) : (
						<span className="text-gray-400">Must be unique.</span>
					)}
					{trimmed !== conflict.suggestedZid ? (
						<button type="button" onClick={() => setValue(conflict.suggestedZid)} className="font-semibold text-emerald-700 hover:underline">
							Use next free: {conflict.suggestedZid}
						</button>
					) : (
						<span className="text-gray-400">Next free ID</span>
					)}
				</div>

				<div className="mt-6 flex justify-end gap-2">
					<button type="button" onClick={() => onClose(null)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
						Cancel
					</button>
					<button
						type="submit"
						disabled={!trimmed || sameAsTaken}
						className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Create with {trimmed || "this ID"}
					</button>
				</div>
			</form>
		</div>
	);
};
