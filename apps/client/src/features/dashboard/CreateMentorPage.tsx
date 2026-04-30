import { CreateMentorPayloadSchema } from "@repo/schema";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { HiUserPlus } from "react-icons/hi2";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "@/api/request";
import { Field, Panel } from "@/components/dashboard-ui";
import { useCreateMentorMutation } from "@/features/users/use-create-mentor-mutation";
import { useUsersQuery } from "@/features/users/users.queries";
import type { CreateMentorForm } from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

const isCounsellorRole = (roleName: string) => roleName.toLowerCase() === "counsellor";

export const CreateMentorPage = () => {
	const navigate = useNavigate();
	const { token } = useSession();
	const usersQuery = useUsersQuery(token);
	const createMentorMutation = useCreateMentorMutation();
	const { control, handleSubmit, setError, reset } = useForm<CreateMentorForm>({
		defaultValues: { name: "", counsellorId: undefined },
	});
	const queryUsers = usersQuery.data?.users ?? [];

	const counsellors = useMemo(
		() => queryUsers.filter((user) => user.roles.some((role) => isCounsellorRole(role.name))),
		[queryUsers],
	);

	const onSubmit = async (form: CreateMentorForm) => {
		const validation = CreateMentorPayloadSchema.safeParse(form);
		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			if (errors.name?.[0]) {
				setError("name", { type: "manual", message: errors.name[0] });
			}
			if (errors.counsellorId?.[0]) {
				setError("counsellorId", { type: "manual", message: errors.counsellorId[0] });
			}
			return;
		}

		try {
			await createMentorMutation.mutateAsync(validation.data);
			toast.success("Mentor created successfully.");
			reset({ name: "", counsellorId: undefined });
			navigate("/mentors");
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Unable to create mentor");
				return;
			}

			toast.error(error instanceof Error ? error.message : "Unable to create mentor");
		}
	};

	return (
		<Panel title="Create mentor" description="Add a new mentor">
			<form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
				<Controller
					name="name"
					control={control}
					render={({ field, fieldState }) => (
						<Field
							label="Full name"
							value={field.value}
							onChange={field.onChange}
							placeholder="Ajnan"
							error={fieldState.error?.message}
						/>
					)}
				/>

				<label className="grid gap-2 text-sm font-medium text-gray-600">
					<span>Optional counsellor</span>
					<Controller
						name="counsellorId"
						control={control}
						render={({ field }) => (
							<select
								className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
								value={field.value ?? ""}
								onChange={(event) => field.onChange(event.target.value || undefined)}
							>
								<option value="">No counsellor</option>
								{counsellors.map((counsellor) => (
									<option key={counsellor.id} value={counsellor.id}>
										{counsellor.name}
									</option>
								))}
							</select>
						)}
					/>
				</label>

				<div className="flex flex-wrap gap-2">
					<button
						type="submit"
						className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
						disabled={createMentorMutation.isPending}
					>
						<HiUserPlus className="h-4 w-4" aria-hidden="true" />
						{createMentorMutation.isPending ? "Creating..." : "Create mentor"}
					</button>
					<Link
						to="/mentors"
						className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
					>
						Cancel
					</Link>
				</div>
			</form>
		</Panel>
	);
};




